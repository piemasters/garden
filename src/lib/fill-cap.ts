import { MAP_FILL_CAP } from "#/domain/geometry";
import type { Garden, Placement } from "#/domain/types";

export function plantedCount(placements: readonly { count?: number }[]): number {
  return placements.reduce((total, placement) => total + (placement.count ?? 1), 0);
}

/** Records the plan will actually draw. A huge fill keeps a spread of positions. */
export function placementsToDraw(placements: Placement[]): Placement[] {
  const groups = new Map<string, Placement[]>();
  for (const placement of placements) {
    if (!placement.fill) continue;
    const key = `${placement.bedId}\0${placement.plantId}`;
    const list = groups.get(key);
    if (list) list.push(placement);
    else groups.set(key, [placement]);
  }
  const keep = new Set<string>();
  for (const list of groups.values()) {
    if (list.length <= MAP_FILL_CAP) {
      for (const item of list) keep.add(item.id);
      continue;
    }
    const step = list.length / MAP_FILL_CAP;
    for (let index = 0; index < MAP_FILL_CAP; index += 1) {
      const item = list[Math.min(list.length - 1, Math.floor(index * step))];
      if (item) keep.add(item.id);
    }
  }
  return placements.filter((item) => !item.fill || keep.has(item.id));
}

/** Replace a huge generated fill with one record that remembers the real count. */
export function compactLargeFills(garden: Garden): Garden {
  const groups = new Map<string, Placement[]>();
  for (const placement of garden.placements) {
    if (!placement.fill || placement.count) continue;
    const key = `${placement.bedId}\0${placement.plantId}`;
    const list = groups.get(key);
    if (list) list.push(placement);
    else groups.set(key, [placement]);
  }
  const replacements = new Map<string, Placement>();
  const drop = new Set<string>();
  for (const list of groups.values()) {
    if (list.length <= MAP_FILL_CAP) continue;
    const first = list[0];
    if (!first) continue;
    replacements.set(first.id, {
      ...first,
      fill: true,
      count: list.length,
      spacing: nearestSpacing(list),
    });
    for (const item of list.slice(1)) drop.add(item.id);
  }
  if (replacements.size === 0) return garden;
  return {
    ...garden,
    placements: garden.placements.flatMap((item) => {
      if (drop.has(item.id)) return [];
      return [replacements.get(item.id) ?? item];
    }),
  };
}

function nearestSpacing(list: readonly { x: number; y: number }[]): number {
  const sample = list.slice(0, 40);
  let best = Infinity;
  for (let index = 0; index < sample.length; index += 1) {
    const point = sample[index];
    if (!point) continue;
    for (let other = index + 1; other < sample.length; other += 1) {
      const next = sample[other];
      if (!next) continue;
      best = Math.min(best, Math.hypot(point.x - next.x, point.y - next.y));
    }
  }
  if (!Number.isFinite(best) || best <= 0) return 0.25;
  return Math.max(0.1, Math.round(best * 20) / 20);
}
