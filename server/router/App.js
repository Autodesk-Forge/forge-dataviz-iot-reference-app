const ApplicationContext = require("../../shared/config/ApplicationContext.js");

const App = function (props) {
    // Use minified build for 'hyperion.autodesk.io' so we get analytics data.
    const viewer3dJs = ApplicationContext.env === "prod" ? "viewer3D.min.js" : "viewer3D.js";
    const bannerImage = `${ApplicationContext.assetUrlPrefix}/assets/banner-home.png`;

    return `<html>
    <head>
        <meta charSet="utf-8" />
        <meta
            name="viewport"
            content="width=device-width, minimum-scale=1.0, initial-scale=1, user-scalable=no"
        />
        <meta property="og:title" content="hyperion.io" />
        <meta property="og:image" content="${bannerImage}" />
        <title>${props.title}</title>
        <link rel="stylesheet" href="${ApplicationContext.lmvUrl}/style.css" />
        <link rel="stylesheet" href="${ApplicationContext.assetRoot}/dist/main.bundle.css" />
        <script src="${ApplicationContext.lmvUrl}/${viewer3dJs}" ></script>
        <link rel="icon" type="image/png" href="https://www.autodesk.com/favicon.ico" />
    </head>
    <body>
        <div id="hyperion_container">
            <script>
                var __app = __app || {};
                __app.dataContext = ${JSON.stringify(props.appData)};
            </script>
            <script src="${ApplicationContext.assetRoot}/dist/bundle.js" async ></script>
        </div>
    </body>
</html>`;
};

module.exports = App;
