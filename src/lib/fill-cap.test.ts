import { describe, expect, it } from "vite-plus/test";
import { MAP_FILL_CAP } from "../domain/geometry";
import type { Garden, Placement } from "../domain/types";
import { compactLargeFills, placementsToDraw, plantedCount } from "./fill-cap";

function placed(id: string, fill = false): Placement {
  return { id, plantId: "calendula-officinalis", bedId: "bed-1", x: Number(id), y: 0, fill };
}

describe("large fills", () => {
  it("counts a fill record as every plant it stands for", () => {
    expect(plantedCount([{ count: 25000 }, {}])).toBe(25001);
  });

  it("draws a spread of a huge fill and keeps plants placed by hand", () => {
    const fills = Array.from({ length: MAP_FILL_CAP + 25 }, (_, index) =>
      placed(String(index), true),
    );
    const hand = { ...placed("hand"), x: 1, y: 2, fill: undefined };
    const drawn = placementsToDraw([...fills, hand]);
    expect(drawn).toHaveLength(MAP_FILL_CAP + 1);
    expect(drawn.some((item) => item.id === "hand")).toBe(true);
    const compact = {
      ...placed("mass", true),
      count: 9000,
      spacing: 0.25,
    };
    expect(placementsToDraw([compact, hand]).map((item) => item.id)).toEqual(["mass", "hand"]);
  });

  it("stores a huge fill as one record and leaves a smaller fill alone", () => {
    const huge = Array.from({ length: MAP_FILL_CAP + 1 }, (_, index) => ({
      ...placed(`p${index}`, true),
      x: index * 0.25,
    }));
    const small = [
      { ...placed("a", true), plantId: "tulip" },
      { ...placed("b", true), plantId: "tulip" },
    ];
    const hand = placed("hand");
    const garden = { placements: [...huge, ...small, hand] } as Garden;
    const compact = compactLargeFills(garden);
    expect(compact).not.toBe(garden);
    const mass = compact.placements.find((item) => item.count);
    expect(mass?.count).toBe(huge.length);
    expect(mass?.spacing).toBe(0.25);
    expect(compact.placements.some((item) => item.id === "p1")).toBe(false);
    expect(compact.placements.map((item) => item.id)).toEqual([mass?.id, "a", "b", "hand"]);
    expect(compactLargeFills(compact)).toBe(compact);
    expect(compactLargeFills({ placements: small } as Garden)).toEqual({ placements: small });
  });
});
