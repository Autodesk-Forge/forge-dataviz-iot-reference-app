/**
 * This is a sample code to show how to render basic heatmap on the screen
 *
 * Heatmap is the terminology we used to show the corresponding sensor values in the room
 * and this is a step foreward by combine both Dot and ModelStructureInfo to created a combined
 * user experience
 */

import React from "react";
import { Viewer } from "forge-dataviz-iot-react-components";
import ApplicationContext from "../../shared/config/ApplicationContext.js";

const SensorStyleDefinitions = {
    co2: {
        url: `${ApplicationContext.assetUrlPrefix}/images/co2.svg`,
        color: 0xffffff,
    },
    temperature: {
        url: `${ApplicationContext.assetUrlPrefix}/images/thermometer.svg`,
        color: 0xffffff,
    },
    default: {
        url: `${ApplicationContext.assetUrlPrefix}/images/circle.svg`,
        color: 0xffffff,
    },
};

const simulationData = [
    {
        id: "engine1",
        dbIds: [558, 560, 562, 563, 583, 705, 571],
        sensors: [
            {
                id: "sensor1a",
                dbId: 558,
                type: "temperature",
                sensorTypes: ["temperature"],
            },
            {
                id: "sensor1b",
                dbId: 560,
                type: "temperature",
                sensorTypes: ["temperature"],
            },
            {
                id: "sensor1c",
                dbId: 562,
                type: "temperature",
                sensorTypes: ["temperature"],
            },
            {
                id: "sensor1d",
                dbId: 583,
                type: "temperature",
                sensorTypes: ["temperature"],
            },
            {
                id: "sensor1e",
                dbId: 705,
                type: "temperature",
                sensorTypes: ["temperature"],
            },
            {
                id: "sensor1e",
                dbId: 571,
                type: "temperature",
                sensorTypes: ["temperature"],
            },
        ],
    },
    {
        id: "engine2",
        dbIds: [968, 970, 972, 973, 981, 992, 993],
        sensors: [
            {
                id: "sensor2",
                dbId: 968,
                type: "temperature",
                sensorTypes: ["temperature"],
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
                        id: "sensor3",
                        dbId: 224,
                        type: "temperature",
                        sensorTypes: ["temperature"],
                    },
                ],
            },
            {
                id: "engine4",
                dbIds: [255, 258, 265, 266, 268, 281, 283],
                sensors: [
                    {
                        id: "sensor4",
                        dbId: 268,
                        type: "temperature",
                        sensorTypes: ["temperature"],
                    },
                ],
            },
            {
                id: "engine5",
                dbIds: [455, 1060, 1062, 1064, 1065],
                sensors: [
                    {
                        id: "sensor5a",
                        dbId: 455,
                        type: "temperature",
                        sensorTypes: ["temperature"],
                    },
                    {
                        id: "sensor5b",
                        dbId: 1060,
                        type: "temperature",
                        sensorTypes: ["temperature"],
                    },
                ],
            },
        ],
    },
];

/**
 * @component
 * @param {Object} props
 */
function EngineSimulation(props) {
    const { env, token } = props.appData;
    const docUrn = "urn:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6Zm9yZ2V0X2h5cGVyaW9uX3Rlc3QvRW5naW5lX1N0YW5kLmR3Zg";

    async function onModelLoaded(viewer, data) {
        const dataVizExt = await viewer.loadExtension("Autodesk.DataVisualization", { useInternal: true });
        const {
            SurfaceShadingData,
            SurfaceShadingPoint,
            SurfaceShadingNode,
            SurfaceShadingGroup,
        } = Autodesk.DataVisualization;
        var styleMap = {};

        // Create model-to-style map from style definitions.
        Object.entries(SensorStyleDefinitions).forEach(([type, styleDef]) => {
            styleMap[type] = new Autodesk.DataVisualization.ViewableStyle(
                type,
                Autodesk.DataVisualization.ViewableType.SPRITE,
                new THREE.Color(styleDef.color),
                styleDef.url
            );
        });

        const viewableData = new Autodesk.DataVisualization.ViewableData();
        viewableData.spriteSize = 16;
        let startId = 1;

        let devices = [];
        let heatmapData = new SurfaceShadingData();

        function createNode(item) {
            let node = new SurfaceShadingNode(item.id, item.dbIds);

            item.sensors.forEach((sensor) => {
                let shadingPoint = new SurfaceShadingPoint(sensor.id, sensor.position, sensor.sensorTypes);

                // If the position is not specified, derive it from the center of Geometry
                if (sensor.dbId != undefined && sensor.position == null) {
                    shadingPoint.positionFromDBId(data.model, sensor.dbId);
                }
                devices.push({
                    id: sensor.id,
                    position: shadingPoint.position,
                    type: sensor.type,
                });
                node.addPoint(shadingPoint);
            });

            return node;
        }

        function createGroup(item) {
            let group = new SurfaceShadingGroup(item.id);

            item.children.forEach((child) => {
                if (child.children) {
                    group.addChild(createGroup(child));
                } else {
                    group.addChild(createNode(child));
                }
            });
            return group;
        }

        simulationData.forEach((item) => {
            if (item.children) {
                heatmapData.addChild(createGroup(item));
            } else {
                heatmapData.addChild(createNode(item));
            }
        });

        devices.forEach((device) => {
            let style = styleMap[device.type] || styleMap["default"];
            const viewable = new Autodesk.DataVisualization.SpriteViewable(device.position, style, startId);
            viewableData.addViewable(viewable);
            startId++;
        });
        await viewableData.finish();
        dataVizExt.addViewables(viewableData);

        // get FloorInfo
        heatmapData.initialize(data.model);
        dataVizExt.setupSurfaceShading(data.model, heatmapData);

        dataVizExt.registerSurfaceShadingColors("co2", [0x000000, 0xff00ff]);
        dataVizExt.registerSurfaceShadingColors("temperature", [0x000000, 0xff0000]);

        /**
         * Interface for application to decide what is the current value for the heatmap
         * @param {string} device device id
         * @param {string} sensorType sensor type
         */
        function getSensorValue(device, sensorType) {
            // just try to avoid line warning
            device, sensorType;

            if (/sensor1[a-z]/gi.test(device.id)) {
                return 1;
            }

            let value = Math.random();
            return value;
        }

        dataVizExt.renderSurfaceShading(["engine1", "engine2"], "temperature", getSensorValue, 300);
        window.dataVizExt = dataVizExt;
    }

    return (
        <React.Fragment>
            <Viewer
                env={env}
                docUrn={docUrn}
                onModelLoaded={onModelLoaded}
                getToken={async () => await fetch("/api/token").then(res => res.json()).then(data => data.access_token)}
            />
        </React.Fragment>
    );
}

module.exports = EngineSimulation;
