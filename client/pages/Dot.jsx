/**
 * This sample illustrates how to add Sprite Viewables.
 */

import React from "react";
import { Viewer } from "forge-dataviz-iot-react-components";

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
 * An example illustrating how to add viewables to the scene. Can be viewed at: https://hyperion.autodesk.io/dot
 *
 * @component
 * @memberof Autodesk.DataVisualization.Examples
 * @param {Object} props
 * @param {Object} props.appData Data passed to the Dot Page.
 * @param {("AutodeskStaging"|"AutodeskProduction")} props.appData.env Forge API environment
 * @param {string} props.appData.docUrn Document URN of model
 * @param {Object} props.appContext Contains base urls used to query assets, LMV, data etc.
 * @param {string} [props.appContext.assetUrlPrefix] The url used to query assets
 */
function Dot(props) {
    const { env, docUrn } = props.appData;
    const ApplicationContext = props.appContext;

    /**
     * @type {SensorStyleDefinitions}
     */
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

    /**
     * Handles `Autodesk.Viewing.GEOMETRY_LOADED_EVENT` event that is sent when a model has been completely loaded in the viewer.
     *
     * @param {Autodesk.Viewing.GuiViewer3D} viewer The viewer in which the model is loaded.
     */
    async function onModelLoaded(viewer) {
        const dataVizExt = viewer.getExtension("Autodesk.DataVisualization");
        const DATAVIZEXTN = Autodesk.DataVisualization.Core;
        var styleMap = {};

        // Create model-to-style map from style definitions.
        Object.entries(SensorStyleDefinitions).forEach(([type, styleDef]) => {
            styleMap[type] = new DATAVIZEXTN.ViewableStyle(
                DATAVIZEXTN.ViewableType.SPRITE,
                new THREE.Color(styleDef.color),
                styleDef.url
            );
        });

        const viewableData = new DATAVIZEXTN.ViewableData();
        viewableData.spriteSize = 16;
        let startId = 1;

        devices.forEach((device) => {
            let style = styleMap[device.type] || styleMap["default"];
            const viewable = new DATAVIZEXTN.SpriteViewable(device.position, style, startId);
            viewableData.addViewable(viewable);
            startId++;
        });
        await viewableData.finish();
        dataVizExt.addViewables(viewableData);

        /**
         * Called when a user clicks on a Sprite Viewable
         * @param {Event} event
         */
        function onItemClick(/* event */) {}

        /**
         *  Called when a user hovers over a Sprite Viewable
         * @param {Event} event
         */
        function onItemHovering(event) {
            console.log("Show tooltip here", event.dbId);
        }

        const DataVizCore = Autodesk.DataVisualization.Core;
        viewer.addEventListener(DataVizCore.MOUSE_CLICK, onItemClick);
        viewer.addEventListener(DataVizCore.MOUSE_HOVERING, onItemHovering);
    }

    return (
        <React.Fragment>
            <Viewer
                env={env}
                docUrn={docUrn}
                onModelLoaded={onModelLoaded}
                extensions={{ "Autodesk.DataVisualization": {} }}
                getToken={async () =>
                    await fetch("/api/token")
                        .then((res) => res.json())
                        .then((data) => data.access_token)
                }
            />
        </React.Fragment>
    );
}

export default Dot;
