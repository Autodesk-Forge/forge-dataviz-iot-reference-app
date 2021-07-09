/**
 * This sample illustrates adding Sprite viewables and rendering a heatmap on a NWD file.
 */

import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { BaseApp } from "forge-dataviz-iot-react-components";
import DataHelper from "./DataHelper";
import { EventTypes } from "forge-dataviz-iot-react-components";

import fan00 from "../../assets/images/fan-00.svg";
import fan01 from "../../assets/images/fan-01.svg";
import fan02 from "../../assets/images/fan-02.svg";
import fan03 from "../../assets/images/fan-03.svg";
import fan04 from "../../assets/images/fan-04.svg";
import fan05 from "../../assets/images/fan-04.svg";

import { SpriteSize, SensorStyleDefinitions, PropIdGradientMap } from "../config/SensorStyles.js";

const fans = [fan00, fan01, fan02, fan03, fan04, fan05];

const RAW_DATA = [
    {
        id: "Stadium",
        dbIds: [8706],
        sensors: [
            {
                id: "sensor-1",
                dbId: 8706,
                type: "fan",
                sensorTypes: ["Temperature"],
            },
            {
                id: "sensor-2",
                dbId: 10736,
                type: "fan",
                sensorTypes: ["Temperature"],
            },
        ],
    },
];

class EventBus {}

THREE.EventDispatcher.prototype.apply(EventBus.prototype);

const surfaceShadingConfig = {
    spriteSize: SpriteSize,
    deviceStyles: Object.assign({}, SensorStyleDefinitions, {
        fan: {
            url: fan00,
            highlightedUrl: fan00,
            color: 0xffffff,
            highlightedColor: 0x44ff00,
            animatedUrls: fans,
        },
    }),
    gradientSetting: PropIdGradientMap,
};

/**
 * An example illustrating how to render sprite viewable and a heatmap for a NWD file. Can be viewed at: https://hyperion.autodesk.io/navisworks
 *
 * @component
 * @param {Object} props
 * @param {Object} props.appData Data passed to the Navisworks.
 * @param {("AutodeskStaging"|"AutodeskProduction")} [props.appData.env] Forge API environment
 * @param {string} props.appData.docUrn Document URN of model
 * @param {string} props.appData.adapterType Corresponds to Data Adapter used to query data. i.e - synthetic, azure etc.
 * @param {"derivativeV2"|"derivativeV2_EU"|"modelDerivativeV2"|"fluent"|"D3S"|"D3S_EU"} [props.appData.api] Please refer to LMV documentation for more information.
 * @param {Object} props.appContext Contains base urls used to query assets, LMV, data etc.
 * @param {string} [props.appContext.dataUrl] The base url used to configure a specific {@link DataAdapter}
 * @param {number|undefined} geomIndex Index of geometry to be shown. Forwarded via URL params.
 *
 * @memberof Autodesk.DataVisualization.Examples
 */
function Navisworks(props) {
    const eventBusRef = useRef(new EventBus());
    const [data, setData] = useState(null);

    const dataRef = useRef();
    const viewerRef = useRef(null);

    const queryParams = new URLSearchParams(useLocation().search);
    const geomIndex = queryParams.get("geometryIndex")
        ? parseInt(queryParams.get("geometryIndex"))
        : undefined;

    props.appData.docUrn =
        "urn:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6aHlwZXJpb24tZGVtby1idWNrZXQvaWNlJTIwc3RhZGl1bS5ud2Q";
    props.appData.adapterType = "synthetic";

    useEffect(() => {
        eventBusRef.current.addEventListener(EventTypes.MODEL_LOAD_COMPLETED, async function (
            event
        ) {
            viewerRef.current = event.data.viewer;
            let viewer = viewerRef.current;

            let model = event.data.data.model;
            let dataHelper = new DataHelper();

            let shadingData = await dataHelper.createShadingData(viewer, model, RAW_DATA);
            let devicePanelData = dataHelper.createDeviceTree(shadingData, true);

            dataRef.current = {
                shadingData,
                devicePanelData,
            };
            setData(dataRef.current);
        });
    }, []);

    eventBusRef.current.addEventListener(EventTypes.VIEWABLES_LOADED, (event) => {
        let { dataVizExtn } = event.data;

        let i = 0;

        let ids = dataVizExtn.viewableData.viewables.map((viewable) => viewable.dbId);

        setInterval(() => {
            dataVizExtn.invalidateViewables(ids, (/* viewable */) => {
                return { url: fans[i++ % 5] };
            });
        }, 200);
    });

    return (
        <React.Fragment>
            <BaseApp
                {...props}
                eventBus={eventBusRef.current}
                surfaceShadingConfig={surfaceShadingConfig}
                data={data}
                geomIndex={geomIndex}
            />
        </React.Fragment>
    );
}

export default Navisworks;
