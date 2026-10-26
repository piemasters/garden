import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  angledRectangle,
  blockCorners,
  blockFromCorners,
  centroid,
  distance,
  fillPoints,
  finishedStroke,
  formatSpacing,
  formatBearing,
  formatMetres,
  formatOffset,
  lineEnds,
  formatSize,
  formatTurn,
  pointInBlock,
  pointInPolygon,
  plantingSpacing,
  polygonArea,
  rectanglePoints,
  rectangleSize,
  rotatePoints,
  rotatedRectangle,
  scalePoints,
  snapOffset,
  translatePoints,
  snapAngle,
  snappedEdge,
  snapPoint,
  snapScale,
  snapToOutline,
  snapLineToOutline,
  spanSize,
} from "../../domain/geometry";
import {
  ASPECT_LABEL,
  GROUP_LABEL,
  KIND_LABEL,
  MOISTURE_LABEL,
  PH_LABEL,
  SOIL_LABEL,
  SUN_LABEL,
} from "../../domain/labels";
import { buildTimeline } from "../../domain/jobs";
import { getPlant, PLANTS } from "../../domain/plants";
import { aspectNote, recommendPlants } from "../../domain/recommend";
import { bedSun, daySamples, midsummerSamples, sunVector } from "../../domain/sun";
import {
  MONTH_NAMES,
  PLANT_GROUPS,
  SUN_LEVELS,
  type Garden,
  type PlantGroup,
  type Point,
  type ShadeBlock,
  type SunLevel,
} from "../../domain/types";
import { useGarden } from "../../lib/use-garden";
import { fetchBuildings } from "../../server/site";
import { buttonClass, quietButtonClass } from "../chrome";
import { GardenCanvas } from "./garden-canvas";

type Tool =
  | "select"
  | "bed"
  | "rect"
  | "angled"
  | "freeform"
  | "place"
  | "block"
  | "rotate"
  | "scale"
  | "move";

const DRAW_TOOLS: { tool: Tool; label: string; help: string }[] = [
  {
    tool: "select",
    label: "Select",
    help: "Click a bed to select it, or drag it to move. Drag empty ground to slide the plan.",
  },
  {
    tool: "rect",
    label: "Rectangle",
    help: "Drag from one corner to the other. Corners snap to half metres.",
  },
  {
    tool: "angled",
    label: "Angled",
    help: "Click both ends of one side, then click again to set the width.",
  },
  {
    tool: "freeform",
    label: "Freeform",
    help: "Drag around the bed. Release to close and smooth the outline.",
  },
  {
    tool: "bed",
    label: "Outline",
    help: "Click each corner, then the first corner again to close the bed.",
  },
  {
    tool: "block",
    label: "Shade",
    help: "Drag a wall, fence, or building. It casts shade on the beds.",
  },
];

type ShapeMenu = {
  x: number;
  y: number;
  kind: "bed" | "block" | "plant";
  id: string;
};

type AdjustPreview = {
  bedId: string;
  points: Point[];
  placements: { id: string; x: number; y: number }[];
  label: string;
  changed: boolean;
  block: ShadeBlock | null;
};

type AdjustGesture = {
  kind: "rotate" | "scale" | "move";
  target: "bed" | "block";
  bedId: string;
  center: Point;
  origin: Point;
  startAngle: number;
  startDistance: number;
  basePoints: Point[];
  basePlacements: { id: string; x: number; y: number }[];
  baseBlock: ShadeBlock | null;
  preview: AdjustPreview | null;
};

const BED_PRESETS = [
  { width: 2, depth: 2, label: "2 × 2 m" },
  { width: 2, depth: 4, label: "2 × 4 m" },
  { width: 4, depth: 2, label: "4 × 2 m" },
] as const;

const SHADE_PRESETS = [
  { label: "House", width: 8, depth: 6, height: 6 },
  { label: "Garage", width: 6, depth: 3, height: 2.5 },
  { label: "Shed", width: 3, depth: 2, height: 2.2 },
  { label: "Tree", width: 5, depth: 5, height: 7 },
  { label: "Hedge", width: 4, depth: 0.8, height: 2, line: true },
  { label: "Fence", width: 4, depth: 0.3, height: 1.8, line: true },
] as const;

export function GardenDesigner({ gardenId }: { gardenId: string }) {
  const { ready, garden, update } = useGarden(gardenId);
  if (!ready) return <p className="p-6 text-sm">Loading garden…</p>;
  if (!garden) {
    return (
      <p className="p-6">
        This garden is not saved in this browser.{" "}
        <Link to="/" className="text-leaf underline">
          Back to your gardens
        </Link>
      </p>
    );
  }
  return <DesignerBody garden={garden} update={update} />;
}

