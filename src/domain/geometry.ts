import type { Point, ShadeBlock } from "./types";

export function centroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  const total = points.reduce(
    (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
    {
      x: 0,
      y: 0,
    },
  );
  return { x: total.x / points.length, y: total.y / points.length };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index++
  ) {
    const current = polygon[index];
    const prior = polygon[previous];
    if (!current || !prior) continue;
    const crosses =
      current.y > point.y !== prior.y > point.y &&
      point.x <
        ((prior.x - current.x) * (point.y - current.y)) /
          (prior.y - current.y) +
          current.x;
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
  const metresPerDegreeLng =
    111_320 * Math.cos((originLatitude * Math.PI) / 180);
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
  const metresPerDegreeLng =
    111_320 * Math.cos((originLatitude * Math.PI) / 180);
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
    if (!outline || outline.length < 3 || !pointInPolygon(point, outline))
      continue;
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

/** The two ends of a fence or hedge, along its length. */
export function lineEnds(
  block: Pick<ShadeBlock, "x" | "y" | "width" | "rotation">,
): [Point, Point] {
  const angle = block.rotation ?? 0;
  const half = block.width / 2;
  const alongX = Math.cos(angle) * half;
  const alongY = Math.sin(angle) * half;
  return [
    { x: block.x - alongX, y: block.y - alongY },
    { x: block.x + alongX, y: block.y + alongY },
  ];
}

/** Corners of a shade block, anticlockwise from its south-west corner when unrotated. */
export function blockCorners(
  block: Pick<ShadeBlock, "x" | "y" | "width" | "depth" | "rotation">,
): Point[] {
  const halfWidth = block.width / 2;
  const halfDepth = block.depth / 2;
  const angle = block.rotation ?? 0;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [
    { x: -halfWidth, y: -halfDepth },
    { x: halfWidth, y: -halfDepth },
    { x: halfWidth, y: halfDepth },
    { x: -halfWidth, y: halfDepth },
  ].map((point) => ({
    x: block.x + point.x * cos - point.y * sin,
    y: block.y + point.x * sin + point.y * cos,
  }));
}

/** Rebuild a block from corners produced by move, turn, or scale. */
export function blockFromCorners(
  base: ShadeBlock,
  corners: Point[],
): ShadeBlock {
  const [first, second, third] = corners;
  if (!first || !second || !third || corners.length < 4) return base;
  const center = {
    x: corners.reduce((sum, point) => sum + point.x, 0) / corners.length,
    y: corners.reduce((sum, point) => sum + point.y, 0) / corners.length,
  };
  return {
    ...base,
    x: center.x,
    y: center.y,
    width: Math.max(distance(first, second), base.line ? 0.5 : 0.15),
    depth: base.line ? base.depth : Math.max(distance(second, third), 0.15),
    rotation: Math.atan2(second.y - first.y, second.x - first.x),
  };
}

/** True when a plan point hits the block, with a little extra room on a thin fence. */
export function pointInBlock(point: Point, block: ShadeBlock): boolean {
  return pointInPolygon(
    point,
    blockCorners({
      ...block,
      width: Math.max(block.width, 0.8),
      depth: Math.max(block.depth, 0.8),
    }),
  );
}

export const DRAW_STEP_M = 0.5;

export function snapPoint(point: Point, step = DRAW_STEP_M): Point {
  return {
    x: Math.round(point.x / step) * step,
    y: Math.round(point.y / step) * step,
  };
}

/** How far a fence may sit from the outline and still be treated as parallel to it. */
const OUTLINE_ALIGN = Math.PI / 12;

/**
 * Pull a point onto the property outline when it is close, otherwise onto the
 * half-metre grid. The outline wins so a boundary that is not on the grid can
 * still be followed.
 */
export function snapToOutline(
  point: Point,
  outline: Point[] | null | undefined,
  threshold: number,
): Point {
  const nearest = nearestOnOutline(point, outline);
  if (nearest && nearest.distance <= threshold) return nearest.point;
  return snapPoint(point);
}

/**
 * Shift a fence or hedge onto the nearest outline edge when it is already
 * nearly parallel and close. Other shade blocks are left alone.
 */
export function snapLineToOutline(
  block: ShadeBlock,
  outline: Point[] | null | undefined,
  threshold: number,
): ShadeBlock {
  if (!block.line) return block;
  const rotation = block.rotation ?? 0;
  const match = nearestParallelEdge(
    { x: block.x, y: block.y },
    rotation,
    outline,
    threshold,
  );
  if (!match) return block;
  return {
    ...block,
    x: match.point.x,
    y: match.point.y,
    rotation: match.angle,
  };
}

export function spanSize(points: Point[]): { width: number; depth: number } {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  if (!Number.isFinite(minX)) return { width: 0, depth: 0 };
  return { width: maxX - minX, depth: maxY - minY };
}

export function formatMetres(metres: number): string {
  const tenths = Math.round(metres * 10) / 10;
  return Number.isInteger(tenths) ? String(tenths) : tenths.toFixed(1);
}

export function formatSize(width: number, depth: number): string {
  return `${formatMetres(width)} × ${formatMetres(depth)} m`;
}

export function rectanglePoints(start: Point, end: Point): Point[] {
  const first = snapPoint(start);
  const second = snapPoint(end);
  const minX = Math.min(first.x, second.x);
  const maxX = Math.max(first.x, second.x);
  const minY = Math.min(first.y, second.y);
  const maxY = Math.max(first.y, second.y);
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
}

export function placedRectangle(
  corner: Point,
  width: number,
  depth: number,
): Point[] {
  const origin = snapPoint(corner);
  return rectanglePoints(origin, { x: origin.x + width, y: origin.y + depth });
}

/** Five-degree steps, so a repeated bed can share an angle. */
export const ANGLE_STEP_RAD = Math.PI / 36;

export function snapAngle(radians: number): number {
  const snapped = Math.round(radians / ANGLE_STEP_RAD) * ANGLE_STEP_RAD;
  return Math.atan2(Math.sin(snapped), Math.cos(snapped));
}

/** Degrees clockwise from north. 0° points up the plan. */
export function formatBearing(radians: number): string {
  let degrees = Math.round(((Math.PI / 2 - radians) * 180) / Math.PI);
  degrees = ((degrees % 360) + 360) % 360;
  if (degrees > 180) degrees -= 360;
  if (degrees === -180) degrees = 180;
  return `${degrees}°`;
}

/** Signed turn in degrees, with a leading plus for anticlockwise. */
export function formatTurn(radians: number): string {
  const degrees = Math.round((radians * 180) / Math.PI);
  if (degrees === 0) return "0°";
  return degrees > 0 ? `+${degrees}°` : `${degrees}°`;
}

/** Handles sit just outside the shape: Turn to the north, Size beyond the furthest corner. */
export function adjustHandles(
  points: Point[],
): { turn: Point; resize: Point } | null {
  if (points.length < 3) return null;
  const center = centroid(points);
  let far = points[0];
  let farDist = 0;
  for (const point of points) {
    const gap = distance(point, center);
    if (!far || gap > farDist) {
      far = point;
      farDist = gap;
    }
  }
  if (!far || farDist < 0.05) return null;
  const reach = Math.max(farDist, 0.6);
  return {
    turn: { x: roundMetre(center.x), y: roundMetre(center.y + reach + 0.85) },
    resize: {
      x: roundMetre(center.x + ((far.x - center.x) / farDist) * (reach + 0.7)),
      y: roundMetre(center.y + ((far.y - center.y) / farDist) * (reach + 0.7)),
    },
  };
}

export function rotatePoints(
  points: Point[],
  center: Point,
  radians: number,
): Point[] {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return points.map((point) => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return {
      x: roundMetre(center.x + dx * cos - dy * sin),
      y: roundMetre(center.y + dx * sin + dy * cos),
    };
  });
}

