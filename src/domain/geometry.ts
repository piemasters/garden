import type { Point, ShadeBlock } from "./types";

export function centroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  const total = points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), {
    x: 0,
    y: 0,
  });
  return { x: total.x / points.length, y: total.y / points.length };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const current = polygon[index];
    const prior = polygon[previous];
    if (!current || !prior) continue;
    const crosses =
      current.y > point.y !== prior.y > point.y &&
      point.x < ((prior.x - current.x) * (point.y - current.y)) / (prior.y - current.y) + current.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function toLocalMetres(
  latitude: number,
  longitude: number,
  originLatitude: number,
  originLongitude: number,
): Point {
  const metresPerDegreeLat = 111_320;
  const metresPerDegreeLng = 111_320 * Math.cos((originLatitude * Math.PI) / 180);
  return {
    x: (longitude - originLongitude) * metresPerDegreeLng,
    y: (latitude - originLatitude) * metresPerDegreeLat,
  };
}

export function fromLocalMetres(
  point: Point,
  originLatitude: number,
  originLongitude: number,
): { latitude: number; longitude: number } {
  const metresPerDegreeLat = 111_320;
  const metresPerDegreeLng = 111_320 * Math.cos((originLatitude * Math.PI) / 180);
  return {
    latitude: originLatitude + point.y / metresPerDegreeLat,
    longitude: originLongitude + point.x / metresPerDegreeLng,
  };
}

export function polygonArea(points: Point[]): number {
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    if (!current || !next) continue;
    sum += current.x * next.y - next.x * current.y;
  }
  return Math.abs(sum) / 2;
}

export function smallestOutlineAt<T extends { outline?: Point[] }>(
  point: Point,
  choices: T[],
): T | null {
  let best: T | null = null;
  let bestArea = Number.POSITIVE_INFINITY;
  for (const choice of choices) {
    const outline = choice.outline;
    if (!outline || outline.length < 3 || !pointInPolygon(point, outline)) continue;
    const area = polygonArea(outline);
    if (area < bestArea) {
      best = choice;
      bestArea = area;
    }
  }
  return best;
}

export function footprintBlock(
  points: Point[],
  height: number,
  id: string,
  source: ShadeBlock["source"],
): ShadeBlock | null {
  if (points.length < 3) return null;
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
  const width = maxX - minX;
  const depth = maxY - minY;
  if (width < 1 || depth < 1 || width > 70 || depth > 70) return null;
  return {
    id,
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    width,
    depth,
    height,
    source,
  };
}

export function buildingHeight(tags: Record<string, string | undefined>): number {
  const heightMatch = tags.height?.match(/[\d.]+/);
  if (heightMatch) {
    const metres = Number(heightMatch[0]);
    if (metres > 1 && metres < 120) return metres;
  }
  const levels = Number(tags["building:levels"]);
  if (Number.isFinite(levels) && levels > 0 && levels < 40) return levels * 3;
  return 6;
}
