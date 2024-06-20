
const { DataAdapter, DeviceModel, DeviceData, AggregatedValues } = require("forge-dataviz-iot-data-modules/client");
const { getTimeInEpochSeconds, getPaddedRange } = require("forge-dataviz-iot-data-modules/shared/Utility");

/**
 * Data adapter class dealing with sample data.
 * @memberof Autodesk.DataVisualization.Data
 * @alias Autodesk.DataVisualization.Data.JsonDbRestApiDataAdapter
 * @augments DataAdapter
 */
export class JsonDbRestApiDataAdapter extends DataAdapter {
    /**
     * Constructs an instance of RestApiDataAdapter.
     */
    constructor(provider = "json", baseName = "") {
        super("JsonDbRestApiDataAdapter", baseName);
        /* eslint-disable no-undef */
        this._provider = provider;
    }

    async addDeviceByModel(device, deviceModel) {
        const data = {
            ...device,
            deviceModelId: deviceModel.id
        };

        return fetch(this._getResourceUrl("api/devices"), {
                method: "post",
                body: JSON.stringify(data),
                headers: new Headers({ "Content-Type": "application/json" })
            })
            .then((response) => response.json())
            .then((rawDevice) => {

                const device = {};
                device.name = rawDevice.name;

                const p = rawDevice.position;
                device.position = new THREE.Vector3(
                    parseFloat(p.x),
                    parseFloat(p.y),
                    parseFloat(p.z)
                );

                device.lastActivityTime = rawDevice.lastActivityTime;
                device.deviceModel = deviceModel;
                device.sensorTypes = deviceModel.propertyIds;

                return device;
            });
    }

    async deleteDevice(deviceId) {
        return fetch(this._getResourceUrl(`api/devices/${deviceId}`), {
                method: "delete"
            })
            .then((response) => response.json())
            .then((rawDevice) => {

                const device = {};
                device.name = rawDevice.name;

                const p = rawDevice.position;
                device.position = new THREE.Vector3(
                    parseFloat(p.x),
                    parseFloat(p.y),
                    parseFloat(p.z)
                );

                device.lastActivityTime = rawDevice.lastActivityTime;

                return device;
            });
    }

    /**
     * Loads all DeviceModel objects from the sample REST API.
     *
     * @returns {Promise<DeviceModel[]>} A promise that resolves to a single
     * &nbsp;dimensional array containing a list of loaded DeviceModel objects. If no
     * &nbsp;DeviceModel is available, the promise resolves to an empty array.
     * @memberof Autodesk.DataVisualization.Data
     * @alias Autodesk.DataVisualization.Data.RestApiDataAdapter#loadDeviceModels
     */
    async loadDeviceModels() {
        const adapterId = this.id;
        return fetch(this._getResourceUrl("api/device-models"))
            .then((response) => response.json())
            .then((rawDeviceModels) => {
                /** @type {DeviceModel[]} */
                const normalizedDeviceModels = [];

                rawDeviceModels.forEach((rdm) => {
                    // Create a normalized device model representation.
                    const ndm = new DeviceModel(rdm.deviceModelId, adapterId);
                    ndm.name = rdm.deviceModelName;
                    ndm.description = rdm.deviceModelDesc;

                    // Generate device property representation.
                    rdm.deviceProperties.forEach((rdp) => {
                        const propId = rdp.propertyId;
                        const propName = rdp.propertyName;

                        const ndp = ndm.addProperty(propId, propName);
                        ndp.description = rdp.propertyDesc;
                        ndp.dataType = rdp.propertyType;
                        ndp.dataUnit = rdp.propertyUnit;
                        ndp.rangeMin = rdp.rangeMin ? rdp.rangeMin : undefined;
                        ndp.rangeMax = rdp.rangeMax ? rdp.rangeMax : undefined;
                    });

                    normalizedDeviceModels.push(ndm);
                });

                // Fetch actual devices for each of the device models.
                return this.fetchDevicesForModels(normalizedDeviceModels);
            });
    }

