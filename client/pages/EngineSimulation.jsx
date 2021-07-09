/**
 * This sample illustrates how to add a heatmap to groups of dbIds.
 */

import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
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

class EventBus {}

THREE.EventDispatcher.prototype.apply(EventBus.prototype);

/**
 * An example illustrating how to render a heatmap using groups of dbIds. Can be viewed at https://hyperion.autodesk.io/engine
 * @component
 * @param {Object} props
 * @param {Object} props.appData Data passed to the EngineSimulation.
 * @param {("AutodeskStaging"|"AutodeskProduction")} props.appData.env Forge API environment
 * @param {string} props.appData.docUrn Document URN of model
 * @param {string} props.appData.adapterType Corresponds to Data Adapter used to query data. i.e - synthetic, azure etc.
 * @param {"derivativeV2"|"derivativeV2_EU"|"modelDerivativeV2"|"fluent"|"D3S"|"D3S_EU"} [props.appData.api] Please refer to LMV documentation for more information.
 * @param {Object} props.appContext Contains base urls used to query assets, LMV, data etc.
 * @param {string} [props.appContext.dataUrl] The base url used to configure a specific {@link DataAdapter}
 * @param {number|undefined} geomIndex Index of geometry to be shown. Forwarded via URL params.
 * @memberof Autodesk.DataVisualization.Examples
 */
function EngineSimulation(props) {
    const eventBusRef = useRef(new EventBus());
    const [data, setData] = useState(null);

    const dataRef = useRef();
    const viewerRef = useRef(null);

    const queryParams = new URLSearchParams(useLocation().search);
    const geomIndex = queryParams.get("geometryIndex")
        ? parseInt(queryParams.get("geometryIndex"))
        : undefined;

    props.appData.docUrn =
        "urn:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6Zm9yZ2V0X2h5cGVyaW9uX3Rlc3QvRW5naW5lX1N0YW5kLmR3Zg";
    props.appData.adapterType = "synthetic";

    useEffect(() => {
        eventBusRef.current.addEventListener(EventTypes.MODEL_LOAD_COMPLETED, async function (
            event
        ) {
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
        });
    }, []);

    return (
        <React.Fragment>
            <BaseApp {...props} eventBus={eventBusRef.current} data={data} geomIndex={geomIndex} />
        </React.Fragment>
    );
}

export default EngineSimulation;
