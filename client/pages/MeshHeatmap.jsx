/**
 * This sample illustrates how to use the IDWProcessor to render a MeshHeatmap.
 */
import React, { useEffect, useRef, useState } from "react";
import STLLoader from "../loader/STLLoader.js";
import { Viewer } from "forge-dataviz-iot-react-components";

class EventBus {}
THREE.EventDispatcher.prototype.apply(EventBus.prototype);

const stlURL = "https://s3-us-west-2.amazonaws.com/hyperion-test-data.autodesk.io/a.stl";

// comma split
const csvURL = "https://s3-us-west-2.amazonaws.com/hyperion-test-data.autodesk.io/a.csv";

class SimpleMaterial extends THREE.ShaderMaterial {
    constructor() {
        const vertexShader = `
            attribute vec3 color; 
            varying vec3 vColor;

              void main()
              {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                gl_Position = projectionMatrix * mvPosition;
              }
            `;

        const fragmentShader = `
          varying vec3 vColor; 

          void main( ) {
            gl_FragColor = vec4(vColor, 1.);
          }
        `;

        super({
            vertexShader,
            fragmentShader,
            side: THREE.DoubleSide,
            depthTest: true,
            depthWrite: true,
        });
    }
}

/**
 * An example illustrating how to add mesh based heatmap using IDW processor (https://en.wikipedia.org/wiki/Inverse_distance_weighting). Can be viewed at: https://hyperion.autodesk.io/meshheatmap
 *
 * @component
 * @memberof Autodesk.DataVisualization.Examples
 * @param {Object} props
 * @param {Object} props.appContext Contains base urls used to query assets, LMV, data etc.
 * @param {string} [props.appContext.assetUrlPrefix] The url used to query assets
 *
 */

