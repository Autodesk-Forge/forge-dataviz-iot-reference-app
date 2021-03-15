
import React, { useEffect, useRef, useState } from "react";
import { BaseApp } from "forge-dataviz-iot-react-components";
import DataHelper from "./DataHelper";
import { EventTypes } from "forge-dataviz-iot-react-components";

const RAW_DATA = [
    {
        id: "engine1",
        dbIds: [558, 560, 562, 563, 583, 705, 571],
        sensors: [
            {
                id: "sensor-1",
                dbId: 558,
                type: "Temperature",
                sensorTypes: ["Temperature"],
                styleId: "fusion",
            },
            {
                id: "sensor-2",
                dbId: 560,
                type: "Temperature",
                sensorTypes: ["Temperature"],
                styleId: "single",
            },
            {
                id: "sensor-3",
                dbId: 562,
                type: "Temperature",
                sensorTypes: ["Temperature"],
            },
            {
                id: "sensor-4",
                dbId: 583,
                type: "Temperature",
                sensorTypes: ["Temperature"],
            },
            {
                id: "sensor1e",
                dbId: 705,
                type: "Temperature",
                sensorTypes: ["Temperature"],
            },
            {
                id: "sensor-5",
                dbId: 571,
                type: "Temperature",
                sensorTypes: ["Temperature"],
            },
        ],
    },
    {
        id: "engine2",
        dbIds: [968, 970, 972, 973, 981, 992, 993],
        sensors: [
            {
                id: "sensor-6",
                dbId: 968,
                type: "Temperature",
                sensorTypes: ["Temperature"],
            },
        ],
    },
    {
        id: "group1",
        children: [
            {
                id: "engine3",
                dbIds: [211, 214, 221, 222, 224, 237, 239],
                sensors: [
                    {
                        id: "sensor-7",
                        dbId: 224,
                        type: "Temperature",
                        sensorTypes: ["Temperature"],
                    },
                ],
            },
            {
                id: "engine4",
                dbIds: [255, 258, 265, 266, 268, 281, 283],
                sensors: [
                    {
                        id: "sensor-8",
                        dbId: 268,
                        type: "Temperature",
                        sensorTypes: ["Temperature"],
                    },
                ],
            },
            {
                id: "engine5",
                dbIds: [455, 1060, 1062, 1064, 1065],
                sensors: [
                    {
                        id: "sensor-9",
                        dbId: 455,
                        type: "Temperature",
                        sensorTypes: ["Temperature"],
                    },
                    {
                        id: "sensor-10",
                        dbId: 1060,
                        type: "Temperature",
                        sensorTypes: ["Temperature"],
                    },
                ],
            },
        ],
    },
];

class EventBus { }

THREE.EventDispatcher.prototype.apply(EventBus.prototype);

function EngineSimulation(props) {
    const eventBusRef = useRef(new EventBus());
    const [data, setData] = useState(null);

    const dataRef = useRef();
    const viewerRef = useRef(null);

    props.appData.docUrn = "urn:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6Zm9yZ2V0X2h5cGVyaW9uX3Rlc3QvRW5naW5lX1N0YW5kLmR3Zg";
    props.appData.adapterType = "synthetic";

    useEffect(() => {
        eventBusRef.current.addEventListener(EventTypes.MODEL_LOAD_COMPLETED, async function (event) {
            viewerRef.current = event.data.viewer;
            let viewer = viewerRef.current;

            let model = event.data.data.model;
            let dataHelper = new DataHelper();

            let shadingData = await dataHelper.createShadingData(viewer, model, RAW_DATA);
            let devicePanelData = dataHelper.createDeviceTree(shadingData, true);

            dataRef.current = {
                shadingData,
                devicePanelData,
            };
            setData(dataRef.current);

            return function cleanUp() {
                eventBusRef.current._listeners = {};
            };
        });
    }, []);

    return (
        <React.Fragment>
            <BaseApp {...props} eventBus={eventBusRef.current} data={data} />
        </React.Fragment>
    );
}

module.exports = EngineSimulation;
