'use strict';

var SWAGGER_METHODS = ['get', 'post', 'put', 'delete'],
    SWAGGER_VERSION = '1.0';

function Resource(path, options) {
  options = options || {};

  this.path = path;
  this.models = options.models || {};
  this.apis = {};
}

Resource.prototype.getApi = function(path) {
  if (!(path in this.apis)) {
    this.apis[path] = {
      path: path,
      description: '',
      operations: []
    };
  }
  return this.apis[path];
};

var operationType = function(method) {
  method = method.toUpperCase();

  return function(path, summary, operation) {
    if (!operation) {
      operation = summary;
      summary = '';
    } else {
      operation.summary = summary;
    }
    operation.httpMethod = method;

    var api = this.getApi(path);
    api.operations.push(operation);
  };
};

for (var i = 0; i < SWAGGER_METHODS.length; i++) {
  var m = SWAGGER_METHODS[i];
  Resource.prototype[m] = operationType(m);
}


var swagger = module.exports = {};

swagger.Resource = Resource;

swagger.resources = [];

/**
 * Configures swagger-doc for a express or restify server.
 * @param  {Server} server  A server object from express or restify.
 * @param  {{discoveryUrl: string, version: string, basePath: string, swaggerPath: string}} options Options
 */
swagger.configure = function(server, options) {
  var self = this;
  options = options || {};

  var discoveryUrl;
  if ( options.swaggerPath ){
    discoveryUrl = options.swaggerPath;
    this.swaggerPath = options.swaggerPath;
  } else {
    discoveryUrl = options.discoveryUrl || '/resources.json';
  }

  this.server = server;
  this.apiVersion = options.version || this.server.version || '0.1';
  this.basePath = options.basePath;

  this.server.get(discoveryUrl, function(req, res) {
    var result = self._createResponse(req);
    result.apis = self.resources.map(function(r) { return {path: self.swaggerPath + r.path, description: ''}; });

    res.send(result);
  });
};

/**
 * Registers a Resource with the specified path and options.
 * @param  {!String} path     The path of the resource.
 * @param  {{models}} options Optional options that can contain models.
 * @return {Resource}         The new resource.
 */
swagger.createResource = function(path, options) {
  var self = this;

  var resource = new Resource(path, options);
  this.resources.push(resource);

  // if no server is set, dont actually create the route
  // this lets us keep the swagger code without running the swagger server which you may want to do only in dev mode
  if (!this.server) return resource;

  this.server.get(self.swaggerPath + path, function(req, res) {
    var result = self._createResponse(req);
    result.resourcePath = path;
    result.apis = Object.keys(resource.apis).map(function(k) { return resource.apis[k]; });
    result.models = resource.models;

    res.send(result);
  });

  return resource;
};

swagger._createResponse = function(req) {
  var basePath = this.basePath || 'http://' + req.headers.host;
  return {
    swaggerVersion: SWAGGER_VERSION,
    apiVersion: this.apiVersion,
    basePath: basePath
  };
};