function DesignerBody({
  garden,
  update,
}: {
  garden: Garden;
  update: (recipe: (current: Garden) => Garden) => void;
}) {
  const [tool, setTool] = useState<Tool>("select");
  const [plantGroup, setPlantGroup] = useState<PlantGroup>("flower");
  const [preset, setPreset] = useState<{ width: number; depth: number } | null>(null);
  const [shadePreset, setShadePreset] = useState<(typeof SHADE_PRESETS)[number] | null>(null);
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
  const [armedPlantId, setArmedPlantId] = useState<string | null>(null);
  const [selectedBedId, setSelectedBedId] = useState<string | null>(garden.beds[0]?.id ?? null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date().getMonth());
  const [view, setView] = useState<"plan" | "orbit">("plan");
  const [scale, setScale] = useState<{ metres: number; pixels: number } | null>(null);
  const [bedLabels, setBedLabels] = useState<{ id: string; name: string; x: number; y: number }[]>(
    [],
  );
  const [handleSpots, setHandleSpots] = useState<{
    turn: { x: number; y: number };
    resize: { x: number; y: number };
    center: { x: number; y: number };
  } | null>(null);
  const pointerRef = useRef<(clientX: number, clientY: number) => Point | null>(() => null);
  const [menu, setMenu] = useState<ShapeMenu | null>(null);
  const appliedBuildings = useRef(false);

  const buildings = useQuery({
    queryKey: ["buildings", garden.id],
    enabled: !garden.buildingsLoaded,
    queryFn: () =>
      fetchBuildings({
        data: {
          latitude: garden.site.latitude,
          longitude: garden.site.longitude,
        },
      }),
  });

  useEffect(() => {
    if (garden.buildingsLoaded || appliedBuildings.current || !buildings.isFetched) return;
    appliedBuildings.current = true;
    const result = buildings.data;
    const buildingError =
      result == null
        ? "Building outlines could not be loaded. You can still draw shade blocks yourself."
        : result.ok
          ? null
          : result.error;
    update((current) => ({
      ...current,
      buildingsLoaded: true,
      buildingError,
      blocks: [
        ...(result?.ok ? result.blocks : []),
        ...current.blocks.filter((block) => block.source === "user"),
      ],
    }));
  }, [buildings.data, buildings.isFetched, garden.buildingsLoaded, update]);

  const samples = useMemo(
    () => midsummerSamples(garden.site.latitude, garden.site.longitude),
    [garden.site.latitude, garden.site.longitude],
  );
  const daylight = useMemo(
    () => daySamples(garden.site.latitude, garden.site.longitude, month, 15),
    [garden.site.latitude, garden.site.longitude, month],
  );
  const sunArc = useMemo(
    () =>
      daylight
        .filter((sample) => sample.altitude > 5)
        .map((sample) => {
          const vector = sunVector(sample.azimuth, sample.altitude);
          const radius = 18;
          return [vector.x * radius, Math.max(0.5, vector.z * radius), -vector.y * radius] as [
            number,
            number,
            number,
          ];
        }),
    [daylight],
  );
  const shadeSamples = useMemo(
    () => daylight.filter((sample, index) => sample.altitude > 8 && index % 2 === 0),
    [daylight],
  );
  const plantsById = useMemo(() => new Map(PLANTS.map((plant) => [plant.id, plant])), []);
  const activeBed = garden.beds.find((bed) => bed.id === selectedBedId) ?? garden.beds[0] ?? null;
  const activeLight = activeBed ? resolvedLight(activeBed, samples, garden.blocks) : null;
  const recommendations = activeLight
    ? recommendPlants(
        PLANTS.filter((plant) => plant.group === plantGroup),
        garden.site,
        activeLight.light,
        garden.showUnsuitable,
      )
    : [];
  const armed = armedPlantId ? getPlant(armedPlantId) : undefined;
  const selectedBlock = garden.blocks.find((block) => block.id === selectedBlockId) ?? null;

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

  function armPreset(width: number, depth: number) {
    setPreset({ width, depth });
    setShadePreset(null);
    setTool("place");
    resetGesture();
  }

  function armShade(next: (typeof SHADE_PRESETS)[number]) {
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
      .map((item) => {
        const neighbour = plantsById.get(item.plantId);
        return {
          x: item.x,
          y: item.y,
          spacing: neighbour ? plantingSpacing(neighbour.spreadM) : spacing,
        };
      });
    const spots = fillPoints(activeBed.points, spacing, occupied);
    if (spots.length === 0) return;
    update((current) => ({
      ...current,
      placements: [
        ...current.placements,
        ...spots.map((point) => ({
          id: crypto.randomUUID(),
          plantId: plant.id,
          bedId: activeBed.id,
          x: point.x,
          y: point.y,
        })),
      ],
    }));
    setSelectedBedId(activeBed.id);
    setSelectedPlacementId(null);
    setArmedPlantId(null);
    setTool("select");
  }

  function handleSurface(raw: Point, phase: "down" | "move" | "up") {
    if (tool === "rotate" || tool === "scale" || tool === "move") {
      adjustShape(tool, raw, phase);
      return;
    }
    if (tool === "freeform") {
      drawFreeform(raw, phase);
      return;
    }
    if (tool === "angled") {
      drawAngled(raw, phase);
      return;
    }
    if (tool === "place" && preset) {
      drawPreset(raw, phase);
      return;
    }
    const point = tool === "select" ? raw : snapPoint(raw);
    if (phase === "move") {
      if (tool === "block" && shadePreset) {
        placeShade(raw, "move");
        return;
      }
      setCursor(point);
      if (tool === "block" && blockStart)
        setBlockDraft(blockBetween(blockId.current, blockStart, point));
      return;
    }
    if (tool === "bed" && phase === "down") {
      const first = draft[0];
      const last = draft[draft.length - 1];
      if (first && draft.length >= 3 && distance(point, first) < 0.25) {
        addBed(draft);
        setTool("select");
        setCursor(null);
        return;
      }
      if (last && distance(point, last) < 0.01) return;
      setDraft((points) => [...points, point]);
      return;
    }
    if (tool === "rect") {
      if (phase === "down") {
        setRectStart(point);
        return;
      }
      if (phase === "up" && rectStart) {
        const points = rectanglePoints(rectStart, point);
        const size = spanSize(points);
        if (size.width >= 0.5 && size.depth >= 0.5) addBed(points);
        setRectStart(null);
      }
      return;
    }
    if (tool === "block") {
      if (shadePreset) {
        placeShade(raw, phase);
        return;
      }
      if (phase === "down") {
        blockId.current = crypto.randomUUID();
        setBlockStart(point);
        setBlockDraft(blockBetween(blockId.current, point, point));
        return;
      }
      if (phase === "up" && blockStart) {
        const block = blockBetween(blockId.current, blockStart, point);
        if (block.width >= 0.5 && block.depth >= 0.5) {
          update((current) => ({
            ...current,
            blocks: [...current.blocks, block],
          }));
          setSelectedBlockId(block.id);
        }
        setBlockStart(null);
        setBlockDraft(null);
        setTool("select");
      }
      return;
    }
    if (phase !== "down") return;
    const shade = blockUnder(point);
    if (shade) {
      setSelectedBlockId(shade.id);
      setSelectedPlacementId(null);
      return;
    }
    const bed = garden.beds.find((item) => pointInPolygon(point, item.points));
    if (armedPlantId && bed) {
      const placement = {
        id: crypto.randomUUID(),
        plantId: armedPlantId,
        bedId: bed.id,
        x: point.x,
        y: point.y,
      };
      update((current) => ({
        ...current,
        placements: [...current.placements, placement],
      }));
      setSelectedBedId(bed.id);
      setSelectedPlacementId(placement.id);
      setArmedPlantId(null);
      return;
    }
    if (bed) {
      setSelectedBedId(bed.id);
      setSelectedPlacementId(null);
      setSelectedBlockId(null);
      return;
    }
    setSelectedBedId(null);
    setSelectedPlacementId(null);
    setSelectedBlockId(null);
  }

  function bedUnder(point: Point) {
    const hits = garden.beds.filter((bed) => pointInPolygon(point, bed.points));
    return (
      hits.find((bed) => bed.id === selectedBedId) ??
      hits.sort((a, b) => polygonArea(a.points) - polygonArea(b.points))[0]
    );
  }

  function blockUnder(point: Point) {
    const hits = garden.blocks.filter((block) => pointInBlock(point, block));
    return (
      hits.find((block) => block.id === selectedBlockId) ??
      hits.sort((a, b) => a.width * a.depth - b.width * b.depth)[0]
    );
  }

  function adjustShape(
    kind: "rotate" | "scale" | "move",
    raw: Point,
    phase: "down" | "move" | "up",
  ) {
    if (view !== "plan") return;
    if (phase === "down") {
      const block = blockUnder(raw);
      const bed = bedUnder(raw);
      const selectedBlock = garden.blocks.find((item) => item.id === selectedBlockId);
      if (block) {
        const center = { x: block.x, y: block.y };
        if (kind === "scale" && distance(raw, center) < 0.4) {
          setSelectedBlockId(block.id);
          setDrawNote("Drag from the edge of the shade, away from the middle.");
          return;
        }
        setDrawNote(null);
        setSelectedBlockId(block.id);
        adjustRef.current = {
          kind,
          target: "block",
          bedId: block.id,
          center,
          origin: raw,
          startAngle: Math.atan2(raw.y - center.y, raw.x - center.x),
          startDistance: Math.max(distance(raw, center), 0.4),
          basePoints: blockCorners(block),
          basePlacements: [],
          baseBlock: block,
          preview: null,
        };
        return;
      }
      if (!bed && selectedBlock) {
        const center = { x: selectedBlock.x, y: selectedBlock.y };
        if (kind === "scale" && distance(raw, center) < 0.4) {
          setDrawNote("Drag from the edge of the shade, away from the middle.");
          return;
        }
        setDrawNote(null);
        adjustRef.current = {
          kind,
          target: "block",
          bedId: selectedBlock.id,
          center,
          origin: raw,
          startAngle: Math.atan2(raw.y - center.y, raw.x - center.x),
          startDistance: Math.max(distance(raw, center), 0.4),
          basePoints: blockCorners(selectedBlock),
          basePlacements: [],
          baseBlock: selectedBlock,
          preview: null,
        };
        return;
      }
      const chosenBed = bed ?? garden.beds.find((item) => item.id === selectedBedId);
      if (!chosenBed) {
        setDrawNote("Select a bed or shade block, then drag it.");
        return;
      }
      const center = centroid(chosenBed.points);
      if (kind === "scale" && distance(raw, center) < 0.4) {
        setSelectedBedId(chosenBed.id);
        setSelectedBlockId(null);
        setDrawNote("Drag from the edge of the bed, away from the middle.");
        return;
      }
      setDrawNote(null);
      setSelectedBedId(chosenBed.id);
      setSelectedBlockId(null);
      adjustRef.current = {
        kind,
        target: "bed",
        bedId: chosenBed.id,
        center,
        origin: raw,
        startAngle: Math.atan2(raw.y - center.y, raw.x - center.x),
        startDistance: Math.max(distance(raw, center), 0.4),
        basePoints: chosenBed.points,
        basePlacements: garden.placements
          .filter((item) => item.bedId === chosenBed.id)
          .map((item) => ({ id: item.id, x: item.x, y: item.y })),
        baseBlock: null,
        preview: null,
      };
      return;
    }
    const gesture = adjustRef.current;
    if (!gesture) return;
    const preview = attachBlock(gesture, previewAdjust(gesture, raw));
    if (phase === "move") {
      gesture.preview = preview;
      setAdjust(preview);
      return;
    }
    adjustRef.current = null;
    setAdjust(null);
    if (!preview.changed) return;
    if (gesture.target === "block" && preview.block) {
      const nextBlock = preview.block;
      update((current) => ({
        ...current,
        blocks: current.blocks.map((block) => (block.id === nextBlock.id ? nextBlock : block)),
      }));
      return;
    }
    update((current) => ({
      ...current,
      beds: current.beds.map((bed) =>
        bed.id === preview.bedId ? { ...bed, points: preview.points } : bed,
      ),
      placements: current.placements.map((item) => {
        const moved = preview.placements.find((placement) => placement.id === item.id);
        return moved ? { ...item, x: moved.x, y: moved.y } : item;
      }),
    }));
  }

  function outlineSnapMetres(): number {
    if (!scale || scale.pixels <= 0) return 1.25;
    return Math.min(4, Math.max(0.35, (scale.metres / scale.pixels) * 16));
  }

  function snapAdjustedLine(block: ShadeBlock): ShadeBlock {
    return snapLineToOutline(block, garden.boundary, outlineSnapMetres());
  }

  function attachBlock(gesture: AdjustGesture, preview: AdjustPreview): AdjustPreview {
    if (gesture.target !== "block" || !gesture.baseBlock) return preview;
    const block = snapAdjustedLine(blockFromCorners(gesture.baseBlock, preview.points));
    return {
      ...preview,
      block,
      label:
        gesture.kind === "scale" && block.line
          ? `${formatMetres(block.width)} m long`
          : preview.label,
    };
  }

  function previewAdjust(gesture: AdjustGesture, raw: Point): AdjustPreview {
    if (gesture.kind === "rotate") {
      const angle = Math.atan2(raw.y - gesture.center.y, raw.x - gesture.center.x);
      const turned = snapAngle(angle - gesture.startAngle);
      const points = rotatePoints(gesture.basePoints, gesture.center, turned);
      return {
        bedId: gesture.bedId,
        points,
        placements: movedPlacements(
          gesture,
          (point) => rotatePoints([point], gesture.center, turned)[0],
        ),
        label: formatTurn(turned),
        changed: turned !== 0,
        block: null,
      };
    }
    if (gesture.kind === "move") {
      const by = snapOffset(gesture.origin, raw);
      return {
        bedId: gesture.bedId,
        points: translatePoints(gesture.basePoints, by),
        placements: movedPlacements(gesture, (point) => translatePoints([point], by)[0]),
        label: formatOffset(by),
        changed: by.x !== 0 || by.y !== 0,
        block: null,
      };
    }
    const factor = snapScale(distance(raw, gesture.center) / gesture.startDistance);
    const points = scalePoints(gesture.basePoints, gesture.center, factor);
    const sides = rectangleSize(points) ?? spanSize(points);
    return {
      bedId: gesture.bedId,
      points,
      placements: movedPlacements(
        gesture,
        (point) => scalePoints([point], gesture.center, factor)[0],
      ),
      label: `${formatSize(sides.width, sides.depth)} · ${Math.round(factor * 100)}%`,
      changed: factor !== 1,
      block: null,
    };
  }

  function movedPlacements(
    gesture: AdjustGesture,
    move: (point: Point) => Point | undefined,
  ): AdjustPreview["placements"] {
    return gesture.basePlacements.flatMap((item) => {
      const next = move(item);
      return next ? [{ id: item.id, x: next.x, y: next.y }] : [];
    });
  }

  function drawFreeform(raw: Point, phase: "down" | "move" | "up") {
    const point = snapPoint(raw, 0.05);
    if (phase === "down") {
      strokeRef.current = [point];
      setDraft([point]);
      setCursor(point);
      setDrawNote(null);
      return;
    }
    if (phase === "move") {
      setCursor(point);
      if (strokeRef.current.length === 0) return;
      const last = strokeRef.current[strokeRef.current.length - 1];
      if (!last || distance(last, point) >= 0.12) {
        strokeRef.current = [...strokeRef.current, point];
        setDraft(strokeRef.current);
      }
      return;
    }
    if (strokeRef.current.length === 0) return;
    const shape = finishedStroke(strokeRef.current);
    strokeRef.current = [];
    setDraft([]);
    setCursor(null);
    if (!shape) {
      setDrawNote("That outline was too small. Draw around the whole bed, then release.");
      return;
    }
    addBed(shape);
  }

  function drawAngled(raw: Point, phase: "down" | "move" | "up") {
    if (phase === "move") {
      setCursor(raw);
      return;
    }
    if (phase !== "down") return;
    const gesture = angledRef.current;
    if (!gesture.origin) {
      const origin = snapPoint(raw);
      gesture.origin = origin;
      gesture.end = null;
      setRectStart(origin);
      setEdgeEnd(null);
      setCursor(origin);
      return;
    }
    if (!gesture.end) {
      const edge = snappedEdge(gesture.origin, raw);
      if (!edge) return;
      gesture.end = edge.end;
      setEdgeEnd(edge.end);
      setCursor(edge.end);
      return;
    }
    const rect = angledRectangle(gesture.origin, gesture.end, raw);
    if (!rect) return;
    addBed(rect.points);
    gesture.origin = null;
    gesture.end = null;
    setRectStart(null);
    setEdgeEnd(null);
    setCursor(null);
  }

  function drawPreset(raw: Point, phase: "down" | "move" | "up") {
    if (!preset) return;
    if (phase === "down") {
      const origin = snapPoint(raw);
      placeAnchorRef.current = origin;
      setPlaceAnchor(origin);
      setCursor(origin);
      return;
    }
    if (phase === "move") {
      setCursor(placeAnchorRef.current ? raw : snapPoint(raw));
      return;
    }
    const origin = placeAnchorRef.current;
    if (!origin) return;
    const dragged = distance(origin, raw);
    const angle =
      dragged < 0.35 ? Math.PI / 2 : snapAngle(Math.atan2(raw.y - origin.y, raw.x - origin.x));
    addBed(rotatedRectangle(origin, preset.width, preset.depth, angle));
    placeAnchorRef.current = null;
    setPlaceAnchor(null);
    setCursor(null);
  }

  function placeShade(raw: Point, phase: "down" | "move" | "up") {
    if (!shadePreset) return;
    if (phase === "down") {
      const origin = presetIsLine(shadePreset)
        ? snapToOutline(raw, garden.boundary, outlineSnapMetres())
        : snapPoint(raw);
      blockId.current = crypto.randomUUID();
      placeAnchorRef.current = origin;
      setPlaceAnchor(origin);
      if (presetIsLine(shadePreset)) {
        const laid = linePlacement(origin, origin, garden.boundary, outlineSnapMetres());
        setBlockDraft(
          madeShade(shadePreset, laid.center, laid.rotation, blockId.current, laid.length),
        );
      } else {
        setBlockDraft(madeShade(shadePreset, origin, 0, blockId.current));
      }
      return;
    }
    const origin = placeAnchorRef.current;
    if (!origin) return;
    const dragged = distance(origin, raw);
    const rotation = dragged < 0.35 ? 0 : snapAngle(Math.atan2(raw.y - origin.y, raw.x - origin.x));
    const laid = presetIsLine(shadePreset)
      ? linePlacement(origin, raw, garden.boundary, outlineSnapMetres())
      : null;
    const center = laid?.center ?? origin;
    const angle = laid?.rotation ?? rotation;
    const length = laid?.length;
    if (phase === "move") {
      setBlockDraft(madeShade(shadePreset, center, angle, blockId.current, length));
      setCursor(raw);
      return;
    }
    const block = madeShade(shadePreset, center, angle, blockId.current, length);
    update((current) => ({ ...current, blocks: [...current.blocks, block] }));
    setSelectedBlockId(block.id);
    setShadePreset(null);
    setTool("select");
    resetGesture();
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
  );
  const drawingLabel = adjust?.label ?? drawing.measure?.text ?? null;
  const shownBeds = garden.beds.map((bed) =>
    adjust && !adjust.block && adjust.bedId === bed.id ? { ...bed, points: adjust.points } : bed,
  );
  const shownBlocks = garden.blocks.map((block) =>
    adjust?.block && adjust.block.id === block.id ? adjust.block : block,
  );
  const editingBlock = shownBlocks.find((block) => block.id === selectedBlockId) ?? null;
  const shownPlacements = garden.placements.map((placement) => {
    const moved = adjust?.placements.find((item) => item.id === placement.id);
    return moved ? { ...placement, x: moved.x, y: moved.y } : placement;
  });
  const jobCount = buildTimeline(PLANTS, garden.placements, garden.site).length;
  const bedPlacements = activeBed
    ? garden.placements.filter((placement) => placement.bedId === activeBed.id)
    : [];
  const bedGroups = groupPlantings(bedPlacements);
  const otherPlacements = activeBed
    ? garden.placements.filter((placement) => placement.bedId !== activeBed.id)
    : [];

  return (
    <div className="grid min-h-[calc(100vh-4.25rem)] lg:grid-cols-[17rem_minmax(0,1fr)_20rem]">
      <aside className="space-y-4 border-b border-line p-4 lg:border-r lg:border-b-0">
        <div>
          <details className="group">
            <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <h1 className="flex items-baseline gap-2 text-3xl">
                <span
                  aria-hidden
                  className="inline-block text-sm text-ink/50 transition-transform group-open:rotate-90"
                >
                  ▸
                </span>
                {garden.site.name}
              </h1>
              <p className="text-sm text-ink/70">
                {garden.site.postcode} · {garden.site.region}
              </p>
            </summary>
            <div className="mt-2 space-y-2">
              <p className="text-sm">
                {SOIL_LABEL[garden.site.soil]} · {MOISTURE_LABEL[garden.site.moisture]} ·{" "}
                {PH_LABEL[garden.site.ph]} · {ASPECT_LABEL[garden.site.aspect]}
              </p>
              {garden.site.address ? (
                <p className="text-sm text-ink/70">{garden.site.address}</p>
              ) : null}
              {garden.site.soilSuggestion ? (
                <p className="text-xs text-ink/60">{garden.site.soilSuggestion.label}</p>
              ) : null}
            </div>
          </details>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-ink/60">Draw</p>
          <div className="flex flex-wrap gap-1">
            {DRAW_TOOLS.map((item) => (
              <ToolButton
                key={item.tool}
                compact
                current={tool}
                tool={item.tool}
                title={item.help}
                onClick={chooseTool}
              >
                {item.label}
              </ToolButton>
            ))}
          </div>
          {shadePreset ? (
            <p className="text-xs leading-snug text-ink/70">
              {presetIsLine(shadePreset)
                ? garden.boundary && garden.boundary.length >= 3
                  ? `Drag to draw the ${shadePreset.label.toLowerCase()} as long as you need. Near the property outline it snaps to that line. Scaling changes its length, not its width.`
                  : `Drag to draw the ${shadePreset.label.toLowerCase()} as long as you need. Scaling changes its length, not its width.`
                : `Click to place a ${shadePreset.label.toLowerCase()}, or drag to aim its long side.`}
            </p>
          ) : DRAW_TOOLS.some((item) => item.tool === tool) ? (
            <p className="text-xs leading-snug text-ink/70">
              {DRAW_TOOLS.find((item) => item.tool === tool)?.help}
            </p>
          ) : null}
          {tool === "freeform" && drawNote ? (
            <p className="text-xs text-ink/70">{drawNote}</p>
          ) : null}
          {tool === "bed" ? (
            <button
              className="min-h-8 rounded-full border border-line bg-card px-2.5 py-1 text-xs text-ink hover:border-leaf disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              disabled={draft.length < 3}
              onClick={() => {
                addBed(draft);
                setTool("select");
                setCursor(null);
              }}
            >
              Finish bed
            </button>
          ) : null}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-ink/60">Shade presets</p>
          <div className="flex flex-wrap gap-1">
            {SHADE_PRESETS.map((item) => {
              const armed = shadePreset?.label === item.label;
              return (
                <button
                  key={item.label}
                  className={
                    armed
                      ? "min-h-8 rounded-full bg-leaf px-2 py-1 text-[11px] text-white"
                      : "min-h-8 rounded-full border border-line bg-card px-2 py-1 text-[11px] text-ink hover:border-leaf"
                  }
                  type="button"
                  onClick={() => armShade(item)}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
        {selectedBlock ? (
          <label className="block text-sm">
            {selectedBlock.label ?? "Shade"} ·{" "}
            {selectedBlock.line
              ? `${formatMetres(selectedBlock.width)} m long`
              : formatSize(selectedBlock.width, selectedBlock.depth)}
            <span className="mt-2 block text-xs text-ink/60">
              Height {selectedBlock.height.toFixed(1)} m
            </span>
            <input
              className="mt-1 w-full"
              type="range"
              min={0.5}
              max={20}
              step={0.5}
              value={selectedBlock.height}
              onChange={(event) => {
                const height = Number(event.target.value);
                update((current) => ({
                  ...current,
                  blocks: current.blocks.map((block) =>
                    block.id === selectedBlock.id ? { ...block, height } : block,
                  ),
                }));
              }}
            />
            <button
              className="mt-2 text-xs text-clay"
              type="button"
              onClick={() => {
                update((current) => ({
                  ...current,
                  blocks: current.blocks.filter((block) => block.id !== selectedBlock.id),
                }));
                setSelectedBlockId(null);
              }}
            >
              Remove
            </button>
          </label>
        ) : null}
        <div className="space-y-2">
          <p className="text-xs font-medium text-ink/60">Adjust the selection</p>
          <div className="flex flex-wrap gap-2">
            <ToolButton current={tool} tool="move" onClick={chooseTool}>
              Move
            </ToolButton>
            <ToolButton current={tool} tool="rotate" onClick={chooseTool}>
              Rotate
            </ToolButton>
            <ToolButton current={tool} tool="scale" onClick={chooseTool}>
              Scale
            </ToolButton>
          </div>
          <p className="text-sm">
            Drag a bed or shade block, or its Move, Turn, or Size handle. Right-click for copy and
            delete.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {BED_PRESETS.map((item) => {
            const armed =
              tool === "place" && preset?.width === item.width && preset.depth === item.depth;
            return (
              <button
                key={item.label}
                className={armed ? buttonClass : quietButtonClass}
                type="button"
                onClick={() => armPreset(item.width, item.depth)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        {drawingLabel ? <p className="text-sm font-medium">{drawingLabel}</p> : null}
        {tool === "place" && preset ? (
          <p className="text-sm">
            Click to place a north-south {formatSize(preset.width, preset.depth)} bed, or drag to
            aim it. The angle snaps to 5°.
          </p>
        ) : null}
        {tool === "move" ? (
          <div className="text-sm">
            <p>Drag a bed to move it. The move snaps to half metres, and plants come with it.</p>
            {drawNote ? <p className="mt-2 text-ink/70">{drawNote}</p> : null}
          </div>
        ) : null}
        {tool === "rotate" ? (
          <div className="text-sm">
            <p>Drag a bed to turn it. The angle snaps to 5°, and plants in the bed turn with it.</p>
            {drawNote ? <p className="mt-2 text-ink/70">{drawNote}</p> : null}
          </div>
        ) : null}
        {tool === "scale" ? (
          <div className="text-sm">
            <p>Drag from the edge of a bed. Pull outward to enlarge it, or inward to shrink it.</p>
            {drawNote ? <p className="mt-2 text-ink/70">{drawNote}</p> : null}
          </div>
        ) : null}
        <p className="text-xs text-ink/60">
          {!garden.buildingsLoaded
            ? "Loading nearby buildings…"
            : garden.buildingError
              ? garden.buildingError
              : garden.blocks.some((block) => block.source === "osm")
                ? "Grey blocks are OpenStreetMap buildings. Heights are often a guess. Delete any that are wrong."
                : "No building outlines were added for this point. You can draw shade blocks yourself."}
        </p>
        <label className="block text-sm">
          Month
          <input
            className="mt-1 w-full"
            type="range"
            min={0}
            max={11}
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
          />
          <span className="font-medium">{MONTH_NAMES[month]}</span>
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={garden.showShade !== false}
            onChange={(event) =>
              update((current) => ({
                ...current,
                showShade: event.target.checked,
              }))
            }
          />
          Show shade
        </label>
        {garden.showShade !== false ? (
          <p className="text-xs text-ink/60">
            Shadows show where shade falls in the middle of this month.
          </p>
        ) : null}
        <div className="flex gap-2">
          <button
            className={view === "plan" ? buttonClass : quietButtonClass}
            type="button"
            onClick={() => setView("plan")}
          >
            Plan
          </button>
          <button
            className={view === "orbit" ? buttonClass : quietButtonClass}
            type="button"
            onClick={() => setView("orbit")}
          >
            3D
          </button>
        </div>
        {view === "plan" ? (
          <p className="text-xs leading-snug text-ink/60">
            Scroll to zoom. Drag empty ground to move around. Double-click to centre the plan.
          </p>
        ) : null}
        <div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg">Beds</h2>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={garden.showBedNames ?? false}
                onChange={(event) =>
                  update((current) => ({
                    ...current,
                    showBedNames: event.target.checked,
                  }))
                }
              />
              Show names
            </label>
          </div>
          <ul className="mt-2 space-y-2 text-sm">
            {garden.beds.map((bed) => {
              const points = adjust?.bedId === bed.id ? adjust.points : bed.points;
              const light = resolvedLight({ ...bed, points }, samples, garden.blocks);
              return (
                <li key={bed.id}>
                  <button
                    className="text-left"
                    type="button"
                    onClick={() => {
                      setSelectedBedId(bed.id);
                      setSelectedBlockId(null);
                    }}
                    onContextMenu={(event) => openMenu(event, { kind: "bed", id: bed.id })}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <span
                        className="inline-block h-3 w-3 shrink-0 rounded-full border border-line"
                        style={{ background: bedColour(bed.color) }}
                      />
                      {bed.name}
                    </span>
                    <span className="block text-ink/70">
                      {bedSize(points)} · {SUN_LABEL[light.light]} · {light.hours.toFixed(1)} h of
                      midsummer sun
                      {bed.lightOverride ? " · override" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
            {garden.beds.length === 0 ? <li className="text-ink/60">No beds yet.</li> : null}
          </ul>
        </div>
        {activeBed ? (
          <BedColours
            color={activeBed.color}
            onColour={(color) => setBedColour(activeBed.id, color)}
          />
        ) : null}
        {activeBed && activeLight ? (
          <label className="block text-sm">
            Light for {activeBed.name}
            <select
              className="mt-1 w-full rounded-md border border-line bg-card px-2 py-2"
              value={activeBed.lightOverride ?? "calculated"}
              onChange={(event) => {
                const value = event.target.value;
                const lightOverride = value === "calculated" ? null : (value as SunLevel);
                update((current) => ({
                  ...current,
                  beds: current.beds.map((bed) =>
                    bed.id === activeBed.id ? { ...bed, lightOverride } : bed,
                  ),
                }));
              }}
            >
              <option value="calculated">
                Use the sun calculation ({SUN_LABEL[activeLight.light]})
              </option>
              {SUN_LEVELS.map((level) => (
                <option key={level} value={level}>
                  Override: {SUN_LABEL[level]}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <p className="text-sm">
          <Link
            to="/gardens/$gardenId/jobs"
            params={{ gardenId: garden.id }}
            className="text-leaf underline"
          >
            {jobCount === 0
              ? "Jobs will appear once you place plants"
              : `${jobCount} jobs this year`}
          </Link>
        </p>
        {garden.attribution || (garden.boundary && garden.boundary.length >= 3) ? (
          <details className="text-xs text-ink/50">
            <summary className="cursor-pointer">Sources</summary>
            {garden.boundary && garden.boundary.length >= 3 ? (
              <p className="mt-1">
                Property outline from HM Land Registry. It is the indicative freehold extent, not
                the legal title.
              </p>
            ) : null}
            {garden.attribution ? <p className="mt-1">{garden.attribution}</p> : null}
          </details>
        ) : null}
      </aside>

      <div
        className="relative h-[70vh] min-h-[28rem] lg:sticky lg:top-0 lg:h-[calc(100vh-4.25rem)] lg:self-start"
        onContextMenu={(event) => {
          const hit = shapeAt(event);
          if (!hit) {
            event.preventDefault();
            setMenu(null);
            return;
          }
          openMenu(event, hit);
        }}
      >
        {view === "plan" ? (
          <p className="pointer-events-none absolute top-3 left-1/2 z-10 -translate-x-1/2 text-xs tracking-widest text-ink/70">
            NORTH
          </p>
        ) : null}
        {armed ? (
          <p className="absolute top-3 left-3 z-10 rounded-full bg-leaf px-3 py-1 text-sm text-white">
            Click a bed to plant {armed.commonName}
          </p>
        ) : null}
        {drawingLabel ? (
          <p className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-ink px-3 py-1 text-sm text-white">
            {drawingLabel}
          </p>
        ) : null}
        {view === "plan"
          ? bedLabels.map((label) => {
              const beside = label.id === activeBed?.id && handleSpots;
              return (
                <p
                  key={label.id}
                  className={`pointer-events-none absolute z-10 -translate-y-1/2 rounded-full bg-paper/90 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-ink shadow-sm ${beside ? "" : "-translate-x-1/2"}`}
                  style={{ left: label.x + (beside ? 20 : 0), top: label.y }}
                >
                  {label.name}
                </p>
              );
            })
          : null}
        {view === "plan" && handleSpots ? (
          <>
            <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full">
              <HandleStem from={handleSpots.center} to={handleSpots.turn} />
              <HandleStem from={handleSpots.center} to={handleSpots.resize} />
            </svg>
            <BedHandle
              label="Move"
              at={handleSpots.center}
              kind="move"
              toPoint={pointerRef}
              adjust={adjustShape}
            />
            <BedHandle
              label="Turn"
              at={handleSpots.turn}
              kind="rotate"
              toPoint={pointerRef}
              adjust={adjustShape}
            />
            <BedHandle
              label="Size"
              at={handleSpots.resize}
              kind="scale"
              toPoint={pointerRef}
              adjust={adjustShape}
            />
          </>
        ) : null}
        {view === "plan" && scale ? (
          <div className="pointer-events-none absolute bottom-4 left-4 z-10 text-ink">
            <div className="flex items-end">
              <span className="h-2 w-px bg-ink" />
              <span className="mb-1 h-0.5 bg-ink" style={{ width: scale.pixels }} />
              <span className="h-2 w-px bg-ink" />
            </div>
            <p className="mt-1 text-center text-xs" style={{ width: scale.pixels }}>
              {scale.metres} m
            </p>
          </div>
        ) : null}
        <GardenCanvas
          beds={shownBeds}
          blocks={shownBlocks}
          placements={shownPlacements}
          plantsById={plantsById}
          month={month}
          view={view}
          tool={tool}
          selectedBedId={selectedBlockId ? null : (activeBed?.id ?? null)}
          selectedPlacementId={selectedPlacementId}
          selectedBlockId={selectedBlockId}
          draft={draft}
          preview={drawing.preview}
          previewClosed={drawing.closed}
          measure={adjust ? { text: adjust.label, at: centroid(adjust.points) } : drawing.measure}
          blockDraft={blockDraft}
          boundary={garden.boundary ?? null}
          sunArc={sunArc}
          shadeSamples={garden.showShade === false ? [] : shadeSamples}
          onSurface={handleSurface}
          onSelectPlacement={setSelectedPlacementId}
          showHandles={
            view === "plan" &&
            !armedPlantId &&
            (tool === "select" || tool === "rotate" || tool === "scale" || tool === "move")
          }
          onMoveBed={
            tool === "select" && !armedPlantId
              ? (point, phase) => adjustShape("move", point, phase)
              : undefined
          }
          onHandleSpots={setHandleSpots}
          handlePoints={editingBlock ? blockCorners(editingBlock) : undefined}
          pointerRef={pointerRef}
          bedNames={
            garden.showBedNames && view === "plan"
              ? shownBeds.map((bed) => ({
                  id: bed.id,
                  name: bed.name,
                  points: bed.points,
                }))
              : null
          }
          onBedLabels={setBedLabels}
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
          onScale={(metres, pixels) => setScale({ metres, pixels })}
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

      <aside className="space-y-3 border-t border-line p-4 lg:border-t-0 lg:border-l">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl">{activeBed ? `For ${activeBed.name}` : "Plants"}</h2>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={garden.showUnsuitable}
              onChange={(event) =>
                update((current) => ({
                  ...current,
                  showUnsuitable: event.target.checked,
                }))
              }
            />
            Show unsuitable
          </label>
        </div>
        <p className="text-xs text-ink/60">{aspectNote(garden.site.aspect)}</p>
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
              onClick={() => setPlantGroup(group)}
            >
              {GROUP_LABEL[group]}
            </button>
          ))}
        </div>
        {!activeBed ? (
          <p className="text-sm">Draw a bed to see plants that fit its sun and your soil.</p>
        ) : recommendations.length === 0 ? (
          <p className="text-sm text-ink/60">Nothing in this list suits this bed.</p>
        ) : null}
        <ul className="max-h-[70vh] space-y-2 overflow-auto">
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
                      onClick={() => setArmedPlantId(verdict.plant.id)}
                    >
                      Place
                    </button>
                    <button
                      className={`${quietButtonClass} px-3`}
                      type="button"
                      title={`${formatSpacing(plantingSpacing(verdict.plant.spreadM))} apart`}
                      aria-label={`Fill ${activeBed.name} with ${verdict.plant.commonName}, ${formatSpacing(plantingSpacing(verdict.plant.spreadM))} apart`}
                      onClick={() => fillBed(verdict.plant)}
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
        {garden.placements.length > 0 ? (
          <div className="space-y-3">
            <h2 className="flex items-baseline justify-between text-lg">
              Planted
              <span className="text-sm font-normal text-ink/60">{garden.placements.length}</span>
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
                    onRemove={(plantId) => removePlantsOf(plantId, activeBed.id)}
                  />
                )}
              </div>
            ) : null}
            {otherPlacements.length > 0 ? (
              <div>
                <h3 className="flex items-baseline justify-between text-base">
                  All beds
                  <span className="text-sm font-normal text-ink/60">
                    {garden.placements.length}
                  </span>
                </h3>
                <PlantedGroups
                  groups={groupPlantings(garden.placements)}
                  month={month}
                  onRemove={(plantId) => removePlantsOf(plantId)}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </aside>
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
          onRename={(name) => renameBed(menu.id, name)}
          onColour={(color) => setBedColour(menu.id, color)}
          onDuplicateBed={() => duplicateBed(menu.id)}
          onDeleteBed={() => removeBed(menu.id)}
          onDuplicateBlock={() => duplicateBlock(menu.id)}
          onDeleteBlock={() => removeBlock(menu.id)}
          onRemovePlant={() => removePlant(menu.id)}
        />
      ) : null}
    </div>
  );

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
    hit: { kind: ShapeMenu["kind"]; id: string },
  ) {
    event.preventDefault();
    const width = 208;
    const height = hit.kind === "bed" ? 248 : 112;
    setMenu({
      kind: hit.kind,
      id: hit.id,
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

  function setBedColour(id: string, color: string) {
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return;
    update((current) => ({
      ...current,
      beds: current.beds.map((bed) =>
        bed.id === id ? { ...bed, color: color.toLowerCase() } : bed,
      ),
    }));
  }

  function renameBed(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    update((current) => ({
      ...current,
      beds: current.beds.map((bed) => (bed.id === id ? { ...bed, name: trimmed } : bed)),
    }));
  }

  function duplicateBed(id: string) {
    const bed = garden.beds.find((item) => item.id === id);
    if (!bed) return;
    const copyId = crypto.randomUUID();
    const shift = { x: 1, y: 0 };
    update((current) => ({
      ...current,
      beds: [
        ...current.beds,
        {
          ...bed,
          id: copyId,
          name: copyName(
            bed.name,
            current.beds.map((item) => item.name),
          ),
          points: translatePoints(bed.points, shift),
        },
      ],
      placements: [
        ...current.placements,
        ...current.placements
          .filter((item) => item.bedId === id)
          .flatMap((item) => {
            const moved = translatePoints([item], shift)[0];
            return moved
              ? [
                  {
                    ...item,
                    id: crypto.randomUUID(),
                    bedId: copyId,
                    x: moved.x,
                    y: moved.y,
                  },
                ]
              : [];
          }),
      ],
    }));
    setSelectedBedId(copyId);
    setSelectedPlacementId(null);
    setSelectedBlockId(null);
    setTool("select");
    setMenu(null);
  }

  function removeBed(id: string) {
    update((current) => ({
      ...current,
      beds: current.beds.filter((item) => item.id !== id),
      placements: current.placements.filter((item) => item.bedId !== id),
    }));
    setSelectedBedId((current) => (current === id ? null : current));
    setMenu(null);
  }

  function duplicateBlock(id: string) {
    const block = garden.blocks.find((item) => item.id === id);
    if (!block) return;
    const copyId = crypto.randomUUID();
    update((current) => ({
      ...current,
      blocks: [
        ...current.blocks,
        {
          ...block,
          id: copyId,
          x: block.x + 1,
          y: block.y,
          source: "user",
          label: copyName(
            block.label ?? "Shade block",
            current.blocks.map((item) => item.label ?? "Shade block"),
          ),
        },
      ],
    }));
    setSelectedBlockId(copyId);
    setMenu(null);
  }

  function removeBlock(id: string) {
    update((current) => ({
      ...current,
      blocks: current.blocks.filter((item) => item.id !== id),
    }));
    setSelectedBlockId((current) => (current === id ? null : current));
    setMenu(null);
  }

  function removePlant(id: string) {
    update((current) => ({
      ...current,
      placements: current.placements.filter((item) => item.id !== id),
    }));
    setSelectedPlacementId((current) => (current === id ? null : current));
    setMenu(null);
  }

  function removePlantsOf(plantId: string, bedId?: string) {
    update((current) => ({
      ...current,
      placements: current.placements.filter((item) => {
        if (item.plantId !== plantId) return true;
        return bedId != null && item.bedId !== bedId;
      }),
    }));
    setSelectedPlacementId((current) => {
      const selected = garden.placements.find((item) => item.id === current);
      if (!selected || selected.plantId !== plantId) return current;
      if (bedId != null && selected.bedId !== bedId) return current;
      return null;
    });
    setMenu(null);
  }
}

const BED_COLOURS = [
  { name: "Soil", value: "#a67c52" },
  { name: "Mulch", value: "#6b4a32" },
  { name: "Sand", value: "#d2c2a4" },
  { name: "Gravel", value: "#b7b1a6" },
  { name: "Slate", value: "#6d7c86" },
  { name: "Terracotta", value: "#c4654a" },
  { name: "Lawn", value: "#6f8f5a" },
  { name: "Moss", value: "#3f6b4a" },
] as const;

function bedColour(color: string | undefined): string {
  return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : "#a67c52";
}

function BedColours({ color, onColour }: { color?: string; onColour: (color: string) => void }) {
  const current = bedColour(color);
  return (
    <div>
      <p className="text-xs text-ink/60">Colour</p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {BED_COLOURS.map((swatch) => (
          <button
            key={swatch.value}
            className={`h-6 w-6 rounded-full border shadow ${current === swatch.value ? "border-ink ring-2 ring-ink/25" : "border-white"}`}
            style={{ background: swatch.value }}
            type="button"
            aria-label={swatch.name}
            aria-pressed={current === swatch.value}
            onClick={() => onColour(swatch.value)}
          />
        ))}
        <input
          className="h-6 w-6 cursor-pointer rounded-full border border-line bg-transparent"
          type="color"
          aria-label="Custom bed colour"
          value={current}
          onChange={(event) => onColour(event.target.value)}
        />
      </div>
    </div>
  );
}

function groupPlantings(placements: { plantId: string }[]) {
  const groups = new Map<
    string,
    { plant: NonNullable<ReturnType<typeof getPlant>>; count: number }
  >();
  for (const placement of placements) {
    const plant = getPlant(placement.plantId);
    if (!plant) continue;
    const existing = groups.get(plant.id);
    if (existing) existing.count += 1;
    else groups.set(plant.id, { plant, count: 1 });
  }
  return [...groups.values()].sort((a, b) => a.plant.commonName.localeCompare(b.plant.commonName));
}

function PlantedGroups({
  groups,
  month,
  scope,
  onRemove,
}: {
  groups: ReturnType<typeof groupPlantings>;
  month: number;
  scope?: string;
  onRemove: (plantId: string) => void;
}) {
  return (
    <ul className="mt-2 space-y-1 text-sm">
      {groups.map(({ plant, count }) => {
        const look = plant.months[month];
        const action = count === 1 ? "Remove" : "Remove all";
        return (
          <li key={plant.id} className="flex items-center justify-between gap-2">
            <span>
              {plant.commonName}
              <span className="text-ink/60"> · {count}</span>
              <span className="block text-xs text-ink/60">
                {look?.flower ? look.flower : look?.foliage ? "In leaf" : "Dormant"}
                {look?.scent ? " · scented" : ""}
              </span>
            </span>
            <button
              className="shrink-0 text-xs text-clay"
              type="button"
              aria-label={
                scope
                  ? `${action} ${plant.commonName} from ${scope}`
                  : `${action} ${plant.commonName}`
              }
              onClick={() => onRemove(plant.id)}
            >
              {action}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function copyName(name: string, existing: string[]): string {
  const base = name.replace(/ copy(?: \d+)?$/, "");
  let next = `${base} copy`;
  let count = 2;
  while (existing.includes(next)) {
    next = `${base} copy ${count}`;
    count += 1;
  }
  return next;
}

function ShapeMenu({
  menu,
  bed,
  block,
  plantName,
  plantCount,
  onRename,
  onColour,
  onDuplicateBed,
  onDeleteBed,
  onDuplicateBlock,
  onDeleteBlock,
  onRemovePlant,
}: {
  menu: ShapeMenu;
  bed: { name: string; color?: string } | null;
  block: { label?: string; source: "osm" | "user" } | null;
  plantName: string | null;
  plantCount: number;
  onRename: (name: string) => void;
  onColour: (color: string) => void;
  onDuplicateBed: () => void;
  onDeleteBed: () => void;
  onDuplicateBlock: () => void;
  onDeleteBlock: () => void;
  onRemovePlant: () => void;
}) {
  const itemClass = "block w-full px-3 py-1.5 text-left hover:bg-paper";
  return (
    <div
      className="fixed z-30 w-52 rounded-md border border-line bg-card py-1 text-sm shadow-lg"
      style={{ left: menu.x, top: menu.y }}
      data-shape-menu=""
      onContextMenu={(event) => event.preventDefault()}
    >
      {menu.kind === "bed" && bed ? (
        <>
          <label className="block px-3 py-1.5">
            <span className="text-xs text-ink/60">Name</span>
            <input
              className="mt-1 w-full rounded-md border border-line bg-paper px-2 py-1 text-sm outline-none focus:border-leaf"
              defaultValue={bed.name}
              aria-label="Bed name"
              onChange={(event) => onRename(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
            />
          </label>
          <div className="px-3 py-1.5">
            <BedColours color={bed.color} onColour={onColour} />
          </div>
          <button className={itemClass} type="button" onClick={onDuplicateBed}>
            Duplicate
          </button>
          <button className={`${itemClass} text-clay`} type="button" onClick={onDeleteBed}>
            {plantCount > 0 ? "Delete bed and plants" : "Delete bed"}
          </button>
        </>
      ) : null}
      {menu.kind === "block" && block ? (
        <>
          <p className="px-3 py-1.5 text-xs text-ink/60">
            {block.label ?? (block.source === "osm" ? "Building" : "Shade block")}
          </p>
          <button className={itemClass} type="button" onClick={onDuplicateBlock}>
            Duplicate
          </button>
          <button className={`${itemClass} text-clay`} type="button" onClick={onDeleteBlock}>
            Delete block
          </button>
        </>
      ) : null}
      {menu.kind === "plant" && plantName ? (
        <>
          <p className="px-3 py-1.5 text-xs text-ink/60">{plantName}</p>
          <button className={`${itemClass} text-clay`} type="button" onClick={onRemovePlant}>
            Remove plant
          </button>
        </>
      ) : null}
    </div>
  );
}

/** A guide from Move out to Turn or Size, stopping short of both buttons. */
function HandleStem({
  from,
  to,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const room = Math.max(length - 6, 0);
  const start = Math.min(15, room * 0.4);
  const end = Math.min(15, room * 0.4);
  return (
    <line
      x1={from.x + (dx / length) * start}
      y1={from.y + (dy / length) * start}
      x2={to.x - (dx / length) * end}
      y2={to.y - (dy / length) * end}
      stroke="#1c2822"
      strokeOpacity="0.45"
      strokeWidth="1.25"
      strokeDasharray="1.5 3"
      strokeLinecap="round"
    />
  );
}

function BedHandle({
  label,
  at,
  kind,
  toPoint,
  adjust,
}: {
  label: string;
  at: { x: number; y: number };
  kind: "rotate" | "scale" | "move";
  toPoint: { current: (clientX: number, clientY: number) => Point | null };
  adjust: (kind: "rotate" | "scale" | "move", point: Point, phase: "down" | "move" | "up") => void;
}) {
  function atEvent(event: { clientX: number; clientY: number }, phase: "down" | "move" | "up") {
    const point = toPoint.current(event.clientX, event.clientY);
    if (point) adjust(kind, point, phase);
  }
  return (
    <button
      className="group absolute z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border border-white bg-leaf text-white shadow active:cursor-grabbing"
      style={{ left: at.x, top: at.y }}
      type="button"
      aria-label={label}
      onPointerDown={(event) => {
        event.stopPropagation();
        event.preventDefault();
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // The gesture still follows the pointer through move and release.
        }
        atEvent(event, "down");
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        atEvent(event, "move");
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        atEvent(event, "up");
      }}
    >
      <HandleIcon kind={kind} />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-paper opacity-0 shadow group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}

function HandleIcon({ kind }: { kind: "rotate" | "scale" | "move" }) {
  const stroke = {
    viewBox: "0 0 16 16",
    className: "h-3.5 w-3.5",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (kind === "move") {
    return (
      <svg {...stroke}>
        <path d="M8 1.75v12.5M1.75 8h12.5" />
        <path d="m5.5 4.25 2.5-2.5 2.5 2.5M5.5 11.75 8 14.25l2.5-2.5M4.25 5.5 1.75 8l2.5 2.5M11.75 5.5 14.25 8l-2.5 2.5" />
      </svg>
    );
  }
  if (kind === "rotate") {
    return (
      <svg {...stroke}>
        <path d="M12.75 6.25a4.75 4.75 0 1 0 .4 4.4" />
        <path d="M12.75 2.75v3.5h-3.5" />
      </svg>
    );
  }
  return (
    <svg {...stroke}>
      <path d="M9.25 2.75h4v4M6.75 13.25h-4v-4" />
      <path d="m13.25 2.75-4.5 4.5M2.75 13.25l4.5-4.5" />
    </svg>
  );
}

function ToolButton({
  current,
  tool,
  onClick,
  title,
  compact = false,
  children,
}: {
  current: Tool;
  tool: Tool;
  onClick: (tool: Tool) => void;
  title?: string;
  compact?: boolean;
  children: string;
}) {
  const selected = current === tool;
  const className = compact
    ? selected
      ? "inline-flex min-h-8 items-center gap-1 rounded-full bg-leaf px-2 py-1 text-[11px] text-white hover:bg-leaf-dark"
      : "inline-flex min-h-8 items-center gap-1 rounded-full border border-line bg-card px-2 py-1 text-[11px] text-ink hover:border-leaf"
    : selected
      ? buttonClass
      : quietButtonClass;
  return (
    <button className={className} type="button" title={title} onClick={() => onClick(tool)}>
      {compact ? <DrawToolIcon tool={tool} /> : null}
      {children}
    </button>
  );
}

function DrawToolIcon({ tool }: { tool: Tool }) {
  const stroke = {
    viewBox: "0 0 16 16",
    className: "h-3.5 w-3.5 shrink-0",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (tool === "select") {
    return (
      <svg {...stroke}>
        <path d="M4 2.25v9.2l2.15-2.35 2.05 4.15 1.7-.85-2.05-4.1H12Z" />
      </svg>
    );
  }
  if (tool === "rect") {
    return (
      <svg {...stroke}>
        <rect x="2.75" y="4.25" width="10.5" height="7.5" rx="0.5" />
      </svg>
    );
  }
  if (tool === "angled") {
    return (
      <svg {...stroke}>
        <path d="M5.25 3.75h8L10.75 12.25h-8Z" />
      </svg>
    );
  }
  if (tool === "freeform") {
    return (
      <svg {...stroke}>
        <path d="M3 8.25c1.4-3.4 3.4-4.6 5.2-3.2 1.6 1.2.8 3.2 2.6 3.5 1.5.2 2.3-1.5 2.7-2.3" />
        <path d="M3 8.25c.3 3.3 2.4 4.8 4.6 4 1.8-.6 2.2-2.2 4-2" />
      </svg>
    );
  }
  if (tool === "bed") {
    return (
      <svg {...stroke}>
        <path d="M3.25 11.25 6.5 3.5 13 6.25 10.25 12.75Z" />
        <circle cx="3.25" cy="11.25" r="1" fill="currentColor" stroke="none" />
        <circle cx="6.5" cy="3.5" r="1" fill="currentColor" stroke="none" />
        <circle cx="13" cy="6.25" r="1" fill="currentColor" stroke="none" />
        <circle cx="10.25" cy="12.75" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg {...stroke}>
      <path d="M2.75 5.75h7.5v7.5h-7.5Z" />
      <path d="M5.75 3.25h7.5v7.5" />
    </svg>
  );
}

function resolvedLight(
  bed: Garden["beds"][number],
  samples: ReturnType<typeof midsummerSamples>,
  blocks: ShadeBlock[],
) {
  const stats = bedSun(bed.points, samples, blocks);
  return { ...stats, light: bed.lightOverride ?? stats.light };
}

function bedSize(points: Point[]): string {
  const sides = rectangleSize(points);
  if (sides) return formatSize(sides.width, sides.depth);
  const size = spanSize(points);
  return formatSize(size.width, size.depth);
}

function drawingPreview(
  tool: Tool,
  preset: { width: number; depth: number } | null,
  draft: Point[],
  cursor: Point | null,
  rectStart: Point | null,
  edgeEnd: Point | null,
  placeAnchor: Point | null,
  blockDraft: ShadeBlock | null,
): {
  preview: Point[] | null;
  closed: boolean;
  measure: { text: string; at: Point } | null;
} {
  if (tool === "place" && preset && cursor) {
    const origin = placeAnchor ?? snapPoint(cursor);
    const angle = presetAngle(placeAnchor, cursor);
    const preview = rotatedRectangle(origin, preset.width, preset.depth, angle);
    return {
      preview,
      closed: true,
      measure: {
        text: `${formatSize(preset.width, preset.depth)} · ${formatBearing(angle)}`,
        at: centroid(preview),
      },
    };
  }
  if (tool === "angled" && rectStart) {
    if (!edgeEnd) {
      if (!cursor) return { preview: [rectStart], closed: false, measure: null };
      const edge = snappedEdge(rectStart, cursor);
      if (!edge) return { preview: [rectStart], closed: false, measure: null };
      return {
        preview: [rectStart, edge.end],
        closed: false,
        measure: {
          text: `${formatMetres(edge.length)} m · ${formatBearing(edge.angle)}`,
          at: edge.end,
        },
      };
    }
    const rect = cursor ? angledRectangle(rectStart, edgeEnd, cursor) : null;
    if (!rect) {
      return {
        preview: [rectStart, edgeEnd],
        closed: false,
        measure: {
          text: `${formatMetres(distance(rectStart, edgeEnd))} m · ${formatBearing(Math.atan2(edgeEnd.y - rectStart.y, edgeEnd.x - rectStart.x))}`,
          at: edgeEnd,
        },
      };
    }
    return {
      preview: rect.points,
      closed: true,
      measure: {
        text: `${formatMetres(rect.depth)} × ${formatMetres(rect.width)} m · ${formatBearing(rect.angle)}`,
        at: centroid(rect.points),
      },
    };
  }
  if (tool === "freeform" && draft.length > 1) {
    const size = spanSize(draft);
    const at = cursor ?? draft[draft.length - 1] ?? { x: 0, y: 0 };
    return {
      preview: draft,
      closed: false,
      measure: { text: formatSize(size.width, size.depth), at },
    };
  }
  if (tool === "rect" && rectStart && cursor) {
    const preview = rectanglePoints(rectStart, cursor);
    const size = spanSize(preview);
    return {
      preview,
      closed: true,
      measure: {
        text: formatSize(size.width, size.depth),
        at: centroid(preview),
      },
    };
  }
  if (tool === "bed" && cursor && draft.length > 0) {
    const last = draft[draft.length - 1];
    const preview = [...draft, cursor];
    const edge = last ? distance(last, cursor) : 0;
    const size = spanSize(preview);
    const text =
      draft.length >= 2
        ? `${formatSize(size.width, size.depth)} · edge ${formatMetres(edge)} m`
        : `Edge ${formatMetres(edge)} m`;
    return { preview, closed: false, measure: { text, at: cursor } };
  }
  if (tool === "block" && blockDraft && (blockDraft.width > 0 || blockDraft.depth > 0)) {
    const ends = blockDraft.line ? lineEnds(blockDraft) : null;
    return {
      preview: null,
      closed: false,
      measure: {
        text: blockDraft.line
          ? `${formatMetres(blockDraft.width)} m long`
          : formatSize(blockDraft.width, blockDraft.depth),
        at: ends?.[1] ?? { x: blockDraft.x, y: blockDraft.y },
      },
    };
  }
  return { preview: null, closed: false, measure: null };
}

function presetAngle(anchor: Point | null, cursor: Point): number {
  if (!anchor || distance(anchor, cursor) < 0.35) return Math.PI / 2;
  return snapAngle(Math.atan2(cursor.y - anchor.y, cursor.x - anchor.x));
}

function presetIsLine(preset: (typeof SHADE_PRESETS)[number]): boolean {
  return "line" in preset && preset.line;
}

function madeShade(
  preset: (typeof SHADE_PRESETS)[number],
  center: Point,
  rotation: number,
  id: string,
  length?: number,
): ShadeBlock {
  return {
    id,
    x: center.x,
    y: center.y,
    width: length ?? preset.width,
    depth: preset.depth,
    height: preset.height,
    rotation,
    line: presetIsLine(preset) || undefined,
    source: "user",
    label: preset.label,
  };
}

/** A fence or hedge runs from the first point to the dragged point, at a fixed width. */
function linePlacement(
  origin: Point,
  raw: Point,
  boundary: Point[] | null,
  threshold: number,
): { center: Point; rotation: number; length: number } {
  const end =
    distance(origin, raw) < 0.35
      ? { x: origin.x + 0.5, y: origin.y }
      : snapToOutline(raw, boundary, threshold);
  const length = Math.max(distance(origin, end), 0.5);
  const rotation = Math.atan2(end.y - origin.y, end.x - origin.x);
  return {
    center: {
      x: origin.x + (Math.cos(rotation) * length) / 2,
      y: origin.y + (Math.sin(rotation) * length) / 2,
    },
    rotation,
    length,
  };
}

function blockBetween(id: string, start: Point, end: Point): ShadeBlock {
  const points = rectanglePoints(start, end);
  const size = spanSize(points);
  const centre = centroid(points);
  return {
    id,
    x: centre.x,
    y: centre.y,
    width: size.width,
    depth: size.depth,
    height: 6,
    source: "user",
    label: "Shade block",
  };
}
