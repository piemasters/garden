import { describe, expect, it } from "vite-plus/test";
import type { ShadeBlock } from "./types";
import {
  angledRectangle,
  blockCorners,
  blockFromCorners,
  pointInBlock,
  distance,
  fillPoints,
  MAP_FILL_CAP,
  placeFills,
  planFill,
  finishedStroke,
  formatSpacing,
  formatBearing,
  formatSize,
  formatOffset,
  formatTurn,
  fromLocalMetres,
  placedRectangle,
  plantingSpacing,
  pointInPolygon,
  rectangleSize,
  adjustHandles,
  rotatePoints,
  rotatedRectangle,
  scaleLength,
  scalePoints,
  snapOffset,
  translatePoints,
  snapScale,
  simplifyStroke,
  smallestOutlineAt,
  snapAngle,
  snappedEdge,
  snapPoint,
  lineEnds,
  snapLineToOutline,
  snapToOutline,
  stretchedLine,
  spanSize,
  toLocalMetres,
} from "./geometry";

describe("map coordinates", () => {
  it("converts a local point back to the same latitude and longitude", () => {
    const originLatitude = 51.14;
    const originLongitude = -0.47;
    const local = toLocalMetres(51.141, -0.469, originLatitude, originLongitude);
    const geographic = fromLocalMetres(local, originLatitude, originLongitude);
    expect(geographic.latitude).toBeCloseTo(51.141, 8);
    expect(geographic.longitude).toBeCloseTo(-0.469, 8);
  });

  it("picks the smallest freehold that contains the click", () => {
    const outer = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    const inner = [
      { x: 10, y: 10 },
      { x: 20, y: 10 },
      { x: 20, y: 20 },
      { x: 10, y: 20 },
    ];
    const choices = [
      { label: "outer", outline: outer },
      { label: "inner", outline: inner },
    ];
    expect(smallestOutlineAt({ x: 15, y: 15 }, choices)?.label).toBe("inner");
    expect(smallestOutlineAt({ x: 50, y: 50 }, choices)?.label).toBe("outer");
    expect(smallestOutlineAt({ x: 150, y: 150 }, choices)).toBeNull();
  });
});

