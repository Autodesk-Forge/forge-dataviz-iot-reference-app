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
 * @component
 * @param {Object} props
 */
function StructureInfo(props) {
    const { env, token, docUrn } = props.appData;
    const eventBusRef = useRef(new EventBus());
    const [appState, setAppState] = useState({});
    const selectedLevelRef = useRef();

    async function onModelLoaded(viewer, data) {
        const dataVizExt = await viewer.loadExtension("Autodesk.DataVisualization", { useInternal: true });

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
        let shadingData = await dataHelper.createShadingGroupByFloor(data.model, []);
        const levelInfo = dataHelper.createDeviceTree(shadingData, true);

        setAppState({
            viewer,
            dataVizExtn: dataVizExt,
            levelsExt,
            buildingInfo: shadingData,
            levelInfo: levelInfo
        });
    }

    useEffect(() => {
        eventBusRef.current.addEventListener(EventTypes.LEVELS_TREE_MOUSE_CLICK, (event) => {
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

        return function cleanUp() {
            eventBusRef.current._listeners = {}
        }
    }, [appState.levelsExt])


    return (
        <React.Fragment>
            <Viewer
                env={env}
                docUrn={docUrn}
                onModelLoaded={onModelLoaded}
                getToken={async () => await fetch("/api/token").then(res => res.json()).then(data => data.access_token)}
            />
            {appState && appState.levelInfo && <HyperionToolContainer
                {...appState}
                eventBus={eventBusRef.current}
                structureToolOnly={true}
                defaultFloor={{ index: 0, name: "01 - Entry Level" }}
                data={appState.levelInfo}
                selectedGroupNode={selectedLevelRef.current}
            />}
        </React.Fragment>
    );
}

module.exports = StructureInfo;
