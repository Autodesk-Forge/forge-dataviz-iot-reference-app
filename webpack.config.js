var ExtractTextPlugin = require("extract-text-webpack-plugin");
const Path = require("path");

var env = process.env.ENV || "local";
var buildNumber = process.env.BUILD_NUMBER || "1";
var SiteConfig = require("./shared/config/SiteConfig.js")(env, buildNumber);

var cssConfig = SiteConfig.toSCSSEnv();
const isDevEnv = /^(local|dev|develop)$/gi.test(env);
const sourceMapOptions = isDevEnv ? "eval-cheap-module-source-map" : "none";
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
                loader: "babel-loader",
                exclude: Path.resolve(__dirname, "node_modules"),
                query: {
                    presets: ["react", "es2015"],
                    plugins: ["transform-object-rest-spread"]
                }
            },
            {
                test: /\.(css|sass|scss)$/,
                use: ExtractTextPlugin.extract({
                    use: [
                        {
                            loader: "css-loader"
                        },
                        {
                            loader: "sass-loader",
                            options: {
                                data: cssConfig
                            }
                        }
                    ]
                })
            }
        ]
    },
    plugins: [
        new ExtractTextPlugin({
            filename: "[name].bundle.css",
            allChunks: true
        }),
        require("./tools/WebpackDefines.js")
    ]
};

module.exports = config;
