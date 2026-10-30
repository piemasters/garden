import { useState } from "react";
import { buildTimeline } from "#/domain/jobs";
import { getPlant, PLANTS } from "#/domain/plants";
import { Tabs } from "#/components/generic/tabs";
import { plantMatchesListFilter, type PlantListFilter } from "#/components/plants/plant-filters";
import { recommendPlants } from "#/domain/recommend";
import { describeSlope } from "#/domain/slope";
import type { SunSample } from "#/domain/sun";
import { groundSurface } from "#/domain/surface";
import type { Garden, PlantGroup } from "#/domain/types";
import { resolvedLight } from "../drawing";
import type { Drawing } from "../use-drawing";
import type { ShapeEdits } from "../use-shape-edits";
import { BedsPanel } from "./beds-panel";
import { CreatePanel } from "./create-panel";
import { PlantsPanel } from "./plants-panel";
import { SelectionBar } from "./selection-bar";
import { SiteSummary } from "./site-summary";

export function DesignerAside({
  garden,
  update,
  view,
  month,
  onMonth,
  panelExpanded,
  onTogglePanel,
  samples,
  activeBed,
  selectedBedId,
  selectedBlockId,
  selectedPlacementId,
  onSelectBed,
  onSelectBlock,
  drawing,
  edits,
  onArmPlant,
}: {
  garden: Garden;
  update: (recipe: (current: Garden) => Garden) => void;
  view: "plan" | "orbit";
  month: number;
  onMonth: (month: number) => void;
  panelExpanded: boolean;
  onTogglePanel: () => void;
  samples: SunSample[];
  activeBed: Garden["beds"][number] | null;
  selectedBedId: string | null;
  selectedBlockId: string | null;
  selectedPlacementId: string | null;
  onSelectBed: (id: string) => void;
  onSelectBlock: (id: string) => void;
  drawing: Drawing;
  edits: ShapeEdits;
  onArmPlant: (plantId: string) => void;
}) {
  const [plantGroup, setPlantGroup] = useState<PlantGroup>("flower");
  const [plantFilter, setPlantFilter] = useState<PlantListFilter>({
    query: "",
    kind: "all",
    sun: "all",
    hardiness: "all",
    flowerColour: "all",
  });
  const [panel, setPanel] = useState<"create" | "beds" | "plants">("create");
  const activeLight = activeBed ? resolvedLight(activeBed, samples, garden.blocks) : null;
  const recommendations = activeLight
    ? recommendPlants(
        PLANTS.filter(
          (plant) => plant.group === plantGroup && plantMatchesListFilter(plant, plantFilter),
        ),
        garden.site,
        activeLight.light,
        garden.showUnsuitable,
      )
    : [];
  const selectedBlock = garden.blocks.find((block) => block.id === selectedBlockId) ?? null;
  const selectedBed = garden.beds.find((bed) => bed.id === selectedBedId) ?? null;
  const bedIsSelected = selectedBlockId === null && selectedBed !== null;
  const placement = garden.placements.find((item) => item.id === selectedPlacementId) ?? null;
  const plant = placement ? getPlant(placement.plantId) : undefined;
  const selectedPlant = plant
    ? {
        name: plant.commonName,
        bedName: garden.beds.find((bed) => bed.id === placement?.bedId)?.name ?? null,
      }
    : null;
  const jobCount = buildTimeline(PLANTS, garden.placements, garden.site).length;

  return (
    <aside className="order-2 min-h-0 flex-1 space-y-4 overflow-y-auto border-t border-line p-4 max-lg:landscape:hidden lg:order-1 lg:w-80 lg:flex-none lg:border-t-0 lg:border-r">
      <SiteSummary
        site={garden.site}
        slopeText={describeSlope(garden.site.slope)}
        month={month}
        onMonth={onMonth}
        surface={groundSurface(garden.surface)}
        hasOutline={Boolean(garden.boundary && garden.boundary.length >= 3)}
        onSurface={(surface) => update((current) => ({ ...current, surface }))}
        showShade={garden.showShade !== false}
        onShowShade={(showShade) => update((current) => ({ ...current, showShade }))}
        showSlope={garden.showSlope !== false}
        onShowSlope={(showSlope) => update((current) => ({ ...current, showSlope }))}
        view={view}
        panelExpanded={panelExpanded}
        onTogglePanel={onTogglePanel}
        attribution={garden.attribution}
      />
      <div className="space-y-4">
        <SelectionBar
          tool={drawing.tool}
          onTool={drawing.chooseTool}
          selectionReady={selectedBlock !== null || bedIsSelected}
          onDuplicate={edits.duplicateSelection}
          onRemove={edits.removeSelection}
          drawNote={drawing.drawNote}
          selectedBlock={selectedBlock}
          selectedBed={bedIsSelected ? selectedBed : null}
          selectedPlant={selectedBlock ? null : selectedPlant}
        />
        {drawing.drawingLabel ? (
          <p className="text-sm font-medium">{drawing.drawingLabel}</p>
        ) : null}
        <Tabs
          label="Panels"
          value={panel}
          options={["create", "beds", "plants"]}
          labels={{ create: "Create", beds: "Beds", plants: "Plants" }}
          onChange={setPanel}
        />
      </div>
      {panel === "create" ? (
        <CreatePanel
          tool={drawing.tool}
          onTool={drawing.chooseTool}
          drawNote={drawing.drawNote}
          draftCount={drawing.draft.length}
          onFinishBed={() => {
            drawing.addBed(drawing.draft);
            drawing.setTool("select");
            drawing.setCursor(null);
          }}
          presets={drawing.customPresets}
          preset={drawing.preset}
          onArmPreset={drawing.armPreset}
          onDeletePreset={drawing.deleteCustomPreset}
          presetWidth={drawing.presetWidth}
          presetDepth={drawing.presetDepth}
          onPresetWidth={drawing.setPresetWidth}
          onPresetDepth={drawing.setPresetDepth}
          onAddPreset={drawing.addCustomPreset}
          presetError={drawing.presetError}
          shadePreset={drawing.shadePreset}
          onArmShade={drawing.armShade}
          hasOutline={Boolean(garden.boundary && garden.boundary.length >= 3)}
          buildingsLoaded={garden.buildingsLoaded}
          buildingError={garden.buildingError}
          hasOsmBuildings={garden.blocks.some((block) => block.source === "osm")}
          selectedBlock={selectedBlock}
          onHeight={(height) => {
            if (!selectedBlock) return;
            edits.setBlockHeight(selectedBlock.id, height);
          }}
        />
      ) : null}
      {panel === "beds" ? (
        <BedsPanel
          beds={garden.beds}
          blocks={garden.blocks}
          samples={samples}
          adjust={drawing.adjust}
          showNames={garden.showBedNames ?? false}
          onShowNames={(showBedNames) => update((current) => ({ ...current, showBedNames }))}
          menu={edits.menu}
          selectedBedId={selectedBedId}
          onSelectBed={onSelectBed}
          selectedBlockId={selectedBlockId}
          onSelectBlock={onSelectBlock}
          onOpenSettings={(id, clientX, clientY) =>
            edits.openMenu(
              { clientX, clientY, preventDefault() {} },
              { kind: "bed", id, fills: true },
            )
          }
          onOpenBlockSettings={(id, clientX, clientY) =>
            edits.openMenu({ clientX, clientY, preventDefault() {} }, { kind: "block", id })
          }
          onCloseMenu={() => edits.setMenu(null)}
          jobCount={jobCount}
          gardenId={garden.id}
        />
      ) : null}
      {panel === "plants" ? (
        <PlantsPanel
          activeBed={activeBed}
          aspect={garden.site.aspect}
          showUnsuitable={garden.showUnsuitable}
          onShowUnsuitable={(showUnsuitable) =>
            update((current) => ({ ...current, showUnsuitable }))
          }
          plantGroup={plantGroup}
          onPlantGroup={setPlantGroup}
          plantFilter={plantFilter}
          onPlantFilter={setPlantFilter}
          recommendations={recommendations}
          onPlace={onArmPlant}
          onFill={drawing.fillBed}
          placements={garden.placements}
          month={month}
          gardenId={garden.id}
          onRemoveFromBed={(plantId) => edits.removePlantsOf(plantId, activeBed?.id)}
        />
      ) : null}
    </aside>
  );
}
