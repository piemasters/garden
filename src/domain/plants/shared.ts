import type { Aspect, Exposure, MonthLook, Plant, PlantGroup } from "../types";

export const ALL_ASPECTS: Aspect[] = ["north", "east", "south", "west"];
export const SUNNY_ASPECTS: Aspect[] = ["east", "south", "west"];
export const BOTH: Exposure[] = ["sheltered", "exposed"];

interface LookRange {
  from: number;
  to: number;
  foliage?: boolean;
  flower?: string;
  flowerHex?: string;
  scent?: boolean;
}

export function year(ranges: LookRange[], evergreen = false): MonthLook[] {
  const months: MonthLook[] = Array.from({ length: 12 }, () => ({
    foliage: evergreen,
    scent: false,
  }));
  for (const range of ranges) {
    for (let month = range.from; month <= range.to; month += 1) {
      months[month] = {
        foliage: range.foliage ?? true,
        scent: range.scent ?? false,
        flower: range.flower,
        flowerHex: range.flowerHex,
      };
    }
  }
  return months;
}

export function plant(record: Omit<Plant, "group"> & { group?: PlantGroup }): Plant {
  return { ...record, group: record.group ?? "flower" };
}
