/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Forge Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

import { JsonDbRestApiDataAdapter } from "./Hyperion.Data.JsonDbRestApiDataAdapter";

//ref: https://github.com/Autodesk-Forge/library-javascript-viewer-extensions/blob/0c0db2d6426f4ff4aea1042813ed10da17c63554/src/components/UIComponent/UIComponent.js#L34
function guid(format = "xxxxxxxxxx") {
    let d = new Date().getTime();

    return format.replace(
        /[xy]/g,
        function (c) {
            let r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c == "x" ? r : (r & 0x7 | 0x8)).toString(16);
        });
}

class AdnToolInterface {
    constructor(viewer) {
        this._viewer = viewer;
        this._active = false;
        this._names = ["unnamed"];
    }

    get viewer() {
        return this._viewer;
    }

    getPriority() {
        return 0;
    }

    isActive() {
        return this._active;
    }

    getNames() {
        return this._names;
    }

    getName() {
        return this._names[0];
    }

    register() {
    }

    deregister() {
    }

    activate(name) {
        this._active = true;
    }

    deactivate(name) {
        this._active = false;
    }

    update(highResTimestamp) {
        return false;
    }

    handleSingleClick(event, button) {
        return false;
    }

    handleDoubleClick(event, button) {
        return false;
    }

    handleSingleTap(event, button) {
        return false;
    }

    handleDoubleTap(event, button) {
        return false;
    }

    handleKeyDown(event, button) {
        return false;
    }

    handleKeyUp(event, button) {
        return false;
    }

    handleWheelInput(event, button) {
        return false;
    }

    handleButtonDown(event, button) {
        return false;
    }

    handleButtonUp(event, button) {
        return false;
    }

    handleMouseMove(event, button) {
        return false;
    }

    handleGesture(event, button) {
        return false;
    }

    handleBlur(event, button) {
        return false;
    }

    handleResize(event, button) {
        return false;
    }
}

class AdnDataVizToolContextMenu extends Autodesk.Viewing.Extensions.ViewerObjectContextMenu {
    constructor(parent) {
        super(parent.viewer);

        this.parent = parent;
    }

    get dataAdapter() {
        return this.parent.dataAdapter;
    }

    get dataVizExt() {
        return this.parent.dataVizExt;
    }

    buildMenu(event, status) {
        if (!this.viewer.model)
            return;

        const that = this;

        let menu = [];

        if (this.dataVizExt.tool.selectedDbId != 0) {
            menu.push({
                title: "Remove Sensor",
                target: async () => {
                    let selectedDbId = this.dataVizExt.tool.selectedDbId;
                    const deviceId = this.parent.dbIdToDeviceId[selectedDbId];

                    this.dataVizExt.clearHighlightedViewables();
                    await this.dataAdapter.deleteDevice(deviceId);

                    delete this.parent.deviceIdToDbId[deviceId];
                    delete this.parent.dbIdToDeviceId[selectedDbId];

                    await this.parent.refresh();
                }
            });
        } else {
            menu = menu.concat(super.buildMenu(event, status));
        }

        return menu;
    }
}

class AdnDataVizTool extends AdnToolInterface {
    constructor(parent) {
        super(parent);

        this.parent = parent;
        this._names = ["adn-dataviz-tool"];
        this.editMode = false;
        this.startId = 100;
        this.deviceIdToDbId = {};
        this.dbIdToDeviceId = {};

        this.styleMap = {};

        const { assetUrlPrefix } = this.parent.options;
        /**
         * @type {SensorStyleDefinitions}
         */
        const sensorStyleDefinitions = {
            co2: {
                url: `${assetUrlPrefix}/images/co2.svg`,
                color: 0xffffff,
            },
            temperature: {
                url: `${assetUrlPrefix}/images/thermometer.svg`,
                color: 0xffffff,
            },
            default: {
                url: `${assetUrlPrefix}/images/circle.svg`,
                color: 0xffffff,
            },
        };

        // Create model-to-style map from style definitions.
        Object.entries(sensorStyleDefinitions).forEach(([type, styleDef]) => {
            this.styleMap[type] = new Autodesk.DataVisualization.Core.ViewableStyle(
                Autodesk.DataVisualization.Core.ViewableType.SPRITE,
                new THREE.Color(styleDef.color),
                styleDef.url
            );
        });
    }

    get viewer() {
        return this.parent.viewer;
    }

    get dataVizExt() {
        return this.viewer.getExtension("Autodesk.DataVisualization");
    }

    get dataAdapter() {
        return this.parent.dataAdapter;
    }

    getPriority() {
        return 1;
    }

    isEditMode() {
        return this.editMode;
    }

    enterEditMode() {
        this.editMode = true;
    }

    leaveEditMode() {
        this.editMode = false;
    }

    attachContextMenu() {
        this.viewer.setContextMenu(new AdnDataVizToolContextMenu(this));
    }

    detachContextMenu() {
        this.viewer.setDefaultContextMenu();
    }

