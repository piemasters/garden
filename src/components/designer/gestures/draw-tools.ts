import {
  angledRectangle,
  distance,
  finishedStroke,
  pointInPolygon,
  rectanglePoints,
  rotatedRectangle,
  snapAngle,
  snappedEdge,
  snapPoint,
  snapToOutline,
  spanSize,
} from "#/domain/geometry";
import type { Point } from "#/domain/types";
import { blockBetween, linePlacement, madeShade, presetIsLine } from "../drawing";
import { adjustShape, blockUnder, outlineSnapMetres } from "./adjust-shape";
import type { DrawSession } from "./draw-session";

function drawFreeform(session: DrawSession, raw: Point, phase: "down" | "move" | "up") {
  const point = snapPoint(raw, 0.05);
  if (phase === "down") {
    session.strokeRef.current = [point];
    session.setDraft([point]);
    session.setCursor(point);
    session.setDrawNote(null);
    return;
  }
  if (phase === "move") {
    session.setCursor(point);
    if (session.strokeRef.current.length === 0) return;
    const last = session.strokeRef.current[session.strokeRef.current.length - 1];
    if (!last || distance(last, point) >= 0.12) {
      session.strokeRef.current = [...session.strokeRef.current, point];
      session.setDraft(session.strokeRef.current);
    }
    return;
  }
  if (session.strokeRef.current.length === 0) return;
  const shape = finishedStroke(session.strokeRef.current);
  session.strokeRef.current = [];
  session.setDraft([]);
  session.setCursor(null);
  if (!shape) {
    session.setDrawNote("That outline was too small. Draw around the whole bed, then release.");
    return;
  }
  session.addBed(shape);
}

function drawAngled(session: DrawSession, raw: Point, phase: "down" | "move" | "up") {
  if (phase === "move") {
    session.setCursor(raw);
    return;
  }
  if (phase !== "down") return;
  const gesture = session.angledRef.current;
  if (!gesture.origin) {
    const origin = snapPoint(raw);
    gesture.origin = origin;
    gesture.end = null;
    session.setRectStart(origin);
    session.setEdgeEnd(null);
    session.setCursor(origin);
    return;
  }
  if (!gesture.end) {
    const edge = snappedEdge(gesture.origin, raw);
    if (!edge) return;
    gesture.end = edge.end;
    session.setEdgeEnd(edge.end);
    session.setCursor(edge.end);
    return;
  }
  const rect = angledRectangle(gesture.origin, gesture.end, raw);
  if (!rect) return;
  session.addBed(rect.points);
  gesture.origin = null;
  gesture.end = null;
  session.setRectStart(null);
  session.setEdgeEnd(null);
  session.setCursor(null);
}

function drawPreset(session: DrawSession, raw: Point, phase: "down" | "move" | "up") {
  if (!session.preset) return;
  if (phase === "down") {
    const origin = snapPoint(raw);
    session.placeAnchorRef.current = origin;
    session.setPlaceAnchor(origin);
    session.setCursor(origin);
    return;
  }
  if (phase === "move") {
    session.setCursor(session.placeAnchorRef.current ? raw : snapPoint(raw));
    return;
  }
  const origin = session.placeAnchorRef.current;
  if (!origin) return;
  const dragged = distance(origin, raw);
  const angle =
    dragged < 0.35 ? Math.PI / 2 : snapAngle(Math.atan2(raw.y - origin.y, raw.x - origin.x));
  session.addBed(rotatedRectangle(origin, session.preset.width, session.preset.depth, angle));
  session.placeAnchorRef.current = null;
  session.setPlaceAnchor(null);
  session.setCursor(null);
}

