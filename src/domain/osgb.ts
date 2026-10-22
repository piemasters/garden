/** British National Grid conversions using the Ordnance Survey Helmert parameters. */

const AIRY_A = 6_377_563.396;
const AIRY_B = 6_356_256.909;
const WGS84_A = 6_378_137;
const WGS84_B = 6_356_752.314245;
const F0 = 0.9996012717;
const LAT0 = (49 * Math.PI) / 180;
const LON0 = (-2 * Math.PI) / 180;
const EAST0 = 400_000;
const NORTH0 = -100_000;
const N = (AIRY_A - AIRY_B) / (AIRY_A + AIRY_B);
const AIRY_E2 = (AIRY_A * AIRY_A - AIRY_B * AIRY_B) / (AIRY_A * AIRY_A);

const TX = -446.448;
const TY = 125.157;
const TZ = -542.06;
const SCALE = 20.4894e-6;
const RX = seconds(-0.1502);
const RY = seconds(-0.247);
const RZ = seconds(-0.8421);

export interface GridPoint {
  easting: number;
  northing: number;
}

export interface GeographicPoint {
  latitude: number;
  longitude: number;
}

export function wgs84ToGrid(latitude: number, longitude: number): GridPoint {
  const cartesian = toCartesian(latitude, longitude, WGS84_A, WGS84_B);
  const shifted = helmert(cartesian.x, cartesian.y, cartesian.z, TX, TY, TZ, SCALE, RX, RY, RZ);
  const geographic = fromCartesian(shifted.x, shifted.y, shifted.z, AIRY_A, AIRY_B);
  return osgb36ToGrid(geographic.latitude, geographic.longitude);
}

export function gridToWgs84(easting: number, northing: number): GeographicPoint {
  const geographic = gridToOsgb36(easting, northing);
  const cartesian = toCartesian(geographic.latitude, geographic.longitude, AIRY_A, AIRY_B);
  const shifted = helmert(
    cartesian.x,
    cartesian.y,
    cartesian.z,
    -TX,
    -TY,
    -TZ,
    -SCALE,
    -RX,
    -RY,
    -RZ,
  );
  return fromCartesian(shifted.x, shifted.y, shifted.z, WGS84_A, WGS84_B);
}

export function osgb36ToGrid(latitude: number, longitude: number): GridPoint {
  const lat = (latitude * Math.PI) / 180;
  const lon = (longitude * Math.PI) / 180;
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const tanLat = Math.tan(lat);
  const tan2 = tanLat * tanLat;
  const nu = (AIRY_A * F0) / Math.sqrt(1 - AIRY_E2 * sinLat * sinLat);
  const rho = (AIRY_A * F0 * (1 - AIRY_E2)) / (1 - AIRY_E2 * sinLat * sinLat) ** 1.5;
  const eta2 = nu / rho - 1;
  const dLon = lon - LON0;
  const arc = meridionalArc(lat);
  const northing =
    NORTH0 +
    arc +
    (nu / 2) * sinLat * cosLat * dLon ** 2 +
    (nu / 24) * sinLat * cosLat ** 3 * (5 - tan2 + 9 * eta2) * dLon ** 4 +
    (nu / 720) * sinLat * cosLat ** 5 * (61 - 58 * tan2 + tan2 * tan2) * dLon ** 6;
  const easting =
    EAST0 +
    nu * cosLat * dLon +
    (nu / 6) * cosLat ** 3 * (nu / rho - tan2) * dLon ** 3 +
    (nu / 120) *
      cosLat ** 5 *
      (5 - 18 * tan2 + tan2 * tan2 + 14 * eta2 - 58 * tan2 * eta2) *
      dLon ** 5;
  return { easting, northing };
}

export function etrs89ToOsgb36Cartesian(
  x: number,
  y: number,
  z: number,
): { x: number; y: number; z: number } {
  return helmert(x, y, z, TX, TY, TZ, SCALE, RX, RY, RZ);
}

