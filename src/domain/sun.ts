import { getPosition } from "suncalc";
import { blockCorners, centroid } from "./geometry";
import type { Point, ShadeBlock, SunLevel } from "./types";

export interface SunSample {
  azimuth: number;
  altitude: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

const LOW_SUN = 5;

/** Azimuth is degrees clockwise from north. The vector points from the garden toward the sun. */
export function sunVector(azimuth: number, altitude: number): Vec3 {
  const az = (azimuth * Math.PI) / 180;
  const alt = (altitude * Math.PI) / 180;
  const horizontal = Math.cos(alt);
  return {
    x: Math.sin(az) * horizontal,
    y: Math.cos(az) * horizontal,
    z: Math.sin(alt),
  };
}

export function rayHitsBox(origin: Vec3, direction: Vec3, block: ShadeBlock): boolean {
  const angle = -(block.rotation ?? 0);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = origin.x - block.x;
  const dy = origin.y - block.y;
  const localOrigin = {
    x: block.x + dx * cos - dy * sin,
    y: block.y + dx * sin + dy * cos,
    z: origin.z,
  };
  const localDirection = {
    x: direction.x * cos - direction.y * sin,
    y: direction.x * sin + direction.y * cos,
    z: direction.z,
  };
  const min = {
    x: block.x - block.width / 2,
    y: block.y - block.depth / 2,
    z: 0,
  };
  const max = {
    x: block.x + block.width / 2,
    y: block.y + block.depth / 2,
    z: block.height,
  };
  let near = 0;
  let far = Number.POSITIVE_INFINITY;
  const axes = ["x", "y", "z"] as const;
  for (const axis of axes) {
    const delta = localDirection[axis];
    const start = localOrigin[axis];
    const lower = min[axis];
    const upper = max[axis];
    if (Math.abs(delta) < 1e-8) {
      if (start < lower || start > upper) return false;
      continue;
    }
    let entry = (lower - start) / delta;
    let exit = (upper - start) / delta;
    if (entry > exit) {
      const swap = entry;
      entry = exit;
      exit = swap;
    }
    near = Math.max(near, entry);
    far = Math.min(far, exit);
    if (far < near) return false;
  }
  return far > 0;
}

const GARDEN_TIME_ZONE = "Europe/London";

/** A clock time in the garden, as an absolute instant. */
function londonInstant(year: number, month: number, day: number, hour: number): Date {
  const guess = new Date(Date.UTC(year, month, day, hour, 0));
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: GARDEN_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(guess);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const rendered = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour") % 24,
    value("minute"),
    value("second"),
  );
  return new Date(guess.getTime() - (rendered - guess.getTime()));
}

/** Sun position at a clock hour on the 15th, in the garden's time zone. */
export function sunAt(
  latitude: number,
  longitude: number,
  month: number,
  hour: number,
  day = 15,
  year = 2026,
): SunSample {
  const position = getPosition(londonInstant(year, month, day, hour), latitude, longitude);
  return { azimuth: position.azimuth, altitude: position.altitude };
}

export function daySamples(
  latitude: number,
  longitude: number,
  month: number,
  day: number,
  year = 2026,
): SunSample[] {
  const samples: SunSample[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += 30) {
    const date = new Date(Date.UTC(year, month, day, 0, minutes));
    const position = getPosition(date, latitude, longitude);
    if (position.altitude > 0) {
      samples.push({ azimuth: position.azimuth, altitude: position.altitude });
    }
  }
  return samples;
}

export function midsummerSamples(latitude: number, longitude: number): SunSample[] {
  return daySamples(latitude, longitude, 5, 21);
}

export function sunlitHours(samples: SunSample[], origin: Vec3, blocks: ShadeBlock[]): number {
  let hours = 0;
  for (const sample of samples) {
    if (sample.altitude <= LOW_SUN) continue;
    const direction = sunVector(sample.azimuth, sample.altitude);
    const shaded = blocks.some((block) => rayHitsBox(origin, direction, block));
    if (!shaded) hours += 0.5;
  }
  return hours;
}

const SHADOW_LIMIT_M = 40;

/** Ground covered by a block's shadow. The shape includes the footprint. */
export function shadowFootprint(block: ShadeBlock, azimuth: number, altitude: number): Point[] {
  const corners = blockCorners(block);
  if (altitude <= 1 || block.height <= 0) return corners;
  const vector = sunVector(azimuth, altitude);
  const horizontal = Math.hypot(vector.x, vector.y);
  if (horizontal < 1e-6 || vector.z <= 0) return corners;
  const raw = block.height / Math.tan((altitude * Math.PI) / 180);
  const length = Math.min(Math.max(raw, 0), SHADOW_LIMIT_M);
  const sx = (-vector.x / horizontal) * length;
  const sy = (-vector.y / horizontal) * length;
  const cast = corners.map((corner) => ({ x: corner.x + sx, y: corner.y + sy }));
  return convexHull([...corners, ...cast]);
}

function convexHull(points: Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const unique = sorted.filter(
    (point, index) =>
      index === 0 || point.x !== sorted[index - 1]?.x || point.y !== sorted[index - 1]?.y,
  );
  if (unique.length <= 2) return unique;
  const cross = (origin: Point, a: Point, b: Point) =>
    (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);
  const build = (source: Point[]) => {
    const hull: Point[] = [];
    for (const point of source) {
      while (
        hull.length >= 2 &&
        cross(hull[hull.length - 2]!, hull[hull.length - 1]!, point) <= 0
      ) {
        hull.pop();
      }
      hull.push(point);
    }
    return hull;
  };
  const lower = build(unique);
  const upper = build([...unique].reverse());
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

export function classifyLight(hours: number): SunLevel {
  if (hours >= 6) return "full-sun";
  if (hours >= 3) return "partial-sun";
  return "shade";
}

export function bedSun(points: Point[], samples: SunSample[], blocks: ShadeBlock[]) {
  const center = centroid(points);
  const hours = sunlitHours(samples, { x: center.x, y: center.y, z: 0.4 }, blocks);
  return { hours, light: classifyLight(hours) };
}
