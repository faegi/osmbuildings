
var Data = {

  tiles: {},
  duplicates: {}, // maintain a list of items in order to avoid duplicates on tile borders
  items: [],

//  set: function(data) {
//    this.isStatic = true;
//    this.items = [];
//    this.duplicates = {};
//    HitAreas.reset();
//    this._staticData = data;
//    this.addRenderItems(this._staticData, true);
//  },

  update: function() {
    this.items = [];
    this.duplicates = {};
    HitAreas.reset();

    if (ZOOM < MIN_ZOOM) {
      return;
    }

//    if (this.isStatic && this._staticData) {
//      this.addRenderItems(this._staticData);
//      return;
//    }

    if (!this.provider) {
      return;
    }

    this.provider.abortAll();

    var
      tileSize = this.provider.tileSize,
      minX = ORIGIN_X/tileSize <<0,
      minY = ORIGIN_Y/tileSize <<0,
      maxX = ceil((ORIGIN_X+WIDTH) /tileSize),
      maxY = ceil((ORIGIN_Y+HEIGHT)/tileSize),
      x, y;

    var self = this;
    var key;
    for (y = minY; y <= maxY; y++) {
      for (x = minX; x <= maxX; x++) {
        key = [x, y].join(',');
        if (this.tiles[ZOOM] && this.tiles[ZOOM][key]) {
					setTimeout(this.processTiles.bind(this), 1);
          continue;
        }

        this.provider.loadTile(x, y, ZOOM, (function(key) {
          return function(data) {
            if (!self.tiles[ZOOM]) self.tiles[ZOOM] = {};
            self.tiles[ZOOM][key] = GeoJSON.import(data);
            self.processTiles();
          };
        }(key)));
      }
    }

    this.dropInvisibleTiles();
  },

  processTiles: function() {
    var tiles = this.tiles[ZOOM], items;
    for (var key in tiles) {
      items = tiles[key];
      for (var i = 0, il = items.length; i < il; i++) {
        if (!this.duplicates[items[i].id]) {
//        items[i].scale = allAreNew ? 0 : 1;
          this.items.push(items[i]);
          this.duplicates[items[i].id] = 1;
        }
      }
    }
    fadeIn();
  },

  dropInvisibleTiles: function() {
    for (var zoom in this.tiles) {
      if (zoom !== ZOOM) {
        this.tiles[zoom] = []; // not deleting - for performance
      }
    }

    var tileSize = this.provider.tileSize;
    var viewport = {
      minX: ORIGIN_X,
      maxX: ORIGIN_X+WIDTH,
      minY: ORIGIN_Y,
      maxY: ORIGIN_Y+HEIGHT
    };

    var
      tiles = this.tiles[ZOOM],
      pos, x, y;
    for (var key in tiles) {
      pos = key.split(',');
      x = pos.x*tileSize;
      y = pos.y*tileSize;

      if (!intersects(x,          y,          viewport) &&
          !intersects(x+tileSize, y,          viewport) &&
          !intersects(x,          y+tileSize, viewport) &&
          !intersects(x+tileSize, y+tileSize, viewport)
      ) {
        tiles[key] = null; // no delete - for performance
      }
    }
  }
};

/***
function distance(a, b) {
  var dx = a.x-b.x, dy = a.y-b.y;
  return dx*dx + dy*dy;
}

var loadTilesForBBox = function(x, y, w, h, z, callback) {
  var
    tileSize = this._scale(z),
    minX = x/tileSize <<0,
    minY = y/tileSize <<0,
    maxX = Math.ceil((x+w)/tileSize),
    maxY = Math.ceil((y+h)/tileSize),
    tx, ty,
    queue = [];

  for (ty = minY; ty <= maxY; ty++) {
    for (tx = minX; tx <= maxX; tx++) {
      queue.push({ x:tx, y:ty, z:z });
    }
  }

  var center = { x: x+(w-tileSize)/2, y: y+(h-tileSize)/2 };
  queue.sort(function(a, b) {
    return distance(a, center) - distance(b, center);
  });

  for (var i = 0, il = queue.length; i < il; i++) {
    this.loadTile(queue[i].x, queue[i].y, queue[i].z, (function(tile) {
      return function(data) {
        callback(data, tile.x, tile.y, tile.z);
      };
    }(queue[i])));
  }
};
***/
