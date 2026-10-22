import { describe, expect, it } from "vite-plus/test";
import { toLocalMetres } from "./geometry";
import {
  BOUNDARY_NONE,
  BOUNDARY_TOO_LARGE,
  PLOT_NONE,
  PLOT_TOO_LARGE,
  ringsFromGeometry,
  selectPlotBoundary,
  selectResidentialBoundary,
} from "./boundary";

const latitude = 51.5;
const longitude = -0.12;

describe("residential site selection", () => {
  it("keeps the smallest site that contains the address", () => {
    const small = square(0.00012);
    const large = square(0.0004);
    const chosen = selectResidentialBoundary(
      [
        { description: "Private Residential Site", coordinates: large, areaM2: 4000 },
        { description: "School", coordinates: square(0.00005), areaM2: 10 },
        { description: "Communal Residential Site", coordinates: small, areaM2: 400 },
      ],
      latitude,
      longitude,
    );
    expect(chosen.reason).toBeNull();
    expect(chosen.boundary).toHaveLength(4);
    const corner = small[0];
    expect(corner).toBeDefined();
    if (!corner) return;
    const expected = toLocalMetres(corner[1], corner[0], latitude, longitude);
    expect(chosen.boundary?.[0]?.x).toBeCloseTo(expected.x, 5);
    expect(chosen.boundary?.[0]?.y).toBeCloseTo(expected.y, 5);
  });

  it("rejects a site whose long side is over 120 metres", () => {
    const chosen = selectResidentialBoundary(
      [{ description: "Private Residential Site", coordinates: square(0.002), areaM2: 80_000 }],
      latitude,
      longitude,
    );
    expect(chosen.boundary).toBeNull();
    expect(chosen.reason).toBe(BOUNDARY_TOO_LARGE);
  });

  it("reads the outer ring of a multipolygon", () => {
    const ring = close(square(0.00012));
    const rings = ringsFromGeometry(
      { type: "MultiPolygon", coordinates: [[ring, []], [square(0.01)]] },
      "Private Residential Site",
      500,
    );
    expect(rings).toHaveLength(2);
    expect(rings[0]?.coordinates).toEqual(square(0.00012));
    const chosen = selectResidentialBoundary(rings, latitude, longitude);
    expect(chosen.reason).toBeNull();
    expect(chosen.boundary).toHaveLength(4);
  });

  it("explains when nothing contains the address", () => {
    const elsewhere = square(0.00012).map(
      ([pointLongitude, pointLatitude]) =>
        [pointLongitude + 0.01, pointLatitude] as [number, number],
    );
    const chosen = selectResidentialBoundary(
      [{ description: "Private Residential Site", coordinates: elsewhere }],
      latitude,
      longitude,
    );
    expect(chosen.reason).toBe(BOUNDARY_NONE);
  });
});

describe("freehold plot selection", () => {
  it("keeps the smallest outline that contains the point", () => {
    const chosen = selectPlotBoundary(
      [
        [
          [0, 0],
          [80, 0],
          [80, 80],
          [0, 80],
        ],
        [
          [10, 10],
          [30, 10],
          [30, 40],
          [10, 40],
        ],
      ],
      20,
      20,
      (easting, northing) => ({ x: easting - 20, y: northing - 20 }),
    );
    expect(chosen.reason).toBeNull();
    expect(chosen.boundary?.[0]).toEqual({ x: -10, y: -10 });
  });

  it("keeps a large freehold that still fits on the plan", () => {
    const chosen = selectPlotBoundary(
      [
        [
          [0, 0],
          [130, 0],
          [130, 40],
          [0, 40],
        ],
      ],
      10,
      10,
      (easting, northing) => ({ x: easting, y: northing }),
    );
    expect(chosen.reason).toBeNull();
    expect(chosen.boundary).toHaveLength(4);
  });

  it("rejects an outline longer than 160 metres", () => {
    const chosen = selectPlotBoundary(
      [
        [
          [0, 0],
          [200, 0],
          [200, 20],
          [0, 20],
        ],
      ],
      10,
      10,
      (easting, northing) => ({ x: easting, y: northing }),
    );
    expect(chosen.boundary).toBeNull();
    expect(chosen.reason).toBe(PLOT_TOO_LARGE);
  });

  it("explains when the point is outside every outline", () => {
    const chosen = selectPlotBoundary(
      [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
        ],
      ],
      50,
      50,
      (easting, northing) => ({ x: easting, y: northing }),
    );
    expect(chosen.reason).toBe(PLOT_NONE);
  });
});

function square(delta: number): Array<[number, number]> {
  return [
    [longitude - delta, latitude - delta],
    [longitude + delta, latitude - delta],
    [longitude + delta, latitude + delta],
    [longitude - delta, latitude + delta],
  ];
}

function close(ring: Array<[number, number]>): Array<[number, number]> {
  const first = ring[0];
  return first ? [...ring, first] : ring;
}
