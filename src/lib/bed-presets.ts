import { METRES_PER_FOOT } from "../domain/units";

export type BedPreset = {
  id: string;
  widthM: number;
  depthM: number;
};

/** Whole feet, so the labels read 3 ft and 0.9 m rather than 2.9 ft. */
function feet(length: number): number {
  return length * METRES_PER_FOOT;
}

export const BUILTIN_BED_PRESETS: BedPreset[] = [
  { id: "3x3", widthM: feet(3), depthM: feet(3) },
  { id: "3x6", widthM: feet(3), depthM: feet(6) },
  { id: "4x4", widthM: feet(4), depthM: feet(4) },
  { id: "4x8", widthM: feet(4), depthM: feet(8) },
];

const KEY = "uk-garden-planner.bed-presets";

export function loadBedPresets(): BedPreset[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const preset = item as Partial<BedPreset>;
      if (
        typeof preset.id !== "string" ||
        typeof preset.widthM !== "number" ||
        typeof preset.depthM !== "number" ||
        preset.widthM <= 0 ||
        preset.depthM <= 0
      ) {
        return [];
      }
      return [{ id: preset.id, widthM: preset.widthM, depthM: preset.depthM }];
    });
  } catch {
    return [];
  }
}

function sameSize(a: { widthM: number; depthM: number }, b: { widthM: number; depthM: number }) {
  return Math.abs(a.widthM - b.widthM) < 0.05 && Math.abs(a.depthM - b.depthM) < 0.05;
}

export function addBedPreset(preset: { widthM: number; depthM: number }): BedPreset[] | null {
  const current = loadBedPresets();
  const taken = [...BUILTIN_BED_PRESETS, ...current].some((item) => sameSize(item, preset));
  if (taken) return null;
  const next = [
    ...current,
    {
      id: crypto.randomUUID(),
      widthM: Math.round(preset.widthM * 100) / 100,
      depthM: Math.round(preset.depthM * 100) / 100,
    },
  ];
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function removeBedPreset(id: string): BedPreset[] {
  const next = loadBedPresets().filter((item) => item.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