function placeShade(session: DrawSession, raw: Point, phase: "down" | "move" | "up") {
  if (!session.shadePreset) return;
  const snap = outlineSnapMetres(session.scale);
  if (phase === "down") {
    const origin = presetIsLine(session.shadePreset)
      ? snapToOutline(raw, session.garden.boundary, snap)
      : snapPoint(raw);
    session.blockId.current = crypto.randomUUID();
    session.placeAnchorRef.current = origin;
    session.setPlaceAnchor(origin);
    if (presetIsLine(session.shadePreset)) {
      const laid = linePlacement(origin, origin, session.garden.boundary, snap);
      session.setBlockDraft(
        madeShade(
          session.shadePreset,
          laid.center,
          laid.rotation,
          session.blockId.current,
          laid.length,
        ),
      );
    } else {
      session.setBlockDraft(madeShade(session.shadePreset, origin, 0, session.blockId.current));
    }
    return;
  }
  const origin = session.placeAnchorRef.current;
  if (!origin) return;
  const dragged = distance(origin, raw);
  const rotation = dragged < 0.35 ? 0 : snapAngle(Math.atan2(raw.y - origin.y, raw.x - origin.x));
  const laid = presetIsLine(session.shadePreset)
    ? linePlacement(origin, raw, session.garden.boundary, snap)
    : null;
  const center = laid?.center ?? origin;
  const angle = laid?.rotation ?? rotation;
  const length = laid?.length;
  if (phase === "move") {
    session.setBlockDraft(
      madeShade(session.shadePreset, center, angle, session.blockId.current, length),
    );
    session.setCursor(raw);
    return;
  }
  const block = madeShade(session.shadePreset, center, angle, session.blockId.current, length);
  session.update((current) => ({ ...current, blocks: [...current.blocks, block] }));
  session.setSelectedBlockId(block.id);
  session.setShadePreset(null);
  session.setTool("select");
  session.resetGesture();
}

export function handleSurface(session: DrawSession, raw: Point, phase: "down" | "move" | "up") {
  if (session.tool === "rotate" || session.tool === "scale" || session.tool === "move") {
    adjustShape(session, session.tool, raw, phase);
    return;
  }
  if (session.tool === "freeform") {
    drawFreeform(session, raw, phase);
    return;
  }
  if (session.tool === "angled") {
    drawAngled(session, raw, phase);
    return;
  }
  if (session.tool === "place" && session.preset) {
    drawPreset(session, raw, phase);
    return;
  }
  const point = session.tool === "select" ? raw : snapPoint(raw);
  if (phase === "move") {
    if (session.tool === "block" && session.shadePreset) {
      placeShade(session, raw, "move");
      return;
    }
    session.setCursor(point);
    if (session.tool === "block" && session.blockStart) {
      session.setBlockDraft(blockBetween(session.blockId.current, session.blockStart, point));
    }
    return;
  }
  if (session.tool === "bed" && phase === "down") {
    const first = session.draft[0];
    const last = session.draft[session.draft.length - 1];
    if (first && session.draft.length >= 3 && distance(point, first) < 0.25) {
      session.addBed(session.draft);
      session.setTool("select");
      session.setCursor(null);
      return;
    }
    if (last && distance(point, last) < 0.01) return;
    session.setDraft((points) => [...points, point]);
    return;
  }
  if (session.tool === "rect") {
    if (phase === "down") {
      session.setRectStart(point);
      return;
    }
    if (phase === "up" && session.rectStart) {
      const points = rectanglePoints(session.rectStart, point);
      const size = spanSize(points);
      if (size.width >= 0.5 && size.depth >= 0.5) session.addBed(points);
      session.setRectStart(null);
    }
    return;
  }
  if (session.tool === "block") {
    if (session.shadePreset) {
      placeShade(session, raw, phase);
      return;
    }
    if (phase === "down") {
      session.blockId.current = crypto.randomUUID();
      session.setBlockStart(point);
      session.setBlockDraft(blockBetween(session.blockId.current, point, point));
      return;
    }
    if (phase === "up" && session.blockStart) {
      const block = blockBetween(session.blockId.current, session.blockStart, point);
      if (block.width >= 0.5 && block.depth >= 0.5) {
        session.update((current) => ({
          ...current,
          blocks: [...current.blocks, block],
        }));
        session.setSelectedBlockId(block.id);
      }
      session.setBlockStart(null);
      session.setBlockDraft(null);
      session.setTool("select");
    }
    return;
  }
  if (phase !== "down") return;
  const shade = blockUnder(session.garden, session.selectedBlockId, point);
  if (shade) {
    session.setSelectedBlockId(shade.id);
    session.setSelectedPlacementId(null);
    return;
  }
  const bed = session.garden.beds.find((item) => pointInPolygon(point, item.points));
  if (session.armedPlantId && bed) {
    const placement = {
      id: crypto.randomUUID(),
      plantId: session.armedPlantId,
      bedId: bed.id,
      x: point.x,
      y: point.y,
    };
    session.update((current) => ({
      ...current,
      placements: [...current.placements, placement],
    }));
    session.setSelectedBedId(bed.id);
    session.setSelectedPlacementId(placement.id);
    session.setArmedPlantId(null);
    return;
  }
  if (bed) {
    session.setSelectedBedId(bed.id);
    session.setSelectedPlacementId(null);
    session.setSelectedBlockId(null);
    return;
  }
  session.setSelectedBedId(null);
  session.setSelectedPlacementId(null);
  session.setSelectedBlockId(null);
}
