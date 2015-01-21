var BLDGS = (function(global) {


function loadJSON(url, callback) {
  var req = new XMLHttpRequest();

  req.onreadystatechange = function() {
    if (req.readyState !== 4) {
      return;
    }
    if (!req.status || req.status < 200 || req.status > 299) {
      return;
    }
    if (callback && req.responseText) {
      var json;
      try {
        json = JSON.parse(req.responseText);
      } catch(ex) {}

      callback(json);
    }
  };

  req.open('GET', url);
  req.send(null);

  return req;
}

function pattern(str, param) {
  return str.replace(/\{(\w+)\}/g, function(tag, key) {
    return param[key] || tag;
  });
}

function intersects(x, y, bbox) {
  return (x > bbox.minX && x < bbox.maxX && y > bbox.minY && y < bbox.maxY);
}

function extract(x, y, w, h, features) {
  var min = pixelToGeo(x, y);
  var max = pixelToGeo(x+w, y+h);

  var bbox = {
    minX: min.longitude,
    maxX: max.longitude,
    minY: min.latitude,
    maxY: max.latitude
  };

  // TODO: handle GeometryCollections
  return features.filter(function(feature) {
    var geometry = feature.geometry;

    switch (geometry.type) {
      case "Point":
        return intersects(geometry.coordinates, bbox);

      case "MultiPoint":
      case "LineString":
        for (var i = 0; i < geometry.coordinates.length; i++) {
          if (intersects(geometry.coordinates[i], bbox)) {
            return true;
          }
        }
        return false;

      case "MultiLineString":
        for (var i = 0; i < geometry.coordinates.length; i++) {
          for (var j = 0; j < geometry.coordinates[i].length; j++) {
            if (intersects(geometry.coordinates[i][j], bbox)) {
              return true;
            }
          }
        }
        return false;

      case "Polygon":
        for (var i = 0; i < geometry.coordinates[0].length; i++) {
          if (intersects(geometry.coordinates[0][i], bbox)) {
            return true;
          }
        }
        return false;

      case "MultiPolygon":
        for (var i = 0; i < geometry.coordinates.length; i++) {
          for (var j = 0; j < geometry.coordinates[i][0].length; j++) {
            if (intersects(geometry.coordinates[i][0][j], bbox)) {
              return true;
    }
          }
        }
        return false;
    }
  });
}


// TODO: consider using CRS EPSG:3857

function BLDGS(options) {
  options = options || {};

  this.tileSize = options.tileSize || 256;
  this.minZoom  = options.minZoom !== undefined ? options.minZoom : 14;
  this.maxZoom  = options.maxZoom || Infinity;

  this._scaleThreshold = options.scaleThreshold || 16;

  var host = 'data.osmbuildings.org';
  var path = '/0.2/'+ (options.key || 'anonymous');

  this._tileURL    = options.tileURL    || 'http://{s}.'+ host + path +'/tile/{z}/{x}/{y}.json';
  this._featureURL = options.featureURL || 'http://'    + host + path +'/feature/{id}.json';
  this._bboxURL    = options.bboxURL    || 'http://'    + host + path +'/bbox.json?bbox={n},{e},{s},{w}';

  this._isLoading = {};
}

BLDGS.ATTRIBUTION = 'Data Service &copy; <a href="http://bld.gs">BLDGS</a>';

BLDGS.prototype = {
  // DEPRECATED
  getTile: function(x, y, zoom, callback) {
    console.warn('BLDGS: getTile() is deprecated, use loadTile() instead');
    return this.loadTile(x, y, zoom, callback);
  },

  // DEPRECATED
  getFeature: function(id, callback) {
    console.warn('BLDGS: getFeature() is deprecated, use loadFeature() instead');
    return this.loadFeature(id, callback);
  },

  // DEPRECATED
  getBBox: function(n, e, s, w, callback) {
    console.warn('BLDGS: getBBox() is deprecated, use loadBBox() instead');
    return this.loadBBox(n, e, s, w, callback);
  },

  loadTile: function(x, y, z, callback) {
    if (z < this.minZoom || z > this.maxZoom) {
      return false;
    }

    if (z <= this._scaleThreshold) {
      var s = 'abcd'[(x+y) % 4];
      var url = pattern(this._tileURL, { s:s, x:x, y:y, z:z });
      return this._load(url, callback);
    }

    var scale = Math.pow(2, z-this._scaleThreshold);
    x /= scale;
    y /= scale;
    z = this._scaleThreshold;

    var s = 'abcd'[(x+y) % 4];
    var url = pattern(this._tileURL, { s:s, x:x, y:x, z:z });
    return this._load(url, function(x, y, z, data) {
      data.features = extract(data.features, x, y, this.tileSize, this.tileSize);
      callback(x, y, z, data);
    });
  },

  loadFeature: function(id, callback) {
    var url = pattern(this._featureURL, { id:id });
    return this._load(url, callback);
  },

  loadBBox: function(n, e, s, w, callback) {
    var url = pattern(this._bboxURL, { n:n.toFixed(5), e:e.toFixed(5), s:s.toFixed(5), w:w.toFixed(5) });
    return this._load(url, callback);
  },

  abortAll: function() {
    for (var url in this._isLoading) {
      this._isLoading[url].abort();
    }
  },

  destroy: function() {
    this.abortAll();
  },

  _load: function(url, callback) {
    if (this._isLoading[url]) {
      return;
    }

    var self = this;
    this._isLoading[url] = loadJSON(url, function(data) {
      delete self._isLoading[url];
      callback(data);
    });

    return this._isLoading[url];
  }
};

return BLDGS; }(this));