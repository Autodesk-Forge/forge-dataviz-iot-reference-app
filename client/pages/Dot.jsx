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
        position: {
            x: -12.590268290876452,
            y: -50.20446526068116,
            z: 14.355262787057484,
        },
        type: "combo",
        sensorTypes: ["co2", "temperature"],
    },
    {
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
 * An example illustrating how to add viewables to the scene.
 * @component
 * @param {Object} props
 */
function Dot(props) {
    const { env, token, docUrn } = props.appData;

    async function onModelLoaded(viewer) {
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

        function onItemClick(event) {
            viewer.select([event.dbId], dataVizExt.sceneModel);
        }

        function onItemHovering(event) {
            console.log("Show tooltip here", event.dbId);
        }

        const DATAVIZEXTN = Autodesk.DataVisualization;
        viewer.addEventListener(DATAVIZEXTN.MOUSE_CLICK, onItemClick);
        viewer.addEventListener(DATAVIZEXTN.MOUSE_HOVERING, onItemHovering);
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

module.exports = Dot;
