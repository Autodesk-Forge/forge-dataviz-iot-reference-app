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
var React = require("react");
var ReactDOM = require("react-dom");
var AppPage = require("./pages/App.jsx");

import { BrowserRouter } from "react-router-dom";

ReactDOM.render(
    <BrowserRouter>
        <AppPage {...{ appData: __app.dataContext, appContext: ApplicationContext }} />
    </BrowserRouter>,
    document.getElementById("hyperion_container")
);
