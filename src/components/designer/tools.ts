import type { Point, ShadeBlock } from "#/domain/types";

export const buttonClass =
  "rounded-full bg-leaf px-4 py-2 text-sm text-white transition hover:bg-leaf-dark disabled:cursor-not-allowed disabled:opacity-60";

export const quietButtonClass =
  "rounded-full border border-line bg-card px-4 py-2 text-sm text-ink hover:border-leaf";

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
  help: "Click a bed to select it, or drag it to move. Drag empty ground to slide the plan.",
};

export const BED_TOOLS: { tool: Tool; label: string; help: string }[] = [
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

export type AdjustPreview = {
  bedId: string;
  points: Point[];
  placements: { id: string; x: number; y: number }[];
  label: string;
  changed: boolean;
  block: ShadeBlock | null;
};

export type AdjustGesture = {
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

export const SHADE_PRESETS = [
  { label: "House", width: 8, depth: 6, height: 6 },
  { label: "Garage", width: 6, depth: 3, height: 2.5 },
  { label: "Shed", width: 3, depth: 2, height: 2.2 },
  { label: "Tree", width: 5, depth: 5, height: 7 },
  { label: "Hedge", width: 4, depth: 0.8, height: 2, line: true },
  { label: "Fence", width: 4, depth: 0.3, height: 1.8, line: true },
] as const;

export type ShadePreset = (typeof SHADE_PRESETS)[number];