    /**
     * Fetches actual device IDs and populate DeviceModel objects with them.
     *
     * @param {DeviceModel[]} deviceModels The DeviceModel objects for which
     * &nbsp;actual device IDs are to be populated.
     *
     * @returns {Promise<DeviceModel[]>} A promise that resolves to the
     * &nbsp;DeviceModel objects populated with actual device IDs.
     * @memberof Autodesk.DataVisualization.Data
     * @alias Autodesk.DataVisualization.Data.RestApiDataAdapter#fetchDevicesForModels
     */
    async fetchDevicesForModels(deviceModels) {
        const promises = deviceModels.map((deviceModel) => {
            const model = deviceModel.id;
            return fetch(this._getResourceUrl("api/devices", { model: model }))
                .then((response) => response.json())
                .then((jsonData) => jsonData.deviceInfo);
        });

        return Promise.all(promises).then((deviceInfosList) => {
            // Assign devices to each device model.
            deviceModels.forEach((deviceModel, index) => {
                // Turn data provider specific device data format into
                // the unified data format stored in Device object.
                //
                const deviceInfos = deviceInfosList[index];
                deviceInfos.forEach((deviceInfo) => {
                    const device = deviceModel.addDevice(deviceInfo.id);
                    device.name = deviceInfo.name;

                    const p = deviceInfo.position;
                    device.position = new THREE.Vector3(
                        parseFloat(p.x),
                        parseFloat(p.y),
                        parseFloat(p.z)
                    );

                    device.lastActivityTime = deviceInfo.lastActivityTime;
                    device.deviceModel = deviceModel;
                    device.sensorTypes = deviceModel.propertyIds;
                });
            });

            return deviceModels;
        });
    }

    /**
     * Fetches the property data based on the given device ID.
     *
     * @param {QueryParam} query Parameters of this query.
     *
     * @returns {Promise<DeviceData>} A promise that resolves to an aggregated
     * &nbsp;property data for the queried device.
     * @memberof Autodesk.DataVisualization.Data
     * @alias Autodesk.DataVisualization.Data.RestApiDataAdapter#fetchDeviceData
     */
    async fetchDeviceData(query) {
        const pids = query.propertyIds;
        const promises = pids.map((pid) => this._fetchPropertyData(query, pid));

        return Promise.all(promises).then((deviceDataList) => {
            const deviceData = new DeviceData(query.deviceId);
            deviceDataList.forEach((devData) => deviceData.mergeFrom(devData));
            return deviceData;
        });
    }

    /**
     * Fetches data for a single property based on the given device ID.
     *
     * @param {QueryParam} query Parameters of this query.
     * @param {string} propertyId The ID of the property.
     *
     * @returns {Promise<DeviceData>} A promise that resolves to an aggregated
     * &nbsp;property data for the queried device.
     */
    async _fetchPropertyData(query, propertyId) {
        const url = this._getResourceUrl("api/aggregates", {
            device: query.deviceId,
            property: propertyId,
            startTime: query.dateTimeSpan.startSecond,
            endTime: query.dateTimeSpan.endSecond,
            resolution: query.dateTimeSpan.resolution,
        });

        return fetch(url)
            .then((response) => response.json())
            .then((rawAggregates) => {
                // Convert "rawAggregates" which is in the following format, into "AggregatedValues"
                //
                // rawAggregates = {
                //     timestamps: number[],
                //     count: number[],
                //     min: number[],
                //     max: number[],
                //     avg: number[],
                //     sum: number[],
                //     stdDev: number[]
                // }
                //
                const aggrValues = new AggregatedValues(query.dateTimeSpan);
                aggrValues.tsValues = rawAggregates.timestamps;
                aggrValues.countValues = rawAggregates.count;
                aggrValues.maxValues = rawAggregates.max;
                aggrValues.minValues = rawAggregates.min;
                aggrValues.avgValues = rawAggregates.avg;
                aggrValues.sumValues = rawAggregates.sum;
                aggrValues.stdDevValues = rawAggregates.stdDev;
                aggrValues.setDataRange("avgValues", getPaddedRange(aggrValues.avgValues));

                const deviceData = new DeviceData(query.deviceId);
                const propertyData = deviceData.getPropertyData(propertyId);
                propertyData.setAggregatedValues(aggrValues);

                return deviceData;
            })
            .catch((err) => {
                console.error(err);
            });
    }

    /**
     * Gets the resource URL for a given endpoint with query parameters
     *
     * @param {string} endpoint The endpoint for the URL to generate
     * @param {Object.<string, string>} parameters Key-value pairs of query parameters
     *
     * @returns {string} The string that represents the complete resource URL
     * @private
     */
    _getResourceUrl(endpoint, parameters) {
        parameters = parameters || {};

        parameters["provider"] = this._provider;
        parameters["project"] = "unused";
        const ps = Object.entries(parameters).map(([k, v]) => `${k}=${v}`);
        return `${this._baseName}/${endpoint}?${ps.join("&")}`;
    }
}