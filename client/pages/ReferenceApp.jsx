/* eslint no-unused-vars: [
    "error", {
        "varsIgnorePattern": "(DataStore|DataView|masterDataView|deviceTypes|currentTime|startSecond|endSecond|resolution|currentSecond|DeviceProperty)"
    }
] */

import React, { useEffect, useState, useRef } from "react";
import { Viewer } from "forge-dataviz-iot-react-components";
import { CustomToolTip } from "forge-dataviz-iot-react-components";
import { DataPanelContainer } from "forge-dataviz-iot-react-components";
import { HyperionToolContainer } from "forge-dataviz-iot-react-components";
import { SpriteSize, SensorStyleDefinitions, PropIdGradientMap } from "../config/SensorStyles.js";
import { ChronosTimeSlider } from "forge-dataviz-iot-react-components";
import { BasicDatePicker } from "forge-dataviz-iot-react-components";
import {
    getPaddedRange,
    getTimeInEpochSeconds,
    getClosestValue,
    clamp,
    convertSurfaceShadingDataToDigitalTwinGraph,
} from "../../shared/Utility";
import { HeatmapOptions } from "forge-dataviz-iot-react-components";
import ApplicationContext from "../../shared/config/ApplicationContext.js";
import io from "socket.io-client";



import {
    Session,
    DataStore,
    AzureDataAdapter,
    RestApiDataAdapter,
    DataView,
    DateTimeSpan,
    EventType,
    DeviceProperty
} from "forge-dataviz-iot-data-modules/client";

import "forge-dataviz-iot-react-components/dist/main.bundle.css"; 
import "react-dates/lib/css/_datepicker.css";

// End Range for timeslider
const endRange = new Date(new Date().getTime() + 7 * 60 * 60 * 1000 * 24);
const startRange = new Date("2020-01-01T00:00:00Z");

/**
 * DeviceInfo inherits from Autodesk.DataVisualization.Device object to provide
 * extended information like device type, name and description.
 *
 * @param {string} id The device identifier.
 * @param {string} type The device model identifier.
 * @param {number} x The x coordinate of the device in world space
 * @param {number} y The y coordinate of the device in world space
 * @param {number} z The z coordinate of the device in world space
 * @param {string[]} sensorTypes The list of sensor types this device
 * exposes. A device can expose multiple sensor types such as temperature,
 * humidity, etc.
 *
 * @memberof Autodesk.Hyperion.UI
 */
function DeviceInfo(id, type, x, y, z, sensorTypes) {
    this.type = type;

    // Copy all enumerable own properties from Device base class.
    const specs = new Autodesk.DataVisualization.Device(id, x, y, z, sensorTypes);
    Object.assign(this, specs);

    /**
     * Sets the name and description of the device.
     * @param {string} name The name of the device.
     * @param {string} description The description of the device.
     */
    DeviceInfo.prototype.setNameDescription = function (name, description) {
        this.name = name;
        this.description = description || name;
    };
}

// TODO: This function does not sound like it belongs in the main application
//  file, more suitable to be in a "device utility file". Move this to where
//  it rightfully belong.
/**
 * @memberof Autodesk.Hyperion.IoTExtension
 * Creates the initial device-id-to-style map for all the device models found
 * defined in the downloaded list.
 *
 * @returns {Object.<string, Autodesk.DataVisualization.ViewableStyle>} The style map
 * that maps a given device model ID to the corresponding viewable style.
 *
 * @memberof Autodesk.Hyperion.UI
 */
function initialDeviceModelStyleMap() {
    let styleMap = {};

    // Create model-to-style map from style definitions.
    Object.entries(SensorStyleDefinitions).forEach(([deviceModelId, styleDef]) => {
        styleMap[deviceModelId] = new Autodesk.DataVisualization.ViewableStyle(
            deviceModelId,
            Autodesk.DataVisualization.ViewableType.SPRITE,
            new THREE.Color(styleDef.color),
            styleDef.url,
            new THREE.Color(styleDef.highlightedColor),
            styleDef.highlightedUrl
        );
    });

    return styleMap;
}

/**
 * Time slice selection of the timeline object
 * @property {Date} endDate End date of the timeslice
 * @property {Date} startDate Starting date of the timeslice
 * @property {string} resolution Current resolution of data
 * @property {Date} currentDate Current date of the timeslice
 */
class TimeOptions { }
export { TimeOptions };

/**
 * Constructs a device tree to back device UI.
 *
 * @param {DataStore} dataStore The data store where device models, devices
 * and their corresponding property data are defined.
 * @param {Autodesk.DataVisualization.LevelRoomsMap} buildingInfo The level-to-room map.
 *
 * @returns {DeviceTreeNode[]} The device tree containing all
 * floors and their corresponding devices in project.
 * @private
 */
