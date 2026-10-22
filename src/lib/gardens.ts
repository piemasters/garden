import type { Garden } from "../domain/types";

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

export function upsertGarden(garden: Garden): void {
  const gardens = loadGardens();
  const next = gardens.some((item) => item.id === garden.id)
    ? gardens.map((item) => (item.id === garden.id ? garden : item))
    : [garden, ...gardens];
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function deleteGarden(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(loadGardens().filter((garden) => garden.id !== id)));
}
