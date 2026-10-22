import { ASPECT_LABEL, joinLabels, PH_LABEL, SOIL_LABEL, SUN_LABEL } from "./labels";
import { HARDINESS_RANK } from "./types";
import type { GardenSite, Hardiness, Plant, SunLevel } from "./types";
import { isColdRegion } from "./jobs";

export interface Verdict {
  plant: Plant;
  suitable: boolean;
  score: number;
  reasons: string[];
}

export function requiredHardiness(
  site: Pick<GardenSite, "country" | "region" | "latitude">,
): Hardiness {
  return isColdRegion(site.country, site.region, site.latitude) ? "H5" : "H4";
}

export function judgePlant(
  plant: Plant,
  site: Pick<
    GardenSite,
    "soil" | "moisture" | "ph" | "aspect" | "exposure" | "country" | "region" | "latitude"
  >,
  light: SunLevel,
): Verdict {
  const reasons: string[] = [];
  if (!plant.soils.includes(site.soil)) {
    reasons.push(
      `Prefers ${joinLabels(plant.soils.map((soil) => SOIL_LABEL[soil].toLowerCase()))} soil`,
    );
  }
  if (!plant.moisture.includes(site.moisture)) {
    reasons.push(`Prefers ${joinLabels(plant.moisture)} soil moisture`);
  }
  if (!plant.ph.includes(site.ph)) {
    reasons.push(
      `Prefers ${joinLabels(plant.ph.map((level) => PH_LABEL[level].toLowerCase()))} soil`,
    );
  }
  if (!plant.sun.includes(light)) {
    reasons.push(
      `Needs ${joinLabels(plant.sun.map((level) => SUN_LABEL[level].toLowerCase()))}; this bed is ${SUN_LABEL[light].toLowerCase()}`,
    );
  }
  const minimum = requiredHardiness(site);
  if (HARDINESS_RANK[plant.hardiness] < HARDINESS_RANK[minimum]) {
    reasons.push(`${plant.hardiness} is tender here, where ${minimum} or hardier is a safer bet`);
  }

  let score = reasons.length === 0 ? 50 : 0;
  if (plant.aspect.includes(site.aspect)) score += 10;
  if (site.aspect === "north" && plant.sun.length === 1 && plant.sun[0] === "full-sun") score -= 20;
  if (plant.exposure.includes(site.exposure)) score += 5;

  return { plant, suitable: reasons.length === 0, score, reasons };
}

export function recommendPlants(
  plants: Plant[],
  site: Pick<
    GardenSite,
    "soil" | "moisture" | "ph" | "aspect" | "exposure" | "country" | "region" | "latitude"
  >,
  light: SunLevel,
  showUnsuitable: boolean,
): Verdict[] {
  return plants
    .map((plant) => judgePlant(plant, site, light))
    .filter((verdict) => showUnsuitable || verdict.suitable)
    .sort(
      (a, b) =>
        Number(b.suitable) - Number(a.suitable) ||
        b.score - a.score ||
        a.plant.commonName.localeCompare(b.plant.commonName),
    );
}

export function aspectNote(siteAspect: GardenSite["aspect"]): string {
  if (siteAspect === "north") {
    return "North-facing gardens still grow sun-loving plants, but they rank lower because the light is cooler and shorter.";
  }
  return `${ASPECT_LABEL[siteAspect]} is a preference. Plants that list this aspect rank a little higher.`;
}
