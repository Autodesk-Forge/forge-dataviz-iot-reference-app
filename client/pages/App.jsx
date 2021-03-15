/*global STAGE_BASEURL*/
/*eslint no-unused-vars: ["warn", { "vars": "local" }]*/

import React from "react";
import { Route, Switch } from "react-router-dom";
import ReferenceApp from "./ReferenceApp.jsx";
import Dot from "./Dot.jsx";
import Heatmap from "./Heatmap.jsx";
import EngineSimulation from "./EngineSimulation.jsx";
import TexturedHeatMap from "./TexturedHeatmap.jsx";
import AnimatedSprites from "./AnimatedSprites.jsx";
import StructureInfo from "./StructureInfo.jsx";
import Navisworks from "./Navisworks.jsx";
import CustomPage from "./CustomPage.jsx";

function App(props) {
    return (
        <div className="outer-container">
            <Switch>
                <Route path="/sample">
                    <ReferenceApp {...props} />
                </Route>
                <Route path="/dot">
                    <Dot {...props} />
                </Route>
                <Route path="/heatmap">
                    <Heatmap {...props} />
                </Route>
                <Route path="/engine">
                    <EngineSimulation {...props} />
                </Route>
                <Route path="/structure">
                    <StructureInfo {...props} />
                </Route>
                <Route path="/texturedmap">
                    <TexturedHeatMap {...props} />
                </Route>
                <Route path="/animation">
                    <AnimatedSprites {...props} />
                </Route>
                <Route path="/navisworks">
                    <Navisworks {...props} />
                </Route>
                {/* Route to custom-developed client app page */}
                <Route path="/app">
                    <CustomPage {...props} />
                </Route>
                <Route exact={true} path="/">
                    <ReferenceApp {...props} />
                </Route>
            </Switch>
        </div>
    );
}

module.exports = App;
