import { pointInPolygon, toLocalMetres } from "./geometry";
import type { Point } from "./types";

export const MAX_BOUNDARY_SIDE_M = 120;
export const MAX_PLOT_SIDE_M = 160;

export const BOUNDARY_TOO_LARGE =
  "The matching site is a campus or estate, not a garden. Draw the plot yourself.";

export const BOUNDARY_NONE =
  "No residential site outline contains this address. Draw the plot yourself.";

export const OS_ATTRIBUTION =
  "Contains OS data © Crown copyright and database rights. Address data contains Royal Mail data © Royal Mail copyright and database rights.";

export const PLOT_TOO_LARGE =
  "The matching freehold is a campus or estate, not a garden. Draw the plot yourself.";

export const PLOT_NONE =
  "No registered freehold outline contains this address. Leasehold homes are often missing. Draw the plot yourself.";

export function outlineAttribution(year: number): string {
  return `This information is subject to Crown copyright and database rights ${year} and is reproduced with the permission of HM Land Registry. The polygons are subject to Crown copyright and database rights ${year} Ordnance Survey AC0000851063. Address location © OpenStreetMap contributors. https://use-land-property-data.service.gov.uk/datasets/inspire/#conditions`;
}

const RESIDENTIAL = new Set(["Private Residential Site", "Communal Residential Site"]);

export interface LngLatRing {
  description: string;
  coordinates: Array<[number, number]>;
  areaM2?: number;
}

export interface BoundarySelection {
  boundary: Point[] | null;
  reason: string | null;
}

export function selectResidentialBoundary(
  rings: LngLatRing[],
  latitude: number,
  longitude: number,
): BoundarySelection {
  const origin = { x: 0, y: 0 };
  let smallest: { points: Point[]; area: number } | null = null;
  let sawOversized = false;

  for (const ring of rings) {
    if (!RESIDENTIAL.has(ring.description)) continue;
    const points = toLocalRing(ring.coordinates, latitude, longitude);
    if (points.length < 3 || !pointInPolygon(origin, points)) continue;
    const side = longSide(points);
    if (side > MAX_BOUNDARY_SIDE_M) {
      sawOversized = true;
      continue;
    }
    const area = ring.areaM2 && ring.areaM2 > 0 ? ring.areaM2 : ringArea(points);
    if (!smallest || area < smallest.area) smallest = { points, area };
  }

  if (smallest) return { boundary: smallest.points, reason: null };
  return { boundary: null, reason: sawOversized ? BOUNDARY_TOO_LARGE : BOUNDARY_NONE };
}

export function selectPlotBoundary(
  rings: Array<Array<[number, number]>>,
  easting: number,
  northing: number,
  toLocal: (easting: number, northing: number) => Point,
): BoundarySelection {
  const origin = { x: easting, y: northing };
  let smallest: { points: Point[]; area: number } | null = null;
  let sawOversized = false;

  for (const ring of rings) {
    const polygon = ring.map(([pointEasting, pointNorthing]) => ({
      x: pointEasting,
      y: pointNorthing,
    }));
    if (!pointInPolygon(origin, polygon)) continue;
    const side = longSide(polygon);
    if (side > MAX_PLOT_SIDE_M) {
      sawOversized = true;
      continue;
    }
    const area = ringArea(polygon);
    if (!smallest || area < smallest.area) {
      smallest = {
        points: openRing(ring).map(([pointEasting, pointNorthing]) =>
          toLocal(pointEasting, pointNorthing),
        ),
        area,
      };
    }
  }

  if (smallest) return { boundary: smallest.points, reason: null };
  return { boundary: null, reason: sawOversized ? PLOT_TOO_LARGE : PLOT_NONE };
}

export function plotMetres(boundary: Point[] | null | undefined): number {
  if (!boundary || boundary.length < 3) return 32;
  const side = longSide(boundary);
  return Math.max(32, Math.min(160, Math.ceil(side + 8)));
}

export function ringsFromGeometry(
  geometry: { type?: string; coordinates?: unknown } | null | undefined,
  description: string,
  areaM2?: number,
): LngLatRing[] {
  if (!geometry?.coordinates) return [];
  const outers =
    geometry.type === "Polygon"
      ? [firstRing(geometry.coordinates)]
      : geometry.type === "MultiPolygon"
        ? polygonOuters(geometry.coordinates)
        : [];
  return outers.flatMap((ring) => {
    if (!ring) return [];
    const coordinates = openRing(ring);
    return coordinates.length >= 3 ? [{ description, coordinates, areaM2 }] : [];
  });
}

function toLocalRing(
  coordinates: Array<[number, number]>,
  latitude: number,
  longitude: number,
): Point[] {
  return openRing(coordinates).map(([pointLongitude, pointLatitude]) =>
    toLocalMetres(pointLatitude, pointLongitude, latitude, longitude),
  );
}

function longSide(points: Point[]): number {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  return Math.max(maxX - minX, maxY - minY);
}

function ringArea(points: Point[]): number {
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    if (!current || !next) continue;
    sum += current.x * next.y - next.x * current.y;
  }
  return Math.abs(sum) / 2;
}

function openRing(ring: Array<[number, number]>): Array<[number, number]> {
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first && last && first[0] === last[0] && first[1] === last[1]) return ring.slice(0, -1);
  return ring;
}

function firstRing(coordinates: unknown): Array<[number, number]> | null {
  if (!Array.isArray(coordinates)) return null;
  return asRing(coordinates[0]);
}

function polygonOuters(coordinates: unknown): Array<Array<[number, number]> | null> {
  if (!Array.isArray(coordinates)) return [];
  return coordinates.map((polygon) => (Array.isArray(polygon) ? asRing(polygon[0]) : null));
}

function asRing(value: unknown): Array<[number, number]> | null {
  if (!Array.isArray(value)) return null;
  const ring: Array<[number, number]> = [];
  for (const pair of value) {
    if (!Array.isArray(pair) || pair.length < 2) return null;
    const longitude = pair[0];
    const latitude = pair[1];
    if (typeof longitude !== "number" || typeof latitude !== "number") return null;
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
    ring.push([longitude, latitude]);
  }
  return ring;
}
