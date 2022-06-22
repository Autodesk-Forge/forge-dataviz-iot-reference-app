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

import "./extensions/SensorManagerExtension";

class EventBus {}

THREE.EventDispatcher.prototype.apply(EventBus.prototype);

/**
 * An example illustrating how to use the {@link SelectionTool} to get a list of JSON objects representing {@link RoomDevice}.
 * Can be viewed at: https://hyperion.autodesk.io/SensorManage
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
function SensorManage(props) {
    const { env, docUrn } = props.appData;
    const eventBusRef = useRef(new EventBus());
    const [appState, setAppState] = useState({});
    const [selectedLevel, setSelectedLevel] = useState("");
    const selectedLevelRef = useRef(null);
    const ApplicationContext = props.appContext;

    selectedLevelRef.current = selectedLevel;

    /**
     * Handles `Autodesk.Viewing.GEOMETRY_LOADED_EVENT` event that is sent when a model has been completely loaded in the viewer.
     *
     * @param {Autodesk.Viewing.GuiViewer3D} viewer The viewer in which the model is loaded.
     * @param {Object} data Event data that contains the loaded model.
     */
    async function onModelLoaded(viewer, data) {
        const dataVizExtn = viewer.getExtension("Autodesk.DataVisualization");

        // Get Model level info
        let viewerDocument = data.model.getDocumentNode().getDocument();
        const aecModelData = await viewerDocument.downloadAecModelData();
        let levelsExt;
        if (aecModelData) {
            levelsExt = await viewer.loadExtension("Autodesk.AEC.LevelsExtension", {
                doNotCreateUI: true,
            });
        }

        let sensorMgrExt = await viewer.loadExtension("SensorManagerExtension", {
            adapterType: "json",
            baseUrl: ApplicationContext.dataUrl,
            assetUrlPrefix: ApplicationContext.assetUrlPrefix
        });

        if (levelsExt && levelsExt.floorSelector) {
            const floorData = levelsExt.floorSelector.floorData;
            if (floorData && floorData.length) {
                const floor = floorData[0];
                levelsExt.floorSelector.selectFloor(floor.index, true);
            }
        }

        await sensorMgrExt.refresh();

        // Model Structure Info
        let dataHelper = new DataHelper();
        let devices = [];
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

    return (
        <React.Fragment>
            <Viewer
                env={env}
                docUrn={docUrn}
                onModelLoaded={onModelLoaded}
                extensions={ { "Autodesk.DataVisualization": {} }}
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
        </React.Fragment>
    );
}

export default SensorManage;
