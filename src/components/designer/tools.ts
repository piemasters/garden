import type { Point, ShadeBlock } from "#/domain/types";

export type Tool =
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

export const SELECT_TOOL = {
  tool: "select" as const,
  label: "Select",
  help: "Click a bed to select it, or drag it to move.",
};

export const BED_TOOLS: { tool: Tool; label: string; help: string }[] = [
  {
    tool: "rect",
    label: "Rectangle",
    help: "Drag one corner to the other. Snaps to half metres.",
  },
  {
    tool: "angled",
    label: "Angled",
    help: "Click twice to set width, then again to set length.",
  },
  {
    tool: "freeform",
    label: "Freeform",
    help: "Drag to draw, then release to close and smooth.",
  },
  {
    tool: "bed",
    label: "Outline",
    help: "Click each corner, then the first corner again to close.",
  },
];

export const CUSTOM_SHADE = {
  tool: "block" as const,
  label: "Custom",
  help: "Drag a wall, fence, or building. It casts shade on the beds.",
};

export type ShapeMenu = {
  x: number;
  y: number;
  kind: "bed" | "block" | "plant";
  id: string;
  /** Colour and material, shown from the bed settings button. */
  fills?: boolean;
};

export type AdjustPlacement = {
  id: string;
  x: number;
  y: number;
  plantId?: string;
  fill?: boolean;
  count?: number;
  spacing?: number;
};

export type AdjustPreview = {
  bedId: string;
  points: Point[];
  placements: AdjustPlacement[];
  /** When set, these placements replace every plant in the bed. */
  replacePlacements?: boolean;
  label: string;
  changed: boolean;
  block: ShadeBlock | null;
};

export type AdjustGesture = {
  kind: "rotate" | "scale" | "move" | "stretch";
  target: "bed" | "block";
  bedId: string;
  center: Point;
  origin: Point;
  startAngle: number;
  startDistance: number;
  basePoints: Point[];
  basePlacements: AdjustPlacement[];
  /** Ids created while a fill grows, kept for the rest of the drag. */
  spareFillIds?: Record<string, string[]>;
  baseBlock: ShadeBlock | null;
  /** The end of a hedge or fence that stays put while the other end stretches. */
  anchor?: Point;
  preview: AdjustPreview | null;
};

export const SHADE_PRESETS = [
  { label: "House", width: 8, depth: 6, height: 6 },
  { label: "Garage", width: 6, depth: 3, height: 2.5 },
  { label: "Shed", width: 3, depth: 2, height: 2.2 },
  { label: "Tree", width: 5, depth: 5, height: 7 },
  { label: "Hedge", width: 4, depth: 0.8, height: 2, line: true },
  { label: "Fence", width: 4, depth: 0.3, height: 1.8, line: true },
] as const;

export type ShadePreset = (typeof SHADE_PRESETS)[number];
