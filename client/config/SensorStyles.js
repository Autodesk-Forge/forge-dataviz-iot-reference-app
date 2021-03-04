import ApplicationContext from "../../shared/config/ApplicationContext.js";

export const SpriteSize = 24;

export const SensorStyleDefinitions = {
    default: {
        url: `${ApplicationContext.assetUrlPrefix}/images/circle.svg`,
        highlightedUrl: `${ApplicationContext.assetUrlPrefix}/images/circle_highlighted.svg`,
        color: 0xffffff,
        highlightedColor: 0xffffff,
        //You may use this instead of highlightedUrl and highlightedColor to simply color over the regular url image
        // highlightedColor: 0xa1c5ff,
    },
};

/**
 * A map that maps a property ID with its corresponding color stop values.
 * This mapping is used for both heatmap rendering, as well as for heatmap
 * slider background color. See registerSurfaceShadingColors API for usage
 * details.
 */
export const PropIdGradientMap = {
    Temperature: [0x0000ff, 0x00ff00, 0xffff00, 0xff0000],
    Humidity: [0x00f260, 0x0575e6],
    "CO₂": [0x1e9600, 0xfff200, 0xff0000],
};
