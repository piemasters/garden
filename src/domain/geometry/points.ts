import type { Point } from "../types";

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

export function formatMetres(metres: number): string {
  const tenths = Math.round(metres * 10) / 10;
  return Number.isInteger(tenths) ? String(tenths) : tenths.toFixed(1);
}

export function roundMetre(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function projectOnSegment(
  point: Point,
  start: Point,
  end: Point,
): { point: Point; t: number } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return { point: start, t: 0 };
  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq),
  );
  return { point: { x: start.x + t * dx, y: start.y + t * dy }, t };
}
