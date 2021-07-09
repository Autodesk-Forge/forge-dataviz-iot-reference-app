/* global ENV, BUILD_NUMBER */

/**
 * Important for server side
 * As this is an sample backend server, we did not add authentication guard for all the APIs
 * Please add rate control and authentication check for all endpoints if you are trying to use our code
 */
const path = require("path");
const Forge = require("../Forge");
const FS = require("fs");
const App = require("./App.js");

let SiteConfig = undefined;

if (process && !process.env.LAMBDA) {
    var env = process.env.ENV || "local";
    var buildNumber = process.env.BUILD_NUMBER || "1";
    SiteConfig = require("../../shared/config/SiteConfig.js")(env, buildNumber);
} else {
    SiteConfig = require("../../shared/config/SiteConfig.js")(ENV, BUILD_NUMBER);
}

if (process.env.ENV == "local") {
    require("dotenv").config({
        path: __dirname + "/../.env",
    });
}

var ApplicationContext = require("../../shared/config/ApplicationContext.js");
ApplicationContext.setup(SiteConfig);

module.exports = function (router) {
    function forgeToken(/* req, res */) {
        // user has already configured the ENV
        if (
            process.env.FORGE_DOC_URN &&
            process.env.FORGE_CLIENT_ID &&
            process.env.FORGE_CLIENT_SECRET
        ) {
            return new Forge().getAuthToken().then((token) => {
                return { forgeToken: token.access_token };
            });
        } else {
            // Send request to get the public doc urn and access token from api
            return new Forge().getHyperionDefault().then((data) => {
                process.env.FORGE_DOC_URN = data.urn;
                return { forgeToken: data.access_token };
            });
        }
    }

    // For Security purpose, this is only allowed for local development
    if (process.env.ENV == "local") {
        router.post("/upload/:filename", function (req, res) {
            var data = Buffer.alloc(0);
            req.on("data", function (chunk) {
                data = Buffer.concat([data, chunk]);
            });
            req.on("end", function () {
                if (data.error) {
                    res.status(500).json({
                        error: "Something wrong. ",
                    });
                }
                req.rawBody = data;
                new Forge().uploadAndTranslate(
                    req.params.filename,
                    data,
                    req.headers.enablesvf2 === "true",
                    function (data) {
                        res.status(200).json(data);
                    },
                    function (error) {
                        res.status(500).json(error);
                    }
                );
            });
        });
        router.get("/translation/:urn", function (req, res) {
            let urn = req.params.urn;
            new Forge().getJobStatus(urn, function (data) {
                if (data.body.status == "success") {
                    // Append job to .env
                    let buff = Buffer.from(urn, "base64");
                    let text = buff.toString("ascii");
                    FS.appendFileSync(
                        `${__dirname}/../.env`,
                        `#${text}\nFORGE_DOC_URN=urn:${urn}\n\n`,
                        { flag: "a+" }
                    );
                    process.env.FORGE_DOC_URN = `urn:${urn}`;
                }
                res.status(200).json(data);
            });
        });
        router.get("/upload", function (req, res) {
            res.sendFile(path.join(__dirname, "upload.html"), function (err) {
                if (err) {
                    console.error(err);
                    res.status(404).end("Error");
                }
            });
        });
    }

    /**
     * Retrieve Forge Token to access URN.
     */
    router.get("/api/token", function (req, res) {
        return forgeToken(req, res)
            .then((response) => {
                return res.status(200).json({ access_token: response.forgeToken });
            })
            .catch((error) => {
                if (error.statusCode && error.error) {
                    res.status(error.statusCode).json(JSON.parse(error.error));
                } else {
                    res.status(500).send(`Error: ${error}`);
                }
            });
    });

    /**
     * Wild card handler, need to be the last of the router entry.
     */
    router.get("*", function (req, res) {
        var context = {
            appData: {
                env: process.env.FORGE_ENV,
                api: process.env.FORGE_API,
                docUrn: process.env.FORGE_DOC_URN,
                adapterType: process.env.ADAPTER_TYPE,
            },
            title: "Hyperion Reference App",
        };

        if (process.env.ADAPTER_TYPE == "csv") {
            if (process.env.CSV_DATA_START && process.env.CSV_DATA_END) {
                context.appData.dataStart = process.env.CSV_DATA_START;
                context.appData.dataEnd = process.env.CSV_DATA_END;
            } else {
                console.error(
                    "variable CSV_DATA_START and CSV_DATA_END is required to use CSV file as a data provider"
                );
                res.send(
                    "variable CSV_DATA_START and CSV_DATA_END is required to use CSV file as a data provider"
                );
            }
        }

        if (!process.env.FORGE_DOC_URN) {
            new Forge().getHyperionDefault().then((data) => {
                process.env.FORGE_DOC_URN = data.urn;
                context.appData.docUrn = data.urn;

                res.status(200);

                var pageString = App(context);

                res.setHeader("Cache-Control", "no-cache");
                res.send("<!DOCTYPE html>\n" + pageString);
            });
        } else {
            res.status(200);

            var pageString = App(context);

            res.setHeader("Cache-Control", "no-cache");
            res.send("<!DOCTYPE html>\n" + pageString);
        }
    });
};
