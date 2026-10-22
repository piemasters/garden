import type { SoilType } from "./types";

export interface BgsSoilReading {
  simpleTex?: string;
  soilGroup?: string;
  carbonate?: string;
  description?: string;
}

export function parseBgsFeatureInfo(text: string): BgsSoilReading {
  const section = text.split("@").find((part) => part.includes("SIMPLE_TEX")) ?? text;
  const parts = section
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const shapeIndex = parts.findIndex(
    (part) => part === "Polygon" || part === "Point" || part === "MultiPolygon",
  );
  if (shapeIndex <= 0) return {};
  const headers = parts
    .slice(0, shapeIndex)
    .map((header, index) => (index === 0 ? (header.split(/\s+/).pop() ?? header) : header));
  const values = parts.slice(shapeIndex);
  const read = (name: string) => {
    const index = headers.indexOf(name);
    return index >= 0 ? values[index] : undefined;
  };
  return {
    simpleTex: read("SIMPLE_TEX"),
    soilGroup: read("SOIL_GROUP"),
    carbonate: read("CACO3_RANK"),
    description: read("SOIL_GROUP_DESC"),
  };
}

export function soilFromBgs(reading: BgsSoilReading): SoilType | null {
  const texture =
    `${reading.simpleTex ?? ""} ${reading.soilGroup ?? ""} ${reading.description ?? ""}`.toUpperCase();
  if (!texture.trim() && !reading.carbonate) return null;
  const carbonate = (reading.carbonate ?? "").toUpperCase();
  const calcareous = /HIGH|MEDIUM/.test(carbonate) || /CHALK|LIMESTONE/.test(texture);
  if (/CHALK/.test(texture) || (calcareous && !/CLAY|HEAVY/.test(texture))) return "chalk";
  if (/CLAY|HEAVY/.test(texture)) return "clay";
  if (/LOAM|SILT|MEDIUM/.test(texture)) return "loam";
  if (/SAND|LIGHT/.test(texture)) return "sand";
  return null;
}

export function describeSoilReading(reading: BgsSoilReading, soil: SoilType | null): string {
  const detail = reading.description ?? reading.simpleTex;
  if (soil && detail) return `${soilLabel(soil)} suggested from the national map (${detail})`;
  if (soil) return `${soilLabel(soil)} suggested from the national map`;
  return "No soil texture came back for this point";
}

function soilLabel(soil: SoilType): string {
  return soil.charAt(0).toUpperCase() + soil.slice(1);
}
