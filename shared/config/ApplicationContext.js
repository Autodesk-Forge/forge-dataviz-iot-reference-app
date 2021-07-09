/**
 * Configuration class
 */

// The config param only work for server side.
var ApplicationContext = function () {};

ApplicationContext.prototype.setup = function (config) {
    this.assetUrlPrefix = config.assetUrlPrefix;
    this.assetRoot = config.assetRoot || config.assetUrlPrefix;
    this.lmvUrl = config.lmvUrl;
    this.dataUrl = config.dataUrl;
    this.baseUrl = config.baseUrl;

    this.env = config.env;
};

module.exports = new ApplicationContext();
