import type { Aspect, Exposure, Garden, Moisture, PhLevel, SoilType } from "../domain/types";
import type { SiteLookup } from "../server/site";
import { compactLargeFills } from "./fill-cap";

type LocatedSite = Extract<SiteLookup, { ok: true }>;

export type GardenConditions = {
  soil: SoilType;
  moisture: Moisture;
  ph: PhLevel;
  aspect: Aspect;
  exposure: Exposure;
};

export function createGarden(
  name: string,
  site: LocatedSite,
  conditions: GardenConditions,
): Garden {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    buildingsLoaded: false,
    buildingError: null,
    showUnsuitable: false,
    showBedNames: false,
    showShade: true,
    showSlope: true,
    surface: "grass",
    boundary: site.boundary,
    attribution: site.attribution,
    blocks: [],
    beds: [],
    placements: [],
    site: {
      name,
      address: site.matchedAddress,
      postcode: site.postcode,
      latitude: site.latitude,
      longitude: site.longitude,
      country: site.country,
      region: site.region,
      soil: conditions.soil,
      moisture: conditions.moisture,
      ph: conditions.ph,
      aspect: conditions.aspect,
      exposure: conditions.exposure,
      soilSuggestion: site.soilSuggestion,
      slope: site.slope ?? { kind: "unknown" },
    },
  };
}

const KEY = "uk-garden-planner.v1";

export function loadGardens(): Garden[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Garden[];
  } catch {
    return [];
  }
}

/** Load gardens and fold any saved fill that is too large to draw. */
export function loadSettledGardens(): Garden[] {
  const loaded = loadGardens();
  let changed = false;
  const settled = loaded.map((garden) => {
    const next = compactLargeFills(garden);
    if (next !== garden) changed = true;
    return next;
  });
  if (changed) localStorage.setItem(KEY, JSON.stringify(settled));
  return settled;
}

export function upsertGarden(garden: Garden): void {
  const saved = compactLargeFills(garden);
  const gardens = loadGardens().map((item) => compactLargeFills(item));
  const next = gardens.some((item) => item.id === saved.id)
    ? gardens.map((item) => (item.id === saved.id ? saved : item))
    : [saved, ...gardens];
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function deleteGarden(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(loadGardens().filter((garden) => garden.id !== id)));
}
