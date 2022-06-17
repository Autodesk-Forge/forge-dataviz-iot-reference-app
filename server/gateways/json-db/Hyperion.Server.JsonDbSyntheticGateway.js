//
// Copyright 2021 Autodesk
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

const DataGateway = require("forge-dataviz-iot-data-modules/server/gateways/Hyperion.Server.DataGateway");
const tweenFunctions = require("tween-functions");
const _ = require("lodash");
const lodashId = require("lodash-id");
const pluralize = require("pluralize");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const { loadJSONFile } = require("./FileUtility.js");
const validateData = require("./validate-data");
const mixins = require("./mixins");

const START_DATE = new Date("2020-01-01");

function randomSign() {
    return Math.random() > 0.5 ? 1 : -1;
}

function random(v) {
    return randomSign() * Math.random() * v;
}

function weekNum(time) {
    var weekNo = Math.abs(Math.ceil(((time - START_DATE) / 86400000 + 1) / 7));
    return weekNo % 2;
}

class Synthetic {
    /**
     *
     * @param {string} configFile File path to config file defining the data stops and range values used to generate synthetic data. For an example, refer to https://github.com/Autodesk-Forge/forge-dataviz-iot-reference-app/blob/main/server/gateways/synthetic-data/config.json
     */
    constructor(configFile) {
        this.configFile = configFile;
    }

    nextStop(stops, index, direction) {
        let nextIndex = index + 1 * direction;

        while (nextIndex < 0 && stops.length > 0) {
            nextIndex += stops.length;
        }
        nextIndex = nextIndex % stops.length;

        let stop = stops[nextIndex].slice(0);
        if ((nextIndex > index && direction < 0) || (nextIndex < index && direction > 0)) {
            stop[0] += 24 * direction;
        }

        return stop;
    }

    _getTweenFunction(start, end) {
        return start > end ? "easeInSine" : "easeOutSine";
    }

    _getStops(sensorType, time) {
        let week = weekNum(time);
        let day = time.getDay() % 7;
        let sensorConfig =
            this.config["Strategy"][sensorType] || this.config["Strategy"]["Temperature"];
        return sensorConfig[day][week];
    }

    async value(sensorType, currentTime, interval) {
        if (!this.config) this.config = await loadJSONFile(this.configFile);
        let hour = this._timeToDecimal(currentTime);
        let self = this;
        let stops = this._getStops(sensorType, currentTime);
        let { min, max } = this.config["Range"][sensorType] || this.config["Range"]["Temperature"];

        function tweenValue(hour, start, end) {
            let duration = end[0] - start[0];
            let current = hour - start[0];

            let startV = min + (max - min) * start[1];
            let endV = min + (max - min) * end[1];

            let variant = ((endV - startV) / (duration / interval)) * random(5);
            let tween = self._getTweenFunction(startV, endV);
            let v = tweenFunctions[tween](current, startV, endV, duration) + variant;
            return v;
        }

        for (let i = 0; i < stops.length; i++) {
            let c = stops[i];
            let p = this.nextStop(stops, i, -1);
            let n = this.nextStop(stops, i, 1);

            if (c[0] >= hour && p[0] <= hour) {
                return tweenValue(hour, p, c);
            } else if (c[0] <= hour && n[0] >= hour) {
                return tweenValue(hour, c, n);
            }
        }
    }

    _timeToDecimal(time) {
        return time.getHours() + time.getMinutes() / 60 + time.getSeconds() / 60 / 60;
    }
}

/**
 * @classdesc A data gateway that supplies synthetic data provided json-server
 * @class
 * @augments DataGateway
 * @memberof Autodesk.DataVisualization.Data
 * @alias Autodesk.DataVisualization.Data.JsonDbSyntheticGateway
 */
class JsonDbSyntheticGateway extends DataGateway {
    constructor(jsonDbFile, configFile) {
        super("JsonDbSyntheticGateway");

        this.configFile = configFile;
        this.options = { foreignKeySuffix: "Id", _isFake: false };

        let db = low(new FileSync(jsonDbFile));

        validateData(db.getState())

        // Add lodash-id methods to db
        db._.mixin(lodashId);

        // Add specific mixins
        db._.mixin(mixins);

        // Expose database
        this.db = db;
    }

    // Embed function
    embed(name, resource, e) {
        e &&
            [].concat(e).forEach((externalResource) => {
                if (this.db.get(externalResource).value) {
                    const query = {};
                    const singularResource = pluralize.singular(name);
                    query[`${singularResource}${this.options.foreignKeySuffix}`] = resource.id;
                    resource[externalResource] = this.db
                        .get(externalResource)
                        .filter(query)
                        .value();
                }
            })
    }

