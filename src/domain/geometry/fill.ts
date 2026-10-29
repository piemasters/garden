import type { Point } from "../types";
import {
  centroid,
  distance,
  formatMetres,
  pointInPolygon,
  projectOnSegment,
  roundMetre,
} from "./points";

/** Centre-to-centre planting distance from the usual mature spread, in 5 cm steps. */
export function plantingSpacing(spread: [number, number]): number {
  const typical = (spread[0] + spread[1]) / 2;
  return Math.max(0.1, Math.round(typical * 20) / 20);
}

export function formatSpacing(metres: number): string {
  if (metres < 1) return `${Math.round(metres * 100)} cm`;
  return `${formatMetres(metres)} m`;
}

const FILL_LIMIT = 160;

/**
 * Positions that fill a bed. Spacing is the plant's mature spread, kept off the
 * edge and off plants already there. A plant larger than the bed still gets the centre.
 * Very small plants in a large bed are spaced a little wider so the plan stays usable.
 */
export function fillPoints(
  polygon: Point[],
  spacing: number,
  occupied: { x: number; y: number; spacing: number }[] = [],
): Point[] {
  if (polygon.length < 3 || !(spacing > 0)) return [];
  const width =
    Math.max(...polygon.map((point) => point.x)) - Math.min(...polygon.map((point) => point.x));
  const depth =
    Math.max(...polygon.map((point) => point.y)) - Math.min(...polygon.map((point) => point.y));
  const estimate = (width / spacing) * (depth / (spacing * 0.866));
  const gap =
    estimate > FILL_LIMIT
      ? Math.max(spacing, Math.round(spacing * Math.sqrt(estimate / FILL_LIMIT) * 20) / 20)
      : spacing;
  const placed = layoutFill(polygon, gap, occupied);
  if (placed.length > 0) return placed;
  const centre = centroid(polygon);
  if (!pointInPolygon(centre, polygon) || !clearOf(centre, gap, occupied)) return [];
  return [{ x: roundMetre(centre.x), y: roundMetre(centre.y) }];
}

function layoutFill(
  polygon: Point[],
  spacing: number,
  occupied: { x: number; y: number; spacing: number }[],
): Point[] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of polygon) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  const inset = spacing * 0.42;
  const rowStep = (spacing * Math.sqrt(3)) / 2;
  const centreX = (minX + maxX) / 2;
  const centreY = (minY + maxY) / 2;
  const rows = Math.ceil((maxY - minY) / rowStep) + 1;
  const cols = Math.ceil((maxX - minX) / spacing) + 1;
  const placed: Point[] = [];
  for (let row = -rows; row <= rows; row += 1) {
    const y = centreY + row * rowStep;
    if (y < minY || y > maxY) continue;
    const shift = Math.abs(row) % 2 === 0 ? 0 : spacing / 2;
    for (let col = -cols; col <= cols; col += 1) {
      const x = centreX + col * spacing + shift;
      if (x < minX || x > maxX) continue;
      const point = { x, y };
      if (!pointInPolygon(point, polygon) || distanceToPolygon(point, polygon) < inset) continue;
      if (!clearOf(point, spacing, occupied)) continue;
      placed.push({ x: roundMetre(x), y: roundMetre(y) });
      if (placed.length >= FILL_LIMIT) return placed;
    }
  }
  return placed;
}

function clearOf(
  point: Point,
  spacing: number,
  occupied: { x: number; y: number; spacing: number }[],
): boolean {
  return occupied.every((item) => distance(point, item) >= (spacing + item.spacing) / 2 - 0.001);
}

function distanceToPolygon(point: Point, polygon: Point[]): number {
  let best = Infinity;
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    if (!start || !end) continue;
    best = Math.min(best, distance(point, projectOnSegment(point, start, end).point));
  }
  return best;
}
