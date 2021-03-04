/**
 * Configuration class
 */

// The config param only work for server side.
var ApplicationContext = function () {
    // used to store user grid/list view style to keep it consitant user experience.
};

ApplicationContext.prototype.setup = function (config) {
    this.assetUrlPrefix = config.assetUrlPrefix;
    this.assetRoot = config.assetRoot || config.assetUrlPrefix;
    this.lmvUrl = config.lmvUrl;
    this.fargateUrl = config.fargateUrl;
    this.baseUrl = config.baseUrl;

    this.env = config.env;
};

module.exports = new ApplicationContext();
