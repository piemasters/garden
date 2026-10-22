import { describe, expect, it } from "vite-plus/test";
import { etrs89ToOsgb36Cartesian, gridToWgs84, osgb36ToGrid, wgs84ToGrid } from "./osgb";

describe("British National Grid", () => {
  it("projects the Ordnance Survey Airy 1830 worked example", () => {
    const latitude = 52 + 39 / 60 + 27.2531 / 3600;
    const longitude = 1 + 43 / 60 + 4.5177 / 3600;
    const grid = osgb36ToGrid(latitude, longitude);
    expect(grid.easting).toBeCloseTo(651_409.903, 1);
    expect(grid.northing).toBeCloseTo(313_177.27, 1);
  });

  it("projects the Helmert worked example onto the National Grid", () => {
    const latitude = 53 + 36 / 60 + 42.2972 / 3600;
    const longitude = -(1 + 39 / 60 + 46.5416 / 3600);
    const grid = osgb36ToGrid(latitude, longitude);
    expect(grid.easting).toBeCloseTo(422_297.792, 1);
    expect(grid.northing).toBeCloseTo(412_878.741, 1);
  });

  it("applies the Ordnance Survey Helmert parameters", () => {
    const shifted = etrs89ToOsgb36Cartesian(3_790_644.9, -110_149.21, 5_111_482.97);
    expect(shifted.x).toBeCloseTo(3_790_269.549, 1);
    expect(shifted.y).toBeCloseTo(-110_038.064, 1);
    expect(shifted.z).toBeCloseTo(5_111_050.261, 1);
  });

  it("round-trips a WGS84 point through the National Grid", () => {
    const geographic = gridToWgs84(...gridPair(wgs84ToGrid(51.5034878, -0.1276965)));
    expect(geographic.latitude).toBeCloseTo(51.5034878, 5);
    expect(geographic.longitude).toBeCloseTo(-0.1276965, 5);
  });
});

function gridPair(grid: { easting: number; northing: number }): [number, number] {
  return [grid.easting, grid.northing];
}
