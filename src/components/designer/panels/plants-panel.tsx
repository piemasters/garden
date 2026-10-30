import { Link } from "@tanstack/react-router";
import { GROUP_LABEL, KIND_LABEL } from "#/domain/labels";
import { MAP_FILL_CAP, plantingSpacing } from "#/domain/geometry";
import { aspectNote, recommendPlants } from "#/domain/recommend";
import { PLANT_GROUPS, type Aspect, type Placement, type PlantGroup } from "#/domain/types";
import { useUnits } from "#/lib/units";
import { plantedCount } from "#/lib/fill-cap";
import {
  PlantFilterFields,
  plantListFilterIsSet,
  type PlantListFilter,
} from "#/components/plants/plant-filters";
import { Tabs } from "#/components/generic/tabs";
import { quietButtonClass } from "../tools";
import { PlantImage } from "#/components/plants/plant-image";
import { PlantedGroups, groupPlantings } from "./planted-groups";

type Verdict = ReturnType<typeof recommendPlants>[number];

export function PlantsPanel({
  activeBed,
  aspect,
  showUnsuitable,
  onShowUnsuitable,
  plantGroup,
  onPlantGroup,
  plantFilter,
  onPlantFilter,
  recommendations,
  onPlace,
  onFill,
  placements,
  month,
  gardenId,
  onRemoveFromBed,
}: {
  activeBed: { id: string; name: string } | null;
  aspect: Aspect;
  showUnsuitable: boolean;
  onShowUnsuitable: (value: boolean) => void;
  plantGroup: PlantGroup;
  onPlantGroup: (group: PlantGroup) => void;
  plantFilter: PlantListFilter;
  onPlantFilter: (filter: PlantListFilter) => void;
  recommendations: Verdict[];
  onPlace: (plantId: string) => void;
  onFill: (plant: { id: string; commonName: string; spreadM: [number, number] }) => void;
  placements: Placement[];
  month: number;
  gardenId: string;
  onRemoveFromBed: (plantId: string) => void;
}) {
  const units = useUnits();
  const bedPlacements = activeBed
    ? placements.filter((placement) => placement.bedId === activeBed.id)
    : [];
  const bedGroups = groupPlantings(bedPlacements);
  const bedCount = plantedCount(bedPlacements);
  return (
    <div className="space-y-3">
      <h2 className="text-xl">{activeBed ? `For ${activeBed.name}` : "Plants"}</h2>
      {activeBed && bedCount > 0 ? (
        <div className="space-y-3">
          <h3 className="flex items-baseline justify-between text-base">
            Planted total
            <span className="text-sm font-normal text-ink/60">{bedCount}</span>
          </h3>
          {bedPlacements.some((item) => (item.count ?? 1) > MAP_FILL_CAP) ? (
            <p className="text-sm text-ink/60">The plan shows a sample of a large fill.</p>
          ) : null}
          <PlantedGroups
            groups={bedGroups}
            month={month}
            scope={activeBed.name}
            onRemove={onRemoveFromBed}
          />
        </div>
      ) : null}

      <p className="text-xs text-ink/60">{aspectNote(aspect)}</p>
      <Tabs
        label="Plant groups"
        value={plantGroup}
        options={PLANT_GROUPS}
        labels={GROUP_LABEL}
        onChange={onPlantGroup}
      />
      <details className="text-sm">
        <summary className="cursor-pointer text-ink/70">
          Filters{plantListFilterIsSet(plantFilter) ? " · on" : ""}
        </summary>
        <PlantFilterFields
          value={plantFilter}
          onChange={onPlantFilter}
          className="mt-2 sm:grid-cols-1 lg:grid-cols-1"
        />
        <label className="flex justify-end pt-4 pb-1 items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={showUnsuitable}
            onChange={(event) => onShowUnsuitable(event.target.checked)}
          />
          Show unsuitable
        </label>
      </details>
      {!activeBed ? (
        <p className="text-sm">Draw a bed to see plants that fit its sun and your soil.</p>
      ) : recommendations.length === 0 ? (
        <p className="text-sm text-ink/60">
          {plantListFilterIsSet(plantFilter)
            ? "No plants match these filters."
            : "Nothing in this list suits this bed."}
        </p>
      ) : null}
      <ul className="space-y-2">
        {recommendations.map((verdict) => (
          <li key={verdict.plant.id} className="rounded-md border border-line bg-card p-3">
            <div className="flex items-start gap-3">
              <Link
                to="/plants/$plantId"
                params={{ plantId: verdict.plant.id }}
                className="flex min-w-0 flex-1 gap-3 hover:text-leaf"
              >
                <PlantImage
                  plantId={verdict.plant.id}
                  className="h-14 w-14 shrink-0 rounded-md object-cover"
                />
                <span>
                  <span className="block font-medium">{verdict.plant.commonName}</span>
                  <span className="block text-xs text-ink/60">
                    {KIND_LABEL[verdict.plant.kind]} · {verdict.plant.hardiness}
                  </span>
                </span>
              </Link>
              <div className="flex shrink-0 flex-wrap items-start justify-end gap-2">
                {verdict.suitable && activeBed ? (
                  <div className="flex shrink-0 gap-1">
                    <button
                      className={`${quietButtonClass} px-3`}
                      type="button"
                      onClick={() => onPlace(verdict.plant.id)}
                    >
                      Place
                    </button>
                    <button
                      className={`${quietButtonClass} px-3`}
                      type="button"
                      title={`${units.spacing(plantingSpacing(verdict.plant.spreadM))} apart`}
                      aria-label={`Fill ${activeBed.name} with ${verdict.plant.commonName}, ${units.spacing(plantingSpacing(verdict.plant.spreadM))} apart`}
                      onClick={() => onFill(verdict.plant)}
                    >
                      Fill
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            {verdict.suitable ? null : (
              <ul className="mt-2 list-disc pl-4 text-xs text-clay">
                {verdict.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
