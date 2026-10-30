import { describe, expect, it } from "vite-plus/test";
import { footprintBlock, pointInPolygon } from "./geometry";
import {
  classifyLight,
  midsummerSamples,
  rayHitsBox,
  shadowFootprint,
  sunAt,
  sunlitHours,
  sunVector,
} from "./sun";
import type { ShadeBlock } from "./types";

const southBlock: ShadeBlock = {
  id: "south",
  x: 0,
  y: -4,
  width: 8,
  depth: 2,
  height: 10,
  source: "user",
};

describe("sun and shade", () => {
  it("points due south when the azimuth is 180 degrees", () => {
    const vector = sunVector(180, 0);
    expect(vector.x).toBeCloseTo(0);
    expect(vector.y).toBeCloseTo(-1);
    expect(vector.z).toBeCloseTo(0);
  });

  it("treats a building to the south as shade and one to the north as clear", () => {
    const direction = sunVector(180, 28);
    const origin = { x: 0, y: 0, z: 0.4 };
    expect(rayHitsBox(origin, direction, southBlock)).toBe(true);
    expect(rayHitsBox(origin, direction, { ...southBlock, id: "north", y: 4 })).toBe(false);
    expect(rayHitsBox({ x: 3, y: 0, z: 0.4 }, direction, southBlock)).toBe(true);
    expect(
      rayHitsBox({ x: 3, y: 0, z: 0.4 }, direction, {
        ...southBlock,
        rotation: Math.PI / 2,
      }),
    ).toBe(false);
  });

  it("throws a building's shadow away from the sun", () => {
    const block: ShadeBlock = {
      id: "house",
      x: 0,
      y: 0,
      width: 4,
      depth: 2,
      height: 6,
      source: "user",
    };
    const north = shadowFootprint(block, 180, 45);
    expect(pointInPolygon({ x: 0, y: 4 }, north)).toBe(true);
    expect(pointInPolygon({ x: 0, y: -3 }, north)).toBe(false);
    const south = shadowFootprint(block, 0, 45);
    expect(pointInPolygon({ x: 0, y: -4 }, south)).toBe(true);
    expect(pointInPolygon({ x: 0, y: 4 }, south)).toBe(false);
    const high = Math.max(...shadowFootprint(block, 180, 60).map((point) => point.y));
    const low = Math.max(...shadowFootprint(block, 180, 30).map((point) => point.y));
    expect(low).toBeGreaterThan(high);
  });

  it("classifies midsummer hours", () => {
    expect(classifyLight(6)).toBe("full-sun");
    expect(classifyLight(3)).toBe("partial-sun");
    expect(classifyLight(2.5)).toBe("shade");
  });

  it("counts only unshaded samples", () => {
    const samples = [
      { azimuth: 180, altitude: 40 },
      { azimuth: 180, altitude: 40 },
      { azimuth: 0, altitude: 40 },
    ];
    const hours = sunlitHours(samples, { x: 0, y: 0, z: 0.4 }, [southBlock]);
    expect(hours).toBe(0.5);
  });

  it("follows the clock from east in the morning to west in the afternoon", () => {
    const norm = (azimuth: number) => ((azimuth % 360) + 360) % 360;
    const morning = sunAt(51.5, -0.12, 5, 9);
    const afternoon = sunAt(51.5, -0.12, 5, 16);
    expect(morning.altitude).toBeGreaterThan(20);
    expect(afternoon.altitude).toBeGreaterThan(20);
    expect(norm(morning.azimuth)).toBeLessThan(180);
    expect(norm(afternoon.azimuth)).toBeGreaterThan(180);
    expect(sunAt(51.5, -0.12, 5, 0).altitude).toBeLessThan(0);
  });

  it("finds a full day of sun on an open June day in London", () => {
    const samples = midsummerSamples(51.5, -0.12);
    const noon = samples.reduce((highest, sample) =>
      sample.altitude > highest.altitude ? sample : highest,
    );
    expect(noon.altitude).toBeGreaterThan(55);
    const south = Math.abs((((noon.azimuth % 360) + 360) % 360) - 180);
    expect(Math.min(south, 360 - south)).toBeLessThan(20);
    expect(sunlitHours(samples, { x: 0, y: 0, z: 0.4 }, [])).toBeGreaterThan(6);
  });

  it("turns a building footprint into a shade block", () => {
    const block = footprintBlock(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 6 },
        { x: 0, y: 6 },
      ],
      8,
      "osm-1",
      "osm",
    );
    expect(block).toMatchObject({ x: 5, y: 3, width: 10, depth: 6, height: 8 });
  });

  it("knows when a point is inside a bed", () => {
    const bed = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 2 },
      { x: 0, y: 2 },
    ];
    expect(pointInPolygon({ x: 1, y: 1 }, bed)).toBe(true);
    expect(pointInPolygon({ x: 5, y: 1 }, bed)).toBe(false);
  });
});
