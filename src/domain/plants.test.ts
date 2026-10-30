import { describe, expect, it } from "vite-plus/test";
import {
  flowersInMonth,
  getPlant,
  harvestsInMonth,
  hasFlowerColour,
  PLANTS,
  seasonInMonth,
} from "./plants";

describe("plant catalog", () => {
  it("has a full record for each plant, bulb and seed", () => {
    expect(PLANTS).toHaveLength(893);
    const ids = new Set(PLANTS.map((plant) => plant.id));
    expect(ids.size).toBe(893);
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
    expect(PLANTS.filter((plant) => plant.kind === "bulb")).toHaveLength(849);
    expect(PLANTS.filter((plant) => plant.kind === "seed")).toHaveLength(24);
    expect(PLANTS.filter((plant) => plant.group === "flower")).toHaveLength(866);
    expect(PLANTS.filter((plant) => plant.group === "vegetable")).toHaveLength(18);
    expect(PLANTS.filter((plant) => plant.group === "fruit")).toHaveLength(9);
    expect(PLANTS.some((plant) => plant.id === "tulipa-olympic-flame")).toBe(true);
    const apeldoorn = getPlant("tulipa-apeldoorn");
    expect(apeldoorn?.kind).toBe("bulb");
    expect(apeldoorn && flowersInMonth(apeldoorn, 2)).toBe(true);
    expect(apeldoorn && hasFlowerColour(apeldoorn, "red")).toBe(true);
    expect(getPlant("tulipa-queen-of-night")?.summary.startsWith("A single late tulip")).toBe(true);
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

  it("finds plants in flower in a month, and skips harvest notes", () => {
    const tulip = getPlant("tulipa-olympic-flame");
    const snowdrop = getPlant("galanthus-nivalis");
    const tomato = getPlant("solanum-lycopersicum");
    const courgette = getPlant("cucurbita-pepo");
    expect(tulip && flowersInMonth(tulip, 4)).toBe(true);
    expect(tulip && flowersInMonth(tulip, 0)).toBe(false);
    expect(snowdrop && flowersInMonth(snowdrop, 0)).toBe(true);
    expect(courgette && flowersInMonth(courgette, 5)).toBe(true);
    expect(tomato && flowersInMonth(tomato, 6)).toBe(false);
  });

  it("finds crops ready to harvest, and keeps blossom months separate", () => {
    const tomato = getPlant("solanum-lycopersicum");
    const leek = getPlant("allium-porrum");
    const onion = getPlant("allium-cepa");
    const apple = getPlant("malus-domestica-bramley");
    const strawberry = getPlant("fragaria-ananassa");
    expect(tomato && harvestsInMonth(tomato, 6)).toBe(true);
    expect(tomato && harvestsInMonth(tomato, 5)).toBe(false);
    expect(leek && harvestsInMonth(leek, 0)).toBe(true);
    expect(leek && harvestsInMonth(leek, 5)).toBe(false);
    expect(onion && harvestsInMonth(onion, 7)).toBe(true);
    expect(apple && harvestsInMonth(apple, 9)).toBe(true);
    expect(apple && harvestsInMonth(apple, 4)).toBe(false);
    expect(strawberry && harvestsInMonth(strawberry, 5)).toBe(true);
    expect(strawberry && harvestsInMonth(strawberry, 4)).toBe(false);
  });

  it("uses bloom for flowers and harvest for crops", () => {
    const tulip = getPlant("tulipa-olympic-flame");
    const tomato = getPlant("solanum-lycopersicum");
    expect(tulip && seasonInMonth(tulip, 4)).toBe(true);
    expect(tulip && seasonInMonth(tulip, 0)).toBe(false);
    expect(tomato && seasonInMonth(tomato, 6)).toBe(true);
    expect(tomato && seasonInMonth(tomato, 4)).toBe(false);
  });
});
