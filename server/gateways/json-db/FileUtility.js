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

const FS = require("fs");

var FileUtility = {};

FileUtility.loadFile = async function (file) {
    return new Promise((resolve, reject) => {
        FS.readFile(file, { encoding: "utf8" }, (error, data) => {
            if (error) {
                reject(error);
            } else {
                resolve(data);
            }
        });
    });
};

FileUtility.loadJSONFile = async function (file) {
    let data = await FileUtility.loadFile(file);
    try {
        return JSON.parse(data);
    } catch (e) {
        console.error("Unable to parse file data. " + e);
        return {};
    }
};

module.exports = FileUtility;