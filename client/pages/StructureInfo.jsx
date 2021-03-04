/**
 * This is a sample code to show how to render basic StructureInfo on the screen
 *
 * Heatmap is the terminology we used to show the corresponding sensor values in the room
 * and this is a step foreward by combine both Dot and ModelStructureInfo to created a combined
 * user experience
 */

import React from "react";
import { Viewer } from "forge-dataviz-iot-react-components";
import { HyperionToolContainer } from "forge-dataviz-iot-react-components";

/**
 * @component
 * @param {Object} props
 */
function StructureInfo(props) {
    const { env, token, docUrn } = props.appData;
    const [appState, setAppState] = React.useState(null)

    async function onModelLoaded(viewer, data) {
        const dataVizExt = await viewer.loadExtension("Autodesk.DataVisualization", { useInternal: true });

        // Get Model level info
        let viewerDocument = data.model.getDocumentNode().getDocument();
        const aecModelData = await viewerDocument.downloadAecModelData();
        let levelsExt;
        if (aecModelData) {
            levelsExt = await viewer.loadExtension("Autodesk.AEC.LevelsExtension", {
                doNotCreateUI: true,
            });
        }

        // Model Structure Info
        const structureInfo = new Autodesk.DataVisualization.ModelStructureInfo(data.model);
        const buildingInfo = await structureInfo.generateSurfaceShadingData();

        setAppState({
            viewer,
            dataVizExtn: dataVizExt,
            levelsExt,
            buildingInfo
        });
    }

    // Callback to select floor
    function onSelectedFloorChange(node) {
        const levelsExt = appState.levelsExt;
        const floorSelector = levelsExt.floorSelector;

        if (!node) {
            floorSelector.selectFloor();

        } else {
            floorSelector.selectFloor(node.index, true);
        }
    }

    return (
        <React.Fragment>
            <Viewer
                env={env}
                docUrn={docUrn}
                onModelLoaded={onModelLoaded}
                getToken={async () => await fetch("/api/token").then(res => res.json()).then(data => data.access_token)}
            />
            <HyperionToolContainer
                {...appState}
                structureToolOnly={true}
                defaultFloor={{ index: 0, name: "01 - Entry Level" }}
                updateSelectedFloor={onSelectedFloorChange} />
        </React.Fragment>
    );
}

module.exports = StructureInfo;
