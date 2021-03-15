
export default class DataHelper {

    async checkExtension(viewer) {
        if (Autodesk && Autodesk.DataVisualization.Core && Autodesk.DataVisualization.Core.SurfaceShadingData) {
            return Autodesk.DataVisualization.Core;
        } else {
            await viewer.loadExtension("Autodesk.DataVisualization", { useInternal: true });
            return Autodesk.DataVisualization.Core;
        }
    }


    /**
     * 
     * rawDatalooks like this
    [
        {
            id: "engine1",
            dbIds: [558, 560, 562, 563, 583, 705, 571],
            sensors: [
                {
                    id: "Device-1",
                    dbId: 558,
                    type: "temperature",
                    sensorTypes: ["temperature"],
                },
                {
                    id: "Device-2",
                    dbId: 560,
                    type: "temperature",
                    sensorTypes: ["temperature"],
                }
            ],
        },
        {
            id: "engine2",
            dbIds: [968, 970, 972, 973, 981, 992, 993],
            sensors: [
                {
                    id: "Device-6",
                    dbId: 968,
                    type: "temperature",
                    sensorTypes: ["temperature"],
                },
            ],
        }
    ]
     * 
     * 
     * @param {*} viewer 
     * @param {*} rawData 
     */
    async createShadingData(viewer, model, rawData) {
        let ns = await this.checkExtension(viewer);

        const {
            SurfaceShadingData,
            SurfaceShadingPoint,
            SurfaceShadingNode,
            SurfaceShadingGroup,
        } = ns;

        let shadingData = new SurfaceShadingData();

        function createNode(item) {
            let node = new SurfaceShadingNode(item.id, item.dbIds);

            item.sensors.forEach((sensor) => {
                let shadingPoint = new SurfaceShadingPoint(sensor.id, sensor.position, sensor.sensorTypes, sensor.name, { styleId: sensor.styleId || sensor.type });

                // If the position is not specified, derive it from the center of Geometry
                if (sensor.dbId != undefined && sensor.position == null) {
                    shadingPoint.positionFromDBId(model, sensor.dbId);
                }
                node.addPoint(shadingPoint);
            });

            return node;
        }

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
    }


    async createShadingGroupByFloor(model, deviceList) {
        const structureInfo = new Autodesk.DataVisualization.Core.ModelStructureInfo(model);
        /**
         * We have a custom type here for the UI in {@link constructDeviceTree}
         */
        let shadingData = await structureInfo.generateSurfaceShadingData(deviceList);

        return shadingData;
    }


    /**
     * Constructs a device tree to back device UI.
     *
     * @param {DataStore} dataStore The data store where device models, devices
     * and their corresponding property data are defined.
     * @param {Autodesk.DataVisualization.Core.LevelRoomsMap} shadingData The level-to-room map.
     *
     * @returns {DeviceTreeNode[]} The device tree containing all
     * floors and their corresponding devices in project.
     * @private
     */
    createDeviceTree(shadingData, usingFullTree = false) {
        if (usingFullTree) {
            const result = shadingData.children.map((item) => {
                let obj = {
                    id: item.id,
                    name: item.name,
                    propIds: item.types || [],
                    children: []
                }

                // SurfaceShadingGroup.
                if (item.isGroup) {
                    obj.children = this.createDeviceTree(item, usingFullTree);
                }
                else if (item.shadingPoints) { // SurfaceShadingNode
                    if (item.shadingPoints.length > 0) {
                        obj.children = item.shadingPoints.map((sp) => {
                            return {
                                id: sp.id,
                                name: sp.name,
                                propIds: sp.types || [],
                                children: []
                            }
                        });
                    }
                }
                else obj.children = [];

                return obj;
            });

            return result.filter(item => Object.keys(item).length);
        } else {
            function traverse(item) {
                if (item.position) {
                    return ({
                        id: item.id,
                        name: item.name,
                        propIds: item.types || [],
                        children: []
                    })
                }
                else if (item.shadingPoints && item.shadingPoints.length > 0) {
                    return item.shadingPoints.map(sp => traverse(sp));
                }
                else if (item.isGroup) {
                    return item.children.map(child => traverse(child));
                }
            }
            return shadingData.children.map(item => ({ id: item.id, name: item.name, propIds: [], children: traverse(item).filter(i => i).flat() }));
        }



    }



}


