import { useMemo, useState } from "react";
import { GROUP_LABEL, KIND_LABEL, SUN_LABEL } from "#/domain/labels";
import { PLANTS } from "#/domain/plants";
import {
  HARDINESS,
  PLANT_GROUPS,
  PLANT_KINDS,
  SUN_LEVELS,
  type Hardiness,
  type PlantGroup,
  type PlantKind,
  type SunLevel,
} from "#/domain/types";
import { Input } from "#/components/generic/input";
import { Select } from "#/components/generic/select";
import { Button } from "#/components/generic/button";
import { PlantsListItem } from "./plants-list-item";

const HARDINESS_LABEL = {
  all: "Any",
  ...Object.fromEntries(HARDINESS.map((level) => [level, level])),
} as Record<Hardiness | "all", string>;

export const PlantsList = () => {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<PlantGroup>("flower");
  const [kind, setKind] = useState<PlantKind | "all">("all");
  const [sun, setSun] = useState<SunLevel | "all">("all");
  const [hardiness, setHardiness] = useState<Hardiness | "all">("all");
  const plants = useMemo(
    () =>
      PLANTS.filter((plant) => {
        const haystack = `${plant.commonName} ${plant.scientificName}`.toLowerCase();
        if (query && !haystack.includes(query.trim().toLowerCase())) return false;
        if (plant.group !== group) return false;
        if (kind !== "all" && plant.kind !== kind) return false;
        if (sun !== "all" && !plant.sun.includes(sun)) return false;
        if (hardiness !== "all" && plant.hardiness !== hardiness) return false;
        return true;
      }),
    [group, hardiness, kind, query, sun],
  );
  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2">
        {PLANT_GROUPS.map((item) => (
          <Button
            key={item}
            variant={group === item ? "primary" : "secondary"}
            onClick={() => setGroup(item)}
          >
            {GROUP_LABEL[item]}
          </Button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          Search
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tulip, rose, bean"
          />
        </label>
        <Select
          label="Kind"
          value={kind}
          options={["all", ...PLANT_KINDS]}
          labels={{ all: "All", ...KIND_LABEL }}
          onChange={setKind}
        />
        <Select
          label="Sun"
          value={sun}
          options={["all", ...SUN_LEVELS]}
          labels={{ all: "Any", ...SUN_LABEL }}
          onChange={setSun}
        />
        <Select
          label="Hardiness"
          value={hardiness}
          options={["all", ...HARDINESS]}
          labels={HARDINESS_LABEL}
          onChange={setHardiness}
        />
      </div>
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