/** Uniform scale around a centre, held between a quarter and four times the size, in 5% steps. */
export function snapScale(factor: number): number {
  if (!Number.isFinite(factor) || factor <= 0) return 1;
  const snapped = Math.round(factor * 20) / 20;
  return Math.min(4, Math.max(0.25, snapped));
}

export function scalePoints(
  points: Point[],
  center: Point,
  factor: number,
): Point[] {
  return points.map((point) => ({
    x: roundMetre(center.x + (point.x - center.x) * factor),
    y: roundMetre(center.y + (point.y - center.y) * factor),
  }));
}

/** Movement snapped to the drawing grid, so a placed bed stays aligned with it. */
export function snapOffset(from: Point, to: Point, step = DRAW_STEP_M): Point {
  return {
    x: roundMetre(Math.round((to.x - from.x) / step) * step),
    y: roundMetre(Math.round((to.y - from.y) / step) * step),
  };
}

export function translatePoints(points: Point[], by: Point): Point[] {
  return points.map((point) => ({
    x: roundMetre(point.x + by.x),
    y: roundMetre(point.y + by.y),
  }));
}

/** North and east are positive. A zero move reads as "0 m". */
export function formatOffset(by: Point): string {
  const parts: string[] = [];
  if (by.y !== 0)
    parts.push(
      `${formatMetres(Math.abs(by.y))} m ${by.y > 0 ? "north" : "south"}`,
    );
  if (by.x !== 0)
    parts.push(
      `${formatMetres(Math.abs(by.x))} m ${by.x > 0 ? "east" : "west"}`,
    );
  return parts.length > 0 ? parts.join(" · ") : "0 m";
}

