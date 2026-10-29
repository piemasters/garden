import { Link } from "@tanstack/react-router";
import { GROUP_LABEL, KIND_LABEL } from "#/domain/labels";
import { plantingSpacing } from "#/domain/geometry";
import { aspectNote, recommendPlants } from "#/domain/recommend";
import { PLANT_GROUPS, type Aspect, type Placement, type PlantGroup } from "#/domain/types";
import { useUnits } from "#/lib/units";
import {
  PlantFilterFields,
  plantListFilterIsSet,
  type PlantListFilter,
} from "#/components/plants/plant-filters";
import { quietButtonClass } from "../tools";
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
  onRemoveFromBed,
  onRemoveEverywhere,
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
  onRemoveFromBed: (plantId: string) => void;
  onRemoveEverywhere: (plantId: string) => void;
}) {
  const units = useUnits();
  const bedPlacements = activeBed
    ? placements.filter((placement) => placement.bedId === activeBed.id)
    : [];
  const otherPlacements = activeBed
    ? placements.filter((placement) => placement.bedId !== activeBed.id)
    : [];
  const bedGroups = groupPlantings(bedPlacements);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl">{activeBed ? `For ${activeBed.name}` : "Plants"}</h2>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={showUnsuitable}
            onChange={(event) => onShowUnsuitable(event.target.checked)}
          />
          Show unsuitable
        </label>
      </div>
      <p className="text-xs text-ink/60">{aspectNote(aspect)}</p>
      <div className="flex flex-wrap gap-1">
        {PLANT_GROUPS.map((group) => (
          <button
            key={group}
            type="button"
            className={`rounded-full border px-3 py-1 text-sm ${
              plantGroup === group
                ? "border-leaf bg-leaf text-white"
                : "border-line bg-card text-ink hover:border-leaf"
            }`}
            onClick={() => onPlantGroup(group)}
          >
            {GROUP_LABEL[group]}
          </button>
        ))}
      </div>
      <PlantFilterFields
        value={plantFilter}
        onChange={onPlantFilter}
        className="sm:grid-cols-1 lg:grid-cols-1"
      />
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
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link
                  to="/plants/$plantId"
                  params={{ plantId: verdict.plant.id }}
                  className="font-medium hover:text-leaf"
                >
                  {verdict.plant.commonName}
                </Link>
                <p className="text-xs text-ink/60">
                  {KIND_LABEL[verdict.plant.kind]} · {verdict.plant.hardiness}
                </p>
              </div>
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
      {placements.length > 0 ? (
        <div className="space-y-3">
          <h2 className="flex items-baseline justify-between text-lg">
            Planted
            <span className="text-sm font-normal text-ink/60">{placements.length}</span>
          </h2>
          {activeBed ? (
            <div>
              <h3 className="flex items-baseline justify-between text-base">
                {activeBed.name}
                <span className="text-sm font-normal text-ink/60">{bedPlacements.length}</span>
              </h3>
              {bedGroups.length === 0 ? (
                <p className="mt-1 text-sm text-ink/60">Nothing planted in this bed.</p>
              ) : (
                <PlantedGroups
                  groups={bedGroups}
                  month={month}
                  scope={activeBed.name}
                  onRemove={onRemoveFromBed}
                />
              )}
            </div>
          ) : null}
          {otherPlacements.length > 0 ? (
            <div>
              <h3 className="flex items-baseline justify-between text-base">
                All beds
                <span className="text-sm font-normal text-ink/60">{placements.length}</span>
              </h3>
              <PlantedGroups
                groups={groupPlantings(placements)}
                month={month}
                onRemove={onRemoveEverywhere}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
