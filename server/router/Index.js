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
const OAuth = require('../ForgeThreeOAuth')
const { HubsApi, ProjectsApi, FoldersApi, ItemsApi, UserProfileApi } = require('forge-apis');

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
    function forgeToken(req, res) {
        // user has already configured the ENV
        if (
            process.env.FORGE_DOC_URN &&
            process.env.FORGE_CLIENT_ID &&
            process.env.FORGE_CLIENT_SECRET
        ) {
            let bimLogin = process.env.BIM_LOGIN === 'true'
            if(bimLogin){
                const oauth = new OAuth(req.session);
                return oauth.getInternalToken().then((internalToken) => {
                return {forgeToken: internalToken.access_token}
                });
            }
            else{
                return new Forge().getAuthToken().then((token) => {
                    return { forgeToken: token.access_token };
                });
            }
            
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
                        `#${text}\nFORGE_DOC_URN=urn:${urn}\n\n
                        BIM_LOGIN=false\n`,
                        { flag: "a+" }
                    );
                    process.env.FORGE_DOC_URN = `urn:${urn}`;
                    process.env.BIM_LOGIN = false;
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

        router.get("/bim360", function (req, res) {
            res.sendFile(path.join(__dirname, "bimPage.html"), function (err) {
                if (err) {
                    console.error(err);
                    res.status(404).end("Error");
                }
            });
        });

        function setCORS(req, res, next) {
            res.set("Access-Control-Allow-Origin", process.env.CORS);
            next();
        }

        router.get('/oauth/signout', (req, res) => {
            res.redirect('/');
        });

        router.get('/bim/login', setCORS, (req, res) => {
            process.env.BIM_LOGIN = true
            const oauth = new OAuth(req.session);
            let url = oauth.getClient().generateAuthUrl()
            res.end(url);
        });

        router.get('/oauth/callback', async (req, res, next) => {
            const { code } = req.query;
            const oauth = new OAuth(req.session);
           
            try {
                await oauth.setCode(code);
                res.redirect('/bim360');
            } catch(error) {
                if (error.statusCode && error.error) {
                    res.status(error.statusCode).json(JSON.parse(error.error));
                } else {
                    res.status(500).send(`Error: ${JSON.stringify(error)}`);
                }
            }
        });

        router.get('/oauth/token', async (req, res, next) => {
            const oauth = new OAuth(req.session);
            if (!oauth.isAuthorized()) {
                res.status(401).end();
                return;
            }
        
            try {
                const accessToken = await oauth.getPublicToken();
                res.json(accessToken);
            } catch(err) {
                next(err);
            }
        });

        router.get('/datamanagement', async (req, res) => {
            // The id querystring parameter contains what was selected on the UI tree, make sure it's valid
            const href = decodeURIComponent(req.query.id);
            if (href === '') {
                res.status(500).end();
                return;
            }
        
            // Get the access token
            const oauth = new OAuth(req.session);
            const internalToken = await oauth.getInternalToken();
            if (href === '#') {
                // If href is '#', it's the root tree node
                getHubs(oauth.getClient(), internalToken, res);
            } else {
                // Otherwise let's break it by '/'
                const params = href.split('/');
                const resourceName = params[params.length - 2];
                const resourceId = params[params.length - 1];
                switch (resourceName) {
                    case 'hubs':
                        getProjects(resourceId, oauth.getClient(), internalToken, res);
                        break;
                    case 'projects':
                        // For a project, first we need the top/root folder
                        const hubId = params[params.length - 3];
                        getFolders(hubId, resourceId/*project_id*/, oauth.getClient(), internalToken, res);
                        break;
                    case 'folders':
                        {
                            const projectId = params[params.length - 3];
                            getFolderContents(projectId, resourceId/*folder_id*/, oauth.getClient(), internalToken, res);
                            break;
                        }
                    case 'items':
                        {
                            const projectId = params[params.length - 3];
                            getVersions(projectId, resourceId/*item_id*/, oauth.getClient(), internalToken, res);
                            break;
                        }
                }
            }
        });

        router.get('/user/profile', async (req, res) => {
            const oauth = new OAuth(req.session);
            const internalToken = await oauth.getInternalToken();
            const user = new UserProfileApi();
            const profile = await user.getUserProfile(oauth.getClient(), internalToken);
            res.json({
                name: profile.body.firstName + ' ' + profile.body.lastName,
                picture: profile.body.profileImages.sizeX40
            });
        });

        router.get('/updateURN/:urn', async(req, res)=>{
            let forgeURN = req.params.urn;
            let buff = Buffer.from(forgeURN, "base64");
            let text = buff.toString("ascii");
            FS.appendFileSync(
                `${__dirname}/../.env`,
                `#${text}\nFORGE_DOC_URN=urn:${forgeURN}
                \nBIM_LOGIN=true\n\n`,
                { flag: "a+" }
            );
            process.env.FORGE_DOC_URN = 'urn:'+forgeURN
            res.status(200)
            res.redirect("/")
        })
    
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
                res.status(500).send(`Error: ${JSON.stringify(error)}. Try logging again`);
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

    async function getHubs(oauthClient, credentials, res) {
        const hubs = new HubsApi();
        const data = await hubs.getHubs({}, oauthClient, credentials);
        res.json(data.body.data.map((hub) => {
            let hubType;
            switch (hub.attributes.extension.type) {
                case 'hubs:autodesk.core:Hub':
                    hubType = 'hubs';
                    break;
                case 'hubs:autodesk.a360:PersonalHub':
                    hubType = 'personalHub';
                    break;
                case 'hubs:autodesk.bim360:Account':
                    hubType = 'bim360Hubs';
                    break;
            }
            return createTreeNode(
                hub.links.self.href,
                hub.attributes.name,
                hubType,
                true
            );
        }));
    }
    
    async function getProjects(hubId, oauthClient, credentials, res) {
        const projects = new ProjectsApi();
        const data = await projects.getHubProjects(hubId, {}, oauthClient, credentials);
        res.json(data.body.data.map((project) => {
            let projectType = 'projects';
            switch (project.attributes.extension.type) {
                case 'projects:autodesk.core:Project':
                    projectType = 'a360projects';
                    break;
                case 'projects:autodesk.bim360:Project':
                    projectType = 'bim360projects';
                    break;
            }
            return createTreeNode(
                project.links.self.href,
                project.attributes.name,
                projectType,
                true
            );
        }));
    }
    
    async function getFolders(hubId, projectId, oauthClient, credentials, res) {
        const projects = new ProjectsApi();
        const folders = await projects.getProjectTopFolders(hubId, projectId, oauthClient, credentials);
        res.json(folders.body.data.map((item) => {
            return createTreeNode(
                item.links.self.href,
                item.attributes.displayName == null ? item.attributes.name : item.attributes.displayName,
                item.type,
                true
            );
        }));
    }
    
    async function getFolderContents(projectId, folderId, oauthClient, credentials, res) {
        const folders = new FoldersApi();
        const contents = await folders.getFolderContents(projectId, folderId, {}, oauthClient, credentials);
        const treeNodes = contents.body.data.map((item) => {
            var name = (item.attributes.name == null ? item.attributes.displayName : item.attributes.name);
            if (name !== '') { // BIM 360 Items with no displayName also don't have storage, so not file to transfer
                return createTreeNode(
                    item.links.self.href,
                    name,
                    item.type,
                    true
                );
            } else {
                return null;
            }
        });
        res.json(treeNodes.filter(node => node !== null));
    }
    
    async function getVersions(projectId, itemId, oauthClient, credentials, res) {
        const items = new ItemsApi();
        const versions = await items.getItemVersions(projectId, itemId, {}, oauthClient, credentials);
        res.json(versions.body.data.map((version) => {
            const dateFormated = new Date(version.attributes.lastModifiedTime).toLocaleString();
            const versionst = version.id.match(/^(.*)\?version=(\d+)$/)[2];
            const viewerUrn = (version.relationships != null && version.relationships.derivatives != null ? version.relationships.derivatives.data.id : null);
            if (viewerUrn.indexOf('|') > -1) {
                viewerUrn = viewerUrn.split('|')[1];
            }
            return createTreeNode(
                viewerUrn,
                decodeURI('v' + versionst + ': ' + dateFormated + ' by ' + version.attributes.lastModifiedUserName),
                (viewerUrn != null ? 'versions' : 'unsupported'),
                false
            );

        }));
    }
    
    // Format data for tree
    function createTreeNode(_id, _text, _type, _children) {
        return { id: _id, text: _text, type: _type, children: _children };
    }
};
