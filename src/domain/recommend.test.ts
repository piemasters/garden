import { describe, expect, it } from "vite-plus/test";
import { PLANTS } from "./plants";
import { judgePlant, recommendPlants, requiredHardiness } from "./recommend";
import type { GardenSite } from "./types";

const london: Pick<
  GardenSite,
  "soil" | "moisture" | "ph" | "aspect" | "exposure" | "country" | "region" | "latitude"
> = {
  soil: "loam",
  moisture: "well-drained",
  ph: "neutral",
  aspect: "south",
  exposure: "sheltered",
  country: "England",
  region: "London",
  latitude: 51.5,
};

describe("recommendations", () => {
  it("expects H5 in the north and H4 elsewhere", () => {
    expect(requiredHardiness({ country: "England", region: "London", latitude: 51.5 })).toBe("H4");
    expect(requiredHardiness({ country: "Scotland", region: "Scotland", latitude: 55.9 })).toBe(
      "H5",
    );
  });

  it("accepts a sun-loving tulip on a matching bed and explains a tomato", () => {
    const tulip = PLANTS.find((plant) => plant.id === "tulipa-olympic-flame");
    const tomato = PLANTS.find((plant) => plant.id === "solanum-lycopersicum");
    expect(tulip && judgePlant(tulip, london, "full-sun").suitable).toBe(true);
    const verdict = tomato && judgePlant(tomato, london, "full-sun");
    expect(verdict?.suitable).toBe(false);
    expect(verdict?.reasons.some((reason) => reason.includes("H2"))).toBe(true);
  });

  it("filters shade and ranks a north-facing full-sun plant lower", () => {
    const hidden = recommendPlants(PLANTS, london, "shade", false);
    expect(hidden.some((verdict) => verdict.plant.id === "tulipa-olympic-flame")).toBe(false);
    const south = judgePlant(
      PLANTS.find((plant) => plant.id === "lavandula-angustifolia")!,
      london,
      "full-sun",
    );
    const north = judgePlant(
      PLANTS.find((plant) => plant.id === "lavandula-angustifolia")!,
      { ...london, aspect: "north" },
      "full-sun",
    );
    expect(north.suitable).toBe(true);
    expect(north.score).toBeLessThan(south.score);
  });

  it("can show unsuitable plants with the reason they were left out", () => {
    const shown = recommendPlants(PLANTS, { ...london, soil: "clay" }, "full-sun", true);
    const tulip = shown.find((verdict) => verdict.plant.id === "tulipa-olympic-flame");
    expect(tulip?.suitable).toBe(false);
    expect(tulip?.reasons[0]).toMatch(/soil/i);
  });
});