export function snapLength(length: number, step = DRAW_STEP_M): number {
  const snapped = Math.round(length / step) * step;
  return snapped < step ? 0 : snapped;
}

function roundMetre(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** First side of an angled rectangle: length on the half-metre grid, angle on 5° steps. */
export function snappedEdge(
  origin: Point,
  toward: Point,
): { end: Point; length: number; angle: number } | null {
  const dx = toward.x - origin.x;
  const dy = toward.y - origin.y;
  const raw = Math.hypot(dx, dy);
  if (raw < 0.25) return null;
  const angle = snapAngle(Math.atan2(dy, dx));
  const length = snapLength(raw);
  if (length <= 0) return null;
  return {
    end: {
      x: roundMetre(origin.x + Math.cos(angle) * length),
      y: roundMetre(origin.y + Math.sin(angle) * length),
    },
    length,
    angle,
  };
}

/** Rectangle built on origin→end, with the width taken from the cursor's side of that side. */
export function angledRectangle(
  origin: Point,
  end: Point,
  cursor: Point,
): { points: Point[]; width: number; depth: number; angle: number } | null {
  const dx = end.x - origin.x;
  const dy = end.y - origin.y;
  const depth = Math.hypot(dx, dy);
  if (depth < 0.01) return null;
  const px = -dy / depth;
  const py = dx / depth;
  const signed = (cursor.x - origin.x) * px + (cursor.y - origin.y) * py;
  const width = snapLength(Math.abs(signed));
  if (width <= 0) return null;
  const sign = Math.sign(signed) || 1;
  const ox = px * width * sign;
  const oy = py * width * sign;
  return {
    points: [
      origin,
      end,
      { x: roundMetre(end.x + ox), y: roundMetre(end.y + oy) },
      { x: roundMetre(origin.x + ox), y: roundMetre(origin.y + oy) },
    ],
    width,
    depth,
    angle: Math.atan2(dy, dx),
  };
}

/** `angle` is the direction of the depth side. π/2 points that side north. */
export function rotatedRectangle(
  origin: Point,
  width: number,
  depth: number,
  angle: number,
): Point[] {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const wx = dy;
  const wy = -dx;
  return [
    origin,
    {
      x: roundMetre(origin.x + wx * width),
      y: roundMetre(origin.y + wy * width),
    },
    {
      x: roundMetre(origin.x + wx * width + dx * depth),
      y: roundMetre(origin.y + wy * width + dy * depth),
    },
    {
      x: roundMetre(origin.x + dx * depth),
      y: roundMetre(origin.y + dy * depth),
    },
  ];
}

export function rectangleSize(
  points: Point[],
): { width: number; depth: number } | null {
  if (points.length !== 4) return null;
  const [a, b, c, d] = points;
  if (!a || !b || !c || !d) return null;
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const cd = { x: d.x - c.x, y: d.y - c.y };
  const da = { x: a.x - d.x, y: a.y - d.y };
  const abLen = Math.hypot(ab.x, ab.y);
  const bcLen = Math.hypot(bc.x, bc.y);
  if (abLen < 0.05 || bcLen < 0.05) return null;
  if (Math.abs(ab.x * bc.x + ab.y * bc.y) > 0.08 * abLen * bcLen) return null;
  if (Math.abs(abLen - Math.hypot(cd.x, cd.y)) > 0.08) return null;
  if (Math.abs(bcLen - Math.hypot(da.x, da.y)) > 0.08) return null;
  return { width: abLen, depth: bcLen };
}

function dedupePoints(points: Point[], gap: number): Point[] {
  const result: Point[] = [];
  for (const point of points) {
    const previous = result[result.length - 1];
    if (!previous || distance(previous, point) >= gap) result.push(point);
  }
  return result;
}

function perpendicularDistance(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return distance(point, start);
  return Math.abs((point.x - start.x) * dy - (point.y - start.y) * dx) / length;
}

function simplifyOpen(points: Point[], epsilon: number): Point[] {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last || points.length < 3) return points;
  let farthest = 0;
  let index = 0;
  for (let cursor = 1; cursor < points.length - 1; cursor += 1) {
    const point = points[cursor];
    if (!point) continue;
    const gap = perpendicularDistance(point, first, last);
    if (gap > farthest) {
      farthest = gap;
      index = cursor;
    }
  }
  if (farthest <= epsilon || index === 0) return [first, last];
  const left = simplifyOpen(points.slice(0, index + 1), epsilon);
  const right = simplifyOpen(points.slice(index), epsilon);
  return [...left.slice(0, -1), ...right];
}

