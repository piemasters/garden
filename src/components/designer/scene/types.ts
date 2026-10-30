import type { SunSample } from "#/domain/sun";
import type {
  Bed,
  GroundSlope,
  GroundSurface,
  Placement,
  Plant,
  Point,
  ShadeBlock,
} from "#/domain/types";

export type Pixel = { x: number; y: number };

export type HandleSpots = {
  turn: Pixel;
  resize: Pixel;
  center: Pixel;
  /** Screen position of each end of a hedge or fence. */
  ends?: [Pixel, Pixel];
};

export type PlanControls = {
  panByPixels: (dx: number, dy: number) => void;
  setGrabbing: (active: boolean) => void;
  refit: () => void;
};

export interface SceneProps {
  beds: Bed[];
  blocks: ShadeBlock[];
  placements: Placement[];
  plantsById: Map<string, Plant>;
  month: number;
  view: "plan" | "orbit";
  tool:
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
  selectedBedId: string | null;
  /** The bed the user has actually chosen. The highlight can fall back to another bed. */
  chosenBedId: string | null;
  selectedPlacementId: string | null;
  selectedBlockId: string | null;
  draft: Point[];
  preview: Point[] | null;
  previewClosed: boolean;
  measure: { text: string; at: Point } | null;
  blockDraft: ShadeBlock | null;
  boundary: Point[] | null;
  surface: GroundSurface;
  slope?: GroundSlope;
  sunArc: Array<[number, number, number]>;
  shadeSamples: SunSample[];
  onSurface: (point: Point, phase: "down" | "move" | "up") => void;
  onMoveBed?: (point: Point, phase: "down" | "move" | "up") => void;
  onSelectPlacement: (id: string) => void;
  onSelectBed: (id: string) => void;
  onDrag: (id: string, point: Point) => void;
  onDrop: (id: string, point: Point) => void;
  onSelectBlock: (id: string) => void;
  onScale?: (metres: number, pixels: number) => void;
  showHandles: boolean;
  onHandleSpots: (spots: HandleSpots | null) => void;
  handlePoints?: Point[] | null;
  /** The two ends of the selected hedge or fence, in plan metres. */
  handleEnds?: [Point, Point] | null;
  pointerRef: { current: (clientX: number, clientY: number) => Point | null };
  bedNames: { id: string; name: string; points: Point[] }[] | null;
  onBedLabels: (labels: { id: string; name: string; x: number; y: number }[]) => void;
}
