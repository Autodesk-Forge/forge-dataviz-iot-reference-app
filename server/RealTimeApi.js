const { DigitalTwinsClient } = require("@azure/digital-twins-core");
const ClientSecretCredential = require("@azure/identity").ClientSecretCredential;
const { EventHubConsumerClient, latestEventPosition } = require("@azure/event-hubs");
const SocketIOServer = require("socket.io");
const _ = require("lodash");

function createSocketIOServer(server) {
    const socketIO = SocketIOServer(server, {
        path: "/api/socket",
    });

    const dtClient = new DigitalTwinsClient(
        process.env.AZURE_DIGITAL_TWIN_URL,
        new ClientSecretCredential(
            process.env.AZURE_TENANT_ID,
            process.env.AZURE_CLIENT_ID,
            process.env.AZURE_APPLICATION_SECRET
        )
    );

    let twinData = [];
    async function getDigitalTwins() {
        const dtQueryItr = dtClient.queryTwins(
            "SELECT * FROM digitaltwins DT WHERE IS_OF_MODEL(DT, 'dtmi:com:Sensor;1')"
        );
        let newTwinData = [];
        for await (let page of dtQueryItr.byPage()) {
            if (page.items) {
                // TODO: Do we need timeStamp?
                /**
                 * All properties will have metadata with the last update time
                 * any property that starts with $ is internal to digital twins and not user defined
                 * Azure digital twin format
                 * {
                 *   $dtId: Hyperion
                 *   $etag: ...
                 *   $ metadata: {
                 *     $model: ..
                 *     name: {
                 *       lastUpdateTime: ...
                 *     }
                 *   }
                 *   name: ...
                 *   ....
                 * }
                 */
                for (const twinQuery of page.items) {
                    let twin = {};
                    for (const [key, value] of Object.entries(twinQuery)) {
                        if (!key.startsWith("$")) {
                            if (key === "name") {
                                twin["DeviceId"] = value;
                            } else {
                                twin[key] = value;
                            }
                        }
                    }
                    newTwinData.push(twin);
                }
            }
        }
        twinData = newTwinData;
        // Real time update option 1
        // Real-time update via digital twin data
        //socket.emit("iot-data", JSON.stringify(twinData));
    }

    // Update and cache twin data
    getDigitalTwins();
    setInterval(getDigitalTwins, 60 * 1000);

    socketIO.on("connection", (socket) => {
        //Send initial IoT-Data collected from Digital Twin
        socket.emit("iot-data", JSON.stringify(twinData));
    });

    // Real time-update option 3
    // Synthetic data push
    // let sensorProperties = {};
    // let sensorPropertiesFile = path.resolve(__dirname, "synthetic", "sensorProperties.txt");
    // let data = fs.readFileSync(sensorPropertiesFile, "utf8");
    // let lines = data.split("\n");
    // for (let i = 1; i < lines.length; ++i) {
    //     let lineComponents = lines[i].split("\t");
    //     sensorProperties[lineComponents[0]] = {
    //         min: parseFloat(lineComponents[1]),
    //         max: parseFloat(lineComponents[2]),
    //     };
    // }
    // let devices = [];
    // let sensorListFile = path.resolve(__dirname, "synthetic", "sensorsList.txt");
    // data = fs.readFileSync(sensorListFile, "utf8");
    // lines = data.split("\n");
    // for (let i = 1; i < lines.length; ++i) {
    //     let lineComponents = lines[i].split("\t");
    //     devices.push({
    //         DeviceId: lineComponents[0],
    //         Sensors: lineComponents[1].split(","),
    //     });
    // }
    // function sendSyntheticData() {
    //     let eventsData = [];
    //     let timeStamp = new Date().toISOString();
    //     for (let device of devices) {
    //         let eventData = { DeviceId: device.DeviceId };
    //         for (let sensor of device.Sensors) {
    //             let sensorProperty = sensorProperties[sensor];
    //             eventData[sensor] = Math.random() * (sensorProperty.max - sensorProperty.min) + sensorProperty.min;
    //         }
    //         eventData["timeStamp"] = timeStamp;
    //         eventsData.push(eventData);
    //     }
    //     console.log("Synthetic Data:", eventsData);
    //     socketIO.emit("iot-data", JSON.stringify(eventsData));
    // }
    // sendSyntheticData();
    // setInterval(sendSyntheticData, 5 * 60 * 1000);

    // Real Time update option 2
    // Real-time update by subscribing to iot-hub events
    const client = new EventHubConsumerClient(
        "websocket",
        process.env.AZURE_IOT_HUB_EVENT_HUB_CONNECTION_STRING
    );
    const subscriptionOptions = {
        startPosition: latestEventPosition,
    };
    // TODO: Check if this connection can fail after being subscribed
    // eslint-disable-next-line no-unused-vars
    const subscription = client.subscribe(
        {
            processEvents: async (events, context) => {
                context;
                // Massage the large event data into a format with timestamp, properties and a deviceId
                /**
                 * {
                 *     "timeStamp" : "",
                 *     "Humidity" : 40.,
                 *     ....
                 *     "DeviceId": "Hyperion-1"
                 * }
                 */
                let eventsData = [];
                for (let e of events) {
                    let eventData = _.cloneDeep(e["body"]);
                    eventData["DeviceId"] = e["systemProperties"]["iothub-connection-device-id"];
                    eventsData.push(eventData);
                }
                socketIO.emit("iot-data", JSON.stringify(eventsData));
            },
            processError: async (err, context) => {
                console.error("Event hub processing error", err, context);
            },
        },
        subscriptionOptions
    );

    return socketIO;
}

module.exports.createSocketIOServer = createSocketIOServer;
