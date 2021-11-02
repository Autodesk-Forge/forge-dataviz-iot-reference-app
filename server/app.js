var express = require("express");
var bodyParser = require("body-parser");

var app = express();
var router = require("express").Router();
const cookieSession = require('cookie-session');

app.use(bodyParser.json());
app.use(cookieSession({
    name: 'forge_session',
    keys: ['forge_secure_key'],
    maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days, same as refresh token
}));

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
