import { GROUND_SURFACES, type GroundSurface } from "./types";

export const SURFACE_LABEL: Record<GroundSurface, string> = {
  grass: "Grass",
  concrete: "Concrete",
  paving: "Paving",
  gravel: "Gravel",
  decking: "Decking",
  soil: "Soil",
  bark: "Bark",
};

/** Flat colour used for the swatch and as the tint on the plot fill. */
export const SURFACE_COLOR: Record<GroundSurface, string> = {
  grass: "#6f8f5a",
  concrete: "#d4d5d0",
  paving: "#aeb6bb",
  gravel: "#c4bfb4",
  decking: "#b08968",
  soil: "#8d6244",
  bark: "#6b4a32",
};

/** Missing or unknown choices stay grass, which is how older gardens were drawn. */
export function groundSurface(value: unknown): GroundSurface {
  return typeof value === "string" && (GROUND_SURFACES as readonly string[]).includes(value)
    ? (value as GroundSurface)
    : "grass";
}

/** A bed material. Missing means the bed uses its flat colour. */
export function bedSurface(value: unknown): GroundSurface | null {
  return typeof value === "string" && (GROUND_SURFACES as readonly string[]).includes(value)
    ? (value as GroundSurface)
    : null;
}
