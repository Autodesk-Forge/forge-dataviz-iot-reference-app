const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const Path = require("path");

var env = process.env.ENV || "local";
var buildNumber = process.env.BUILD_NUMBER || "1";
var SiteConfig = require("./shared/config/SiteConfig.js")(env, buildNumber);

var cssConfig = SiteConfig.toSCSSEnv();
const isDevEnv = /^(local|dev|develop)$/gi.test(env);
const sourceMapOptions = isDevEnv ? "eval-cheap-module-source-map" : false;
const mode = isDevEnv ? "development" : "production";

var config = {
    entry: ["./client/app.js", "./scss/main.scss"],
    output: {
        filename: "bundle.js",
        path: __dirname + "/dist",
    },
    resolve: {
        alias: {
            PIXI: Path.resolve(__dirname, "node_modules/pixi.js/"),
        },
    },
    mode: mode,
    devtool: sourceMapOptions,
    externals: {
        three: "THREE",
    },
    module: {
        rules: [
            {
                test: /.jsx?$/,
                use: [
                    {
                        loader: "babel-loader",
                        options: {
                            presets: ["@babel/react", ["@babel/env", { "targets": "defaults" }]],
                            plugins: ["@babel/plugin-transform-spread"]
                        },
                    },
                ],
                exclude: Path.resolve(__dirname, "node_modules")
            },
            {
                test: /forge-dataviz-iot-react-component.*.jsx?$/,
                use: [
                    {
                        loader: "babel-loader",
                        options: {
                            presets: ["@babel/react", ["@babel/env", { "targets": "defaults" }]],
                            plugins: ["@babel/plugin-transform-spread"]
                        }
                    },
                ],
                exclude: Path.resolve(__dirname, "node_modules", "forge-dataviz-iot-react-components", "node_modules"),
            },
            {
                test: /\.(css|sass|scss)$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: "css-loader"
                    },
                    {
                        loader: "sass-loader",
                        options: {
                            additionalData: cssConfig
                        }
                    }
                ]
            },
            {
                test: /\.svg$/i,
                use: {
                    loader: "svg-url-loader",
                    options: {
                        // make loader to behave like url-loader, for all svg files
                        encoding: "base64",
                    },
                },
            },
        ],
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: "[name].bundle.css"
        }),
        require("./tools/WebpackDefines.js"),
    ],
};

module.exports = config;
