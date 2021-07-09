/* eslint-disable no-undef */

/**
 * Initialize the configurations
 *
 */
var env = ENV || "local";
var buildNumber = BUILD_NUMBER || "1";

var SiteConfig = require("../shared/config/SiteConfig.js")(env, buildNumber);
var ApplicationContext = require("../shared/config/ApplicationContext.js");
ApplicationContext.setup(SiteConfig);

/**
 * Import required libraries
 */
import React from "react";
import ReactDOM from "react-dom";
import App from "./pages/App.jsx";
import { BrowserRouter } from "react-router-dom";

ReactDOM.render(
    <BrowserRouter>
        <App {...{ appData: __app.dataContext, appContext: ApplicationContext }} />
    </BrowserRouter>,
    document.getElementById("hyperion_container")
);
