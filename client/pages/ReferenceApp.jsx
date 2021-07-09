import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { BaseApp } from "forge-dataviz-iot-react-components";
import DataHelper from "./DataHelper";
import { EventTypes } from "forge-dataviz-iot-react-components";

import {
    SpriteSize,
    SensorStyleDefinitions,
    PropIdGradientMap,
    PropertyIconMap,
} from "../config/SensorStyles.js";

import "forge-dataviz-iot-react-components/dist/main.bundle.css";

const surfaceShadingConfig = {
    spriteSize: SpriteSize,
    deviceStyles: SensorStyleDefinitions,
    gradientSetting: PropIdGradientMap,
};

class EventBus {}

THREE.EventDispatcher.prototype.apply(EventBus.prototype);

/**
 * An example of a complete application utilizing all features of the Data Visualization extension. Can be viewed at https://hyperion.autodesk.io/
 *
 * @component
 * @param {Object} props
 * @param {Object} props.appData Data passed to the BaseApp.
 * @param {("AutodeskStaging"|"AutodeskProduction")} props.appData.env Forge API environment
 * @param {string} props.appData.docUrn Document URN of model
 * @param {string} props.appData.adapterType Corresponds to Data Adapter used to query data. i.e - synthetic, azure etc.
 * @param {"derivativeV2"|"derivativeV2_EU"|"modelDerivativeV2"|"fluent"|"D3S"|"D3S_EU"} [props.appData.api] Please refer to LMV documentation for more information.
 * @param {string} [props.appData.dataStart] Start date for provided CSV data in ISO string format.
 * @param {string} [props.appData.dataEnd] End date for provided CSV data in ISO string format.
 * @param {Object} props.appContext Contains base urls used to query assets, LMV, data etc.
 * @param {string} [props.appContext.dataUrl] The base url used to configure a specific {@link DataAdapter}
 * @param {number|undefined} geomIndex Index of geometry to be shown. Forwarded via URL params.
 *
 * @memberof Autodesk.DataVisualization.Examples
 */
function ReferenceApp(props) {
    const queryParams = new URLSearchParams(useLocation().search);
    const geomIndex = queryParams.get("geometryIndex")
        ? parseInt(queryParams.get("geometryIndex"))
        : undefined;

    const eventBusRef = useRef(new EventBus());
    const [data, setData] = useState(null);

    const dataRef = useRef();
    const viewerRef = useRef(null);
    const appStateRef = useRef({});
    const leafNodesRef = useRef([]);

    const renderSettings = {
        showViewables: true,
        occlusion: false,
        showTextures: true,
        heatmapType: "GeometryHeatmap",
    };

    useEffect(() => {
        eventBusRef.current.addEventListener(EventTypes.MODEL_LOAD_COMPLETED, async function (
            event
        ) {
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
            eventBusRef.current.addEventListener(DataVizCore.MOUSE_CLICK, function (/* event */) {
                // console.log("Received sprite click", event);
                // event.hasStopped = true;
            });

            /**
             * Called when a user has selected a grouping in the {@link HyperionToolContainer} or expanded/closed a
             * grouping in {@link DeviceTree}
             * @param {Event} event
             */
            function handleNodeChange(event) {
                if (levelsExt) {
                    let { selectedNodeId } = appStateRef.current;
                    let floorSelector = levelsExt.floorSelector;

                    if (selectedNodeId && selectedNodeId == event.data.id) {
                        floorSelector.selectFloor();
                        appStateRef.current = {
                            selectedNodeId: null,
                        };
                    } else {
                        if (floorSelector.floorData) {
                            let floor = floorSelector.floorData.find(
                                (item) => item.name == event.data.id
                            );
                            if (floor) {
                                floorSelector.selectFloor(floor.index, true);

                                appStateRef.current = {
                                    selectedNodeId: event.data.id,
                                };
                            }
                        }
                    }
                }
            }

            eventBusRef.current.addEventListener(
                EventTypes.GROUP_SELECTION_MOUSE_CLICK,
                handleNodeChange
            );
            eventBusRef.current.addEventListener(
                EventTypes.DEVICE_TREE_EXPAND_EVENT,
                handleNodeChange
            );

            eventBusRef.current.addEventListener(EventTypes.GROUP_SELECTION_MOUSE_OUT, (event) => {
                let floorSelector = levelsExt.floorSelector;

                if (floorSelector.floorData) {
                    let floor = floorSelector.floorData.find((item) => item.name == event.data.id);
                    if (floor) {
                        floorSelector.rollOverFloor();
                        viewer.impl.invalidate(false, false, true);
                    }
                }
            });

            eventBusRef.current.addEventListener(EventTypes.GROUP_SELECTION_MOUSE_OVER, (event) => {
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
            let shadingData = await dataHelper.createShadingGroupByFloor(
                viewer,
                model,
                devicesList
            );
            let devicePanelData = dataHelper.createDeviceTree(shadingData, false);

            shadingData.getChildLeafs(leafNodesRef.current);

            dataRef.current = {
                shadingData,
                devicePanelData,
            };
            setData(dataRef.current);
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
                geomIndex={geomIndex}
            />
        </React.Fragment>
    );
}

export default ReferenceApp;
