import { useMemo, useState } from "react";
import { GROUP_LABEL } from "#/domain/labels";
import { PLANTS } from "#/domain/plants";
import { PLANT_GROUPS, type PlantGroup } from "#/domain/types";
import { Tabs } from "#/components/generic/tabs";
import { Toggle } from "#/components/generic/toggle";
import { PlantFilterFields, plantMatchesListFilter, type PlantListFilter } from "./plant-filters";
import { PlantsListItem } from "./plants-list-item";

const LAYOUTS = ["grid", "list"] as const;

const OPEN_FILTER: PlantListFilter = {
  query: "",
  kind: "all",
  sun: "all",
  hardiness: "all",
  flowerColour: "all",
  flowering: "all",
};

export const PlantsList = () => {
  const [group, setGroup] = useState<PlantGroup>("flower");
  const [filter, setFilter] = useState<PlantListFilter>(OPEN_FILTER);
  const [layout, setLayout] = useState<(typeof LAYOUTS)[number]>("grid");
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
      <PlantFilterFields className="mt-4" group={group} value={filter} onChange={setFilter} />
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-ink/60">
          {plants.length} {plants.length === 1 ? "plant" : "plants"}
        </p>
        <Toggle
          label="Catalogue layout"
          value={layout}
          options={LAYOUTS}
          labels={{ grid: "Grid", list: "List" }}
          onChange={setLayout}
        />
      </div>
      <ul className={layout === "grid" ? "mt-3 grid gap-3 sm:grid-cols-2" : "mt-3 space-y-2"}>
        {plants.map((plant) => (
          <PlantsListItem key={plant.id} plant={plant} layout={layout} />
        ))}
      </ul>
    </>
  );
};
