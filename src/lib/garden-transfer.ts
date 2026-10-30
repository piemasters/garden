import {
  ASPECTS,
  EXPOSURES,
  GROUND_SURFACES,
  MOISTURE_LEVELS,
  PH_LEVELS,
  SOIL_TYPES,
  SUN_LEVELS,
  type Garden,
} from "../domain/types";

export const GARDEN_FILE_KIND = "uk-garden-planner.garden";
export const GARDEN_FILE_VERSION = 1;

export type GardenFileResult = { ok: true; garden: Garden } | { ok: false; error: string };

export function gardenFileName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "garden"}.json`;
}

export function downloadGarden(garden: Garden): void {
  const payload = {
    kind: GARDEN_FILE_KIND,
    version: GARDEN_FILE_VERSION,
    garden,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = gardenFileName(garden.site.name);
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function readGardenFile(text: string): GardenFileResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    return { ok: false, error: "That file is not valid JSON." };
  }
  if (!isRecord(parsed) || parsed.kind !== GARDEN_FILE_KIND) {
    return { ok: false, error: "That file is not a garden export." };
  }
  if (parsed.version !== GARDEN_FILE_VERSION) {
    return { ok: false, error: "This garden file is from a different version of the planner." };
  }
  if (!isGarden(parsed.garden)) {
    return { ok: false, error: "This garden file is missing part of the plan." };
  }
  return { ok: true, garden: parsed.garden };
}

export function gardenForImport(garden: Garden, existingIds: readonly string[]): Garden {
  if (!existingIds.includes(garden.id)) return garden;
  return { ...garden, id: crypto.randomUUID() };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function oneOf(value: unknown, options: readonly string[]): boolean {
  return typeof value === "string" && options.includes(value);
}

function isPoint(value: unknown): boolean {
  return isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y);
}

function isPointList(value: unknown): boolean {
  return Array.isArray(value) && value.every(isPoint);
}

function isSlope(value: unknown): boolean {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  if (value.kind === "level" || value.kind === "unknown") return true;
  return value.kind === "fall" && isFiniteNumber(value.bearing) && isFiniteNumber(value.gradient);
}

function isSoilSuggestion(value: unknown): boolean {
  if (value === null) return true;
  return isRecord(value) && oneOf(value.soil, SOIL_TYPES) && typeof value.label === "string";
}

function isSite(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.name === "string" &&
    typeof value.postcode === "string" &&
    isFiniteNumber(value.latitude) &&
    isFiniteNumber(value.longitude) &&
    typeof value.country === "string" &&
    typeof value.region === "string" &&
    oneOf(value.soil, SOIL_TYPES) &&
    oneOf(value.moisture, MOISTURE_LEVELS) &&
    oneOf(value.ph, PH_LEVELS) &&
    oneOf(value.aspect, ASPECTS) &&
    oneOf(value.exposure, EXPOSURES) &&
    (value.address === null || typeof value.address === "string") &&
    isSoilSuggestion(value.soilSuggestion) &&
    isSlope(value.slope)
  );
}

function isBlock(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.width) &&
    isFiniteNumber(value.depth) &&
    isFiniteNumber(value.height) &&
    (value.source === "osm" || value.source === "user") &&
    (value.rotation === undefined || isFiniteNumber(value.rotation)) &&
    (value.line === undefined || typeof value.line === "boolean") &&
    (value.surface === undefined || oneOf(value.surface, GROUND_SURFACES)) &&
    (value.label === undefined || typeof value.label === "string")
  );
}

function isBed(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isPointList(value.points) &&
    (value.lightOverride === null || oneOf(value.lightOverride, SUN_LEVELS)) &&
    (value.soilOverride === undefined ||
      value.soilOverride === null ||
      oneOf(value.soilOverride, SOIL_TYPES)) &&
    (value.color === undefined || typeof value.color === "string") &&
    (value.surface === undefined || oneOf(value.surface, GROUND_SURFACES)) &&
    (value.raised === undefined || typeof value.raised === "boolean")
  );
}

function isPlacement(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.plantId === "string" &&
    typeof value.bedId === "string" &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    (value.fill === undefined || typeof value.fill === "boolean") &&
    (value.count === undefined ||
      (isFiniteNumber(value.count) &&
        value.count >= 1 &&
        Math.floor(value.count) === value.count)) &&
    (value.spacing === undefined || (isFiniteNumber(value.spacing) && value.spacing > 0))
  );
}

function isGarden(value: unknown): value is Garden {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    isSite(value.site) &&
    Array.isArray(value.blocks) &&
    value.blocks.every(isBlock) &&
    Array.isArray(value.beds) &&
    value.beds.every(isBed) &&
    Array.isArray(value.placements) &&
    value.placements.every(isPlacement) &&
    typeof value.buildingsLoaded === "boolean" &&
    (value.buildingError === null || typeof value.buildingError === "string") &&
    typeof value.showUnsuitable === "boolean" &&
    (value.showBedNames === undefined || typeof value.showBedNames === "boolean") &&
    (value.showShade === undefined || typeof value.showShade === "boolean") &&
    (value.showSlope === undefined || typeof value.showSlope === "boolean") &&
    (value.surface === undefined || oneOf(value.surface, GROUND_SURFACES)) &&
    (value.boundary === null || isPointList(value.boundary)) &&
    (value.attribution === null || typeof value.attribution === "string")
  );
}
