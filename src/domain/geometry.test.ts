import { describe, expect, it } from "vite-plus/test";
import { fromLocalMetres, smallestOutlineAt, toLocalMetres } from "./geometry";

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
