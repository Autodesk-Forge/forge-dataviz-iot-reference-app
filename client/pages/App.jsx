/*global STAGE_BASEURL*/
/*eslint no-unused-vars: ["warn", { "vars": "local" }]*/

import React from "react";
import { Route, Switch } from "react-router-dom";
import { createBrowserHistory } from "history";
import ReferenceApp from "./ReferenceApp.jsx";
import Dot from "./Dot.jsx";
import Heatmap from "./Heatmap.jsx";
import EngineSimulation from "./EngineSimulation.jsx";
import TexturedHeatMap from "./TexturedHeatmap.jsx";
import StructureInfo from "./StructureInfo.jsx";
import CustomPage from "./CustomPage.jsx";

function App(props) {
    function createHistory(url = "/") {
        if (!window.browserHistory) {
            window.browserHistory = createBrowserHistory();
        }
        return window.browserHistory;
    }

    // work around when we set the api-gateway
    //TODO: Remove this once we have customized domain
    var BASENAME = (BASENAME = STAGE_BASEURL || "");
    var locationObj = {
        key: window.location.pathname,
        pathname: window.location.pathname,
    };

    return (
        <div className="outer-container">
            <Switch>
                <Route path="/sample">
                    <ReferenceApp appData={props.appData} />
                </Route>
                <Route path="/dot">
                    <Dot appData={props.appData} />
                </Route>
                <Route path="/heatmap">
                    <Heatmap appData={props.appData} />
                </Route>
                <Route path="/engine">
                    <EngineSimulation appData={props.appData} />
                </Route>
                <Route path="/structure">
                    <StructureInfo appData={props.appData} />
                </Route>
                <Route path="/texturedmap">
                    <TexturedHeatMap appData={props.appData} />
                </Route>
                {/* Route to custom-developed client app page */}
                <Route path="/app">
                    <CustomPage appData={props.appData} />
                </Route>
                <Route exact={true} path="/">
                    <ReferenceApp appData={props.appData} />
                </Route>
            </Switch>
        </div>
    );
}

module.exports = App;
