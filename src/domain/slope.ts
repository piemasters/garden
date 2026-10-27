import { centroid } from "./geometry";
import type { GroundSlope, Point } from "./types";

export interface SlopeSample {
  /** Metres east of the site origin. */
  x: number;
  /** Metres north of the site origin. */
  y: number;
  elevation: number;
}

/** Ring radius used when the plot itself is smaller than one elevation cell. */
export const SLOPE_SAMPLE_RADIUS_M = 80;

/** Shallower than this is treated as flat. 1 in 80 is about 0.7°. */
export const LEVEL_GRADIENT = 1 / 80;

const COMPASS = [
  "north",
  "north-east",
  "east",
  "south-east",
  "south",
  "south-west",
  "west",
  "north-west",
] as const;

/** Centre plus eight compass points, far enough for a 25–50 m elevation grid. */
export function slopeSamplePoints(boundary: Point[] | null): Point[] {
  const anchor = boundary && boundary.length >= 3 ? centroid(boundary) : { x: 0, y: 0 };
  let reach = SLOPE_SAMPLE_RADIUS_M;
  if (boundary && boundary.length >= 3) {
    for (const point of boundary) {
      reach = Math.max(reach, Math.hypot(point.x - anchor.x, point.y - anchor.y));
    }
  }
  const points = [anchor];
  for (let step = 0; step < 8; step += 1) {
    const bearing = (step * Math.PI) / 4;
    points.push({
      x: anchor.x + Math.sin(bearing) * reach,
      y: anchor.y + Math.cos(bearing) * reach,
    });
  }
  return points;
}

/** Fit one plane. `bearing` is degrees clockwise from north, downhill. `gradient` is rise over run. */
export function fitSlope(samples: SlopeSample[]): GroundSlope {
  const usable = samples.filter(
    (sample) =>
      Number.isFinite(sample.x) && Number.isFinite(sample.y) && Number.isFinite(sample.elevation),
  );
  if (usable.length < 4) return { kind: "unknown" };
  const meanX = average(usable.map((sample) => sample.x));
  const meanY = average(usable.map((sample) => sample.y));
  const meanZ = average(usable.map((sample) => sample.elevation));
  let xx = 0;
  let xy = 0;
  let yy = 0;
  let xz = 0;
  let yz = 0;
  for (const sample of usable) {
    const x = sample.x - meanX;
    const y = sample.y - meanY;
    const z = sample.elevation - meanZ;
    xx += x * x;
    xy += x * y;
    yy += y * y;
    xz += x * z;
    yz += y * z;
  }
  const determinant = xx * yy - xy * xy;
  if (Math.abs(determinant) < 1e-6) return { kind: "unknown" };
  const east = (yy * xz - xy * yz) / determinant;
  const north = (xx * yz - xy * xz) / determinant;
  const gradient = Math.hypot(east, north);
  if (!Number.isFinite(gradient) || gradient < LEVEL_GRADIENT) return { kind: "level" };
  const bearing = ((Math.atan2(-east, -north) * 180) / Math.PI + 360) % 360;
  return { kind: "fall", bearing, gradient };
}

/** Uphill rise per metre east and north. Null when the ground is not tipped. */
export function slopeGradient(slope: GroundSlope): { east: number; north: number } | null {
  if (slope.kind !== "fall") return null;
  const bearing = (slope.bearing * Math.PI) / 180;
  return {
    east: -slope.gradient * Math.sin(bearing),
    north: -slope.gradient * Math.cos(bearing),
  };
}

export function describeSlope(slope: GroundSlope | null | undefined): string | null {
  if (!slope) return null;
  if (slope.kind === "unknown") {
    return "The ground slope could not be read from the elevation map.";
  }
  if (slope.kind === "level") return "The ground is effectively level.";
  const run = Math.max(1, Math.round(1 / slope.gradient));
  return `Falls ${compassPoint(slope.bearing)}, about 1 in ${run}.`;
}

function compassPoint(bearing: number): string {
  const turned = ((bearing % 360) + 360) % 360;
  const index = Math.round(turned / 45) % COMPASS.length;
  return COMPASS[index] ?? "north";
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
