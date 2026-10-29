import { useMemo, useState } from "react";
import { GROUP_LABEL } from "#/domain/labels";
import { PLANTS } from "#/domain/plants";
import { PLANT_GROUPS, type PlantGroup } from "#/domain/types";
import { Tabs } from "#/components/generic/tabs";
import { PlantFilterFields, plantMatchesListFilter, type PlantListFilter } from "./plant-filters";
import { PlantsListItem } from "./plants-list-item";

const OPEN_FILTER: PlantListFilter = {
  query: "",
  kind: "all",
  sun: "all",
  hardiness: "all",
  flowerColour: "all",
};

export const PlantsList = () => {
  const [group, setGroup] = useState<PlantGroup>("flower");
  const [filter, setFilter] = useState<PlantListFilter>(OPEN_FILTER);
  const plants = useMemo(
    () => PLANTS.filter((plant) => plant.group === group && plantMatchesListFilter(plant, filter)),
    [filter, group],
  );
  return (
    <>
      <Tabs
        className="mt-6"
        label="Plant groups"
        value={group}
        options={PLANT_GROUPS}
        labels={GROUP_LABEL}
        onChange={setGroup}
      />
      <PlantFilterFields className="mt-4" value={filter} onChange={setFilter} />
      <p className="mt-4 text-sm text-ink/60">
        {plants.length} {plants.length === 1 ? "plant" : "plants"}
      </p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {plants.map((plant) => (
          <PlantsListItem key={plant.id} plant={plant} />
        ))}
      </ul>
    </>
  );
};
