import { describe, expect, it } from "vite-plus/test";
import { parseBgsFeatureInfo, soilFromBgs } from "./soil";

describe("BGS soil parsing", () => {
  it("reads a clay parent material", () => {
    const text =
      "@Parent.Material.Soil.texture Shape;SIMPLE_TEX;SOIL_GROUP;CACO3_RANK;SOIL_GROUP_DESC;Polygon;PEATY CLAY;HEAVY;NONE;Heavy, clay-rich soil and subsoil.";
    const reading = parseBgsFeatureInfo(text);
    expect(reading.simpleTex).toBe("PEATY CLAY");
    expect(soilFromBgs(reading)).toBe("clay");
  });

  it("reads chalk when the texture is calcareous and not clay", () => {
    const text = "Shape;SIMPLE_TEX;SOIL_GROUP;CACO3_RANK;Polygon;CHALK;LIGHT;HIGH";
    expect(soilFromBgs(parseBgsFeatureInfo(text))).toBe("chalk");
  });

  it("reads sand and loam", () => {
    expect(
      soilFromBgs(
        parseBgsFeatureInfo("Shape;SIMPLE_TEX;SOIL_GROUP;CACO3_RANK;Polygon;SAND;LIGHT;LOW"),
      ),
    ).toBe("sand");
    expect(
      soilFromBgs(
        parseBgsFeatureInfo("Shape;SIMPLE_TEX;SOIL_GROUP;CACO3_RANK;Polygon;LOAM;MEDIUM;LOW"),
      ),
    ).toBe("loam");
  });

  it("returns nothing when the response has no feature", () => {
    expect(parseBgsFeatureInfo("no features")).toEqual({});
    expect(soilFromBgs({})).toBeNull();
  });
});
