
function getDistance(p1, p2) {
  var
    dx = p1.x-p2.x,
    dy = p1.y-p2.y;
  return dx*dx + dy*dy;
}

function rad(deg) {
  return deg * PI / 180;
}

function deg(rad) {
  return rad / PI * 180;
}

function pixelToGeo(x, y) {
  var res = {};
  x /= MAP_SIZE;
  y /= MAP_SIZE;
  res[LAT] = y <= 0  ? 90 : y >= 1 ? -90 : deg(2 * atan(exp(PI * (1 - 2*y))) - HALF_PI),
  res[LON] = (x === 1 ?  1 : (x%1 + 1) % 1) * 360 - 180;
  return res;
}

function geoToPixel(lat, lon) {
  var latitude  = min(1, max(0, 0.5 - (log(tan(QUARTER_PI + HALF_PI * lat / 180)) / PI) / 2)),
    longitude = lon/360 + 0.5;
  return {
    x: longitude*MAP_SIZE <<0,
    y: latitude *MAP_SIZE <<0
  };
}

function fromRange(sVal, sMin, sMax, dMin, dMax) {
  sVal = min(max(sVal, sMin), sMax);
  var rel = (sVal-sMin) / (sMax-sMin),
    range = dMax-dMin;
  return min(max(dMin + rel*range, dMin), dMax);
}

function isVisible(bbox) {
   var viewport = {
    minX: ORIGIN_X,
    maxX: ORIGIN_X+WIDTH,
    minY: ORIGIN_Y,
    maxY: ORIGIN_Y+HEIGHT
  };

  // TODO: checking footprint is sufficient for visibility - NOT VALID FOR SHADOWS!
  return (
    intersects(bbox.minX, bbox.minY, viewport) ||
    intersects(bbox.maxX, bbox.minY, viewport) ||
    intersects(bbox.maxX, bbox.maxY, viewport) ||
    intersects(bbox.minX, bbox.maxY, viewport)
  );
}

function intersects(x, y, bbox) {
  return (x > bbox.minX && x < bbox.maxX && y > bbox.minY && y < bbox.maxY);
}
