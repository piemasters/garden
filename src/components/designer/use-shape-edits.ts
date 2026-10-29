import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { distance, pointInBlock, pointInPolygon, polygonArea } from "#/domain/geometry";
import type { Garden, GroundSurface, Plant, Point, SunLevel } from "#/domain/types";
import {
  duplicateBed,
  duplicateBlock,
  removeBed,
  removeBlock,
  removePlant,
  removePlantsOf,
  renameBed,
  setBedColour,
  setBedLight,
  setBedRaised,
  setBedSurface,
} from "./shape-actions";
import type { ShapeMenu as ShapeMenuState, Tool } from "./tools";

export function useShapeEdits({
  garden,
  update,
  pointerRef,
  plantsById,
  selectedBedId,
  setSelectedBedId,
  selectedBlockId,
  setSelectedBlockId,
  selectedPlacementId,
  setSelectedPlacementId,
  setTool,
}: {
  garden: Garden;
  update: (recipe: (current: Garden) => Garden) => void;
  pointerRef: { current: (clientX: number, clientY: number) => Point | null };
  plantsById: Map<string, Plant>;
  selectedBedId: string | null;
  setSelectedBedId: Dispatch<SetStateAction<string | null>>;
  selectedBlockId: string | null;
  setSelectedBlockId: Dispatch<SetStateAction<string | null>>;
  selectedPlacementId: string | null;
  setSelectedPlacementId: Dispatch<SetStateAction<string | null>>;
  setTool: (tool: Tool) => void;
}) {
  const [menu, setMenu] = useState<ShapeMenuState | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Backspace" && event.key !== "Delete") return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
        return;
      event.preventDefault();
      if (selectedPlacementId) {
        update((current) => ({
          ...current,
          placements: current.placements.filter((item) => item.id !== selectedPlacementId),
        }));
        setSelectedPlacementId(null);
      } else if (selectedBlockId) {
        update((current) => ({
          ...current,
          blocks: current.blocks.filter((item) => item.id !== selectedBlockId),
        }));
        setSelectedBlockId(null);
      } else if (selectedBedId) {
        update((current) => ({
          ...current,
          beds: current.beds.filter((item) => item.id !== selectedBedId),
          placements: current.placements.filter((item) => item.bedId !== selectedBedId),
        }));
        setSelectedBedId(null);
      }
      setMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedBedId, selectedBlockId, selectedPlacementId, update]);

  useEffect(() => {
    if (!menu) return;
    const close = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-shape-menu]")) return;
      setMenu(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(null);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const edits = {
    garden,
    update,
    setSelectedBedId,
    setSelectedBlockId,
    setSelectedPlacementId,
    setTool,
    setMenu,
  };

  function duplicateSelection() {
    if (selectedBlockId) {
      duplicateBlock(edits, selectedBlockId);
      return;
    }
    if (selectedBedId) duplicateBed(edits, selectedBedId);
  }

  function removeSelection() {
    if (selectedBlockId) {
      removeBlock(edits, selectedBlockId);
      return;
    }
    if (selectedBedId) removeBed(edits, selectedBedId);
  }

  function shapeAt(event: { clientX: number; clientY: number; target: EventTarget | null }) {
    const label =
      event.target instanceof Element
        ? event.target.closest("button")?.getAttribute("aria-label")?.trim()
        : undefined;
    if ((label === "Move" || label === "Turn" || label === "Size") && selectedBedId) {
      return { kind: "bed" as const, id: selectedBedId };
    }
    const point = pointerRef.current(event.clientX, event.clientY);
    if (!point) return null;
    const plant = garden.placements
      .map((placement) => {
        const plant = plantsById.get(placement.plantId);
        const spread = plant ? (plant.spreadM[0] + plant.spreadM[1]) / 2 : 0.3;
        return {
          placement,
          gap: distance(point, placement),
          radius: Math.max(spread / 2, 0.2),
        };
      })
      .filter((item) => item.gap <= item.radius)
      .sort((a, b) => a.gap - b.gap)[0]?.placement;
    if (plant) return { kind: "plant" as const, id: plant.id };
    const block = garden.blocks
      .filter((item) => pointInBlock(point, item))
      .sort((a, b) => a.width * a.depth - b.width * b.depth)[0];
    if (block) return { kind: "block" as const, id: block.id };
    const bed = garden.beds
      .filter((item) => pointInPolygon(point, item.points))
      .sort((a, b) => polygonArea(a.points) - polygonArea(b.points))[0];
    return bed ? { kind: "bed" as const, id: bed.id } : null;
  }

  function openMenu(
    event: { clientX: number; clientY: number; preventDefault: () => void },
    hit: { kind: ShapeMenuState["kind"]; id: string; fills?: boolean },
  ) {
    event.preventDefault();
    const width = hit.fills ? 288 : 208;
    const height = hit.fills ? 540 : hit.kind === "bed" ? 180 : 112;
    setMenu({
      kind: hit.kind,
      id: hit.id,
      fills: hit.fills,
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - width - 8)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - height - 8)),
    });
    if (hit.kind === "bed") {
      setSelectedBedId(hit.id);
      setSelectedPlacementId(null);
      setSelectedBlockId(null);
    } else if (hit.kind === "block") {
      setSelectedBlockId(hit.id);
      setSelectedPlacementId(null);
    } else {
      setSelectedPlacementId(hit.id);
    }
  }

  return {
    menu,
    setMenu,
    shapeAt,
    openMenu,
    duplicateSelection,
    removeSelection,
    renameBed: (id: string, name: string) => renameBed(edits, id, name),
    setBedColour: (id: string, color: string) => setBedColour(edits, id, color),
    setBedSurface: (id: string, surface: GroundSurface) => setBedSurface(edits, id, surface),
    setBedLight: (id: string, light: SunLevel | null) => setBedLight(edits, id, light),
    setBedRaised: (id: string, raised: boolean) => setBedRaised(edits, id, raised),
    duplicateBed: (id: string) => duplicateBed(edits, id),
    removeBed: (id: string) => removeBed(edits, id),
    duplicateBlock: (id: string) => duplicateBlock(edits, id),
    removeBlock: (id: string) => removeBlock(edits, id),
    removePlant: (id: string) => removePlant(edits, id),
    removePlantsOf: (plantId: string, bedId?: string) => removePlantsOf(edits, plantId, bedId),
  };
}

export type ShapeEdits = ReturnType<typeof useShapeEdits>;
