import {
  blockCorners,
  blockFromCorners,
  centroid,
  distance,
  lineEnds,
  stretchedLine,
  formatTurn,
  pointInBlock,
  pointInPolygon,
  polygonArea,
  rectangleSize,
  rotatePoints,
  scalePoints,
  snapLineToOutline,
  snapOffset,
  spanSize,
  translatePoints,
  MAP_FILL_CAP,
  fillPoints,
  planFill,
  plantingSpacing,
  snapAngle,
  snapScale,
} from "#/domain/geometry";
import type { Garden, Point } from "#/domain/types";
import type { AdjustGesture, AdjustPreview } from "../tools";
import type { DrawSession } from "./draw-session";

function bedUnder(garden: Garden, selectedBedId: string | null, point: Point) {
  const hits = garden.beds.filter((bed) => pointInPolygon(point, bed.points));
  return (
    hits.find((bed) => bed.id === selectedBedId) ??
    hits.sort((a, b) => polygonArea(a.points) - polygonArea(b.points))[0]
  );
}

export function blockUnder(garden: Garden, selectedBlockId: string | null, point: Point) {
  const hits = garden.blocks.filter((block) => pointInBlock(point, block));
  return (
    hits.find((block) => block.id === selectedBlockId) ??
    hits.sort((a, b) => a.width * a.depth - b.width * b.depth)[0]
  );
}

export function outlineSnapMetres(scale: DrawSession["scale"]): number {
  if (!scale || scale.pixels <= 0) return 1.25;
  return Math.min(4, Math.max(0.35, (scale.metres / scale.pixels) * 16));
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

function previewAdjust(
  units: DrawSession["units"],
  gesture: AdjustGesture,
  raw: Point,
): AdjustPreview {
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
      label: units.move(by),
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
    label: `${units.size(sides.width, sides.depth)} · ${Math.round(factor * 100)}%`,
    changed: factor !== 1,
    block: null,
  };
}

function attachBlock(
  session: DrawSession,
  gesture: AdjustGesture,
  preview: AdjustPreview,
): AdjustPreview {
  if (gesture.target !== "block" || !gesture.baseBlock) return preview;
  const block = snapLineToOutline(
    blockFromCorners(gesture.baseBlock, preview.points),
    session.garden.boundary,
    outlineSnapMetres(session.scale),
  );
  return {
    ...preview,
    block,
    label:
      gesture.kind === "scale" && block.line
        ? `${session.units.length(block.width)} long`
        : preview.label,
  };
}

