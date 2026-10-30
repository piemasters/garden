import { describe, expect, it } from "vite-plus/test";
import type { Garden } from "../domain/types";
import { gardenFileName, gardenForImport, readGardenFile } from "./garden-transfer";

const garden: Garden = {
  id: "garden-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  buildingsLoaded: false,
  buildingError: null,
  showUnsuitable: false,
  boundary: [{ x: 0, y: 0 }],
  attribution: null,
  blocks: [],
  beds: [
    {
      id: "bed-1",
      name: "Front",
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
      ],
      lightOverride: null,
    },
  ],
  placements: [{ id: "plant-1", plantId: "rosa-gertrude-jekyll", bedId: "bed-1", x: 0.2, y: 0.4 }],
  site: {
    name: "Front garden",
    postcode: "SW1A 2AA",
    latitude: 51.5,
    longitude: -0.12,
    country: "England",
    region: "London",
    soil: "clay",
    moisture: "moist",
    ph: "neutral",
    aspect: "south",
    exposure: "sheltered",
    soilSuggestion: null,
    address: "10 Downing Street",
    slope: { kind: "unknown" },
  },
};

describe("garden transfer", () => {
  it("names the download from the garden name", () => {
    expect(gardenFileName("Front garden")).toBe("front-garden.json");
    expect(gardenFileName("   ")).toBe("garden.json");
  });

  it("reads a garden file and rejects anything else", () => {
    const file = JSON.stringify({
      kind: "uk-garden-planner.garden",
      version: 1,
      garden,
    });
    const result = readGardenFile(file);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.garden.site.name).toBe("Front garden");

    expect(readGardenFile("{").ok).toBe(false);
    expect(readGardenFile(JSON.stringify({ kind: "other", version: 1, garden })).ok).toBe(false);
    expect(
      readGardenFile(JSON.stringify({ kind: "uk-garden-planner.garden", version: 2, garden })).ok,
    ).toBe(false);
    expect(
      readGardenFile(
        JSON.stringify({
          kind: "uk-garden-planner.garden",
          version: 1,
          garden: { ...garden, site: { ...garden.site, soil: "peat" } },
        }),
      ).ok,
    ).toBe(false);
    const counted = readGardenFile(
      JSON.stringify({
        kind: "uk-garden-planner.garden",
        version: 1,
        garden: {
          ...garden,
          placements: [{ ...garden.placements[0], fill: true, count: 25000, spacing: 0.25 }],
        },
      }),
    );
    expect(counted.ok).toBe(true);
    if (counted.ok) expect(counted.garden.placements[0]?.count).toBe(25000);
    expect(
      readGardenFile(
        JSON.stringify({
          kind: "uk-garden-planner.garden",
          version: 1,
          garden: {
            ...garden,
            placements: [{ ...garden.placements[0], count: 0 }],
          },
        }),
      ).ok,
    ).toBe(false);
    const clay = readGardenFile(
      JSON.stringify({
        kind: "uk-garden-planner.garden",
        version: 1,
        garden: {
          ...garden,
          beds: [{ ...garden.beds[0], soilOverride: "clay" }],
        },
      }),
    );
    expect(clay.ok).toBe(true);
    if (clay.ok) expect(clay.garden.beds[0]?.soilOverride).toBe("clay");
    expect(
      readGardenFile(
        JSON.stringify({
          kind: "uk-garden-planner.garden",
          version: 1,
          garden: {
            ...garden,
            beds: [{ ...garden.beds[0], soilOverride: "peat" }],
          },
        }),
      ).ok,
    ).toBe(false);
  });

  it("keeps a second copy when this browser already has that garden", () => {
    expect(gardenForImport(garden, []).id).toBe("garden-1");
    expect(gardenForImport(garden, ["garden-1"]).id).not.toBe("garden-1");
  });
});
