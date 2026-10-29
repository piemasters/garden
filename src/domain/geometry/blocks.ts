import type { Point, ShadeBlock } from "../types";
import { distance, pointInPolygon } from "./points";

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
export function blockFromCorners(base: ShadeBlock, corners: Point[]): ShadeBlock {
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
