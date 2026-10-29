export function buildingHeight(tags: Record<string, string | undefined>): number {
  const heightMatch = tags.height?.match(/[\d.]+/);
  if (heightMatch) {
    const metres = Number(heightMatch[0]);
    if (metres > 1 && metres < 120) return metres;
  }
  const levels = Number(tags["building:levels"]);
  if (Number.isFinite(levels) && levels > 0 && levels < 40) return levels * 3;
  return 6;
}
