import { describe, expect, it } from "vite-plus/test";
import { searchPolygon, titlePlots } from "./titles";

describe("title boundary search", () => {
  it("builds a closed box around the search point", () => {
    const polygon = searchPolygon(51.344944, -0.10973, 320);
    expect(polygon.startsWith("POLYGON((")).toBe(true);
    expect(polygon.endsWith("))")).toBe(true);
    const pairs = polygon.slice("POLYGON((".length, -2).split(",");
    expect(pairs).toHaveLength(5);
    expect(pairs[0]).toBe(pairs[4]);
    const longitudes = pairs.map((pair) => Number(pair.split(" ")[0]));
    expect(Math.min(...longitudes)).toBeLessThan(-0.10973);
    expect(Math.max(...longitudes)).toBeGreaterThan(-0.10973);
  });

  it("keeps garden-sized plots within the search pad, nearest first", () => {
    const plots = titlePlots(
      [square(0, 0, 20), square(400, 0, 20), square(30, 0, 200), square(40, 10, 8)],
      { x: 0, y: 0 },
      320,
    );
    expect(plots).toHaveLength(1);
    expect(plots[0]?.width).toBe(20);
    expect(plots[0]?.distance).toBe(0);
  });
});

function square(east: number, north: number, side: number) {
  return [
    { x: east, y: north },
    { x: east + side, y: north },
    { x: east + side, y: north + side },
    { x: east, y: north + side },
  ];
}
