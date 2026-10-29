import type { Dispatch, SetStateAction } from "react";
import { blockCorners, centroid, pointInPolygon } from "#/domain/geometry";
import { getPlant } from "#/domain/plants";
import { bedSun, type SunSample } from "#/domain/sun";
import { groundSurface } from "#/domain/surface";
import type { Garden, Plant, Point } from "#/domain/types";
import { GardenCanvas } from "./garden-canvas";
import { PlanChrome } from "./panels/plan-chrome";
import { ShapeMenu } from "./panels/shape-menu";
import type { Drawing } from "./use-drawing";
import type { ShapeEdits } from "./use-shape-edits";

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
  panelExpanded,
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
  handleSpots: {
    turn: { x: number; y: number };
    resize: { x: number; y: number };
    center: { x: number; y: number };
  } | null;
  onHandleSpots: Dispatch<
    SetStateAction<{
      turn: { x: number; y: number };
      resize: { x: number; y: number };
      center: { x: number; y: number };
    } | null>
  >;
  pointerRef: { current: (clientX: number, clientY: number) => Point | null };
  panelExpanded: boolean;
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

  return (
    <>
      <div
        className={`relative order-1 shrink-0 overflow-hidden lg:order-2 lg:h-auto lg:min-h-0 lg:flex-1 max-lg:landscape:h-auto max-lg:landscape:min-h-0 max-lg:landscape:shrink max-lg:landscape:flex-1 ${panelExpanded ? "h-0 max-lg:portrait:hidden lg:h-auto" : "h-[45vh]"}`}
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
          onSurface={(surface) => edits.setBedSurface(menu.id, surface)}
          onLight={(lightOverride) => edits.setBedLight(menu.id, lightOverride)}
          onRaised={(raised) => edits.setBedRaised(menu.id, raised)}
          onDuplicateBed={() => edits.duplicateBed(menu.id)}
          onDeleteBed={() => edits.removeBed(menu.id)}
          onDuplicateBlock={() => edits.duplicateBlock(menu.id)}
          onDeleteBlock={() => edits.removeBlock(menu.id)}
          onRemovePlant={() => edits.removePlant(menu.id)}
        />
      ) : null}
    </>
  );
}
