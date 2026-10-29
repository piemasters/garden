import { describe, expect, it } from "vite-plus/test";
import { getPlant, hasFlowerColour, PLANTS } from "./plants";

describe("plant catalog", () => {
  it("has a full record for each of 36 plants, bulbs and seeds", () => {
    expect(PLANTS).toHaveLength(36);
    const ids = new Set(PLANTS.map((plant) => plant.id));
    expect(ids.size).toBe(36);
    for (const plant of PLANTS) {
      expect(plant.months).toHaveLength(12);
      expect(plant.jobs.length).toBeGreaterThan(0);
      expect(plant.soils.length).toBeGreaterThan(0);
      expect(plant.sun.length).toBeGreaterThan(0);
      expect(plant.summary.length).toBeGreaterThan(40);
      for (const month of plant.months) {
        if (month.flower) expect(month.flowerHex).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
    expect(PLANTS.filter((plant) => plant.kind === "bulb")).toHaveLength(12);
    expect(PLANTS.filter((plant) => plant.kind === "seed")).toHaveLength(12);
    expect(PLANTS.filter((plant) => plant.group === "flower")).toHaveLength(29);
    expect(PLANTS.filter((plant) => plant.group === "vegetable")).toHaveLength(6);
    expect(PLANTS.filter((plant) => plant.group === "fruit")).toHaveLength(1);
    expect(PLANTS.some((plant) => plant.id === "tulipa-olympic-flame")).toBe(true);
  });

  it("matches a flower colour from the month notes", () => {
    const tulip = getPlant("tulipa-olympic-flame");
    const snowdrop = getPlant("galanthus-nivalis");
    const bluebell = getPlant("hyacinthoides-non-scripta");
    const queen = getPlant("tulipa-queen-of-night");
    expect(tulip && hasFlowerColour(tulip, "yellow")).toBe(true);
    expect(tulip && hasFlowerColour(tulip, "red")).toBe(true);
    expect(tulip && hasFlowerColour(tulip, "white")).toBe(false);
    expect(snowdrop && hasFlowerColour(snowdrop, "white")).toBe(true);
    expect(bluebell && hasFlowerColour(bluebell, "blue")).toBe(true);
    expect(bluebell && hasFlowerColour(bluebell, "purple")).toBe(true);
    expect(queen && hasFlowerColour(queen, "red")).toBe(true);
  });
});
