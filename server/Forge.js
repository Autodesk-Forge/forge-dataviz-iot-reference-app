const ForgeSDK = require("forge-apis");
const Q = require("q");

function _interopDefault(ex) {
    return ex && typeof ex === "object" && "default" in ex ? ex["default"] : ex;
}

const fetch = _interopDefault(require("node-fetch"));

class Forge {
    constructor() {
        this.FORGE_ENV = process.env.FORGE_ENV;
        this.oAuth2TwoLegged = new ForgeSDK.AuthClientTwoLegged(
            process.env.FORGE_CLIENT_ID,
            process.env.FORGE_CLIENT_SECRET,
            ["data:read"],
            false
        );
        this.apiClient = new ForgeSDK.ApiClient();
        this.oAuth2TwoLegged.basePath = process.env.FORGE_API_URL;
        this.apiClient.basePath = process.env.FORGE_API_URL;
    }

    getAuthToken() {
        let defer = Q.defer();
        this.oAuth2TwoLegged.authenticate().then(
            function (credentials) {
                defer.resolve(credentials);
            },
            function (err) {
                defer.reject(err);
            }
        );

        return defer.promise;
    }

    /**
     * We will provide public access token for our public demo model
     */
    getHyperionDefault() {
        return fetch("https://hyperion-dev.autodesk.io/api/app/config", {
            method: "GET",
            cache: "no-cache",
            headers: {
                app: "hyperion-reference-app",
            },
        }).then((response) => response.json());
    }

    async uploadAndTranslate(filename, buffer, isSVF2, callback, error) {
        let oAuth2TwoLegged = new ForgeSDK.AuthClientTwoLegged(
            process.env.FORGE_CLIENT_ID,
            process.env.FORGE_CLIENT_SECRET,
            ["data:read", "data:write", "bucket:read", "bucket:create"],
            false
        );
        oAuth2TwoLegged.basePath = process.env.FORGE_API_URL;
        let targetBucket = process.env.FORGE_BUCKET;
        let objectsApi = new ForgeSDK.ObjectsApi(this.apiClient);
        let derivativesApi = new ForgeSDK.DerivativesApi(this.apiClient);
        let bucketApi = new ForgeSDK.BucketsApi(this.apiClient);

        oAuth2TwoLegged.authenticate().then(
            async function (credentials) {
                // Upload the file to OSS
                try {
                    await bucketApi.getBucketDetails(targetBucket, oAuth2TwoLegged, credentials);
                } catch (error) {
                    // create the bucket if it is not exists
                    if (error.statusCode == 404) {
                        let bucketBody = {
                            bucketKey: targetBucket,
                            policyKey: "persistent",
                        };

                        try {
                            await bucketApi.createBucket(
                                bucketBody,
                                {},
                                oAuth2TwoLegged,
                                credentials
                            );
                        } catch (err) {
                            console.error(err);
                        }
                    }
                }

                objectsApi
                    .uploadObject(
                        targetBucket,
                        filename,
                        buffer.length,
                        buffer,
                        {},
                        oAuth2TwoLegged,
                        credentials
                    )
                    .then(
                        function (data) {
                            let encodedURN = Buffer.from(data["body"]["objectId"]).toString(
                                "base64"
                            );
                            let job = new ForgeSDK.JobPayload();
                            job.input = new ForgeSDK.JobPayloadInput();
                            job.input.urn = encodedURN;
                            job.input.compressedUrn = false;
                            let OutputPayload;
                            if (isSVF2) {
                                OutputPayload = ForgeSDK.JobSvf2OutputPayload;
                            } else {
                                OutputPayload = ForgeSDK.JobSvfOutputPayload;
                            }
                            job.output = new ForgeSDK.JobPayloadOutput(
                                [
                                    new OutputPayload("svf", {
                                        views: [
                                            ForgeSDK.JobSvfOutputPayload.ViewsEnum["2d"],
                                            ForgeSDK.JobSvfOutputPayload.ViewsEnum["3d"],
                                        ],
                                        advanced: { generateMasterViews: true },
                                    }),
                                ],
                                {
                                    destination: new ForgeSDK.JobPayloadDestination(
                                        ForgeSDK.JobPayloadDestination.RegionEnum.US
                                    ),
                                }
                            );
                            // Start translation Job
                            derivativesApi
                                .translate(job, { xAdsForce: true }, oAuth2TwoLegged, credentials)
                                .then(
                                    function (data) {
                                        callback(data);
                                    },
                                    function (err) {
                                        console.error(err);
                                        error(err);
                                    }
                                );
                        },
                        function (err) {
                            console.error(err);
                            error(err);
                        }
                    );
            },
            function (err) {
                console.error(err);
                error(err);
            }
        );
    }

    getJobStatus(urn, callback) {
        let derivativesApi = new ForgeSDK.DerivativesApi(this.apiClient);
        let oAuth2TwoLegged = this.oAuth2TwoLegged;
        oAuth2TwoLegged.authenticate().then(function (credentials) {
            derivativesApi.getManifest(urn, {}, oAuth2TwoLegged, credentials).then(function (data) {
                callback(data);
            });
        });
    }
}

module.exports = Forge;