/** Smooth a freehand stroke into a polygon. A stroke that ends near its start is treated as closed. */
export function simplifyStroke(points: Point[], epsilon = 0.18): Point[] {
  const cleaned = dedupePoints(points, 0.05);
  if (cleaned.length < 3) return cleaned;
  const first = cleaned[0];
  const last = cleaned[cleaned.length - 1];
  if (!first || !last) return cleaned;
  const open =
    distance(first, last) <= Math.max(epsilon, 0.4)
      ? cleaned.slice(0, -1)
      : cleaned;
  if (open.length < 3) return open;
  const simplified = simplifyOpen(open, epsilon);
  return simplified.length > 64 ? simplifyOpen(open, epsilon * 2) : simplified;
}

export function finishedStroke(points: Point[]): Point[] | null {
  const simplified = simplifyStroke(points);
  if (simplified.length < 3) return null;
  if (polygonArea(simplified) < 0.25) return null;
  const size = spanSize(simplified);
  if (size.width < 0.4 && size.depth < 0.4) return null;
  return simplified;
}

export function scaleLength(worldWidth: number): number {
  const target = worldWidth * 0.22;
  const steps = [1, 2, 5, 10, 20, 50];
  let best = 1;
  for (const step of steps) {
    if (
      step <= worldWidth * 0.5 &&
      Math.abs(step - target) < Math.abs(best - target)
    )
      best = step;
  }
  return best;
}

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
    Math.max(...polygon.map((point) => point.x)) -
    Math.min(...polygon.map((point) => point.x));
  const depth =
    Math.max(...polygon.map((point) => point.y)) -
    Math.min(...polygon.map((point) => point.y));
  const estimate = (width / spacing) * (depth / (spacing * 0.866));
  const gap =
    estimate > FILL_LIMIT
      ? Math.max(
          spacing,
          Math.round(spacing * Math.sqrt(estimate / FILL_LIMIT) * 20) / 20,
        )
      : spacing;
  const placed = layoutFill(polygon, gap, occupied);
  if (placed.length > 0) return placed;
  const centre = centroid(polygon);
  if (!pointInPolygon(centre, polygon) || !clearOf(centre, gap, occupied))
    return [];
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
      if (
        !pointInPolygon(point, polygon) ||
        distanceToPolygon(point, polygon) < inset
      )
        continue;
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
  return occupied.every(
    (item) => distance(point, item) >= (spacing + item.spacing) / 2 - 0.001,
  );
}