function constructDeviceTree(dataStore, buildingInfo) {
    const deviceTree = [];

    /** @type {Object.<string, { deviceId: string, propIds: string[] }>} */
    const devicePropertiesMap = {};
    dataStore.deviceModels.map((deviceModel) => {
        deviceModel.devices.forEach((device) => {
            devicePropertiesMap[device.id] = {
                deviceId: device.id,
                deviceName: device.name,
                propIds: deviceModel.properties.map((dp) => dp.id),
            };
        });
    });

    let positionedDeviceIds = [];

    for (let floor in buildingInfo) {
        const roomsWithDevices = buildingInfo.getRoomsOnLevel(floor, true);

        const floorObj = {
            id: floor,
            name: floor.toUpperCase(),
            children: [],
        };

        roomsWithDevices.forEach((room) =>
            room.devices.map((device) => {
                positionedDeviceIds.push(device.id);

                // All of the properties of this device.
                const propIds = devicePropertiesMap[device.id].propIds;

                floorObj.children.push({
                    id: device.id,
                    name: device.name,
                    propIds: [...propIds],
                    children: [],
                });
            })
        );

        if (roomsWithDevices.length > 0) {
            deviceTree.push(floorObj);
        }
    }

    /** @type {Array.<{ deviceId: string, propIds: string[] }>} */
    const unpositionedDevices = [];
    Object.values(devicePropertiesMap).forEach((device) => {
        if (!positionedDeviceIds.includes(device.deviceId)) {
            unpositionedDevices.push(device);
        }
    });

    if (unpositionedDevices.length > 0) {
        deviceTree.push({
            id: "Unassigned",
            name: "UNASSIGNED",
            children: [],
        });
        unpositionedDevices.forEach((device) =>
            deviceTree.lastItem.children.push({
                id: device.deviceId,
                name: device.deviceName,
                propIds: [...device.propIds],
                children: [],
            })
        );
    }

    return deviceTree;
}

/**
 * Configure default start/end date to be ranging from two weeks
 * in the past, to tomorrow. Also the current time to be now.
 */
const currDate = new Date();
currDate.setUTCHours(0, 0, 0, 0);
const endDate = new Date(currDate.getTime() + 1 * 24 * 60 * 60 * 1000);
endDate.setUTCHours(0, 0, 0, 0);
const startDate = new Date(currDate.getTime() - 14 * 24 * 60 * 60 * 1000);
startDate.setUTCHours(0, 0, 0, 0);

/**
 * Main Reference App component
 * 
 * @component
 * @param {Object} props
 * @param {Object} props.appData Data passed to the Reference App.
 * @param {("AutodeskStaging"|"AutodeskProduction")} props.appData.env Forge API environment
 * @param {string} props.appData.docUrn Document URN of model
 * @param {string} props.appData.adapterType Corresponds to Data Adapter used to query data. i.e - synthetic, azure etc.
 * @memberof Autodesk.Hyperion.UI
 * @alias Autodesk.Hyperion.UI.ReferenceApp
 */
