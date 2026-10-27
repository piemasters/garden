import { describe, expect, it } from "vite-plus/test";
import {
  formatLengthLabel,
  formatMove,
  formatRange,
  formatSizeIn,
  formatSpacingIn,
  toMetres,
} from "./units";

describe("length units", () => {
  it("keeps metres and converts feet", () => {
    expect(toMetres(2, "m")).toBe(2);
    expect(toMetres(10, "ft")).toBeCloseTo(3.048);
    expect(formatLengthLabel(2, "m")).toBe("2 m");
    expect(formatLengthLabel(2, "ft")).toBe("6.6 ft");
    expect(formatSizeIn(2, 4, "ft")).toBe("6.6 × 13.1 ft");
  });

  it("uses the smaller unit for short spacing", () => {
    expect(formatSpacingIn(0.4, "m")).toBe("40 cm");
    expect(formatSpacingIn(0.2, "ft")).toBe("8 in");
    expect(formatSpacingIn(1.5, "ft")).toBe("4.9 ft");
  });

  it("formats a plant size range and a move", () => {
    expect(formatRange([0.3, 0.6], "m")).toBe("0.3–0.6 m");
    expect(formatRange([1, 1], "ft")).toBe("3.3 ft");
    expect(formatMove({ x: 0.5, y: -1 }, "m")).toBe("1 m south · 0.5 m east");
    expect(formatMove({ x: 0, y: 0 }, "ft")).toBe("0 ft");
  });
});
