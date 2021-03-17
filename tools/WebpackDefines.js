
var webpack = require("webpack");

var env = process.env.ENV || "local";

var buildNumber = process.env.BUILD_NUMBER || "1";
var STAGE = process.env.STAGE || "";

module.exports = new webpack.DefinePlugin(
    {
        'ENV': JSON.stringify(env),
        'BUILD_NUMBER': JSON.stringify(buildNumber),
        "STAGE_BASEURL": JSON.stringify(STAGE),
        "WEBPACK" : JSON.stringify(1)
    }
);