export function adjustShape(
  session: DrawSession,
  kind: "rotate" | "scale" | "move" | "stretch",
  raw: Point,
  phase: "down" | "move" | "up",
  endIndex?: 0 | 1,
  /** The canvas handles belong to the current selection, even when they overlap another shape. */
  fromHandle = false,
) {
  if (session.view !== "plan") return;
  if (phase === "down") {
    if (kind === "stretch") {
      beginStretch(session, raw, endIndex);
      return;
    }
    const selectedBlock = session.garden.blocks.find((item) => item.id === session.selectedBlockId);
    const block = fromHandle
      ? selectedBlock
      : blockUnder(session.garden, session.selectedBlockId, raw);
    const bed = fromHandle ? undefined : bedUnder(session.garden, session.selectedBedId, raw);
    if (block) {
      const center = { x: block.x, y: block.y };
      if (kind === "scale" && distance(raw, center) < 0.4) {
        session.setSelectedBlockId(block.id);
        session.setDrawNote("Drag from the edge of the shade, away from the middle.");
        return;
      }
      session.setDrawNote(null);
      session.setSelectedBlockId(block.id);
      session.adjustRef.current = {
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
        session.setDrawNote("Drag from the edge of the shade, away from the middle.");
        return;
      }
      session.setDrawNote(null);
      session.adjustRef.current = {
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
    const chosenBed = bed ?? session.garden.beds.find((item) => item.id === session.selectedBedId);
    if (!chosenBed) {
      session.setDrawNote("Select a bed or shade block, then drag it.");
      return;
    }
    const center = centroid(chosenBed.points);
    if (kind === "scale" && distance(raw, center) < 0.4) {
      session.setSelectedBedId(chosenBed.id);
      session.setSelectedBlockId(null);
      session.setDrawNote("Drag from the edge of the bed, away from the middle.");
      return;
    }
    session.setDrawNote(null);
    session.setSelectedBedId(chosenBed.id);
    session.setSelectedBlockId(null);
    session.adjustRef.current = {
      kind,
      target: "bed",
      bedId: chosenBed.id,
      center,
      origin: raw,
      startAngle: Math.atan2(raw.y - center.y, raw.x - center.x),
      startDistance: Math.max(distance(raw, center), 0.4),
      basePoints: chosenBed.points,
      basePlacements: session.garden.placements
        .filter((item) => item.bedId === chosenBed.id)
        .map((item) => ({
          id: item.id,
          x: item.x,
          y: item.y,
          plantId: item.plantId,
          fill: item.fill,
          count: item.count,
          spacing: item.spacing,
        })),
      baseBlock: null,
      preview: null,
    };
    return;
  }
  const gesture = session.adjustRef.current;
  if (!gesture) return;
  if (gesture.kind === "stretch" && phase === "up" && !gesture.preview) {
    session.adjustRef.current = null;
    session.setAdjust(null);
    return;
  }
  const preview =
    gesture.kind === "stretch"
      ? stretchPreview(session, gesture, raw)
      : reflowScaledFill(
          session,
          gesture,
          attachBlock(session, gesture, previewAdjust(session.units, gesture, raw)),
        );
  if (phase === "move") {
    gesture.preview = preview;
    session.setAdjust(preview);
    return;
  }
  session.adjustRef.current = null;
  session.setAdjust(null);
  if (!preview.changed) return;
  if (gesture.target === "block" && preview.block) {
    const nextBlock = preview.block;
    session.update((current) => ({
      ...current,
      blocks: current.blocks.map((item) => (item.id === nextBlock.id ? nextBlock : item)),
    }));
    return;
  }
  if (preview.replacePlacements) {
    const kept = new Set(preview.placements.map((item) => item.id));
    session.setSelectedPlacementId((current) => {
      if (!current) return null;
      const startedHere = gesture.basePlacements.some((item) => item.id === current);
      if (!startedHere) return current;
      return kept.has(current) ? current : null;
    });
    session.update((current) => ({
      ...current,
      beds: current.beds.map((item) =>
        item.id === preview.bedId ? { ...item, points: preview.points } : item,
      ),
      placements: [
        ...current.placements.filter((item) => item.bedId !== preview.bedId),
        ...preview.placements.flatMap((item) => {
          const plantId =
            item.plantId ??
            current.placements.find((placement) => placement.id === item.id)?.plantId;
          if (!plantId) return [];
          return [
            {
              id: item.id,
              plantId,
              bedId: preview.bedId,
              x: item.x,
              y: item.y,
              fill: item.fill,
              count: item.count,
              spacing: item.spacing,
            },
          ];
        }),
      ],
    }));
    return;
  }
  session.update((current) => ({
    ...current,
    beds: current.beds.map((item) =>
      item.id === preview.bedId ? { ...item, points: preview.points } : item,
    ),
    placements: current.placements.map((item) => {
      const moved = preview.placements.find((placement) => placement.id === item.id);
      return moved ? { ...item, x: moved.x, y: moved.y } : item;
    }),
  }));
}

function beginStretch(session: DrawSession, raw: Point, endIndex?: 0 | 1) {
  const selected = session.garden.blocks.find((item) => item.id === session.selectedBlockId);
  const block = selected?.line
    ? selected
    : blockUnder(session.garden, session.selectedBlockId, raw);
  if (!block?.line) {
    session.setDrawNote("Select a hedge or fence, then drag an end.");
    return;
  }
  const ends = lineEnds(block);
  const index = endIndex ?? (distance(raw, ends[0]) <= distance(raw, ends[1]) ? 0 : 1);
  const anchor = ends[index === 0 ? 1 : 0];
  session.setDrawNote(null);
  session.setSelectedBlockId(block.id);
  session.adjustRef.current = {
    kind: "stretch",
    target: "block",
    bedId: block.id,
    center: { x: block.x, y: block.y },
    origin: ends[index],
    anchor,
    startAngle: block.rotation ?? 0,
    startDistance: Math.max(block.width, 0.5),
    basePoints: blockCorners(block),
    basePlacements: [],
    baseBlock: block,
    preview: null,
  };
}

function stretchPreview(session: DrawSession, gesture: AdjustGesture, raw: Point): AdjustPreview {
  const base = gesture.baseBlock;
  const anchor = gesture.anchor;
  if (!base || !anchor) {
    return {
      bedId: gesture.bedId,
      points: gesture.basePoints,
      placements: [],
      label: "",
      changed: false,
      block: base,
    };
  }
  const block = stretchedLine(
    base,
    anchor,
    raw,
    session.garden.boundary,
    outlineSnapMetres(session.scale),
  );
  return {
    bedId: gesture.bedId,
    points: blockCorners(block),
    placements: [],
    label: `${session.units.length(block.width)} long`,
    changed:
      Math.abs(block.width - base.width) > 0.001 ||
      Math.abs((block.rotation ?? 0) - (base.rotation ?? 0)) > 0.001 ||
      Math.abs(block.x - base.x) > 0.001 ||
      Math.abs(block.y - base.y) > 0.001,
    block,
  };
}

function reflowScaledFill(
  session: DrawSession,
  gesture: AdjustGesture,
  preview: AdjustPreview,
): AdjustPreview {
  if (gesture.kind !== "scale" || gesture.target !== "bed") return preview;
  const filled = gesture.basePlacements.filter((item) => item.fill && item.plantId);
  if (filled.length === 0) return preview;
  const manual = gesture.basePlacements.filter((item) => !item.fill);
  const placed = new Map(preview.placements.map((item) => [item.id, item]));
  const occupied = manual.flatMap((item) => {
    const at = placed.get(item.id);
    if (!at || !item.plantId) return [];
    const plant = session.plantsById.get(item.plantId);
    return [{ x: at.x, y: at.y, spacing: plant ? plantingSpacing(plant.spreadM) : 0.3 }];
  });
  const groups: { plantId: string; spacing: number }[] = [];
  for (const item of filled) {
    if (!item.plantId || groups.some((group) => group.plantId === item.plantId)) continue;
    const plant = session.plantsById.get(item.plantId);
    if (!plant) continue;
    groups.push({ plantId: item.plantId, spacing: plantingSpacing(plant.spreadM) });
  }
  const spots = groups.flatMap((group, groupIndex) => {
    const plan = planFill(preview.points, group.spacing, occupied);
    if (plan.count > MAP_FILL_CAP) {
      const id = idsForFill(gesture, group.plantId, 1)[0];
      const anchor = plan.points[0];
      if (groupIndex < groups.length - 1) {
        for (const spot of fillPoints(preview.points, group.spacing, occupied)) {
          occupied.push({ x: spot.x, y: spot.y, spacing: group.spacing });
        }
      }
      return id && anchor
        ? [
            {
              id,
              plantId: group.plantId,
              x: anchor.x,
              y: anchor.y,
              fill: true as const,
              count: plan.count,
              spacing: group.spacing,
            },
          ]
        : [];
    }
    const ids = idsForFill(gesture, group.plantId, plan.points.length);
    return plan.points.flatMap((spot, index) => {
      const id = ids[index];
      if (!id) return [];
      occupied.push({ x: spot.x, y: spot.y, spacing: group.spacing });
      return [{ id, plantId: group.plantId, x: spot.x, y: spot.y, fill: true as const }];
    });
  });
  const kept = [
    ...manual,
    ...filled.filter(
      (item) => item.plantId && !groups.some((group) => group.plantId === item.plantId),
    ),
  ].flatMap((item) => {
    const at = placed.get(item.id);
    return at ? [{ ...item, x: at.x, y: at.y }] : [];
  });
  return { ...preview, replacePlacements: true, placements: [...kept, ...spots] };
}

function idsForFill(gesture: AdjustGesture, plantId: string, count: number): string[] {
  const owned = gesture.basePlacements
    .filter((item) => item.fill && item.plantId === plantId)
    .map((item) => item.id);
  const spare = gesture.spareFillIds ?? {};
  const extra = spare[plantId] ?? [];
  while (owned.length + extra.length < count) extra.push(crypto.randomUUID());
  spare[plantId] = extra;
  gesture.spareFillIds = spare;
  return [...owned, ...extra].slice(0, count);
}
