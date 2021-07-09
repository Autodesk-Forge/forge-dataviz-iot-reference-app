/**
 * This is a sample code to show how to render basic heatmap on the screen
 *
 * Heatmap is the terminology we used to show the corresponding sensor values in the room
 * and this is a step foreward by combine both Dot and ModelStructureInfo to created a combined
 * user experience
 */

import React, { useEffect, useRef, useState } from "react";
import { Viewer } from "forge-dataviz-iot-react-components";

/**
 * Defines the two additional toolbar icons - play button and eye icon to show/hide sensors
 */
class TexturedHeatmapToolbarExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
    }

    load() {
        return true;
    }

    unload() {
        if (this.subToolbar) {
            this.viewer.toolbar.removeControl(this.subToolbar);
            this.subToolbar = null;
        }
    }

    onToolbarCreated(toolbar) {
        // Button 1
        var button1 = new Autodesk.Viewing.UI.Button("TexturedHeatMapPlayBack");
        button1.addClass("textured-heatmap-playbutton");
        button1.setToolTip("Playback");

        // Button 2
        var button2 = new Autodesk.Viewing.UI.Button("ShowHideSensors");
        button2.addClass("textured-heatmap-showhide-button");
        button2.setToolTip("Show/Hide Sensors");

        // SubToolbar
        this.subToolbar = new Autodesk.Viewing.UI.ControlGroup("textured-heatmap-toolbar");
        this.subToolbar.addControl(button1);
        this.subToolbar.addControl(button2);

        toolbar.addControl(this.subToolbar);
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
    "TexturedHeatmapToolbarExtension",
    TexturedHeatmapToolbarExtension
);

const sensorDescriptors = {
    "Exit 2": {
        position: { x: -55.66762924194336, y: 88.7755241394043, z: -16.919677257537842 },
    },
    "Restroom 2": {
        position: { x: -65.71856307983398, y: 86.61837005615234, z: -16.919677257537842 },
    },
    "Consulation Room 2": {
        position: { x: -90.7604751586914, y: 87.13715362548828, z: -16.919677257537842 },
    },
    "Main Entrance": {
        position: { x: -105.57610702514648, y: -11.594642639160156, z: -16.919677257537842 },
    },
    "Cafeteria": {
        position: { x: -143.30173110961914, y: 87.18759536743164, z: -16.919677257537842 },
    },
    "Lobby": {
        position: { x: -132.45924377441406, y: 10.900766372680664, z: -10.544355034828186 },
    },
    "Administration": {
        position: { x: -159.2780303955078, y: -1.8119175434112549, z: -16.919677257537842 },
    },
    "Imaging & Radiology Lab": {
        position: { x: -159.2780303955078, y: -50.4998254776001, z: -16.919677257537842 },
    },
    "Consulation Room 1": {
        position: { x: -126.44904327392578, y: -62.24671173095703, z: -16.919677257537842 },
    },
    "Restroom 1": {
        position: { x: -112.73586654663086, y: -66.04428291320801, z: -16.919677257537842 },
    },
    "Medical Supplies": {
        position: { x: -103.05361557006836, y: -66.04428291320801, z: -16.919677257537842 },
    },
    "Diagnostic Labs": {
        position: { x: -80.95461654663086, y: -62.41075134277344, z: -16.919677257537842 },
    },
    "Lab Sample Storage": {
        position: { x: -52.953880310058594, y: -62.41075134277344, z: -16.919677257537842 },
    },
    "Blood Bank": {
        position: { x: -23.426319122314453, y: -62.41075134277344, z: -16.919677257537842 },
    },
    "Pharmacy": {
        position: { x: 6.101234436035156, y: -62.41075134277344, z: -16.919677257537842 },
    },
    "Waiting Room": {
        position: { x: 25.59398651123047, y: -62.41075134277344, z: -16.919677257537842 },
    },
    "Exit 1": {
        position: { x: 40.003883361816406, y: -63.63409614562988, z: -16.919677257537842 },
    },
};

/**
 * Returns a random normalized sensor value used to render the heatmap shading.
 *
 * @param {string} sensorName
 * @param {string} sensorType
 */
const getNormalizedSensorValue = function (sensorName, sensorType) {
    // Returns a normalized value based on the min/max temperatures
    return Math.random();
};

/**
 * An example illustrating how to render a planar heatmap. Can be viewed at: https://hyperion.autodesk.io/texturedmap
 *
 * @component
 * @param {Object} props
 * @param {Object} props.appData Data passed to TexturedHeatmap.
 * @param {("AutodeskStaging"|"AutodeskProduction")} props.appData.env Forge API environment
 * @param {string} props.appData.docUrn Document URN of model
 * @memberof Autodesk.DataVisualization.Examples
 */
