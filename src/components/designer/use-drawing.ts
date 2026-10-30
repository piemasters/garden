import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { MAP_FILL_CAP, fillPoints, planFill, plantingSpacing } from "#/domain/geometry";
import type { Garden, Placement, Plant, Point, ShadeBlock } from "#/domain/types";
import { formatEntry } from "#/domain/units";
import { addBedPreset, loadBedPresets, removeBedPreset, type BedPreset } from "#/lib/bed-presets";
import { useUnits } from "#/lib/units";
import { drawingPreview } from "./drawing";
import type { AdjustGesture, AdjustPreview, ShadePreset, Tool } from "./tools";
import { adjustShape as runAdjust } from "./gestures/adjust-shape";
import { handleSurface as onSurface } from "./gestures/draw-tools";
import type { DrawSession } from "./gestures/draw-session";

export function useDrawing({
  garden,
  update,
  view,
  scale,
  selectedBedId,
  setSelectedBedId,
  selectedBlockId,
  setSelectedBlockId,
  setSelectedPlacementId,
  armedPlantId,
  setArmedPlantId,
  plantsById,
  activeBed,
}: {
  garden: Garden;
  update: (recipe: (current: Garden) => Garden) => void;
  view: "plan" | "orbit";
  scale: { metres: number; pixels: number } | null;
  selectedBedId: string | null;
  setSelectedBedId: Dispatch<SetStateAction<string | null>>;
  selectedBlockId: string | null;
  setSelectedBlockId: Dispatch<SetStateAction<string | null>>;
  setSelectedPlacementId: Dispatch<SetStateAction<string | null>>;
  armedPlantId: string | null;
  setArmedPlantId: Dispatch<SetStateAction<string | null>>;
  plantsById: Map<string, Plant>;
  activeBed: Garden["beds"][number] | null;
}) {
  const units = useUnits();
  const [tool, setTool] = useState<Tool>("select");
  const [customPresets, setCustomPresets] = useState<BedPreset[]>([]);
  const [presetWidth, setPresetWidth] = useState("");
  const [presetDepth, setPresetDepth] = useState("");
  const [presetError, setPresetError] = useState<string | null>(null);
  const shownUnit = useRef(units.unit);
  const [preset, setPreset] = useState<{ width: number; depth: number } | null>(null);
  const [shadePreset, setShadePreset] = useState<ShadePreset | null>(null);
  const [draft, setDraft] = useState<Point[]>([]);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [rectStart, setRectStart] = useState<Point | null>(null);
  const [edgeEnd, setEdgeEnd] = useState<Point | null>(null);
  const [placeAnchor, setPlaceAnchor] = useState<Point | null>(null);
  const [blockStart, setBlockStart] = useState<Point | null>(null);
  const [blockDraft, setBlockDraft] = useState<ShadeBlock | null>(null);
  const [drawNote, setDrawNote] = useState<string | null>(null);
  const blockId = useRef("");
  const placeAnchorRef = useRef<Point | null>(null);
  const angledRef = useRef<{ origin: Point | null; end: Point | null }>({
    origin: null,
    end: null,
  });
  const strokeRef = useRef<Point[]>([]);
  const adjustRef = useRef<AdjustGesture | null>(null);
  const [adjust, setAdjust] = useState<AdjustPreview | null>(null);

  function resetGesture() {
    setDraft([]);
    setCursor(null);
    setRectStart(null);
    setEdgeEnd(null);
    setPlaceAnchor(null);
    setBlockStart(null);
    setBlockDraft(null);
    setDrawNote(null);
    placeAnchorRef.current = null;
    angledRef.current = { origin: null, end: null };
    strokeRef.current = [];
    adjustRef.current = null;
    setAdjust(null);
  }

  function chooseTool(next: Tool) {
    setTool(next);
    setPreset(null);
    setShadePreset(null);
    resetGesture();
  }

  useEffect(() => {
    setCustomPresets(loadBedPresets());
  }, []);

  useEffect(() => {
    if (shownUnit.current === units.unit) return;
    const previous = shownUnit.current;
    shownUnit.current = units.unit;
    setPresetWidth((value) => formatEntry(value, previous, units.unit));
    setPresetDepth((value) => formatEntry(value, previous, units.unit));
  }, [units.unit]);

  function addCustomPreset(event: FormEvent) {
    event.preventDefault();
    const width = Number(presetWidth);
    const depth = Number(presetDepth);
    if (!Number.isFinite(width) || !Number.isFinite(depth) || width <= 0 || depth <= 0) {
      setPresetError("Enter a width and a depth.");
      return;
    }
    const widthM = units.toMetres(width);
    const depthM = units.toMetres(depth);
    if (widthM < 0.5 || depthM < 0.5) {
      setPresetError(`Use at least ${units.length(0.5)} on each side.`);
      return;
    }
    const next = addBedPreset({ widthM, depthM });
    if (!next) {
      setPresetError("That size is already a preset.");
      return;
    }
    setCustomPresets(next);
    setPresetWidth("");
    setPresetDepth("");
    setPresetError(null);
  }

  function deleteCustomPreset(item: BedPreset) {
    setCustomPresets(removeBedPreset(item.id));
    if (
      preset &&
      Math.abs(preset.width - item.widthM) < 0.05 &&
      Math.abs(preset.depth - item.depthM) < 0.05
    ) {
      setPreset(null);
      if (tool === "place") setTool("select");
    }
  }

  function armPreset(width: number, depth: number) {
    setPreset({ width, depth });
    setShadePreset(null);
    setTool("place");
    resetGesture();
  }

  function armShade(next: ShadePreset) {
    setShadePreset(next);
    setPreset(null);
    setTool("block");
    resetGesture();
  }

  function addBed(points: Point[]) {
    if (points.length < 3) return;
    const id = crypto.randomUUID();
    update((current) => ({
      ...current,
      beds: [
        ...current.beds,
        {
          id,
          name: `Bed ${current.beds.length + 1}`,
          points,
          lightOverride: null,
        },
      ],
    }));
    setSelectedBedId(id);
    setTool("select");
    resetGesture();
  }

  function fillBed(plant: { id: string; spreadM: [number, number] }) {
    if (!activeBed) return;
    const spacing = plantingSpacing(plant.spreadM);
    const occupied = garden.placements
      .filter((item) => item.bedId === activeBed.id)
      .flatMap((item) => occupiedBy(item, activeBed.points, plantsById, spacing));
    const plan = planFill(activeBed.points, spacing, occupied);
    if (plan.count === 0) return;
    const added =
      plan.count > MAP_FILL_CAP
        ? [
            {
              id: crypto.randomUUID(),
              plantId: plant.id,
              bedId: activeBed.id,
              x: plan.points[0]?.x ?? 0,
              y: plan.points[0]?.y ?? 0,
              fill: true as const,
              count: plan.count,
              spacing,
            },
          ]
        : plan.points.map((point) => ({
            id: crypto.randomUUID(),
            plantId: plant.id,
            bedId: activeBed.id,
            x: point.x,
            y: point.y,
            fill: true as const,
          }));
    update((current) => ({
      ...current,
      placements: [...current.placements, ...added],
    }));
    setSelectedBedId(activeBed.id);
    setSelectedPlacementId(null);
    setArmedPlantId(null);
    setTool("select");
  }

  const session: DrawSession = {
    garden,
    plantsById,
    update,
    view,
    units,
    scale,
    tool,
    preset,
    shadePreset,
    draft,
    rectStart,
    blockStart,
    selectedBedId,
    selectedBlockId,
    armedPlantId,
    setTool,
    setShadePreset,
    setDraft,
    setCursor,
    setDrawNote,
    setRectStart,
    setEdgeEnd,
    setPlaceAnchor,
    setBlockStart,
    setBlockDraft,
    setAdjust,
    setSelectedBedId,
    setSelectedBlockId,
    setSelectedPlacementId,
    setArmedPlantId,
    blockId,
    placeAnchorRef,
    angledRef,
    strokeRef,
    adjustRef,
    addBed,
    resetGesture,
  };

  function handleSurface(raw: Point, phase: "down" | "move" | "up") {
    onSurface(session, raw, phase);
  }

  function adjustShape(
    kind: "rotate" | "scale" | "move" | "stretch",
    raw: Point,
    phase: "down" | "move" | "up",
    endIndex?: 0 | 1,
    fromHandle?: boolean,
  ) {
    runAdjust(session, kind, raw, phase, endIndex, fromHandle);
  }

  const drawing = drawingPreview(
    tool,
    preset,
    draft,
    cursor,
    rectStart,
    edgeEnd,
    placeAnchor,
    blockDraft,
    units.unit,
  );
  const drawingLabel = adjust?.label ?? drawing.measure?.text ?? null;
  const shownBeds = garden.beds.map((bed) =>
    adjust && !adjust.block && adjust.bedId === bed.id ? { ...bed, points: adjust.points } : bed,
  );
  const shownBlocks = garden.blocks.map((block) =>
    adjust?.block && adjust.block.id === block.id ? adjust.block : block,
  );
  const editingBlock = shownBlocks.find((block) => block.id === selectedBlockId) ?? null;
  const shownPlacements = adjust?.replacePlacements
    ? [
        ...garden.placements.filter((placement) => placement.bedId !== adjust.bedId),
        ...adjust.placements.flatMap((placement) => {
          const plantId =
            placement.plantId ??
            garden.placements.find((item) => item.id === placement.id)?.plantId;
          if (!plantId) return [];
          return [
            {
              id: placement.id,
              plantId,
              bedId: adjust.bedId,
              x: placement.x,
              y: placement.y,
              fill: placement.fill,
              count: placement.count,
              spacing: placement.spacing,
            },
          ];
        }),
      ]
    : garden.placements.map((placement) => {
        const moved = adjust?.placements.find((item) => item.id === placement.id);
        return moved ? { ...placement, x: moved.x, y: moved.y } : placement;
      });

  return {
    tool,
    setTool,
    chooseTool,
    customPresets,
    presetWidth,
    setPresetWidth,
    presetDepth,
    setPresetDepth,
    presetError,
    addCustomPreset,
    deleteCustomPreset,
    armPreset,
    armShade,
    preset,
    shadePreset,
    draft,
    drawNote,
    adjust,
    addBed,
    fillBed,
    handleSurface,
    adjustShape,
    drawing,
    drawingLabel,
    blockDraft,
    shownBeds,
    shownBlocks,
    shownPlacements,
    editingBlock,
    setCursor,
  };
}

export type Drawing = ReturnType<typeof useDrawing>;

function occupiedBy(
  item: Placement,
  bedPoints: Point[],
  plantsById: Map<string, Plant>,
  fallback: number,
): { x: number; y: number; spacing: number }[] {
  if (item.fill && item.spacing && (item.count ?? 1) > MAP_FILL_CAP) {
    const spacing = item.spacing;
    return fillPoints(bedPoints, spacing).map((point) => ({
      x: point.x,
      y: point.y,
      spacing,
    }));
  }
  const neighbour = plantsById.get(item.plantId);
  return [
    {
      x: item.x,
      y: item.y,
      spacing: neighbour ? plantingSpacing(neighbour.spreadM) : fallback,
    },
  ];
}
