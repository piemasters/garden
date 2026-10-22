import { MONTH_NAMES } from "./types";
import type { GardenSite, Placement, Plant, PlantTask } from "./types";

export interface ScheduledJob {
  plantId: string;
  plantName: string;
  title: string;
  detail: string;
  month: number;
  day: number;
}

export function isColdRegion(country: string, region: string, latitude: number): boolean {
  if (country === "Scotland") return true;
  if (latitude >= 54.5) return true;
  return /north|yorkshire/i.test(region);
}

export function shiftDays(cold: boolean, shift: PlantTask["shift"]): number {
  if (!cold) return 0;
  if (shift === "spring") return 14;
  if (shift === "autumn") return -14;
  return 0;
}

export function shiftDate(
  month: number,
  day: number,
  days: number,
): { month: number; day: number } {
  const date = new Date(Date.UTC(2026, month, day));
  date.setUTCDate(date.getUTCDate() + days);
  return { month: date.getUTCMonth(), day: date.getUTCDate() };
}

export function scheduleTask(task: PlantTask, cold: boolean): { month: number; day: number } {
  return shiftDate(task.month, task.day, shiftDays(cold, task.shift));
}

export function buildTimeline(
  plants: Plant[],
  placements: Pick<Placement, "plantId">[],
  site: Pick<GardenSite, "country" | "region" | "latitude">,
): ScheduledJob[] {
  const byId = new Map(plants.map((plant) => [plant.id, plant]));
  const seen = new Set<string>();
  const cold = isColdRegion(site.country, site.region, site.latitude);
  const jobs: ScheduledJob[] = [];
  for (const placement of placements) {
    if (seen.has(placement.plantId)) continue;
    seen.add(placement.plantId);
    const plant = byId.get(placement.plantId);
    if (!plant) continue;
    for (const task of plant.jobs) {
      const when = scheduleTask(task, cold);
      jobs.push({
        plantId: plant.id,
        plantName: plant.commonName,
        title: task.title,
        detail: task.detail,
        month: when.month,
        day: when.day,
      });
    }
  }
  return jobs.sort(
    (a, b) => a.month - b.month || a.day - b.day || a.plantName.localeCompare(b.plantName),
  );
}

export function jobsByMonth(
  jobs: ScheduledJob[],
): Array<{ month: number; label: string; jobs: ScheduledJob[] }> {
  return MONTH_NAMES.map((label, month) => ({
    month,
    label,
    jobs: jobs.filter((job) => job.month === month),
  })).filter((group) => group.jobs.length > 0);
}

export function formatJobDate(month: number, day: number): string {
  return `${day} ${MONTH_NAMES[month] ?? ""}`;
}
