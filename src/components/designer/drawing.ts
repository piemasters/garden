import {
  angledRectangle,
  centroid,
  distance,
  formatBearing,
  lineEnds,
  rectanglePoints,
  rectangleSize,
  rotatedRectangle,
  snapAngle,
  snappedEdge,
  snapPoint,
  snapToOutline,
  spanSize,
} from "#/domain/geometry";
import { bedSun, midsummerSamples } from "#/domain/sun";
import { formatLength, formatLengthLabel, formatSizeIn, type LengthUnit } from "#/domain/units";
import type { Garden, Point, ShadeBlock } from "#/domain/types";
import { SHADE_PRESETS, type Tool } from "./tools";

export function resolvedLight(
  bed: Garden["beds"][number],
  samples: ReturnType<typeof midsummerSamples>,
  blocks: ShadeBlock[],
) {
  const stats = bedSun(bed.points, samples, blocks);
  return { ...stats, light: bed.lightOverride ?? stats.light };
}
export function bedSize(points: Point[], unit: LengthUnit): string {
  const sides = rectangleSize(points);
  if (sides) return formatSizeIn(sides.width, sides.depth, unit);
  const size = spanSize(points);
  return formatSizeIn(size.width, size.depth, unit);
}

export function drawingPreview(
  tool: Tool,
  preset: { width: number; depth: number } | null,
  draft: Point[],
  cursor: Point | null,
  rectStart: Point | null,
  edgeEnd: Point | null,
  placeAnchor: Point | null,
  blockDraft: ShadeBlock | null,
  unit: LengthUnit,
): {
  preview: Point[] | null;
  closed: boolean;
  measure: { text: string; at: Point } | null;
} {
  const sizeLabel = (width: number, depth: number) => formatSizeIn(width, depth, unit);
  const lengthLabel = (metres: number) => formatLengthLabel(metres, unit);
  if (tool === "place" && preset && cursor) {
    const origin = placeAnchor ?? snapPoint(cursor);
    const angle = presetAngle(placeAnchor, cursor);
    const preview = rotatedRectangle(origin, preset.width, preset.depth, angle);
    return {
      preview,
      closed: true,
      measure: {
        text: `${sizeLabel(preset.width, preset.depth)} · ${formatBearing(angle)}`,
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
          text: `${lengthLabel(edge.length)} · ${formatBearing(edge.angle)}`,
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
          text: `${lengthLabel(distance(rectStart, edgeEnd))} · ${formatBearing(
            Math.atan2(edgeEnd.y - rectStart.y, edgeEnd.x - rectStart.x),
          )}`,
          at: edgeEnd,
        },
      };
    }
    return {
      preview: rect.points,
      closed: true,
      measure: {
        text: `${formatLength(rect.depth, unit)} × ${formatLength(rect.width, unit)} ${unit} · ${formatBearing(
          rect.angle,
        )}`,
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
      measure: { text: sizeLabel(size.width, size.depth), at },
    };
  }
  if (tool === "rect" && rectStart && cursor) {
    const preview = rectanglePoints(rectStart, cursor);
    const size = spanSize(preview);
    return {
      preview,
      closed: true,
      measure: {
        text: sizeLabel(size.width, size.depth),
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
        ? `${sizeLabel(size.width, size.depth)} · edge ${lengthLabel(edge)}`
        : `Edge ${lengthLabel(edge)}`;
    return { preview, closed: false, measure: { text, at: cursor } };
  }
  if (tool === "block" && blockDraft && (blockDraft.width > 0 || blockDraft.depth > 0)) {
    const ends = blockDraft.line ? lineEnds(blockDraft) : null;
    return {
      preview: null,
      closed: false,
      measure: {
        text: blockDraft.line
          ? `${lengthLabel(blockDraft.width)} long`
          : sizeLabel(blockDraft.width, blockDraft.depth),
        at: ends?.[1] ?? { x: blockDraft.x, y: blockDraft.y },
      },
    };
  }
  return { preview: null, closed: false, measure: null };
}

export function presetAngle(anchor: Point | null, cursor: Point): number {
  if (!anchor || distance(anchor, cursor) < 0.35) return Math.PI / 2;
  return snapAngle(Math.atan2(cursor.y - anchor.y, cursor.x - anchor.x));
}

export function presetIsLine(preset: (typeof SHADE_PRESETS)[number]): boolean {
  return "line" in preset && preset.line;
}

export function madeShade(
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
export function linePlacement(
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

export function blockBetween(id: string, start: Point, end: Point): ShadeBlock {
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
export function copyName(name: string, existing: string[]): string {
  const base = name.replace(/ copy(?: \d+)?$/, "");
  let next = `${base} copy`;
  let count = 2;
  while (existing.includes(next)) {
    next = `${base} copy ${count}`;
    count += 1;
  }
  return next;
}