    async refresh() {
        const deviceModelsList = await this.dataAdapter.loadDeviceModels();
        const deviceModels = deviceModelsList.flat(Infinity);
        this.deviceModels = deviceModels;

        if (!deviceModels || deviceModels.length <= 0) return;

        const devices = deviceModels.map(deviceModel => deviceModel.devices).flat(Infinity);

        if (!devices || devices.length <= 0) return;

        const dataVizExt = this.dataVizExt;
        dataVizExt.removeAllViewables();

        this.deviceIdToDbId = {};
        this.dbIdToDeviceId = {};

        const viewableData = new Autodesk.DataVisualization.Core.ViewableData();
        viewableData.spriteSize = 16;

        // Add viewables
        devices.forEach((device, index) => {
            const dbId = this.startId++;
            const deviceId = device.id;
            this.deviceIdToDbId[deviceId] = dbId;
            this.dbIdToDeviceId[dbId] = deviceId;

            const style = this.styleMap[device.type] || this.styleMap["default"];
            const viewable = new Autodesk.DataVisualization.Core.SpriteViewable(
                device.position,
                style,
                dbId
            );

            viewableData.addViewable(viewable);
        });

        await viewableData.finish();
        dataVizExt.addViewables(viewableData);
    }

    async getPropertiesAsync(dbId, model) {
        return new Promise((resolve, reject) => {
            model.getProperties2(
                dbId,
                (result) => resolve(result),
                (error) => reject(error)
            );
        });
    };

    async handleSingleClick(event) {
        const viewer = this.viewer;
        viewer.clearSelection();

        const viewport = viewer.container.getBoundingClientRect();
        const canvasX = event.clientX - viewport.left;
        const canvasY = event.clientY - viewport.top;

        //get the selected 3D position of the object
        const result = viewer.impl.hitTest(canvasX, canvasY, true);
        // console.log(result);

        if (!result) return true;

        if (this.editMode) {
            const hitTargetProps = await this.getPropertiesAsync(result.dbId, this.viewer.model);
            const hitTargetName = hitTargetProps.name;
            const deviceName = `${hitTargetName}-${guid()}`;

            const device = {
                id: deviceName,
                name: deviceName,
                position: result.intersectPoint,
                lastActivityTime: new Date().toISOString()
            };

            const deviceModel = this.deviceModels[0];
            await this.dataAdapter.addDeviceByModel(device, deviceModel);
            await this.refresh();
        }
    }
}

class SensorManagerExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);

        this.tool = null;

        const { adapterType, baseUrl } = this.options;
        this.dataAdapter = new JsonDbRestApiDataAdapter(adapterType, baseUrl);
    }

    onToolbarCreated(toolbar) {
        const sensorAddButton = new Autodesk.Viewing.UI.Button("toolbar-sensor-add-tool");
        sensorAddButton.onClick = () => {
            const state = sensorAddButton.getState();

            if (state === Autodesk.Viewing.UI.Button.State.INACTIVE) {
                sensorAddButton.setState(Autodesk.Viewing.UI.Button.State.ACTIVE);

                this.viewer.toolController.activateTool(this.tool.getName());
                this.tool.enterEditMode();
            } else if (state === Autodesk.Viewing.UI.Button.State.ACTIVE) {
                sensorAddButton.setState(Autodesk.Viewing.UI.Button.State.INACTIVE);

                this.viewer.toolController.deactivateTool(this.tool.getName());
                this.tool.leaveEditMode();
            }
        };

        sensorAddButton.icon.classList.add("fas", "fa-plus");
        sensorAddButton.setToolTip("Add new sensor points");

        this.group = new Autodesk.Viewing.UI.ControlGroup("toolbar-dataviz-tool");
        this.group.addControl(sensorAddButton);
        toolbar.addControl(this.group);
    }

    async refresh() {
        await this.tool.refresh();
    }

    async load() {
        const loadCSS = (href) => new Promise(function (resolve, reject) {
            const el = document.createElement("link");
            el.rel = "stylesheet";
            el.href = href;
            el.onload = resolve;
            el.onerror = reject;
            document.head.appendChild(el);
        });

        await Promise.all([
            loadCSS("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.11.2/css/all.min.css"),
            this.viewer.loadExtension("Autodesk.DataVisualization")
        ]);

        const tool = new AdnDataVizTool(this);
        this.viewer.toolController.registerTool(tool);
        // this.viewer.toolController.activateTool(tool.getName());
        this.tool = tool;

        tool.attachContextMenu();

        console.log("SensorManagerExtension has been loaded.");
        return true;
    }

    async unload() {
        this.tool.detachContextMenu();
        this.viewer.toolController.deactivateTool(this.tool.getName());
        this.viewer.toolController.deregisterTool(this.tool);
        delete this.tool;
        this.tool = null;

        console.log("SensorManagerExtension has been unloaded.");
        return true;
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension("SensorManagerExtension", SensorManagerExtension);