function ReferenceApp(props) {
    /**
     * Most import variables that will define the behavoir of this APP.
     * env: String -- AutodeskProduction/AutodeskStaging
     * api: "derivativeV2"|"derivativeV2_EU"|"modelDerivativeV2"|"fluent"|"D3S"|"D3S_EU" -- Please refer LMV documentation
     * docUrn: String -- the document user want to load
     */
    const { env, docUrn, adapterType, api } = props.appData;
    /**
     * Function to get the access token used to load the model into {@link Autodesk.Hyperion.UI.Viewer}
     */
    async function getToken() {
        return fetch("/api/token")
            .then((res) => res.json())
            .then((data) => data.access_token);
    }

    let DataAdapter = RestApiDataAdapter;
    if (adapterType == "azure") {
        DataAdapter = AzureDataAdapter;
    }

    // calculate start/end range of the timeline if there is limitted data range
    // override the timeslider with the date range (from CSV or other database)
    if (props.appData.dataStart && props.appData.dataEnd) {
        let dataStart = new Date(props.appData.dataStart);
        let dataEnd = new Date(props.appData.dataEnd);
        startRange.setTime(dataStart.getTime());
        endRange.setTime(dataEnd.getTime());

        if (startDate.getTime() < startRange.getTime() || startDate.getTime() >= endRange.getTime()) {
            startDate.setTime(startRange.getTime());
        }

        if (endDate.getTime() <= startRange.getTime() || endDate.getTime() >= endRange.getTime()) {
            endDate.setTime(endRange.getTime());
        }

        if (currDate.getTime() <= startRange.getTime() || currDate.getTime() >= endRange.getTime()) {
            currDate.setTime(endRange.getTime());
        }

        // give it a little bit buffer to make the range selection visible
        startRange.setTime(dataStart.getTime() - 2 * 60 * 60 * 24 * 1000);
        endRange.setTime(dataEnd.getTime() + 2 * 60 * 60 * 24 * 1000);
    }

    const lmvViewerRef = useRef(null);
    const activeListenersRef = useRef({});
    const appStateRef = useRef(null);
    const timeOptionRef = useRef(null);
    const hoveredDeviceInfoRef = useRef({});

    const [hoveredDeviceInfo, setHoveredDeviceInfo] = useState({});

    const [appState, setAppState] = useState({});
    const [deviceTree, setDeviceTree] = useState({});
    const [selectedDevice, setSelectedDevice] = useState("");
    const [selectedFloorNode, setSelectedFloorNode] = useState();
    const [heatmapOptions, setHeatmapOptions] = useState({
        resolutionValue: "PT1H",
        selectedPropertyId: "Temperature", // Defaults to temperature sensor type
        showHeatMap: true,
    });

    const [timeOptions, setTimeOptions] = useState({
        endTime: endDate,
        startTime: startDate,
        resolution: heatmapOptions.resolutionValue,
        currentTime: currDate,
    });

    const [dataContext, setDataContext] = useState("");
    const [currentDeviceData, setcurrentDeviceData] = useState({});
    const [chartData, setchartData] = useState({});

    timeOptionRef.current = timeOptions;
    appStateRef.current = appState;
    hoveredDeviceInfoRef.current = hoveredDeviceInfo;

    useEffect(() => {
        document.title = "Hyperion Reference App";
        return function cleanUp() {
            const viewer = lmvViewerRef.current;
            const listeners = activeListenersRef.current;

            if (viewer) {
                for (let key in listeners) {
                    viewer.removeEventListener(key, listeners[key]);
                }

                activeListenersRef.current = {};
            }
        };
    }, []);

    /**
     * Adjust the current time window of the given DataView object.
     *
     * @param {Date} startTime The start time of the time window
     * @param {Date} endTime The end time of the time window
     * @param {DataView} dataView The DataView object whose time
     * window is to be adjusted.
     */
    function setTimeWindow(startTime, endTime, dataView, resolution = timeOptionRef.current.resolution) {
        const startSecond = getTimeInEpochSeconds(startTime);
        const endSecond = getTimeInEpochSeconds(endTime);

        const span = new DateTimeSpan(startSecond, endSecond, resolution);
        dataView.setTimeWindow(span);
    }

    /**
     * Initializes a {@link DataStore} to generate a corresponding {@link DataView}.
     * @alias Autodesk.Hyperion.UI.ReferenceApp#initializeDataStore
     */
    async function initializeDataStore() {
        // Create a data adapter to pull in data from server.
        const adapter = new DataAdapter(adapterType, ApplicationContext.fargateUrl);

        // Register the adapter and pull in all device models.
        const session = new Session();
        session.dataStore.registerDataAdapter(adapter);
        await session.dataStore.loadDeviceModelsFromAdapters();

        const masterDataView = session.dataStore.createView();

        // Add all known devices to masterDataView so they are watched.
        const deviceModels = session.dataStore.deviceModels;
        deviceModels.forEach((deviceModel) => {
            // Get all the properties that belong to this device type.
            const pids = deviceModel.properties.map((p) => p.id);

            deviceModel.devices.forEach((device) => {
                // Add a device and all its properties into the view.
                masterDataView.addDeviceProperties(device.id, pids);
            });
        });

        setTimeWindow(timeOptions.startTime, timeOptions.endTime, masterDataView);
        return [session, masterDataView];
    }

    /**
     * Maps devices to rooms in the model.
     * @param {Session} session The session object where all device models
     * are loaded into. The device models found in the session will be mapped
     * &nbsp;to available rooms.
     * @param {Model} model The model of the building.
     * @alias Autodesk.Hyperion.UI.ReferenceApp#mapDevicesToRooms
     */
    async function mapDevicesToRooms(session, model) {
        const deviceModels = session.dataStore.deviceModels;

        try {
            /** @type {DeviceInfo[]} */
            const deviceList = [];
            deviceModels.forEach((deviceModel) => {
                deviceModel.devices.forEach((device) => {
                    const deviceInfo = new DeviceInfo(
                        device.id,
                        deviceModel.id,
                        device.position.x,
                        device.position.y,
                        device.position.z,
                        deviceModel.propertyIds.slice(0)
                    );

                    deviceInfo.setNameDescription(device.name, device.description);
                    deviceList.push(deviceInfo);
                });
            });

            const structureInfo = new Autodesk.DataVisualization.ModelStructureInfo(model);
            /**
             * Using {@link Autodesk.DataVisualization.Device} works as well
             * the reason we have a custom type here is for the UI in {@link constructDeviceTree}
             */
            let shadingData = await structureInfo.generateSurfaceShadingData(deviceList);
            const buildingInfo = await structureInfo.getLevelRoomsMap();

            const completeDeviceTree = constructDeviceTree(session.dataStore, buildingInfo);
            setDeviceTree(completeDeviceTree);
            return shadingData;
        } catch (er) {
            console.error(er);
        }
    }

    /**
     * Called by {@link Autodesk.Hyperion.UI.Viewer} when the model has been loaded.
     * 
     * @param {Autodesk.Viewing.GuiViewer3D} viewer Instance of Forge Viewer
     * @param {*} data 
     * @callback
     */
    async function onModelLoaded(viewer, data) {
        const [session, masterDataView] = await initializeDataStore();

        const dataVizExt = await viewer.loadExtension("Autodesk.DataVisualization", { useInternal: true });

        //Optional: load the ZoomWindow and MinimapExtention
        viewer.loadExtension("Autodesk.Viewing.ZoomWindow");
        // viewer.loadExtension('Autodesk.AEC.Minimap3DExtension')

        let levelsExt = null;
        let styleMap = initialDeviceModelStyleMap();

        let viewerDocument = data.model.getDocumentNode().getDocument();
        const aecModelData = await viewerDocument.downloadAecModelData();
        if (aecModelData) {
            levelsExt = await viewer.loadExtension("Autodesk.AEC.LevelsExtension", {
                doNotCreateUI: true,
            });
        }

        let buildingInfo = await mapDevicesToRooms(session, data.model);

        /**
         * Gets the ViewableStyle object for the given device model.
         *
         * @param {string} deviceModelId Identifier of the device model.
         *
         * @returns {Autodesk.DataVisualization.ViewableStyle} The corresponding
         * ViewableStyle object for the given device model, or the default
         * style if none is found matching.
         *
         */
        function getViewableStyle(deviceModelId) {
            return styleMap[deviceModelId] || styleMap["default"];
        }

        /**
         * Asynchronously generates SpriteViewable objects for each device loaded within the session.
         *
         * @param {Session} session The session that contains the data store
         * &nbsp;where all of the loaded devices from service providers are stored.
         * @param {DataView} masterDataView The master view of device data
         * &nbsp;stored inside session data store.
         * @alias Autodesk.Hyperion.UI.ReferenceApp#generateViewables
         */
        async function generateViewables(session, masterDataView) {
            const dataStore = session.dataStore;

            let dbId = 1;
            const dbId2DeviceIdMap = {};
            const deviceId2DbIdMap = {};
            /**@type {Map.<string, DeviceProperty>} */
            const propertyMap = dataStore.getPropertiesFromDataStore()
            const viewableData = new Autodesk.DataVisualization.ViewableData();
            viewableData.spriteSize = SpriteSize;

            const deviceModels = dataStore.deviceModels;
            deviceModels.forEach((deviceModel) => {
                const deviceModelId = deviceModel.id;

                // Viewable style is defined per-device-model.
                const style = getViewableStyle(deviceModelId);

                deviceModel.devices.forEach((device) => {
                    const position = device.position;
                    const viewable = new Autodesk.DataVisualization.SpriteViewable(position, style, dbId);

                    dbId2DeviceIdMap[dbId] = device.id;
                    deviceId2DbIdMap[device.id] = dbId;
                    dbId++;

                    viewableData.addViewable(viewable);
                });
            });

            await viewableData.finish();
            dataVizExt.addViewables(viewableData);
            dataVizExt.setupSurfaceShading(data.model, buildingInfo);

            propertyMap.forEach((prop) => {
                // Register color stops for a property, use default if none is defined.
                const colors = PropIdGradientMap[prop.id] || [0xf9d423, 0xff4e50];
                dataVizExt.registerSurfaceShadingColors(prop.id, colors);
            });

            setAppState({
                viewer: viewer,
                dataVizExtn: dataVizExt,
                session: session,
                masterDataView: masterDataView,
                deviceId2DbIdMap: deviceId2DbIdMap,
                dbId2DeviceIdMap: dbId2DeviceIdMap,
                propertyMap: propertyMap,
                levelsExt,
                buildingInfo,
            });
        }

        /**
         * Called when a user selects a device in the scene. The corresponding device is selected in the scene.
         * 
         * @param {MouseEvent} event 
         * @private
         */
        function onItemClick(event) {
            const currAppState = appStateRef.current;
            if (currAppState.dataVizExtn && currAppState.dbId2DeviceIdMap) {
                setSelectedDevice(currAppState.dbId2DeviceIdMap[event.dbId]);
            }
        }

        /**
         * Called when a user hovers over a device in the scene.
         * 
         * @param {MouseEvent} event 
         * @private
         */
        async function onItemHovering(event) {
            const currAppState = appStateRef.current;
            if (event.hovering && currAppState.dbId2DeviceIdMap) {
                const deviceId = currAppState.dbId2DeviceIdMap[event.dbId];
                const device = currAppState.session.dataStore.getDevice(deviceId);

                if (device) {
                    const position = device.position;
                    const mappedPosition = currAppState.viewer.impl.worldToClient(position);

                    // Accounting for vertical offset of viewer container.
                    const vertificalOffset = event.originalEvent.clientY - event.originalEvent.offsetY;

                    setHoveredDeviceInfo({
                        id: deviceId,
                        xcoord: mappedPosition.x,
                        ycoord: mappedPosition.y + vertificalOffset - SpriteSize / viewer.getWindow().devicePixelRatio,
                    });
                }
            } else {
                if (hoveredDeviceInfoRef.current && hoveredDeviceInfoRef.current.id != null) {
                    setHoveredDeviceInfo({});
                }
            }
        }

        // Need to convert the deviceList to viewable data
        await generateViewables(session, masterDataView);

        const DATAVIZEXT = Autodesk.DataVisualization;
        viewer.addEventListener(DATAVIZEXT.MOUSE_CLICK, onItemClick);
        viewer.addEventListener(DATAVIZEXT.MOUSE_HOVERING, onItemHovering);
        activeListenersRef.current[DATAVIZEXT.MOUSE_CLICK] = onItemClick;
        activeListenersRef.current[DATAVIZEXT.MOUSE_HOVERING] = onItemHovering;

        //Initialize websocket
        /**
         * 
         * @param {Session} session {@link Session} object 
         * initialized from the {@link Autodesk.Hyperion.UI.ReferenceApp#initializeDataStore} 
         * @private
         */
        async function createWebsocket(session) {
            const dataStore = session.dataStore;
            console.log("Starting websocket");
            let socket = new io({
                path: "/api/socket",
            });
            socket.on("connect", () => {
                console.log("Socket open.");
            });
            socket.on("iot-data", (message) => {
                let events = JSON.parse(message);
                for (let e of events) {
                    let deviceId = e["DeviceId"];
                    for (const [key, value] of Object.entries(e)) {
                        if (key === "timeStamp" || key === "DeviceId") continue;
                        //Outside of timeStamp and DeviceId all other keys are properties
                        dataStore.updateCurrentPropertyValue(deviceId, key, value);
                    }
                }
            });
            socket.on("disconnect", () => {
                console.log("Socket Disconnection");
            });
        }
        createWebsocket(session);
    }

    /**
     * Called when by {@link Autodesk.Hyperion.UI.Viewer} when Forge Viewer has been initialized.
     * 
     * @param {Autodesk.Viewing.GuiViewer3D} viewer Instance of Forge Viewer
     * @callback
     */
    function onViewerInitialized(viewer) {
        if (lmvViewerRef.current) {
            throw new Error("Viewer has been recreated");
        }

        lmvViewerRef.current = viewer;
    }

    /**
     * Handles changes on the time slider. The start date and/or end date can
     * be modified by user inputs interactively. This function will be called
     * when such changes happen.
     * @param {Date} startTime The start time for device data fetch call
     * @param {Date} endTime The end time for device data fetch call
     * @param {Date} currentTime The current time at which the TimeMarker is
     * @alias Autodesk.Hyperion.UI.ReferenceApp.#handleTimeRangeUpdated
     */
    function handleTimeRangeUpdated(startTime, endTime, currentTime) {
        const currAppState = appStateRef.current;
        if (currAppState && currAppState.masterDataView) {
            setTimeWindow(startTime, endTime, currAppState.masterDataView);

            // Update component time option state.
            const options = Object.assign({}, timeOptionRef.current);
            options.startTime = startTime;
            options.endTime = endTime;
            options.currentTime = currentTime ? currentTime : startTime;
            setTimeOptions(options);
            setcurrentDeviceData({});
            setchartData({});
        }
    }

    /**
     * Handles changes of the time slider's time marker. The time marker can be
     * changed interactively by the user when it is dragged within the time window,
     * or during a playback mode of the time slider.
     * @param {Date} currentTime The current time at which the time marker is.
     * @alias Autodesk.Hyperion.UI.ReferenceApp.#handleCurrTimeUpdated
     */
    function handleCurrTimeUpdated(currentTime) {
        const options = Object.assign({}, timeOptionRef.current);
        options.currentTime = currentTime;
        setTimeOptions(options);
        setcurrentDeviceData({})
        setchartData({});
    }

    /**
     * Called when a device has been selected. Uses the Data Visualization Extension to highlight node.
     * 
     * @param {MouseEvent} event Click event indicating that a row in {@link Autodesk.Hyperion.UI.DeviceTree} has been selected.
     * @param {string} node Device identifier
     */
    async function onNodeSelected(event, node) {
        /** @type {string} */
        const deviceId = node;

        // Only attempt select if device IDs have been established.
        if (appState.deviceId2DbIdMap && appState.deviceId2DbIdMap[deviceId]) {
            appState.dataVizExtn.highlightViewables([appState.deviceId2DbIdMap[deviceId]]);
            setSelectedDevice(deviceId);
        } else {
            setSelectedDevice("");
        }
    }

    /**
     * Clears selected device from the scene and from the {@link Autodesk.Hyperion.UI.DevicePanel}.
     */
    function navigateBackToDevices() {
        setSelectedDevice("");
        appState.dataVizExtn.clearHighlightedViewables();
    }

    /**
     * Gets the device property value given the current time marker.
     *
     * @param {Autodesk.DataVisualization.SurfaceShadingPoint} surfaceShadingPoint A point that
     * &nbsp;contributes to the heatmap generally generated from a {@link Autodesk.DataVisualization.Device} object.
     * &nbsp;This is generally created from a call to {@link ModelSurfaceInfo#generateSurfaceShadingData}
     * @param {string} sensorType The device property for which normalized
     * &nbsp;property value is to be retrieved.
     * @returns {number} The property value of the device at the time given in
     * &nbsp;timeOptions.currentTime field.
     * @alias Autodesk.Hyperion.UI.ReferenceApp#getSensorValue
     */
    function getSensorValue(surfaceShadingPoint, sensorType) {
        const currAppState = appStateRef.current;
        const options = timeOptionRef.current;

        if (currAppState && options) {
            const deviceId = surfaceShadingPoint.id;

            /** @type {DataView} */
            const dataView = currAppState.masterDataView;

            /** @type {Map.<string, DeviceProperty>} */
            const properties = currAppState.propertyMap

            // Get the aggregated value for the selected property.
            const prop = properties.get(sensorType);
            if (prop) {
                const ct = getTimeInEpochSeconds(options.currentTime);
                const av = dataView.getAggregatedValues(deviceId, prop.id);

                if (av) {
                    // Given the current time, find the closest from time stamp array.
                    const value = getClosestValue(av, ct);
                    // Compute the normalized sensor value from the data range.
                    const range = av.getDataRange("avgValues");
                    let normalized = (value - range.min) / (range.max - range.min);

                    normalized = clamp(normalized, 0, 1);
                    return normalized;
                }
            }
        }

        return 0;
    }

    /**
     * Uses the application based on user changes to the {@link Autodesk.Hyperion.UI.SurfaceShader} component.
     * 
     * @param {Object} options Settings defined in the {@link Autodesk.Hyperion.UI.SurfaceShader}.
     */
    function onHeatmapOptionChange(options) {
        setHeatmapOptions(options);
        const currAppState = appStateRef.current;

        // Update timeOptions with new resolution value if applicable.
        if (options.resolutionValue != timeOptionRef.current.resolutionValue) {
            var newTimeOptions = Object.assign({}, timeOptionRef.current);
            newTimeOptions.resolution = options.resolutionValue;

            setTimeWindow(
                newTimeOptions.startTime,
                newTimeOptions.endTime,
                currAppState.masterDataView,
                newTimeOptions.resolution
            );
            setTimeOptions(newTimeOptions);
            setchartData({});
        }

        if (selectedFloorNode && currAppState) {
            const { dataVizExtn } = currAppState;
            if (options.showHeatMap) {
                const selectedProperty = options.selectedPropertyId;
                dataVizExtn.renderSurfaceShading(selectedFloorNode.name, selectedProperty, getSensorValue);
            } else {
                dataVizExtn.removeSurfaceShading();
            }
        }
    }

    /**
     * Called when a user has changed the floor in the scene using the {@link Autodesk.Hyperion.UI.HyperionToolContainer} 
     * or the {@link Autodesk.Hyperion.UI.DeviceTree}
     * 
     * @param {Object} node Represents floor object to show in scene
     */
    function onSelectedFloorChange(node) {
        setSelectedFloorNode(node);

        const currAppState = appStateRef.current;
        const { dataVizExtn, levelsExt } = currAppState;
        const floorSelector = levelsExt.floorSelector;

        if (!node) {
            floorSelector.selectFloor();
            dataVizExtn.removeSurfaceShading();

            // Set resolution back to 1 hour.
            if (timeOptionRef.current.resolution != "PT1H") {
                var newHeatmapOptions = heatmapOptions;
                newHeatmapOptions.resolutionValue = "PT1H";
                setHeatmapOptions(newHeatmapOptions);

                var newTimeOptions = Object.assign({}, timeOptionRef.current);
                newTimeOptions.resolution = "PT1H";
                setTimeWindow(
                    newTimeOptions.startTime,
                    newTimeOptions.endTime,
                    currAppState.masterDataView,
                    newTimeOptions.resolution
                );
                setTimeOptions(newTimeOptions);
            }
        } else {
            floorSelector.selectFloor(node.index, true);
            if (heatmapOptions.showHeatMap) {
                const selectedProperty = heatmapOptions.selectedPropertyId;
                dataVizExtn.renderSurfaceShading(node.name, selectedProperty, getSensorValue);
            }
        }
    }

    /**
     * Gets the selected property's range min, max and dataUnit value.
     * 
     * @param {string} propertyId String identifier of a device property.
     * @returns {Object} The rangeMin, rangeMax and dataUnit for the selected propertyId
     */
    function getPropertyRanges(propertyId) {
        const currAppState = appStateRef.current;


        if (propertyId !== "None") {
            let dataUnit = "";
            let rangeMin = Infinity;
            let rangeMax = -Infinity;

            /** @type {Map.<string,DeviceProperty>} */
            const propertyMap = currAppState.propertyMap

            //Get the property data from the device model
            let deviceProperty = propertyMap.get(propertyId);

            if (deviceProperty) {
                dataUnit = deviceProperty.dataUnit;
                dataUnit = dataUnit.toLowerCase() === "celsius" ? "°C" : dataUnit;
                dataUnit = dataUnit.toLowerCase() === "fahrenheit" ? "°F" : dataUnit;
                rangeMin = Math.min(rangeMin, deviceProperty.rangeMin); // will be NaN if deviceProperty.rangeMin == undefined or NaN
                rangeMax = Math.max(rangeMax, deviceProperty.rangeMax); // will be NaN if deviceProperty.rangeMax == undefined or NaN
            }

            // Check if the property min and max range is available in the device model, else notify user
            if (isNaN(rangeMin) || isNaN(rangeMax)) {
                console.warn(
                    "RangeMin and RangeMax for " +
                    propertyId +
                    " not specified. \
                 Please update these values in the device model"
                );
                rangeMin = 0;
                rangeMax = 100;
                dataUnit = "%";
            }
            return { rangeMin, rangeMax, dataUnit }
        }
    }

    const currAppState = appStateRef.current;
    if (selectedFloorNode && currAppState) {
        const { dataVizExtn } = currAppState;
        if (heatmapOptions.showHeatMap) {
            dataVizExtn.updateSurfaceShading(getSensorValue);
        }
    }

    /**
     * Returns all devices given the name of a floor. [] if no devices found.
     * 
     * @param {string} selectedFloor floor name
     * @returns {Array.<DeviceTreeNode>} All devices (if any) on selectedFloor.
     */
    function getDevicesOnFloor(selectedFloor) {
        const deviceTreeFloor = deviceTree.filter(floor => floor.id == selectedFloor.name)
        return deviceTreeFloor.length == 1 ? deviceTreeFloor[0].children : []
    }

    /**
     * Given a list of deviceToQuery, checks masterDataView for relevant data. If not found, triggers a fetch and updates currentDeviceData when complete.
     * 
     * @param {*} devicesToQuery List of {@link DeviceTreeNode} to fetch device data for.
     */
    function getDeviceData(devicesToQuery) {
        let currAppState = appStateRef.current;
        /** @type {CurrentDeviceData} */
        let data = {}
        let propertyMap = currAppState.propertyMap

        devicesToQuery.forEach(device => {
            if (!currentDeviceData[device.id]) {
                device.propIds.forEach(property => {
                    let av = currAppState.masterDataView.getAggregatedValues(device.id, property)
                    if (av) {
                        let options = timeOptionRef.current;
                        const ct = getTimeInEpochSeconds(options.currentTime);
                        let val = getClosestValue(av, ct);

                        Object.assign(data, currentDeviceData);

                        if (!data[device.id]) {
                            data[device.id] = {}
                        }
                        let deviceProperty = propertyMap.get(property);
                        let dataUnit = deviceProperty ? deviceProperty.dataUnit : '%';
                        data[device.id][property] = `${val.toFixed(2)} ${dataUnit}`;
                    }
                })
            }
        })
        if (Object.keys(data).length) setcurrentDeviceData(data);
    }

    /**
     * Fetches and populates chartData for all devices in devicesToQuery that haven't already been fetched.
     * 
     * @param {Array.<DeviceTreeNode>} devicesToQuery List of {@link DeviceTreeNode} to retrieve chart data for.
     */
    function getChartData(devicesToQuery) {
        let currAppState = appStateRef.current;
        /**@type {ChartData} */
        let data = {}
        let propertyMap = currAppState.propertyMap

        devicesToQuery.forEach(device => {
            if (!chartData[device.id]) {
                device.propIds.forEach(property => {
                    let av = currAppState.masterDataView.getAggregatedValues(device.id, property)
                    if (av) {
                        const { min, max } = getPaddedRange(av.avgValues, 10.0);
                        Object.assign(data, chartData);

                        if (!data[device.id]) {
                            data[device.id] = {
                                name: device.name,
                                properties: {}
                            }
                        }

                        const seriesData = [];
                        av.tsValues.forEach((tsValue, index) => {
                            seriesData.push({
                                value: [tsValue * 1000, av.avgValues[index]],
                                label: {},
                            });
                        });
                        let deviceProperty = propertyMap.get(property);
                        let dataUnit = deviceProperty ? deviceProperty.dataUnit : '%';
                        data[device.id]["properties"][property] = {
                            dataUnit: dataUnit,
                            seriesData: seriesData,
                            yAxis: {
                                dataMin: min,
                                dataMax: max
                            }
                        }
                    }
                })
            }
        })
        if (Object.keys(data).length) setchartData(data);
    }

    if (selectedFloorNode) {
        let devicesToQuery = getDevicesOnFloor(selectedFloorNode);
        getDeviceData(devicesToQuery);
        getChartData(devicesToQuery);
    }
    else if (selectedFloorNode === null) { // Viewing entire building, need to query all devices.
        let devicesToQuery = [];
        deviceTree.forEach(floor => {
            devicesToQuery.push.apply(devicesToQuery, floor.children);
        })
        getChartData(devicesToQuery);
        getDeviceData(devicesToQuery);
    }

    /**
    * Handle QueryCompleted event originating from the DataView object. Informs this component about the completion of a particular data fetch.
    * 
    * @param {QueryCompletedEventArgs} eventArgs The arguments for which the {@link DataView} was queried.
    */
    function handleQueryCompleted(eventArgs) {
        // The following hook causes ReferenceApp to repaint every time a device
        // fetch is completed. E.g. if the time slider is adjusted, and 10 devices
        // are being queried for their data (in bulk), then the following will 
        // trigger 10 renders. This should not be a concern as React will only ever
        // update the relevant DOM sub-tree that actually changes.
        const query = eventArgs.query;
        setDataContext(`${query.dateTimeSpan.hashCode}-${query.deviceId}`);
    };

    useEffect(() => {
        if (currAppState.masterDataView) {
            currAppState.masterDataView.addEventListener(EventType.QueryCompleted, handleQueryCompleted);
            return () => {
                currAppState.masterDataView.removeEventListener(EventType.QueryCompleted, handleQueryCompleted);
            };
        }
    }, [currAppState.masterDataView]);

    return (
        <React.Fragment>
            <div id="main_header" style={{ display: "flex", backgroundColor: "#474747" }}>
                <ChronosTimeSlider
                    rangeStart={startRange.toISOString()}
                    rangeEnd={endRange.toISOString()}
                    {...timeOptions}
                    onTimeRangeUpdated={handleTimeRangeUpdated}
                    onCurrTimeUpdated={handleCurrTimeUpdated}
                />
                <BasicDatePicker
                    {...timeOptions}
                    dataVizExtn={appStateRef.current.dataVizExtn}
                    onRangeChange={handleTimeRangeUpdated}
                />
            </div>
            <CustomToolTip
                hoveredDeviceInfo={hoveredDeviceInfo}
                chartData={chartData}
                currentDeviceData={currentDeviceData}
            />
            
            <div className="viewer-container">
                <Viewer
                    env={env}
                    docUrn={docUrn}
                    api={api}
                    onViewerInitialized={onViewerInitialized}
                    onModelLoaded={onModelLoaded}
                    getToken={getToken}
                />
            </div>
            <HyperionToolContainer {...appStateRef.current}
                updateSelectedFloor={onSelectedFloorChange}
                selectedFloorNodeIndex={selectedFloorNode ? selectedFloorNode.index.toString() : ""}
            />
            {selectedFloorNode && (
                <HeatmapOptions
                    {...heatmapOptions}
                    propIdGradientMap={PropIdGradientMap}
                    sensorValueHandler={getSensorValue}
                    onHeatmapOptionChange={onHeatmapOptionChange}
                    getPropertyRanges={getPropertyRanges}
                    deviceModelProperties={appStateRef.current.propertyMap}
                    totalMarkers={4}
                />
            )}
            <DataPanelContainer
                {...appStateRef.current}
                selectedDevice={selectedDevice}
                selectedPropertyId={heatmapOptions.selectedPropertyId}
                devices={deviceTree}
                onNodeSelected={onNodeSelected}
                onNavigateBack={navigateBackToDevices}
                propertyIconMap={{
                    Temperature: `${ApplicationContext.assetUrlPrefix}/images/temperature_property.svg`,
                    Humidity: `${ApplicationContext.assetUrlPrefix}/images/humidity_property.svg`,
                    "CO₂": `${ApplicationContext.assetUrlPrefix}/images/co2_property.svg`,
                }}
                selectedFloorNode={selectedFloorNode}
                currentDeviceData={currentDeviceData}
                chartData={chartData}
                updateSelectedFloor={onSelectedFloorChange}
            />
            <img
                className="logo"
                src={`${ApplicationContext.assetUrlPrefix}/images/autodesk-logo.svg`}
                style={{ width: "9%", bottom: "22px", position: "absolute", zIndex: 2, left: "15px", opacity: 0.85 }}
            ></img>
        </React.Fragment>
    );
}

module.exports = ReferenceApp;