describe("drawing sizes", () => {
  it("snaps a point to the nearest half metre", () => {
    expect(snapPoint({ x: 1.2, y: -0.8 })).toEqual({ x: 1, y: -1 });
    expect(snapPoint({ x: 2.25, y: 3.8 })).toEqual({ x: 2.5, y: 4 });
  });

  it("places a 2 by 4 rectangle from the snapped corner", () => {
    const points = placedRectangle({ x: 0.2, y: 0.4 }, 2, 4);
    expect(spanSize(points)).toEqual({ width: 2, depth: 4 });
    expect(points[0]).toEqual({ x: 0, y: 0.5 });
  });

  it("formats whole metres without a decimal", () => {
    expect(formatSize(2, 4)).toBe("2 × 4 m");
    expect(formatSize(2.5, 1.2)).toBe("2.5 × 1.2 m");
  });

  it("picks a scale bar that fits the view", () => {
    expect(scaleLength(30)).toBe(5);
    expect(scaleLength(8)).toBe(2);
    expect(scaleLength(120)).toBe(20);
  });

  it("snaps a side to 5° and half-metre steps", () => {
    const edge = snappedEdge({ x: 0, y: 0 }, { x: 0, y: 3.2 });
    expect(edge?.length).toBe(3);
    expect(edge?.end).toEqual({ x: 0, y: 3 });
    expect(formatBearing(edge?.angle ?? 0)).toBe("0°");
    const sevenDegrees = ((90 - 7) * Math.PI) / 180;
    const tilted = snappedEdge(
      { x: 0, y: 0 },
      { x: Math.cos(sevenDegrees) * 4.2, y: Math.sin(sevenDegrees) * 4.2 },
    );
    expect(tilted?.length).toBe(4);
    expect(formatBearing(tilted?.angle ?? 0)).toBe("5°");
    expect(snapAngle(Math.PI / 36 + 0.04)).toBeCloseTo(Math.PI / 36, 5);
  });

  it("builds a rectangle out from an angled side", () => {
    const rect = angledRectangle({ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 1, y: 2.2 });
    expect(rect?.width).toBe(2);
    expect(rect?.depth).toBe(4);
    expect(rect?.points[2]).toEqual({ x: 4, y: 2 });
    expect(formatBearing(rect?.angle ?? 0)).toBe("90°");
  });

  it("aims a 2 by 4 bed along a direction", () => {
    const north = rotatedRectangle({ x: 1, y: 2 }, 2, 4, Math.PI / 2);
    expect(north[0]).toEqual({ x: 1, y: 2 });
    expect(north[1]).toEqual({ x: 3, y: 2 });
    expect(north[2]?.y).toBeCloseTo(6, 5);
    expect(rectangleSize(north)).toEqual({ width: 2, depth: 4 });
    expect(formatBearing(Math.PI / 2)).toBe("0°");
  });

  it("smooths a freehand square and rejects a straight scribble", () => {
    const square = [
      { x: 0, y: 0 },
      { x: 1, y: 0.05 },
      { x: 2, y: 0 },
      { x: 3, y: 0.02 },
      { x: 3, y: 1 },
      { x: 2.9, y: 2 },
      { x: 1, y: 2.05 },
      { x: 0, y: 2 },
      { x: 0.05, y: 1 },
      { x: 0.1, y: 0.1 },
    ];
    const shape = simplifyStroke(square);
    expect(shape.length).toBeGreaterThanOrEqual(4);
    expect(shape.length).toBeLessThan(square.length);
    expect(finishedStroke(square)?.length).toBeGreaterThanOrEqual(4);
    const line = [
      { x: 0, y: 0 },
      { x: 1, y: 0.02 },
      { x: 2, y: 0 },
      { x: 3, y: 0.01 },
    ];
    expect(finishedStroke(line)).toBeNull();
  });

  it("rotates and scales a shape around its centre", () => {
    expect(rotatePoints([{ x: 2, y: 1 }], { x: 1, y: 1 }, Math.PI / 2)).toEqual([{ x: 1, y: 2 }]);
    expect(scalePoints([{ x: 3, y: 1 }], { x: 1, y: 1 }, 2)).toEqual([{ x: 5, y: 1 }]);
    expect(formatTurn(Math.PI / 12)).toBe("+15°");
    expect(formatTurn(-Math.PI / 18)).toBe("-10°");
    expect(snapScale(1)).toBe(1);
    expect(snapScale(1.04)).toBe(1.05);
    expect(snapScale(0.1)).toBe(0.25);
    expect(snapScale(9)).toBe(4);
  });

  it("places turn and size handles outside the shape", () => {
    const square = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
    ];
    const handles = adjustHandles(square);
    expect(handles?.turn.y).toBeGreaterThan(2);
    expect(handles?.turn.x).toBeCloseTo(1, 3);
    expect(distance(handles?.resize ?? { x: 1, y: 1 }, { x: 1, y: 1 })).toBeGreaterThan(Math.SQRT2);
  });

  it("moves a shape on the half-metre grid", () => {
    expect(snapOffset({ x: 0, y: 0 }, { x: 0.6, y: -0.8 })).toEqual({
      x: 0.5,
      y: -1,
    });
    expect(translatePoints([{ x: 1, y: 2 }], { x: 0.5, y: -1 })).toEqual([{ x: 1.5, y: 1 }]);
    expect(formatOffset({ x: 0, y: 0 })).toBe("0 m");
    expect(formatOffset({ x: 0.5, y: -1 })).toBe("1 m south · 0.5 m east");
  });

  it("fills a bed at the plant's spread and leaves room for plants already there", () => {
    expect(plantingSpacing([0.1, 0.15])).toBe(0.15);
    expect(plantingSpacing([0.4, 0.5])).toBe(0.45);
    expect(formatSpacing(0.15)).toBe("15 cm");
    expect(formatSpacing(3.5)).toBe("3.5 m");
    const square = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
    ];
    expect(fillPoints(square, 1)).toEqual([{ x: 1, y: 1 }]);
    expect(fillPoints(square, 1, [{ x: 1, y: 1, spacing: 1 }])).toEqual([]);
    const packed = fillPoints(square, 0.5);
    expect(packed.length).toBeGreaterThan(4);
    for (const point of packed) expect(pointInPolygon(point, square)).toBe(true);
    for (let index = 0; index < packed.length; index += 1) {
      for (let other = index + 1; other < packed.length; other += 1) {
        const left = packed[index];
        const right = packed[other];
        if (left && right) expect(distance(left, right)).toBeGreaterThanOrEqual(0.49);
      }
    }
  });

  it("keeps the plant spacing when a larger bed is filled", () => {
    const spacing = 0.25;
    const small = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
    ];
    const large = [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 6, y: 4 },
      { x: 0, y: 4 },
    ];
    const few = fillPoints(small, spacing);
    const many = fillPoints(large, spacing);
    expect(many.length).toBeGreaterThan(few.length);
    expect(many.length).toBeGreaterThan(160);
    let nearest = Infinity;
    for (let index = 0; index < many.length; index += 1) {
      for (let other = index + 1; other < many.length; other += 1) {
        const left = many[index];
        const right = many[other];
        if (!left || !right) continue;
        nearest = Math.min(nearest, distance(left, right));
        expect(distance(left, right)).toBeGreaterThanOrEqual(spacing - 0.02);
      }
    }
    expect(nearest).toBeLessThan(spacing + 0.02);
    const again = placeFills(large, [], [{ plantId: "tulip", spacing }]);
    expect(again.length).toBe(many.length);
  });

  it("counts every plant in a large fill and keeps a sample to draw", () => {
    const spacing = 0.25;
    const bed = [
      { x: 0, y: 0 },
      { x: 12, y: 0 },
      { x: 12, y: 8 },
      { x: 0, y: 8 },
    ];
    const full = fillPoints(bed, spacing);
    const plan = planFill(bed, spacing);
    expect(full.length).toBeGreaterThan(MAP_FILL_CAP);
    expect(plan.count).toBe(full.length);
    expect(plan.points).toHaveLength(MAP_FILL_CAP);
    for (const point of plan.points) expect(pointInPolygon(point, bed)).toBe(true);
    const first = plan.points[0];
    const last = plan.points[plan.points.length - 1];
    if (first && last) expect(distance(first, last)).toBeGreaterThan(5);
    const taken = full.map((point) => ({ ...point, spacing }));
    expect(fillPoints(bed, spacing, taken)).toEqual([]);
  });

  it("keeps a shade block's size when its corners are turned", () => {
    const block: ShadeBlock = {
      id: "fence",
      x: 2,
      y: 1,
      width: 4,
      depth: 0.2,
      height: 1.8,
      source: "user",
    };
    const turned = rotatePoints(blockCorners(block), { x: block.x, y: block.y }, Math.PI / 2);
    const next = blockFromCorners(block, turned);
    expect(next.width).toBeCloseTo(4);
    expect(next.depth).toBeCloseTo(0.2);
    expect(next.rotation).toBeCloseTo(Math.PI / 2);
    expect(pointInBlock({ x: 2, y: 1 }, next)).toBe(true);
    expect(pointInBlock({ x: 6, y: 1 }, next)).toBe(false);
  });

  it("snaps a fence onto the property outline and leaves a distant point on the grid", () => {
    const outline = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 8 },
      { x: 0, y: 8 },
    ];
    expect(snapToOutline({ x: 4.2, y: 0.4 }, outline, 1)).toEqual({
      x: 4.2,
      y: 0,
    });
    expect(snapToOutline({ x: 4.2, y: 3 }, outline, 1)).toEqual({ x: 4, y: 3 });
    expect(snapToOutline({ x: 0.2, y: 0.15 }, null, 1)).toEqual({ x: 0, y: 0 });
    const fence: ShadeBlock = {
      id: "fence",
      x: 5,
      y: 0.6,
      width: 4,
      depth: 0.3,
      height: 1.8,
      rotation: 0.05,
      line: true,
      source: "user",
    };
    const snapped = snapLineToOutline(fence, outline, 1);
    expect(snapped.x).toBeCloseTo(5);
    expect(snapped.y).toBeCloseTo(0);
    expect(snapped.rotation).toBeCloseTo(0);
    expect(snapped.depth).toBe(0.3);
    const across: ShadeBlock = { ...fence, rotation: Math.PI / 2 };
    expect(snapLineToOutline(across, outline, 1)).toEqual(across);
    const house: ShadeBlock = { ...fence, line: false, y: 0.2 };
    expect(snapLineToOutline(house, outline, 1)).toEqual(house);
  });

  it("lengthens a fence without making it wider", () => {
    const block: ShadeBlock = {
      id: "fence",
      x: 0,
      y: 0,
      width: 4,
      depth: 0.3,
      height: 1.8,
      rotation: 0.4,
      line: true,
      source: "user",
    };
    const scaled = scalePoints(blockCorners(block), { x: 0, y: 0 }, 2.5);
    const next = blockFromCorners(block, scaled);
    expect(next.width).toBeCloseTo(10);
    expect(next.depth).toBeCloseTo(0.3);
    expect(next.rotation).toBeCloseTo(0.4);
  });

  it("stretches a fence from one end and leaves the other end put", () => {
    const block: ShadeBlock = {
      id: "fence",
      x: 2,
      y: 0,
      width: 4,
      depth: 0.3,
      height: 1.8,
      rotation: 0,
      line: true,
      source: "user",
    };
    const [start, end] = lineEnds(block);
    const longer = stretchedLine(block, start, { x: 8.1, y: 0.1 }, null, 1);
    expect(longer.width).toBeCloseTo(8);
    expect(longer.depth).toBe(0.3);
    expect(longer.rotation).toBeCloseTo(0);
    expect(lineEnds(longer)[0]).toEqual({ x: 0, y: 0 });
    const aimed = stretchedLine(block, end, { x: 4, y: 4 }, null, 1);
    expect(aimed.depth).toBe(0.3);
    expect(aimed.width).toBeCloseTo(4);
    expect(lineEnds(aimed)).toEqual([
      { x: 4, y: 0 },
      { x: 4, y: 4 },
    ]);
  });
});
