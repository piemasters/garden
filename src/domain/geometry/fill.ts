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

/** Most plant models drawn for one fill. The planted count can be higher. */
export const MAP_FILL_CAP = 400;

type Occupied = { x: number; y: number; spacing: number };

/**
 * Positions that fill a bed. Spacing is the plant's mature spread, kept off the
 * edge and off plants already there. A plant larger than the bed still gets the centre.
 */
export function fillPoints(polygon: Point[], spacing: number, occupied: Occupied[] = []): Point[] {
  return planFill(polygon, spacing, occupied, Number.POSITIVE_INFINITY).points;
}

/**
 * The full fill count, plus at most `cap` positions spread across the bed.
 * Spacing stays the plant's own spacing.
 */
export function planFill(
  polygon: Point[],
  spacing: number,
  occupied: Occupied[] = [],
  cap = MAP_FILL_CAP,
): { count: number; points: Point[] } {
  if (polygon.length < 3 || !(spacing > 0) || !(cap > 0)) return { count: 0, points: [] };
  const index = indexOccupied(occupied);
  const placed = layoutFill(polygon, spacing, index);
  const points = placed.length > 0 ? placed : centreFill(polygon, spacing, index);
  if (points.length <= cap) return { count: points.length, points };
  const step = points.length / cap;
  const sample: Point[] = [];
  for (let stepIndex = 0; stepIndex < cap; stepIndex += 1) {
    const point = points[Math.min(points.length - 1, Math.floor(stepIndex * step))];
    if (point) sample.push(point);
  }
  return { count: points.length, points: sample };
}

/** Lay each filled plant out in order. Earlier groups count as plants already in the bed. */
export function placeFills(
  polygon: Point[],
  occupied: Occupied[],
  groups: { plantId: string; spacing: number }[],
): { plantId: string; x: number; y: number }[] {
  const taken = [...occupied];
  const placed: { plantId: string; x: number; y: number }[] = [];
  for (const group of groups) {
    for (const spot of fillPoints(polygon, group.spacing, taken)) {
      placed.push({ plantId: group.plantId, x: spot.x, y: spot.y });
      taken.push({ x: spot.x, y: spot.y, spacing: group.spacing });
    }
  }
  return placed;
}

function centreFill(polygon: Point[], spacing: number, index: OccupiedIndex): Point[] {
  const centre = centroid(polygon);
  if (!pointInPolygon(centre, polygon) || !clearOf(centre, spacing, index)) return [];
  return [{ x: roundMetre(centre.x), y: roundMetre(centre.y) }];
}

function layoutFill(polygon: Point[], spacing: number, index: OccupiedIndex): Point[] {
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
      if (!clearOf(point, spacing, index)) continue;
      placed.push({ x: roundMetre(x), y: roundMetre(y) });
    }
  }
  return placed;
}

const CELL = 1;

type OccupiedIndex = { cells: Map<string, Occupied[]>; maxSpacing: number };

function indexOccupied(occupied: Occupied[]): OccupiedIndex {
  const cells = new Map<string, Occupied[]>();
  let maxSpacing = 0;
  for (const item of occupied) {
    maxSpacing = Math.max(maxSpacing, item.spacing);
    const key = cellKey(item.x, item.y);
    const list = cells.get(key);
    if (list) list.push(item);
    else cells.set(key, [item]);
  }
  return { cells, maxSpacing };
}

function cellKey(x: number, y: number): string {
  return `${Math.floor(x / CELL)}:${Math.floor(y / CELL)}`;
}

function clearOf(point: Point, spacing: number, index: OccupiedIndex): boolean {
  const reach = (spacing + index.maxSpacing) / 2;
  const radius = Math.ceil(reach / CELL) + 1;
  const cx = Math.floor(point.x / CELL);
  const cy = Math.floor(point.y / CELL);
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      const list = index.cells.get(`${x}:${y}`);
      if (!list) continue;
      for (const item of list) {
        if (distance(point, item) < (spacing + item.spacing) / 2 - 0.001) return false;
      }
    }
  }
  return true;
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
