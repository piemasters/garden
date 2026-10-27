import { describe, expect, it } from "vite-plus/test";
import { GROUND_SURFACES } from "./types";
import { SURFACE_LABEL, bedSurface, groundSurface } from "./surface";

describe("ground surface", () => {
  it("treats a missing or unknown choice as grass", () => {
    expect(groundSurface(undefined)).toBe("grass");
    expect(groundSurface(null)).toBe("grass");
    expect(groundSurface("pond")).toBe("grass");
  });

  it("keeps a known material and a readable name", () => {
    expect(groundSurface("concrete")).toBe("concrete");
    expect(SURFACE_LABEL.decking).toBe("Decking");
    expect(GROUND_SURFACES).toContain("bark");
  });

  it("leaves a bed on its colour when no material is chosen", () => {
    expect(bedSurface(undefined)).toBeNull();
    expect(bedSurface("pond")).toBeNull();
    expect(bedSurface("paving")).toBe("paving");
  });
});