function TexturedHeatMap(props) {
    const { env, docUrn } = props.appData;
    const ApplicationContext = props.appContext;
    const [dataVizExt, setDataVizExt] = useState(null);
    const [sensorsVisible, setSensorsVisible] = useState(true);

    const dataVizExtRef = useRef(null);
    dataVizExtRef.current = dataVizExt;

    const playbackTimerRef = useRef(null);
    const playbackCounterRef = useRef(0);

    /**
     * Generates simulation data used for this sample app
     *
     * @returns {Object} Resulting simulation data.
     * @example
     *  const obj = {
     *      id: "floor1",
     *      dbIds: [1945],
     *      sensors: [
     *          {
     *              id: "Cafeteria",
     *              position: { x: -143.3017, y: 87.1875, z: -16.9196 },
     *              type: "thermometer",
     *              sensorTypes: ["temperature"],
     *          },
     *          ...
     *      ],
     *  };
     *
     */
    function generateSimulationData() {
        const simulationData = {
            id: "floor1",
            dbIds: [1945],
            sensors: [],
        };

        for (let sensor in sensorDescriptors) {
            simulationData.sensors.push({
                id: sensor,
                position: sensorDescriptors[sensor].position,
                type: "thermometer",
                sensorTypes: ["temperature"],
            });
        }

        return [simulationData];
    }

    /**
     * Generates viewables to be added to the view. These viewables are sprite-based objects in the 3D viewer canvas and represent physical sensors in the real world.
     *
     * @param {Object} dataItems The simulation data generated in 'generateSimulationData'.
     * @returns {ViewableData} The resulting viewable data that carries all viewables.
     */
    async function generateViewableData(dataItems) {
        // Create a visual style shared by all the thermometers since they're the same type.
        const deviceType = "thermometer";
        const styleColor = 0xffffff;
        const styleIconUrl = `${ApplicationContext.assetUrlPrefix}/images/thermometer.svg`;
        const dataVizExtn = Autodesk.DataVisualization.Core;

        const thermStyle = new dataVizExtn.ViewableStyle(
            dataVizExtn.ViewableType.SPRITE,
            new THREE.Color(styleColor),
            styleIconUrl
        );

        const viewableData = new dataVizExtn.ViewableData();
        viewableData.spriteSize = 16;

        const devices = [];
        const dataItem = dataItems[0];

        dataItem.sensors.forEach((sensor) => {
            devices.push({
                id: sensor.id,
                position: sensor.position,
                type: sensor.type,
            });
        });

        let viewableDbId = 1;
        devices.forEach((device) => {
            const viewable = new dataVizExtn.SpriteViewable(
                device.position,
                thermStyle,
                viewableDbId
            );
            viewableData.addViewable(viewable);
            viewableDbId++;
        });

        await viewableData.finish();
        return viewableData;
    }

    /**
     * `SurfaceShadingData` allows for hierarchical representation of shading data.
     * This method generates `SurfaceShadingData` from the given simulation data which
     * consists of a linear list of `sensors` on "floor1". When the surface shading
     * (i.e. heatmap) is rendered, it will be based on the named `SurfaceShadingNode`,
     * which in this case is "floor1". The hierarchical nature of `SurfaceShadingData`
     * allows rendering to take place for "floor1" independent of other floors.
     *
     * @param {Object} dataItems The data from which `SurfaceShadingData` is to be generated.
     * @param {Model} [model] The optional model that contains sensors' dbIds.
     *
     * @returns {SurfaceShadingData} The resulting `SurfaceShadingData` to generate
     * heatmap shading from.
     */
    function generateSurfaceShadingData(dataItems, model) {
        const {
            SurfaceShadingData,
            SurfaceShadingPoint,
            SurfaceShadingNode,
            SurfaceShadingGroup,
        } = Autodesk.DataVisualization.Core;

        function createNode(item) {
            const shadingNode = new SurfaceShadingNode(item.id, item.dbIds);

            item.sensors.forEach((sensor) => {
                // A `SurfaceShadingPoint` represents a physical device (i.e. thermometer) with a position.
                const shadingPoint = new SurfaceShadingPoint(
                    sensor.id,
                    sensor.position,
                    sensor.sensorTypes
                );

                // If the position is not specified during construction, it can be derived from
                // the center of geometry of the sensor is being represented by a valid dbId.
                if (sensor.dbId != undefined && sensor.position == null) {
                    shadingPoint.positionFromDBId(model, sensor.dbId);
                }

                shadingNode.addPoint(shadingPoint);
            });

            return shadingNode;
        }

        function createGroup(item) {
            const shadingGroup = new SurfaceShadingGroup(item.id);

            item.children.forEach((child) => {
                if (child.children) {
                    shadingGroup.addChild(createGroup(child));
                } else {
                    shadingGroup.addChild(createNode(child));
                }
            });

            return shadingGroup;
        }

        const heatmapData = new SurfaceShadingData();
        dataItems.forEach((item) => {
            if (item.children) {
                heatmapData.addChild(createGroup(item));
            } else {
                heatmapData.addChild(createNode(item));
            }
        });

        return heatmapData;
    }

    const maxPlaybackSteps = 100.0;

    /**
     * Interface for application to determine the current value for the heatmap
     * @param {SurfaceShadingPoint} shadingPoint shading point that represents a device
     * @param {string} sensorType sensor type (in this case, "temperature")
     */
    function getSensorValue(shadingPoint, sensorType) {
        return getNormalizedSensorValue(shadingPoint.id, sensorType);
    }

    function startAnimation() {
        if (!playbackTimerRef.current && dataVizExtRef.current) {
            playbackCounterRef.current = maxPlaybackSteps - 1;
            playbackTimerRef.current = setInterval(() => {
                // Use 'updateSurfaceShading' for higher frequency updates.
                dataVizExtRef.current.updateSurfaceShading(getSensorValue);

                playbackCounterRef.current--;
                if (!playbackCounterRef.current) {
                    clearInterval(playbackTimerRef.current);
                    playbackTimerRef.current = null;
                }
            }, 200);
        }
    }

    function handleShowHideSensors() {
        setSensorsVisible((prevVisible) => !prevVisible);
    }

    /**
     * Handles `Autodesk.Viewing.GEOMETRY_LOADED_EVENT` event that is sent when a model has been completely loaded in the viewer.
     *
     * @param {Autodesk.Viewing.GuiViewer3D} viewer The viewer in which the model is loaded.
     * @param {Object} data Event data that contains the loaded model.
     */
    async function onModelLoaded(viewer, data) {
        const dataVizExtension = viewer.getExtension("Autodesk.DataVisualization");
        const viewerDocument = data.model.getDocumentNode().getDocument();
        const aecModelData = await viewerDocument.downloadAecModelData();

        let levelsExtension = null;
        if (aecModelData) {
            levelsExtension = await viewer.loadExtension("Autodesk.AEC.LevelsExtension", {
                doNotCreateUI: true,
            });
        }

        if (levelsExtension) {
            levelsExtension.floorSelector.selectFloor(0, true);
        }

        const simulationData = generateSimulationData();

        const viewableData = await generateViewableData(simulationData);
        dataVizExtension.addViewables(viewableData);

        const shadingData = generateSurfaceShadingData(simulationData, data.model);
        shadingData.initialize(data.model);
        await dataVizExtension.setupSurfaceShading(data.model, shadingData, {
            type: "PlanarHeatmap",
            placePosition: "max",
        });

        // Represents temperature range with three color stops.
        dataVizExtension.registerSurfaceShadingColors("temperature", [
            0x00ff00,
            0xffff00,
            0xff0000,
        ]);

        dataVizExtension.renderSurfaceShading(["floor1"], "temperature", getSensorValue, 300);
        setDataVizExt(dataVizExtension);

        // Zoom in for better view of the heatmap
        viewer.fitToView([simulationData[0].dbIds]);

        // Play animation when toolbar play button is selected.
        document.getElementsByClassName("textured-heatmap-playbutton")[0].onclick = startAnimation;

        // Play animation when toolbar visiblity button is selected.
        document.getElementsByClassName(
            "textured-heatmap-showhide-button"
        )[0].onclick = handleShowHideSensors;
    }

    useEffect(() => {
        if (dataVizExt) {
            dataVizExt.showHideViewables(sensorsVisible);
        }
    }, [dataVizExt, sensorsVisible]);

    return (
        <Viewer
            env={env}
            docUrn={docUrn}
            onModelLoaded={onModelLoaded}
            extensions={{
                TexturedHeatmapToolbarExtension: {},
                "Autodesk.DataVisualization": {},
            }}
            getToken={async () =>
                await fetch("/api/token")
                    .then((res) => res.json())
                    .then((data) => data.access_token)
            }
        />
    );
}

export default TexturedHeatMap;
