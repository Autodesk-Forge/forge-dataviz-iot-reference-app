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

const devices = [
    {
        id: "sensor1",
        position: {
            x: -12.590268290876452,
            y: -50.20446526068116,
            z: 14.355262787057484,
        },
        type: "combo",
        sensorTypes: ["co2", "temperature"],
    },
    {
        id: "sensor2",
        position: {
            x: -97.94954550038506,
            y: -50.21776820050724,
            z: 12.444056161946492,
        },
        type: "temperature",
        sensorTypes: ["temperature"],
    },
];

/**
 * @component Sample heatmap code
 * @param {Object} props
 */
function Heatmap(props) {
    const { env, token, docUrn } = props.appData;

    async function onModelLoaded(viewer, data) {
        const dataVizExt = await viewer.loadExtension("Autodesk.DataVisualization", { useInternal: true });
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

        devices.forEach((device) => {
            let style = styleMap[device.type] || styleMap["default"];
            const viewable = new Autodesk.DataVisualization.SpriteViewable(device.position, style, startId);
            viewableData.addViewable(viewable);
            startId++;
        });
        await viewableData.finish();
        dataVizExt.addViewables(viewableData);

        // Model Structure Info
        let viewerDocument = data.model.getDocumentNode().getDocument();
        const aecModelData = await viewerDocument.downloadAecModelData();
        let levelsExt;
        if (aecModelData) {
            levelsExt = await viewer.loadExtension("Autodesk.AEC.LevelsExtension", {
                doNotCreateUI: true,
            });
        }

        // get FloorInfo
        const floorData = levelsExt.floorSelector.floorData;
        const floor = floorData[2];
        levelsExt.floorSelector.selectFloor(floor.index, true);

        const structureInfo = new Autodesk.DataVisualization.ModelStructureInfo(data.model);
        const heatmapData = await structureInfo.generateSurfaceShadingData(devices);

        dataVizExt.setupSurfaceShading(data.model, heatmapData);

        dataVizExt.registerSurfaceShadingColors("co2", [0x00ff00, 0xff0000]);
        dataVizExt.registerSurfaceShadingColors("temperature", [0xff0000, 0x0000ff]);

        /**
         * Interface for application to decide what is the current value for the heatmap
         * @param {string} device device id
         * @param {string} sensorType sensor type
         */
        function getSensorValue(device, sensorType) {
            // just try to avoid line warning
            device, sensorType;
            let value = Math.random();
            return value;
        }

        dataVizExt.renderSurfaceShading(floor.name, "temperature", getSensorValue);
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

module.exports = Heatmap;
