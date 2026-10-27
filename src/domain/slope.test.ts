import { describe, expect, it } from "vite-plus/test";
import {
  describeSlope,
  fitSlope,
  slopeGradient,
  slopeSamplePoints,
  type SlopeSample,
} from "./slope";

function ring(east: number, north: number): SlopeSample[] {
  return slopeSamplePoints(null).map((point) => ({
    ...point,
    elevation: east * point.x + north * point.y,
  }));
}

describe("ground slope", () => {
  it("samples a ring wide enough to cross an elevation cell", () => {
    const points = slopeSamplePoints(null);
    expect(points).toHaveLength(9);
    expect(points[0]).toEqual({ x: 0, y: 0 });
    const north = points[1];
    expect(north?.x).toBeCloseTo(0);
    expect(north?.y).toBeCloseTo(80);
  });

  it("fits a fall to the west as 1 in 10", () => {
    const slope = fitSlope(ring(0.1, 0));
    expect(slope.kind).toBe("fall");
    if (slope.kind !== "fall") return;
    expect(slope.bearing).toBeCloseTo(270);
    expect(slope.gradient).toBeCloseTo(0.1);
    expect(describeSlope(slope)).toBe("Falls west, about 1 in 10.");
    expect(slopeGradient(slope)?.east).toBeCloseTo(0.1);
    expect(slopeGradient(slope)?.north).toBeCloseTo(0);
  });

  it("fits a south-west fall as about 1 in 14", () => {
    const slope = fitSlope(ring(0.05, 0.05));
    expect(slope.kind).toBe("fall");
    if (slope.kind !== "fall") return;
    expect(slope.bearing).toBeCloseTo(225);
    expect(describeSlope(slope)).toBe("Falls south-west, about 1 in 14.");
  });

  it("calls a shallow plane level and a short sample unknown", () => {
    expect(fitSlope(ring(0.005, 0))).toEqual({ kind: "level" });
    expect(describeSlope({ kind: "level" })).toBe("The ground is effectively level.");
    expect(fitSlope(ring(0.1, 0).slice(0, 3))).toEqual({ kind: "unknown" });
    expect(describeSlope({ kind: "unknown" })).toBe(
      "The ground slope could not be read from the elevation map.",
    );
    expect(describeSlope(undefined)).toBeNull();
    expect(slopeGradient({ kind: "level" })).toBeNull();
  });
});
