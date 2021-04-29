/**
 * This is a sample code to show how to render basic StructureInfo on the screen
 *
 * Heatmap is the terminology we used to show the corresponding sensor values in the room
 * and this is a step foreward by combine both Dot and ModelStructureInfo to created a combined
 * user experience
 */

import React, { useState, useEffect, useRef } from "react";
import { Viewer } from "forge-dataviz-iot-react-components";
import DataHelper from "./DataHelper";
import { EventTypes } from "forge-dataviz-iot-react-components";
import { HyperionToolContainer } from "forge-dataviz-iot-react-components";

class EventBus { }

THREE.EventDispatcher.prototype.apply(EventBus.prototype);

/**
 * An example illustrating how to use the AEC Levels Extension and the {@link HyperionToolContainer} to select floors in a model. 
 * Can be viewed at: https://hyperion.autodesk.io/structure
 * 
 * @component
 * @param {Object} props
 * @param {Object} props.appData Data passed to application.
 * @param {("AutodeskStaging"|"AutodeskProduction")} props.appData.env Forge API environment
 * @param {string} props.appData.docUrn Document URN of model
 * 
 * @memberof Autodesk.DataVisualization.Examples
 */
function StructureInfo(props) {
    const { env, docUrn } = props.appData;
    const eventBusRef = useRef(new EventBus());
    const [appState, setAppState] = useState({});
    const selectedLevelRef = useRef();

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

        // Model Structure Info
        let dataHelper = new DataHelper();
        let shadingData = await dataHelper.createShadingGroupByFloor(viewer, data.model, []);
        const levelInfo = dataHelper.createDeviceTree(shadingData, true);

        setAppState({
            viewer,
            dataVizExtn,
            levelsExt,
            buildingInfo: shadingData,
            levelInfo: levelInfo
        });
    }

    useEffect(() => {
        eventBusRef.current.addEventListener(EventTypes.GROUP_SELECTION_MOUSE_CLICK, (event) => {
            if (appState.levelsExt) {
                let floorSelector = appState.levelsExt.floorSelector;

                if (selectedLevelRef.current && selectedLevelRef.current.id == event.data.id) {
                    floorSelector.selectFloor();
                    selectedLevelRef.current = null;
                } else {
                    if (floorSelector.floorData) {
                        let floor = floorSelector.floorData.find((item) => item.name == event.data.id);
                        if (floor) {
                            floorSelector.selectFloor(floor.index, true);
                            selectedLevelRef.current = event.data;
                        }
                    }
                }
            }
        });
    }, [appState.levelsExt])


    return (
        <React.Fragment>
            <Viewer
                env={env}
                docUrn={docUrn}
                onModelLoaded={onModelLoaded}
                extensions={{ "Autodesk.DataVisualization": { } }}
                getToken={async () => await fetch("/api/token").then(res => res.json()).then(data => data.access_token)}
            />
            {appState && appState.levelInfo && <HyperionToolContainer
                {...appState}
                eventBus={eventBusRef.current}
                structureToolOnly={true}
                data={appState.levelInfo}
                selectedGroupNode={selectedLevelRef.current}
            />}
        </React.Fragment>
    );
}

export default StructureInfo;
