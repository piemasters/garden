import type {
  Aspect,
  Exposure,
  Moisture,
  PhLevel,
  PlantGroup,
  PlantKind,
  SoilType,
  SunLevel,
} from "./types";

export const SOIL_LABEL: Record<SoilType, string> = {
  chalk: "Chalk",
  clay: "Clay",
  loam: "Loam",
  sand: "Sand",
};

export const MOISTURE_LABEL: Record<Moisture, string> = {
  "well-drained": "Well-drained",
  moist: "Moist",
  wet: "Wet",
};

export const PH_LABEL: Record<PhLevel, string> = {
  acid: "Acid",
  neutral: "Neutral",
  alkaline: "Alkaline",
};

export const SUN_LABEL: Record<SunLevel, string> = {
  "full-sun": "Full sun",
  "partial-sun": "Partial sun",
  shade: "Shade",
};

export const ASPECT_LABEL: Record<Aspect, string> = {
  north: "North-facing",
  east: "East-facing",
  south: "South-facing",
  west: "West-facing",
};

export const EXPOSURE_LABEL: Record<Exposure, string> = {
  sheltered: "Sheltered",
  exposed: "Exposed",
};

export const KIND_LABEL: Record<PlantKind, string> = {
  plant: "Perennials and shrubs",
  bulb: "Bulbs",
  seed: "Seeds",
};

export const GROUP_LABEL: Record<PlantGroup, string> = {
  flower: "Flowers",
  vegetable: "Vegetables",
  fruit: "Fruit",
};

export function joinLabels(values: string[]): string {
  if (values.length <= 1) return values[0] ?? "";
  return `${values.slice(0, -1).join(", ")} or ${values[values.length - 1]}`;
}