    // Expand function used
    expand(name, resource, e) {
        e &&
            [].concat(e).forEach((innerResource) => {
                const plural = pluralize(innerResource);
                if (this.db.get(plural).value()) {
                    const prop = `${innerResource}${this.options.foreignKeySuffix}`;
                    resource[innerResource] = this.db
                        .get(plural)
                        .getById(resource[prop])
                        .value();
                }
            })
    }

    async getDeviceModels(/*embed = false*/) {
        // Resource chain
        let chain = this.db.get("deviceModels");
        // embed and expand
        chain = chain.cloneDeep().forEach((element) => {
            this.embed("deviceModels", element, "properties");

            // if (embed) {
            //     this.embed("deviceModels", element, "devices");
            // }
        });

        return chain.value().map((element) => {
            return {
                deviceModelId: element.code,
                deviceModelName: element.name,
                deviceModelDesc: element.description,
                deviceProperties: element.properties.map(property => {
                    return {
                        propertyId: property.code,
                        propertyName: property.name,
                        propertyDesc: property.description,
                        propertyType: property.type,
                        propertyUnit: property.unit,
                        rangeMin: property.rangeMin,
                        rangeMax: property.rangeMax
                    };
                })
            };
        });
    }

    async getDevicesInModel(deviceModelId) {
        // Resource chain
        let chain = this.db.get("devices");

        // embed and expand
        chain = chain.cloneDeep().forEach((element) => {
            this.expand("devices", element, "deviceModel");
        });

        chain = chain.filter((element) => {
            return element.deviceModel.code = deviceModelId;
        });

        return {
            deviceModelId: deviceModelId,
            deviceInfo: chain.value().map((element) => {
                return {
                    id: element.code,
                    name: element.name,
                    position: Object.assign({}, element.position),
                    lastActivityTime: element.lastActivityTime
                };
            })
        };
    }

    async getAggregates(deviceId, propertyId, startSecond, endSecond, resolution) {
        deviceId; // Not used for synthetic data generation.
        propertyId; // Not used for synthetic data generation.

        let synthetic = new Synthetic(this.configFile);

        // Just sample data, no need to validate existence of device/property IDs.
        const totalSeconds = Math.abs(endSecond - startSecond);

        let dataPoints = 0;
        if (resolution === "1d" || resolution == "PT1D") {
            dataPoints = 1 + Math.floor(totalSeconds / (60 * 60 * 24));
        } else if (resolution === "1h" || resolution == "PT1H") {
            dataPoints = 1 + Math.floor(totalSeconds / (60 * 60));
        } else if (resolution === "1m") {
            dataPoints = 1 + Math.floor(totalSeconds / 60);
        } else {
            dataPoints = 1 + Math.floor(totalSeconds / 60 / 5);
        }

        // Keep to a reasonable data points to return to client.
        dataPoints = dataPoints > 1 ? dataPoints : 2;
        const maxDataPoints = dataPoints < 100 ? dataPoints : 100;

        const gapSeconds = Math.floor(totalSeconds / (maxDataPoints - 1));

        const timestamps = [];
        const countValues = [];
        const minValues = [];
        const maxValues = [];
        const avgValues = [];
        const sumValues = [];
        const stdDevValues = [];

        let currSecond = startSecond;
        for (let i = 0; i < maxDataPoints; ++i, currSecond += gapSeconds) {
            timestamps.push(currSecond);

            // Generate a series of random data points.
            let values = [];
            let step = gapSeconds / 32;
            let intervalToHour = gapSeconds / 60 / 60;
            for (let i = 0; i < 32; i++) {
                let time = new Date(Math.round((currSecond + step * i) * 1000));
                let v = await synthetic.value(propertyId, time, intervalToHour);
                values.push(v);
            }

            // const values = [...new Array(32)].map((_) => Math.random() * gap + min);

            countValues.push(values.length);

            minValues.push(Math.min(...values));
            maxValues.push(Math.max(...values));

            const sum = values.reduce((p, c) => p + c);
            const avg = sum / values.length;
            sumValues.push(sum);
            avgValues.push(avg);

            const sd = values.reduce((p, c) => p + Math.pow(c - avg, 2));
            stdDevValues.push(Math.sqrt(sd / values.length));
        }

        return {
            timestamps: timestamps,
            count: countValues,
            min: minValues.map((v) => parseFloat(v.toFixed(2))),
            max: maxValues.map((v) => parseFloat(v.toFixed(2))),
            avg: avgValues.map((v) => parseFloat(v.toFixed(2))),
            sum: sumValues.map((v) => parseFloat(v.toFixed(2))),
            stdDev: stdDevValues.map((v) => parseFloat(v.toFixed(2))),
        };
    }
}

module.exports = {
    JsonDbSyntheticGateway
};