function MeshHeatmap(props) {
    const eventBusRef = useRef(new EventBus());
    const viewerRef = useRef(null);
    const processorRef = useRef(null);
    const bufferGeometryRef = useRef(null);
    const dataVizExtRef = useRef(null);

    const [pow, setPow] = useState(2);
    const [showSensor, setShowSensor] = useState(false);

    const ApplicationContext = props.appContext;

    const SensorStyleDefinitions = {
        default: {
            url: `${ApplicationContext.assetUrlPrefix}/images/circle.svg`,
            color: 0xffffff,
        },
    };

    async function addViewables(viewer, sensors) {
        const dataVizExt = viewer.getExtension("Autodesk.DataVisualization");
        const DATAVIZEXTN = Autodesk.DataVisualization.Core;

        var styleMap = {};
        const viewableData = new DATAVIZEXTN.ViewableData();
        viewableData.spriteSize = 5;

        // Create model-to-style map from style definitions.
        Object.entries(SensorStyleDefinitions).forEach(([type, styleDef]) => {
            styleMap[type] = new DATAVIZEXTN.ViewableStyle(
                DATAVIZEXTN.ViewableType.SPRITE,
                new THREE.Color(styleDef.color),
                styleDef.url
            );
        });

        let startId = 0;
        for (let i = 0; i < sensors.length; i += 4) {
            let position = new THREE.Vector3(sensors[i], sensors[i + 1], sensors[i + 2]);

            let style = styleMap["default"];
            const viewable = new DATAVIZEXTN.SpriteViewable(position, style, startId);
            viewableData.addViewable(viewable);
            startId++;
        }
        await viewableData.finish();
        dataVizExt.addViewables(viewableData);

        viewer.addEventListener(DATAVIZEXTN.MOUSE_CLICK, async (event) => {
            let index = event.dbId * 4 + 3;

            console.log(event.dbId, sensors[index]);
        });
    }

    /**
     * Technically, gives the ability to allow upload and let user to try it without changle the code
     * can generate blobURL to do that
     *
     * @param {string} stl  URL
     * @param {string} csv  URL
     */
    function loadSTL(stl, csv) {
        let viewer = viewerRef.current;

        new STLLoader().load(stl, (geometry) => {
            //
            // normalize the geometry
            let vertices = [];
            geometry.vertices.forEach((v) => {
                vertices.push(v.x - 0.001, v.y + 0.003, v.z + 0.002);
            });

            let bufferGeometry = new THREE.BufferGeometry();
            bufferGeometry.fromGeometry(geometry);

            bufferGeometryRef.current = bufferGeometry;

            fetch(csv)
                .then((res) => res.text())
                .then(async (text) => {
                    let sensorData = [];

                    text.split(/\r?\n/gi)
                        .map((line) => line.split(/,/gi))
                        .filter((item) => item.length >= 4)
                        .forEach((row) => {
                            sensorData.push(
                                parseFloat(row[0]),
                                parseFloat(row[1]),
                                parseFloat(row[2]),
                                parseFloat(row[3])
                            );
                        });

                    const DATAVIZEXTN = Autodesk.DataVisualization.Core;

                    let processor = new DATAVIZEXTN.IDWDataProcessor(viewer, vertices, sensorData);
                    let colors = processor.process({ pow });
                    processorRef.current = processor;

                    let colorAttribute = new THREE.BufferAttribute(colors, 3);
                    colorAttribute.bytesPerItem = 1;
                    colorAttribute.normalize = true;
                    bufferGeometry.addAttribute("color", colorAttribute);

                    let basicMaterial = new SimpleMaterial();
                    let mesh2 = new THREE.Mesh(bufferGeometry, basicMaterial);

                    await addViewables(viewer, sensorData);
                    dataVizExtRef.current.showHideViewables(showSensor);

                    let box = geometry.boundingBox;
                    let center = box.center();

                    let camera = {};
                    camera.isPerspective = false;
                    camera.position = new THREE.Vector3(center.x * 10, center.y * 10, center.z * 10);
                    camera.target = new THREE.Vector3(center.x, center.y, 0);
                    camera.up = new THREE.Vector3(0, 0, 1);

                    viewer.sceneAfter.skipDepthTarget = true;
                    viewer.sceneAfter.skipIdTarget = true;

                    viewer.sceneAfter.add(mesh2);
                    viewer.impl.setViewFromCamera(camera, true, false);
                });
        });
    }

    function onPowChange(event) {
        let bufferGeometry = bufferGeometryRef.current;
        let processor = processorRef.current;
        let viewer = viewerRef.current;

        if (bufferGeometryRef && processor) {
            let colorsArray = bufferGeometry.attributes["color"].array;

            let value = parseFloat(event.target.value);
            // console.time("process");
            let colors = processor.process({ pow: value, targetOutput: colorsArray });
            // console.timeEnd("process");

            if (colors != colorsArray) {
                colorsArray.set(colors, 0);
            }

            bufferGeometry.attributes["color"].needsUpdate = true;

            viewer.impl.invalidate(true);
            setPow(value);
        }
    }

    function onShowSensorChange(event) {
        if (dataVizExtRef.current) {
            dataVizExtRef.current.showHideViewables(event.target.checked);
            setShowSensor(event.target.checked);
        }
    }

    useEffect(() => {
        eventBusRef.current.addEventListener("VIEWER_READY", async function (event) {
            viewerRef.current = event.data.viewer;
            let viewer = viewerRef.current;

            const options = {
                env: "Local",
                api: undefined,
                useCredentials: false,
                useCookie: false,
                shouldInitializeAuth: false,
                getAccessToken: null,
            };

            // need a empty model to initialize viewer
            const sceneBuilder = await viewer.loadExtension("Autodesk.Viewing.SceneBuilder");
            await sceneBuilder.addNewModel(options);

            const dataVizExt = await viewer.loadExtension("Autodesk.DataVisualization", { });
            dataVizExtRef.current = dataVizExt;

            loadSTL(stlURL, csvURL);
        });

        return function cleanup() {
            if (processorRef.current) {
                processorRef.current.cleanUp();
                processorRef.current = null;
            }

            if (bufferGeometryRef.current) {
                bufferGeometryRef.current.dispose();
                bufferGeometryRef.current = null;
            }
        };
    }, []);

    return (
        <React.Fragment>
            <div id="mesh-hm-controls">
                <label>Pow: {pow.toFixed(1)}</label>
                <input type="range" onChange={onPowChange} value={pow} min="0.1" max="6" step="0.01" />
                <label> Show Sensor: </label>
                <input type="checkbox" checked={showSensor} onChange={onShowSensorChange} />
            </div>
            <Viewer viewerOptions={{ shouldInitializeAuth: false }} eventBus={eventBusRef.current} />
        </React.Fragment>
    );
}

export default MeshHeatmap;
