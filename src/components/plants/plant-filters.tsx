import { twMerge } from "tailwind-merge";
import { KIND_LABEL, SUN_LABEL } from "#/domain/labels";
import {
  FLOWER_COLOUR_LABEL,
  FLOWER_COLOURS,
  flowersInMonth,
  harvestsInMonth,
  hasFlowerColour,
  type FlowerColour,
} from "#/domain/plants";
import {
  HARDINESS,
  MONTH_NAMES,
  PLANT_KINDS,
  SUN_LEVELS,
  type Hardiness,
  type Plant,
  type PlantGroup,
  type PlantKind,
  type SunLevel,
} from "#/domain/types";
import { Input } from "#/components/generic/input";
import { Select } from "#/components/generic/select";

export type FloweringMonth = (typeof MONTH_NAMES)[number];

export type PlantListFilter = {
  query: string;
  kind: PlantKind | "all";
  sun: SunLevel | "all";
  hardiness: Hardiness | "all";
  flowerColour: FlowerColour | "all";
  flowering: FloweringMonth | "all";
};

const HARDINESS_LABEL = {
  all: "Any",
  ...Object.fromEntries(HARDINESS.map((level) => [level, level])),
} as Record<Hardiness | "all", string>;

const FLOWERING_LABEL = {
  all: "Any",
  ...Object.fromEntries(MONTH_NAMES.map((name) => [name, name])),
} as Record<FloweringMonth | "all", string>;

export function plantMatchesListFilter(plant: Plant, filter: PlantListFilter): boolean {
  const haystack = `${plant.commonName} ${plant.scientificName}`.toLowerCase();
  if (filter.query && !haystack.includes(filter.query.trim().toLowerCase())) return false;
  if (filter.kind !== "all" && plant.kind !== filter.kind) return false;
  if (filter.sun !== "all" && !plant.sun.includes(filter.sun)) return false;
  if (filter.hardiness !== "all" && plant.hardiness !== filter.hardiness) return false;
  if (filter.flowerColour !== "all" && !hasFlowerColour(plant, filter.flowerColour)) return false;
  if (filter.flowering !== "all") {
    const month = MONTH_NAMES.indexOf(filter.flowering);
    const inSeason =
      plant.group === "flower" ? flowersInMonth(plant, month) : harvestsInMonth(plant, month);
    if (!inSeason) return false;
  }
  return true;
}

export function plantListFilterIsSet(filter: PlantListFilter): boolean {
  return (
    filter.query.trim() !== "" ||
    filter.kind !== "all" ||
    filter.sun !== "all" ||
    filter.hardiness !== "all" ||
    filter.flowerColour !== "all" ||
    filter.flowering !== "all"
  );
}

export function PlantFilterFields({
  value,
  onChange,
  group = "flower",
  className,
}: {
  value: PlantListFilter;
  onChange: (value: PlantListFilter) => void;
  group?: PlantGroup;
  className?: string;
}) {
  const byHarvest = group !== "flower";
  return (
    <div className={twMerge("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
      <label className="text-sm">
        Search
        <Input
          value={value.query}
          onChange={(event) => onChange({ ...value, query: event.target.value })}
          placeholder="Tulip, rose, bean"
        />
      </label>
      <Select
        label="Kind"
        value={value.kind}
        options={["all", ...PLANT_KINDS]}
        labels={{ all: "All", ...KIND_LABEL }}
        onChange={(kind) => onChange({ ...value, kind })}
      />
      <Select
        label="Sun"
        value={value.sun}
        options={["all", ...SUN_LEVELS]}
        labels={{ all: "Any", ...SUN_LABEL }}
        onChange={(sun) => onChange({ ...value, sun })}
      />
      <Select
        label="Hardiness"
        value={value.hardiness}
        options={["all", ...HARDINESS]}
        labels={HARDINESS_LABEL}
        onChange={(hardiness) => onChange({ ...value, hardiness })}
      />
      <Select
        label="Flower colour"
        value={value.flowerColour}
        options={["all", ...FLOWER_COLOURS]}
        labels={{ all: "Any", ...FLOWER_COLOUR_LABEL }}
        onChange={(flowerColour) => onChange({ ...value, flowerColour })}
      />
      <Select
        label={byHarvest ? "Harvest" : "Flowering"}
        value={value.flowering}
        options={["all", ...MONTH_NAMES]}
        labels={FLOWERING_LABEL}
        onChange={(flowering) => onChange({ ...value, flowering })}
      />
    </div>
  );
}