function distanceToPolygon(point: Point, polygon: Point[]): number {
  let best = Infinity;
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    if (!start || !end) continue;
    best = Math.min(best, distanceToSegment(point, start, end));
  }
  return best;
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  return distance(point, projectOnSegment(point, start, end).point);
}

function projectOnSegment(
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
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq,
    ),
  );
  return { point: { x: start.x + t * dx, y: start.y + t * dy }, t };
}

function nearestOnOutline(
  point: Point,
  outline: Point[] | null | undefined,
): { point: Point; distance: number } | null {
  if (!outline || outline.length < 3) return null;
  let best: { point: Point; distance: number } | null = null;
  for (let index = 0; index < outline.length; index += 1) {
    const start = outline[index];
    const end = outline[(index + 1) % outline.length];
    if (!start || !end || (start.x === end.x && start.y === end.y)) continue;
    const projected = projectOnSegment(point, start, end);
    const span = distance(point, projected.point);
    if (best && span >= best.distance) continue;
    best = { point: projected.point, distance: span };
  }
  return best;
}

function nearestParallelEdge(
  point: Point,
  rotation: number,
  outline: Point[] | null | undefined,
  threshold: number,
): { point: Point; angle: number } | null {
  if (!outline || outline.length < 3) return null;
  let best: { point: Point; angle: number; distance: number } | null = null;
  for (let index = 0; index < outline.length; index += 1) {
    const start = outline[index];
    const end = outline[(index + 1) % outline.length];
    if (!start || !end || (start.x === end.x && start.y === end.y)) continue;
    const projected = projectOnSegment(point, start, end);
    if (projected.t <= 0 || projected.t >= 1) continue;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    if (undirectedTurn(rotation, angle) > OUTLINE_ALIGN) continue;
    const span = distance(point, projected.point);
    if (span > threshold || (best && span >= best.distance)) continue;
    best = {
      point: projected.point,
      angle: nearerAngle(rotation, angle),
      distance: span,
    };
  }
  return best;
}

/** Smaller angle between two undirected lines, in radians. */
function undirectedTurn(a: number, b: number): number {
  const turn = Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  return Math.min(turn, Math.PI - turn);
}

function nearerAngle(current: number, segment: number): number {
  const flipped = segment + Math.PI;
  const toSegment = Math.abs(
    Math.atan2(Math.sin(current - segment), Math.cos(current - segment)),
  );
  const toFlipped = Math.abs(
    Math.atan2(Math.sin(current - flipped), Math.cos(current - flipped)),
  );
  const chosen = toFlipped < toSegment ? flipped : segment;
  return Math.atan2(Math.sin(chosen), Math.cos(chosen));
}

export function buildingHeight(
  tags: Record<string, string | undefined>,
): number {
  const heightMatch = tags.height?.match(/[\d.]+/);
  if (heightMatch) {
    const metres = Number(heightMatch[0]);
    if (metres > 1 && metres < 120) return metres;
  }
  const levels = Number(tags["building:levels"]);
  if (Number.isFinite(levels) && levels > 0 && levels < 40) return levels * 3;
  return 6;
}