function gridToOsgb36(easting: number, northing: number): GeographicPoint {
  let lat = LAT0;
  let arc = 0;
  do {
    lat = (northing - NORTH0 - arc) / (AIRY_A * F0) + lat;
    arc = meridionalArc(lat);
  } while (Math.abs(northing - NORTH0 - arc) > 0.00001);
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const tanLat = Math.tan(lat);
  const tan2 = tanLat * tanLat;
  const nu = (AIRY_A * F0) / Math.sqrt(1 - AIRY_E2 * sinLat * sinLat);
  const rho = (AIRY_A * F0 * (1 - AIRY_E2)) / (1 - AIRY_E2 * sinLat * sinLat) ** 1.5;
  const eta2 = nu / rho - 1;
  const east = easting - EAST0;
  const vii = tanLat / (2 * rho * nu);
  const viii = (tanLat * (5 + 3 * tan2 + eta2 - 9 * tan2 * eta2)) / (24 * rho * nu ** 3);
  const ix = (tanLat * (61 + 90 * tan2 + 45 * tan2 * tan2)) / (720 * rho * nu ** 5);
  const x = 1 / (cosLat * nu);
  const xi = (nu / rho + 2 * tan2) / (6 * nu ** 3 * cosLat);
  const xii = (5 + 28 * tan2 + 24 * tan2 * tan2) / (120 * nu ** 5 * cosLat);
  const xiia =
    (61 + 662 * tan2 + 1320 * tan2 * tan2 + 720 * tan2 * tan2 * tan2) / (5040 * nu ** 7 * cosLat);
  const latitude = lat - vii * east ** 2 + viii * east ** 4 - ix * east ** 6;
  const longitude = LON0 + x * east - xi * east ** 3 + xii * east ** 5 - xiia * east ** 7;
  return { latitude: (latitude * 180) / Math.PI, longitude: (longitude * 180) / Math.PI };
}

function meridionalArc(lat: number): number {
  const n2 = N * N;
  const n3 = n2 * N;
  return (
    AIRY_B *
    F0 *
    ((1 + N + (5 / 4) * n2 + (5 / 4) * n3) * (lat - LAT0) -
      (3 * N + 3 * n2 + (21 / 8) * n3) * Math.sin(lat - LAT0) * Math.cos(lat + LAT0) +
      ((15 / 8) * n2 + (15 / 8) * n3) * Math.sin(2 * (lat - LAT0)) * Math.cos(2 * (lat + LAT0)) -
      (35 / 24) * n3 * Math.sin(3 * (lat - LAT0)) * Math.cos(3 * (lat + LAT0)))
  );
}

function helmert(
  x: number,
  y: number,
  z: number,
  tx: number,
  ty: number,
  tz: number,
  scale: number,
  rx: number,
  ry: number,
  rz: number,
): { x: number; y: number; z: number } {
  const scaleFactor = 1 + scale;
  return {
    x: tx + scaleFactor * x - rz * y + ry * z,
    y: ty + rz * x + scaleFactor * y - rx * z,
    z: tz - ry * x + rx * y + scaleFactor * z,
  };
}

function toCartesian(
  latitude: number,
  longitude: number,
  semiMajor: number,
  semiMinor: number,
): { x: number; y: number; z: number } {
  const lat = (latitude * Math.PI) / 180;
  const lon = (longitude * Math.PI) / 180;
  const eccentricity = (semiMajor * semiMajor - semiMinor * semiMinor) / (semiMajor * semiMajor);
  const radius = semiMajor / Math.sqrt(1 - eccentricity * Math.sin(lat) ** 2);
  return {
    x: radius * Math.cos(lat) * Math.cos(lon),
    y: radius * Math.cos(lat) * Math.sin(lon),
    z: (1 - eccentricity) * radius * Math.sin(lat),
  };
}

function fromCartesian(
  x: number,
  y: number,
  z: number,
  semiMajor: number,
  semiMinor: number,
): GeographicPoint {
  const eccentricity = (semiMajor * semiMajor - semiMinor * semiMinor) / (semiMajor * semiMajor);
  const longitude = Math.atan2(y, x);
  const planar = Math.hypot(x, y);
  let latitude = Math.atan2(z, planar * (1 - eccentricity));
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const radius = semiMajor / Math.sqrt(1 - eccentricity * Math.sin(latitude) ** 2);
    latitude = Math.atan2(z + eccentricity * radius * Math.sin(latitude), planar);
  }
  return { latitude: (latitude * 180) / Math.PI, longitude: (longitude * 180) / Math.PI };
}

function seconds(value: number): number {
  return (value * Math.PI) / (180 * 3600);
}
