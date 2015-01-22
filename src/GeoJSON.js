
var GeoJSON = (function() {

  var METERS_PER_LEVEL = 3;

  var materialColors = {
    brick: '#cc7755',
    bronze: '#ffeecc',
    canvas: '#fff8f0',
    concrete: '#999999',
    copper: '#a0e0d0',
    glass: '#e8f8f8',
    gold: '#ffcc00',
    plants: '#009933',
    metal: '#aaaaaa',
    panel: '#fff8f0',
    plaster: '#999999',
    roof_tiles: '#f08060',
    silver: '#cccccc',
    slate: '#666666',
    stone: '#996666',
    tar_paper: '#333333',
    wood: '#deb887'
  };

  var baseMaterials = {
    asphalt: 'tar_paper',
    bitumen: 'tar_paper',
    block: 'stone',
    bricks: 'brick',
    glas: 'glass',
    glassfront: 'glass',
    grass: 'plants',
    masonry: 'stone',
    granite: 'stone',
    panels: 'panel',
    paving_stones: 'stone',
    plastered: 'plaster',
    rooftiles: 'roof_tiles',
    roofingfelt: 'tar_paper',
    sandstone: 'stone',
    sheet: 'canvas',
    sheets: 'canvas',
    shingle: 'tar_paper',
    shingles: 'tar_paper',
    slates: 'slate',
    steel: 'metal',
    tar: 'tar_paper',
    tent: 'canvas',
    thatch: 'plants',
    tile: 'roof_tiles',
    tiles: 'roof_tiles'
  };
  // cardboard
  // eternit
  // limestone
  // straw

  function getMaterialColor(str) {
    str = str.toLowerCase();
    if (str[0] === '#') {
      return str;
    }
    return materialColors[baseMaterials[str] || str] || null;
  }

  function alignProperties(prop) {
    prop = prop || {};

    var item = {};

    var height    = prop.height    || (prop.levels   ? prop.levels  *METERS_PER_LEVEL : DEFAULT_HEIGHT);
    var minHeight = prop.minHeight || (prop.minLevel ? prop.minLevel*METERS_PER_LEVEL : 0);

    item.height    = min(height/ZOOM_SCALE, MAX_HEIGHT);
    item.minHeight = minHeight/ZOOM_SCALE;

    var color;
    var wallColor = prop.material ? getMaterialColor(prop.material) : (prop.wallColor || prop.color);
    if (wallColor && (color = Color.parse(wallColor))) {
      color = color.alpha(ZOOM_FACTOR);
      item.altColor  = ''+ color.lightness(0.8);
      item.wallColor = ''+ color;
    }

    var roofColor = prop.roofMaterial ? getMaterialColor(prop.roofMaterial) : prop.roofColor;
    if (roofColor && (color = Color.parse(roofColor))) {
      item.roofColor = ''+ color.alpha(ZOOM_FACTOR);
    }

    switch (prop.shape) {
      case 'cylinder':
      case 'cone':
      case 'dome':
      case 'sphere':
        item.shape = prop.shape;
        item.isRotational = true;
      break;

      case 'pyramid':
        item.shape = prop.shape;
      break;
    }

    switch (prop.roofShape) {
      case 'cone':
      case 'dome':
        item.roofShape = prop.roofShape;
        item.isRotational = true;
      break;

      case 'pyramid':
        item.roofShape = prop.roofShape;
      break;
    }

    if (item.roofShape && prop.roofHeight) {
      item.roofHeight = prop.roofHeight/ZOOM_SCALE;
      item.height = max(0, item.height-item.roofHeight);
    } else {
      item.roofHeight = 0;
    }

    if (item.minHeight > item.height) {
      return;
    }

    return item;
  }

  function getGeometries(geometry) {
    var
      i, il, polygon,
      geometries = [], sub;

    switch (geometry.type) {
      case 'GeometryCollection':
        geometries = [];
        for (i = 0, il = geometry.geometries.length; i < il; i++) {
          if ((sub = getGeometries(geometry.geometries[i]))) {
            geometries.push.apply(geometries, sub);
          }
        }
        return geometries;

      case 'MultiPolygon':
        geometries = [];
        for (i = 0, il = geometry.coordinates.length; i < il; i++) {
          if ((sub = getGeometries({ type: 'Polygon', coordinates: geometry.coordinates[i] }))) {
            geometries.push.apply(geometries, sub);
          }
        }
        return geometries;

      case 'Polygon':
        polygon = geometry.coordinates;
      break;

      default: return [];
    }

    var outer = projectPolygon(polygon[0]);

    if (outer) {
      var inner = [];
      for (i = 1, il = polygon.length; i < il; i++) {
        inner[i] = projectPolygon(polygon[i]);
      }

      return [{
        outer: outer,
        inner: inner.length ? inner : null
      }];
    }
  }

  function projectPolygon(polygon) {
    var res = new Int32Array(polygon.length), px;
    for (var i = 0, il = polygon.length; i < il; i++) {
      px = geoToPixel(polygon[i][1], polygon[i][0]);
      res.push(px.x, px.y);
    }

    if (res.length < 8) { // 3 points & end = start (*2)
      return;
    }

    return res;
  }

  function geometryIsRotational(polygon, bbox) {
    var length = polygon.length;
    if (length < 16) {
      return false;
    }

    var
      i,
      width  = bbox.maxX-bbox.minX,
      height = bbox.maxY-bbox.minY,
      ratio  = width/height;

    if (ratio < 0.85 || ratio > 1.15) {
      return false;
    }

    var
      center = { x:bbox.minX + width/2, y:bbox.minY + height/2 },
      radius = (width+height)/4,
      sqRadius = radius*radius;

    for (i = 0; i < length-1; i+=2) {
      var dist = getDistance({ x:polygon[i], y:polygon[i+1] }, center);
      if (dist/sqRadius < 0.8 || dist/sqRadius > 1.2) {
        return false;
      }
    }

    return true;
  }

  function getBBox(footprint) {
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (var i = 0, il = footprint.length-3; i < il; i += 2) {
      minX = min(minX, footprint[i]);
      maxX = max(maxX, footprint[i]);
      minY = min(minY, footprint[i+1]);
      maxY = max(maxY, footprint[i+1]);
    }
    return { x:minX+(maxX-minX)/2 <<0, y:minY+(maxY-minY)/2 <<0 };
  }

  function clone(obj) {
    var res = {};
    for (var p in obj) {
      if (obj.hasOwnProperty(p)) {
        res[p] = obj[p];
      }
    }
    return res;
  }

  return {
    import: function(geojson) {
      if (!geojson || geojson.type !== 'FeatureCollection') {
        return [];
      }

      var
        collection = geojson.features,
        i, il, j, jl,
        res = [],
        feature,
        geometries,
        baseItem, item, bbox;

      for (i = 0, il = collection.length; i < il; i++) {
        feature = collection[i];

        if (feature.type !== 'Feature' || onEach(feature) === false) {
          continue;
        }

        baseItem = alignProperties(feature.properties);

        if ((geometries = getGeometries(feature.geometry))) {
          for (j = 0, jl = geometries.length; j < jl; j++) {
            item = clone(baseItem);
            item.footprint = geometries[j].outer;

            item.bbox = bbox = getBBox(item.footprint);
            item.center = { x:bbox.minX + (bbox.maxX-bbox.minX)/2 <<0, y:bbox.minY + (bbox.maxY-bbox.minY)/2 <<0 };

            if (!item.shape && geometryIsRotational(item.footprint, item.bbox)) {
              item.isRotational = true;
              item.shape = 'cylinder';
            }

            if (item.isRotational) {
              item.radius = (bbox.maxX-bbox.minX)/2;
            }

            if (geometries[j].inner) {
              item.holes = geometries[j].inner;
            }

            item.id = feature.id || feature.properties.id || [item.footprint[0], item.footprint[1], item.height, item.minHeight].join(',');

            if (feature.properties.relationId) {
              item.relationId = feature.properties.relationId;
            }

            item.hitColor = HitAreas.idToColor(item.relationId || item.id);

            res.push(item); // TODO: clone base properties!
          }
        }
      }

      return res;
    }
  };
}());

//    // TODO: simplify on backend
//    footprint = simplifyPolygon(footprint);
