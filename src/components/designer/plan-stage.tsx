import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { blockCorners, centroid, lineEnds, pointInPolygon } from "#/domain/geometry";
import { getPlant } from "#/domain/plants";
import { bedSun, type SunSample } from "#/domain/sun";
import { groundSurface } from "#/domain/surface";
import type { Garden, Plant, Point } from "#/domain/types";
import type { HandleSpots } from "./scene/types";
import { GardenCanvas } from "./garden-canvas";
import { PlanChrome } from "./panels/plan-chrome";
import { ShapeMenu } from "./panels/shape-menu";
import type { Drawing } from "./use-drawing";
import type { ShapeEdits } from "./use-shape-edits";

const planHeight = {
  short: "h-[45vh]",
  tall: "h-1/3",
  full: "h-0 max-lg:portrait:hidden lg:h-auto",
} as const;

/** A finger dragged across the plan can select the canvas and paint it blue. */
function clearTouchSelection(event: { pointerType: string; currentTarget: HTMLElement }) {
  if (event.pointerType === "mouse") return;
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;
  const node = selection.anchorNode;
  if (node && event.currentTarget.contains(node)) selection.removeAllRanges();
}

export function PlanStage({
  garden,
  update,
  view,
  month,
  samples,
  sunArc,
  shadeSamples,
  scale,
  onScale,
  bedLabels,
  onBedLabels,
  handleSpots,
  onHandleSpots,
  pointerRef,
  panelSize,
  armedPlantId,
  selectedBedId,
  setSelectedBedId,
  selectedPlacementId,
  setSelectedPlacementId,
  selectedBlockId,
  setSelectedBlockId,
  activeBed,
  plantsById,
  drawing,
  edits,
}: {
  garden: Garden;
  update: (recipe: (current: Garden) => Garden) => void;
  view: "plan" | "orbit";
  month: number;
  samples: SunSample[];
  sunArc: [number, number, number][];
  shadeSamples: SunSample[];
  scale: { metres: number; pixels: number } | null;
  onScale: (metres: number, pixels: number) => void;
  bedLabels: { id: string; name: string; x: number; y: number }[];
  onBedLabels: Dispatch<SetStateAction<{ id: string; name: string; x: number; y: number }[]>>;
  handleSpots: HandleSpots | null;
  onHandleSpots: Dispatch<SetStateAction<HandleSpots | null>>;
  pointerRef: { current: (clientX: number, clientY: number) => Point | null };
  panelSize: "short" | "tall" | "full";
  armedPlantId: string | null;
  selectedBedId: string | null;
  setSelectedBedId: Dispatch<SetStateAction<string | null>>;
  selectedPlacementId: string | null;
  setSelectedPlacementId: Dispatch<SetStateAction<string | null>>;
  selectedBlockId: string | null;
  setSelectedBlockId: Dispatch<SetStateAction<string | null>>;
  activeBed: Garden["beds"][number] | null;
  plantsById: Map<string, Plant>;
  drawing: Drawing;
  edits: ShapeEdits;
}) {
  const armed = armedPlantId ? getPlant(armedPlantId) : undefined;
  const bedIsSelected =
    selectedBlockId === null && garden.beds.some((bed) => bed.id === selectedBedId);
  const menu = edits.menu;
  const planRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const plan = planRef.current;
    if (!plan) return;
    const blockSelection = (event: Event) => event.preventDefault();
    plan.addEventListener("selectstart", blockSelection);
    return () => plan.removeEventListener("selectstart", blockSelection);
  }, []);

  return (
    <>
      <div
        ref={planRef}
        className={`relative touch-none select-none [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] [&_canvas]:select-none [&_canvas]:[-webkit-tap-highlight-color:transparent] [&_canvas]:[-webkit-touch-callout:none] order-1 shrink-0 overflow-hidden lg:order-2 lg:h-auto lg:min-h-0 lg:flex-1 max-lg:landscape:h-auto max-lg:landscape:min-h-0 max-lg:landscape:shrink max-lg:landscape:flex-1 ${planHeight[panelSize]}`}
        onPointerMove={clearTouchSelection}
        onContextMenu={(event) => {
          const hit = edits.shapeAt(event);
          if (!hit) {
            event.preventDefault();
            edits.setMenu(null);
            return;
          }
          edits.openMenu(event, hit);
        }}
      >
        <GardenCanvas
          beds={drawing.shownBeds}
          blocks={drawing.shownBlocks}
          placements={drawing.shownPlacements}
          plantsById={plantsById}
          month={month}
          view={view}
          tool={drawing.tool}
          selectedBedId={selectedBlockId ? null : (activeBed?.id ?? null)}
          chosenBedId={bedIsSelected ? selectedBedId : null}
          selectedPlacementId={selectedPlacementId}
          selectedBlockId={selectedBlockId}
          draft={drawing.draft}
          preview={drawing.drawing.preview}
          previewClosed={drawing.drawing.closed}
          measure={
            drawing.adjust
              ? { text: drawing.adjust.label, at: centroid(drawing.adjust.points) }
              : drawing.drawing.measure
          }
          blockDraft={drawing.blockDraft}
          boundary={garden.boundary ?? null}
          surface={groundSurface(garden.surface)}
          slope={garden.showSlope === false ? undefined : garden.site.slope}
          sunArc={sunArc}
          shadeSamples={garden.showShade === false ? [] : shadeSamples}
          onSurface={drawing.handleSurface}
          onSelectPlacement={setSelectedPlacementId}
          onSelectBed={(id) => {
            setSelectedBedId(id);
            setSelectedPlacementId(null);
            setSelectedBlockId(null);
          }}
          showHandles={
            view === "plan" &&
            !armedPlantId &&
            (drawing.tool === "select" ||
              drawing.tool === "rotate" ||
              drawing.tool === "scale" ||
              drawing.tool === "move")
          }
          onMoveBed={
            drawing.tool === "select" && !armedPlantId
              ? (point, phase) => drawing.adjustShape("move", point, phase)
              : undefined
          }
          onHandleSpots={onHandleSpots}
          handlePoints={drawing.editingBlock ? blockCorners(drawing.editingBlock) : undefined}
          handleEnds={drawing.editingBlock?.line ? lineEnds(drawing.editingBlock) : null}
          pointerRef={pointerRef}
          bedNames={
            garden.showBedNames && view === "plan"
              ? drawing.shownBeds.map((bed) => ({
                  id: bed.id,
                  name: bed.name,
                  points: bed.points,
                }))
              : null
          }
          onBedLabels={onBedLabels}
          onSelectBlock={(id) => {
            setSelectedBlockId(id);
            setSelectedPlacementId(null);
          }}
          onDrag={(id, point) => {
            update((current) => ({
              ...current,
              placements: current.placements.map((placement) =>
                placement.id === id ? { ...placement, x: point.x, y: point.y } : placement,
              ),
            }));
          }}
          onScale={onScale}
          onDrop={(id, point) => {
            update((current) => {
              const bed = current.beds.find((item) => pointInPolygon(point, item.points));
              if (!bed) {
                return {
                  ...current,
                  placements: current.placements.filter((placement) => placement.id !== id),
                };
              }
              return {
                ...current,
                placements: current.placements.map((placement) =>
                  placement.id === id
                    ? { ...placement, x: point.x, y: point.y, bedId: bed.id }
                    : placement,
                ),
              };
            });
            setSelectedPlacementId(null);
          }}
        />
        <PlanChrome
          view={view}
          armedName={armed?.commonName ?? null}
          drawingLabel={drawing.drawingLabel}
          bedLabels={bedLabels}
          activeBedId={activeBed?.id ?? null}
          handleSpots={handleSpots}
          pointerRef={pointerRef}
          adjust={drawing.adjustShape}
          scale={scale}
        />
      </div>
      {menu ? (
        <ShapeMenu
          menu={menu}
          bed={garden.beds.find((bed) => bed.id === menu.id) ?? null}
          block={garden.blocks.find((block) => block.id === menu.id) ?? null}
          plantName={
            menu.kind === "plant"
              ? (getPlant(garden.placements.find((item) => item.id === menu.id)?.plantId ?? "")
                  ?.commonName ?? null)
              : null
          }
          plantCount={
            menu.kind === "bed"
              ? garden.placements.filter((item) => item.bedId === menu.id).length
              : 0
          }
          calculatedLight={(() => {
            const bed = garden.beds.find((item) => item.id === menu.id);
            return bed ? bedSun(bed.points, samples, garden.blocks).light : null;
          })()}
          onRename={(name) => edits.renameBed(menu.id, name)}
          onColour={(color) => edits.setBedColour(menu.id, color)}
          onSurface={(surface) =>
            menu.kind === "block"
              ? edits.setBlockSurface(menu.id, surface)
              : edits.setBedSurface(menu.id, surface)
          }
          onLight={(lightOverride) => edits.setBedLight(menu.id, lightOverride)}
          gardenSoil={garden.site.soil}
          onSoil={(soilOverride) => edits.setBedSoil(menu.id, soilOverride)}
          onRaised={(raised) => edits.setBedRaised(menu.id, raised)}
          onDuplicateBed={() => edits.duplicateBed(menu.id)}
          onDeleteBed={() => edits.removeBed(menu.id)}
          onDuplicateBlock={() => edits.duplicateBlock(menu.id)}
          onDeleteBlock={() => edits.removeBlock(menu.id)}
          onRemovePlant={() => edits.removePlant(menu.id)}
          onHeight={(height) => edits.setBlockHeight(menu.id, height)}
        />
      ) : null}
    </>
  );
}
