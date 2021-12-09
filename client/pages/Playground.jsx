/**
 * This is a sample code to show how to use the getSelectedPoints() API to get a list of JSON objects representing {@link RoomDevice}.
 *
 * The resulting list can be used to add sprite viewables to the model.
 */

import React, { useState, useEffect, useRef } from "react";
import { Viewer } from "forge-dataviz-iot-react-components";
import DataHelper from "./DataHelper";
import { EventTypes } from "forge-dataviz-iot-react-components";
import { HyperionToolContainer } from "forge-dataviz-iot-react-components";
import { SelectionTool } from "forge-dataviz-iot-react-components";

class EventBus {}

THREE.EventDispatcher.prototype.apply(EventBus.prototype);

/**
 * An example illustrating how to use the {@link SelectionTool} to get a list of JSON objects representing {@link RoomDevice}.
 * Can be viewed at: https://hyperion.autodesk.io/playground
 *
 * @component
 * @param {Object} props
 * @param {Object} props.appData Data passed to application.
 * @param {("AutodeskStaging"|"AutodeskProduction")} props.appData.env Forge API environment
 * @param {string} props.appData.docUrn Document URN of model
 * @param {Object} props.appContext Contains base urls used to query assets, LMV, data etc.
 *
 * @memberof Autodesk.DataVisualization.Examples
 */
function Playground(props) {
    const { env, docUrn } = props.appData;
    const eventBusRef = useRef(new EventBus());
    const [appState, setAppState] = useState({});
    const [selectedLevel, setSelectedLevel] = useState("");
    const selectedLevelRef = useRef(null);
    const ApplicationContext = props.appContext;
    const [devices, setDevices] = useState([]);
    const devicesRef = useRef(null);
    const styleMapRef = useRef(null);

    selectedLevelRef.current = selectedLevel;
    devicesRef.current = devices;

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

    async function updateDevices(newDeviceList) {
        setDevices(newDeviceList);
    }

    async function addSprites() {
        if (appState.dataVizExtn) {
            // Clear any existing viewables
            appState.dataVizExtn.removeAllViewables();

            const currDevices = devicesRef.current;
            const DATAVIZEXTN = Autodesk.DataVisualization.Core;

            // Add Viewables
            const viewableData = new DATAVIZEXTN.ViewableData();
            viewableData.spriteSize = 16;
            let startId = 1;

            currDevices.forEach((device) => {
                let style = styleMapRef.current[device.type] || styleMapRef.current["default"];
                const viewable = new DATAVIZEXTN.SpriteViewable(device.position, style, startId);
                viewableData.addViewable(viewable);
                startId++;
            });

            await viewableData.finish();
            appState.dataVizExtn.addViewables(viewableData);
        }
    }

    /**
     * Handles `Autodesk.Viewing.GEOMETRY_LOADED_EVENT` event that is sent when a model has been completely loaded in the viewer.
     *
     * @param {Autodesk.Viewing.GuiViewer3D} viewer The viewer in which the model is loaded.
     * @param {Object} data Event data that contains the loaded model.
     */
    async function onModelLoaded(viewer, data) {
        const dataVizExtn = viewer.getExtension("Autodesk.DataVisualization");
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

        styleMapRef.current = styleMap;

        // Get Model level info
        let viewerDocument = data.model.getDocumentNode().getDocument();
        const aecModelData = await viewerDocument.downloadAecModelData();
        let levelsExt;
        if (aecModelData) {
            levelsExt = await viewer.loadExtension("Autodesk.AEC.LevelsExtension", {
                doNotCreateUI: true,
            });
        }

        if (levelsExt && levelsExt.floorSelector) {
            const floorData = levelsExt.floorSelector.floorData;
            if (floorData && floorData.length) {
                const floor = floorData[0];
                levelsExt.floorSelector.selectFloor(floor.index, true);
            }
        }

        // Model Structure Info
        let dataHelper = new DataHelper();
        let shadingData = await dataHelper.createShadingGroupByFloor(viewer, data.model, devices);
        const levelInfo = dataHelper.createDeviceTree(shadingData, true);

        setSelectedLevel(levelInfo[0]);

        setAppState({
            viewer,
            dataVizExtn,
            levelsExt,
            buildingInfo: shadingData,
            levelInfo: levelInfo,
        });
    }

    useEffect(() => {
        eventBusRef.current.addEventListener(EventTypes.GROUP_SELECTION_MOUSE_CLICK, (event) => {
            if (appState.levelsExt) {
                let floorSelector = appState.levelsExt.floorSelector;

                if (selectedLevelRef.current && selectedLevelRef.current.id == event.data.id) {
                    floorSelector.selectFloor();
                    setSelectedLevel(null);
                    selectedLevelRef.current = null;
                } else {
                    if (floorSelector.floorData) {
                        let floor = floorSelector.floorData.find(
                            (item) => item.name == event.data.id
                        );
                        if (floor) {
                            floorSelector.selectFloor(floor.index, true);
                            setSelectedLevel(event.data);
                            selectedLevelRef.current = event.data;
                        }
                    }
                }
            }
        });
    }, [appState.levelsExt]);

    addSprites();

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
            {appState && appState.levelInfo && (
                <HyperionToolContainer
                    {...appState}
                    eventBus={eventBusRef.current}
                    structureToolOnly={true}
                    data={appState.levelInfo}
                    selectedGroupNode={selectedLevelRef.current}
                />
            )}
            {appState && appState.viewer && (
                <SelectionTool viewer={appState.viewer} updateDevices={updateDevices} />
            )}
        </React.Fragment>
    );
}

export default Playground;
