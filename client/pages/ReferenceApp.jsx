import React, { useEffect, useRef, useState } from "react";
import { BaseApp } from "forge-dataviz-iot-react-components";
import DataHelper from "./DataHelper";
import { EventTypes } from "forge-dataviz-iot-react-components";
import { SpriteSize, SensorStyleDefinitions, PropIdGradientMap, PropertyIconMap } from "../config/SensorStyles.js";

import "forge-dataviz-iot-react-components/dist/main.bundle.css"; 
import "react-dates/lib/css/_datepicker.css";

const surfaceShadingConfig = {
    spriteSize: SpriteSize,
    deviceStyles: SensorStyleDefinitions,
    gradientSetting: PropIdGradientMap
};

class EventBus { }

THREE.EventDispatcher.prototype.apply(EventBus.prototype);

function ReferenceApp(props) {

    const eventBusRef = useRef(new EventBus());
    const [data, setData] = useState(null);

    const dataRef = useRef();
    const viewerRef = useRef(null);
    const appStateRef = useRef({});
    const leafNodesRef = useRef([]);

    const renderSettings = {
        showViewables: true,
        occlusion: false,
        showTextures: true
    };

    useEffect(() => {

        eventBusRef.current.addEventListener(EventTypes.MODEL_LOAD_COMPLETED, async function (event) {
            viewerRef.current = event.data.viewer;
            let viewer = viewerRef.current;

            let model = event.data.data.model;

            let levelsExt = null;

            let viewerDocument = model.getDocumentNode().getDocument();
            const aecModelData = await viewerDocument.downloadAecModelData();
            if (aecModelData) {
                levelsExt = await viewer.loadExtension("Autodesk.AEC.LevelsExtension", {
                    doNotCreateUI: true,
                });
            }

            /**
             * Empty event to show how to use the EventBus
             */
            const DataVizCore = Autodesk.DataVisualization.Core;
            eventBusRef.current.addEventListener(DataVizCore.MOUSE_CLICK, function (event) {
                // console.log("Received sprite click", event);
                // event.hasStopped = true;
            })

            function handleNodeChange(event) {
                if (levelsExt) {
                    let { selectedNodeId } = appStateRef.current;
                    let floorSelector = levelsExt.floorSelector;

                    if (selectedNodeId && selectedNodeId == event.data.id) {
                        floorSelector.selectFloor();
                        appStateRef.current = {
                            selectedNodeId: null
                        }
                    } else {
                        if (floorSelector.floorData) {
                            let floor = floorSelector.floorData.find((item) => item.name == event.data.id);
                            if (floor) {
                                floorSelector.selectFloor(floor.index, true);

                                appStateRef.current = {
                                    selectedNodeId: event.data.id
                                }
                            }
                        }
                    }
                }
            }

            eventBusRef.current.addEventListener(EventTypes.LEVELS_TREE_MOUSE_CLICK, handleNodeChange);
            eventBusRef.current.addEventListener(EventTypes.DEVICE_TREE_EXPAND_EVENT, handleNodeChange);

            eventBusRef.current.addEventListener(EventTypes.LEVELS_TREE_MOUSE_OUT, (event) => {
                let floorSelector = levelsExt.floorSelector;

                if (floorSelector.floorData) {
                    let floor = floorSelector.floorData.find((item) => item.name == event.data.id);
                    if (floor) {
                        floorSelector.rollOverFloor();
                        viewer.impl.invalidate(false, false, true);
                    }
                }
            });

            eventBusRef.current.addEventListener(EventTypes.LEVELS_TREE_MOUSE_OVER, (event) => {
                let floorSelector = levelsExt.floorSelector;
                if (floorSelector.floorData) {
                    let floor = floorSelector.floorData.find((item) => item.name == event.data.id);
                    if (floor) {
                        floorSelector.rollOverFloor(floor.index);
                        viewer.impl.invalidate(false, false, true);
                    }
                }
            });

            let session = event.data.session;
            let devicesList = session.dataStore.deviceModels[0].devices;
            let dataHelper = new DataHelper();
            let shadingData = await dataHelper.createShadingGroupByFloor(model, devicesList);
            let devicePanelData = dataHelper.createDeviceTree(shadingData, false);

            shadingData.getChildLeafs(leafNodesRef.current);

            dataRef.current = {
                shadingData,
                devicePanelData
            };
            setData(dataRef.current);

            return function cleanUp() {
                eventBusRef.current._listeners = {}
            }
        });
    }, []);


    return (
        <React.Fragment>
            <BaseApp
                {...props}
                eventBus={eventBusRef.current}
                data={data}
                renderSettings={renderSettings}
                surfaceShadingConfig={surfaceShadingConfig}
                propertyIconMap={PropertyIconMap}
            />
        </React.Fragment>
    );
}

module.exports = ReferenceApp;
