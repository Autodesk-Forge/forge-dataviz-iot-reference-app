var express = require("express");
var bodyParser = require("body-parser");

var app = express();
var router = require("express").Router();

app.use(bodyParser.json());

var env = process.env.ENV || "local";
var buildNumber = process.env.BUILD_NUMBER || "1";

var SiteConfig = require("../shared/config/SiteConfig.js")(env, buildNumber);
var ApplicationContext = require("../shared/config/ApplicationContext.js");
ApplicationContext.setup(SiteConfig);



require("./router/DataAPI")(router);
require("./CustomRouter.js")(router); // Override or Add your custom API routes to this file
require("./router/Index.js")(router);

module.exports = {
    app,
    router,
};
