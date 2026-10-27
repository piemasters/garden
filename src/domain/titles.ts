import { fromLocalMetres, pointInPolygon } from "./geometry";
import type { Point } from "./types";

export interface TitlePlot {
  ring: Point[];
  east: number;
  north: number;
  width: number;
  depth: number;
  distance: number;
}

export function searchPolygon(latitude: number, longitude: number, padMetres: number): string {
  const west = fromLocalMetres({ x: -padMetres, y: 0 }, latitude, longitude);
  const east = fromLocalMetres({ x: padMetres, y: 0 }, latitude, longitude);
  const south = fromLocalMetres({ x: 0, y: -padMetres }, latitude, longitude);
  const north = fromLocalMetres({ x: 0, y: padMetres }, latitude, longitude);
  const corners = [
    [west.longitude, south.latitude],
    [east.longitude, south.latitude],
    [east.longitude, north.latitude],
    [west.longitude, north.latitude],
    [west.longitude, south.latitude],
  ];
  return `POLYGON((${corners.map(([pointLongitude, pointLatitude]) => `${pointLongitude} ${pointLatitude}`).join(",")}))`;
}

export function titlePlots(rings: Point[][], centre: Point, pad: number): TitlePlot[] {
  const plots: TitlePlot[] = [];
  for (const ring of rings) {
    if (ring.length < 3) continue;
    const box = bounds(ring);
    const span = Math.max(box.maxX - box.minX, box.maxY - box.minY);
    if (span < 12 || span > 160) continue;
    const distance = distanceToBox(centre, box);
    if (distance > pad) continue;
    const inside = interior(ring);
    plots.push({
      ring,
      east: inside.x,
      north: inside.y,
      width: Math.round(box.maxX - box.minX),
      depth: Math.round(box.maxY - box.minY),
      distance,
    });
  }
  return plots.sort((left, right) => left.distance - right.distance);
}

function bounds(ring: Point[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of ring) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  return { minX, maxX, minY, maxY };
}

function distanceToBox(
  point: Point,
  box: { minX: number; maxX: number; minY: number; maxY: number },
): number {
  const east =
    point.x < box.minX ? box.minX - point.x : point.x > box.maxX ? point.x - box.maxX : 0;
  const north =
    point.y < box.minY ? box.minY - point.y : point.y > box.maxY ? point.y - box.maxY : 0;
  return Math.hypot(east, north);
}

function interior(ring: Point[]): Point {
  const centre = ring.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), {
    x: 0,
    y: 0,
  });
  centre.x /= ring.length;
  centre.y /= ring.length;
  if (pointInPolygon(centre, ring)) return centre;
  for (const point of ring) {
    const between = { x: (centre.x + point.x) / 2, y: (centre.y + point.y) / 2 };
    if (pointInPolygon(between, ring)) return between;
  }
  return centre;
}
