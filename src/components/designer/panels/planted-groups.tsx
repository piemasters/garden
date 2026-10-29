import { getPlant } from "#/domain/plants";

export function groupPlantings(placements: { plantId: string; count?: number }[]) {
  const groups = new Map<
    string,
    { plant: NonNullable<ReturnType<typeof getPlant>>; count: number }
  >();
  for (const placement of placements) {
    const plant = getPlant(placement.plantId);
    if (!plant) continue;
    const amount = placement.count ?? 1;
    const existing = groups.get(plant.id);
    if (existing) existing.count += amount;
    else groups.set(plant.id, { plant, count: amount });
  }
  return [...groups.values()].sort((a, b) => a.plant.commonName.localeCompare(b.plant.commonName));
}

export function PlantedGroups({
  groups,
  month,
  scope,
  onRemove,
}: {
  groups: ReturnType<typeof groupPlantings>;
  month: number;
  scope?: string;
  onRemove: (plantId: string) => void;
}) {
  return (
    <ul className="mt-2 space-y-1 text-sm">
      {groups.map(({ plant, count }) => {
        const look = plant.months[month];
        const action = count === 1 ? "Remove" : "Remove all";
        return (
          <li key={plant.id} className="flex items-center justify-between gap-2">
            <span>
              {plant.commonName}
              <span className="text-ink/60"> · {count}</span>
              <span className="block text-xs text-ink/60">
                {look?.flower ? look.flower : look?.foliage ? "In leaf" : "Dormant"}
                {look?.scent ? " · scented" : ""}
              </span>
            </span>
            <button
              className="shrink-0 text-xs text-clay"
              type="button"
              aria-label={
                scope
                  ? `${action} ${plant.commonName} from ${scope}`
                  : `${action} ${plant.commonName}`
              }
              onClick={() => onRemove(plant.id)}
            >
              {action}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
