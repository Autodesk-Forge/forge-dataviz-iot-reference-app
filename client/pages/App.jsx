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
import Playground from "./Playground.jsx";

/**
 *
 * @param {Object} props
 * @param {Object} props.appData Data passed to the application.
 * @param {("AutodeskStaging"|"AutodeskProduction")} props.appData.env Forge API environment
 * @param {string} props.appData.docUrn Document URN of model
 * @param {string} props.appData.adapterType Corresponds to Data Adapter used to query data. i.e - synthetic, azure etc.
 * @param {"derivativeV2"|"derivativeV2_EU"|"modelDerivativeV2"|"fluent"|"D3S"|"D3S_EU"} [props.appData.api] Please refer to LMV documentation for more information.
 * @param {string} [props.appData.dataStart] Start date for provided CSV data in ISO string format.
 * @param {string} [props.appData.dataEnd] End date for provided CSV data in ISO string format.
 * @param {Object} props.appContext Contains base urls used to query assets, LMV, data etc.
 * @param {string} [props.appContext.dataUrl] The base url used to configure a specific {@link DataAdapter}
 */
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
                <Route path="/playground">
                    <Playground {...props} />
                </Route>
                <Route path="/">
                    <ReferenceApp {...props} />
                </Route>
            </Switch>
        </div>
    );
}

export default App;
