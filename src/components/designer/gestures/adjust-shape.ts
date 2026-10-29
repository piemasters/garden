import {
  blockCorners,
  blockFromCorners,
  centroid,
  distance,
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
  kind: "rotate" | "scale" | "move",
  raw: Point,
  phase: "down" | "move" | "up",
) {
  if (session.view !== "plan") return;
  if (phase === "down") {
    const block = blockUnder(session.garden, session.selectedBlockId, raw);
    const bed = bedUnder(session.garden, session.selectedBedId, raw);
    const selectedBlock = session.garden.blocks.find((item) => item.id === session.selectedBlockId);
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
        .map((item) => ({ id: item.id, x: item.x, y: item.y })),
      baseBlock: null,
      preview: null,
    };
    return;
  }
  const gesture = session.adjustRef.current;
  if (!gesture) return;
  const preview = attachBlock(session, gesture, previewAdjust(session.units, gesture, raw));
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
