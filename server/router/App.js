const ApplicationContext = require("../../shared/config/ApplicationContext.js");

const App = function(props) {
    return `<html>
    <head>
        <meta charSet="utf-8" />
        <meta
            name="viewport"
            content="width=device-width, minimum-scale=1.0, initial-scale=1, user-scalable=no"
        />
        <meta property="og:title" content="hyperion.io" />
        <meta property="og:image" content=${ApplicationContext.assetUrlPrefix + "/assets/banner-home.png"} />
        <title>${props.title}</title>
        <link rel="stylesheet" href=${ApplicationContext.lmvUrl + "/style.css"} />
        <link rel="stylesheet" href=${ApplicationContext.assetRoot + "/dist/main.bundle.css"} />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@300&display=swap" />
        <script src="${ApplicationContext.lmvUrl + "/viewer3D.js"}" ></script>
        <link rel="icon" type="image/png" href="https://www.autodesk.com/favicon.ico" />
    </head>
    <body>
        <div id="hyperion_container">
            <script>
                var __app = __app || {};
                __app.dataContext = ${JSON.stringify(props.appData)};
            </script>
            <script src="${ApplicationContext.assetRoot + "/dist/bundle.js"}" async ></script>
        </div>
    </body>
</html>`;
}


module.exports = App;
