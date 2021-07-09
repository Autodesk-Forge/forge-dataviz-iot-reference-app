export default class DataHelper {
    /**
     *
     * Checks if the "Autodesk.DataVisualization" extension has already been loaded and loads it otherwise.
     *
     * @param {Autodesk.Viewing.GuiViewer3D} viewer Instance of Forge Viewer
     * @returns {Object} Reference to Autodesk.DataVisualization extension.
     */
    async getExtension(viewer) {
        if (
            Autodesk &&
            Autodesk.DataVisualization.Core &&
            Autodesk.DataVisualization.Core.SurfaceShadingData
        ) {
            return await viewer.getExtension("Autodesk.DataVisualization");
        } else {
            return await viewer.loadExtension("Autodesk.DataVisualization");
        }
    }

    /**
     * Converts rawData into {@link SurfaceShadingData} that can be used to load the application.
     *
     * @param {Autodesk.Viewing.GuiViewer3D} viewer Instance of Forge Viewer
     * @param {Model} model Model loaded in Viewer
     * @param {Object} rawData Corresponds to data to be displayed in the application.
     *
     * @returns {SurfaceShadingData}
     *
     * @example
     *  const rawData = [
     *      {
     *          id: "engine1",
     *          dbIds: [558, 560, 562, 563, 583, 705, 571],
     *          sensors: [
     *              {
     *                  id: "Device-1",
     *                  dbId: 558,
     *                  type: "temperature",
     *                  sensorTypes: ["temperature"],
     *              },
     *              {
     *                  id: "Device-2",
     *                  dbId: 560,
     *                  type: "temperature",
     *                  sensorTypes: ["temperature"],
     *              },
     *          ],
     *      },
     *      {
     *          id: "engine2",
     *          dbIds: [968, 970, 972, 973, 981, 992, 993],
     *          sensors: [
     *              {
     *                  id: "Device-6",
     *                  dbId: 968,
     *                  type: "temperature",
     *                  sensorTypes: ["temperature"],
     *              },
     *          ],
     *      },
     *  ];
     *
     */
    async createShadingData(viewer, model, rawData) {
        let dataVizExt = await this.getExtension(viewer);
        const ns = Autodesk.DataVisualization.Core;
        const {
            SurfaceShadingData,
            SurfaceShadingPoint,
            SurfaceShadingNode,
            SurfaceShadingGroup,
        } = ns;

        const create = async () => {
            let shadingData = new SurfaceShadingData();

            /**
             * Creates a {@link SurfaceShadingNode} corresponding to item.
             *
             * @param {Object} item
             */
            function createNode(item) {
                let node = new SurfaceShadingNode(item.id, item.dbIds);

                item.sensors.forEach((sensor) => {
                    let shadingPoint = new SurfaceShadingPoint(
                        sensor.id,
                        sensor.position,
                        sensor.sensorTypes,
                        sensor.name,
                        { styleId: sensor.styleId || sensor.type }
                    );

                    // If the position is not specified, derive it from the center of Geometry
                    if (sensor.dbId != undefined && sensor.position == null) {
                        shadingPoint.positionFromDBId(model, sensor.dbId);
                    }
                    node.addPoint(shadingPoint);
                });

                return node;
            }

            /**
             * Creates a {@link SurfaceShadingGroup} corresponding to item.
             *
             * @param {Object} item
             */
            function createGroup(item) {
                let group = new SurfaceShadingGroup(item.id);

                item.children.forEach((child) => {
                    if (child.children) {
                        group.addChild(createGroup(child));
                    } else {
                        group.addChild(createNode(child));
                    }
                });
                return group;
            }

            rawData.forEach((item) => {
                if (item.children) {
                    shadingData.addChild(createGroup(item));
                } else {
                    shadingData.addChild(createNode(item));
                }
            });

            return shadingData;
        };

        // Ensure that instance tree has loaded.
        await dataVizExt.waitForInstanceTree(model);
        return create();
    }

    /**
     * Uses the {@link ModelStructureInfo} to construct {@link SurfaceShadingData}
     *
     * @param {GuiViewer3D} Viewer instance used to retrieve dataViz extension.
     * @param {Model} model Model loaded in viewer
     * @param {Device[]} deviceList List of devices to be mapped to loaded rooms.
     * @param {string} [nodeName] Optional. Name of the node whose child nodes
     * are to be retrieved and used as the bounding volumns for surface shading.
     * The default value is "Rooms" if none is supplied.
     */
    async createShadingGroupByFloor(viewer, model, deviceList, nodeName) {
        let dataVizExt = await this.getExtension(viewer);

        const getShadingData = async () => {
            const structureInfo = new Autodesk.DataVisualization.Core.ModelStructureInfo(model);
            /**
             * We have a custom type here for the UI in {@link constructDeviceTree}
             */

            let shadingData = await structureInfo.generateSurfaceShadingData(
                deviceList,
                undefined,
                nodeName
            );

            return shadingData;
        };

        // Ensure that instance tree has loaded.
        await dataVizExt.waitForInstanceTree(model);
        return getShadingData();
    }

    /**
     * Constructs a device tree used to load the device UI.
     *
     * @param {SurfaceShadingData} shadingData The `SurfaceShadingData`, generally
     * the output of {@link createShadingGroupByFloor} or {@link createShadingData}.
     * @param {boolean} usingFullTree When true, constructs a device tree that
     * contains all non-empty `SurfaceShadingGroup`, intermediate `SurfaceShadingNode`,
     * and `SurfaceShadingPoint` objects. When `false`, skips intermediate `SurfaceShadingNode`
     * objects.
     *
     * @returns {TreeNode[]} The device tree containing all groups and their corresponding devices.
     */
    createDeviceTree(shadingData, usingFullTree = false) {
        function traverse(item) {
            if (item.position) {
                //SurfaceShadingPoint
                return {
                    id: item.id,
                    name: item.name,
                    propIds: item.types || [],
                    children: [],
                };
            } else if (item.shadingPoints && item.shadingPoints.length > 0) {
                //non-empty SurfaceShadingNode
                return item.shadingPoints.map((sp) => traverse(sp));
            } else if (item.isGroup) {
                //SurfaceShadingGroup
                return item.children.map((child) => traverse(child));
            }
        }

        if (usingFullTree) {
            const result = shadingData.children.map((item) => {
                let obj = {
                    id: item.id,
                    name: item.name,
                    propIds: item.types || [],
                    children: [],
                };

                // SurfaceShadingGroup.
                if (item.isGroup) {
                    obj.children = this.createDeviceTree(item, usingFullTree);
                } // SurfaceShadingNode
                else if (item.shadingPoints) {
                    if (item.shadingPoints.length > 0) {
                        obj.children = item.shadingPoints.map((sp) => {
                            return {
                                id: sp.id,
                                name: sp.name,
                                propIds: sp.types || [],
                                children: [],
                            };
                        });
                    }
                } else {
                    obj.children = [];
                }

                return obj;
            });

            return result.filter((item) => Object.keys(item).length); // Skips over empty SurfaceShadingGroups and SurfaceShadingNodes
        } else {
            return shadingData.children.map((item) => ({
                id: item.id,
                name: item.name,
                propIds: [],
                children: traverse(item)
                    .filter((i) => i)
                    .flat(),
            }));
        }
    }
}
