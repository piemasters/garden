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

/** Draw one tile of a material. The plan tints a white tile; a swatch can pass its own base. */
export function paintSurface(
  context: CanvasRenderingContext2D,
  surface: GroundSurface,
  size = 128,
  base = "#ffffff",
) {
  context.save();
  context.scale(size / 128, size / 128);
  context.fillStyle = base;
  context.fillRect(0, 0, 128, 128);
  if (surface === "grass") {
    for (let index = 0; index < 90; index += 1) {
      context.fillStyle = `rgba(20, 50, 20, ${0.08 + Math.random() * 0.16})`;
      context.fillRect(Math.random() * 128, Math.random() * 128, 2, 7);
    }
  } else if (surface === "concrete") {
    for (let index = 0; index < 140; index += 1) {
      context.fillStyle = `rgba(40, 40, 40, ${0.04 + Math.random() * 0.08})`;
      context.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
  } else if (surface === "paving") {
    context.strokeStyle = "rgba(40, 44, 48, 0.45)";
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(0, 64);
    context.lineTo(128, 64);
    context.moveTo(64, 0);
    context.lineTo(64, 128);
    context.stroke();
  } else if (surface === "gravel" || surface === "soil" || surface === "bark") {
    const count = surface === "bark" ? 28 : 46;
    for (let index = 0; index < count; index += 1) {
      context.fillStyle = `rgba(30, 24, 18, ${0.12 + Math.random() * 0.28})`;
      context.beginPath();
      context.ellipse(
        Math.random() * 128,
        Math.random() * 128,
        3 + Math.random() * (surface === "bark" ? 10 : 6),
        2 + Math.random() * 4,
        Math.random() * Math.PI,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  } else {
    const board = 18;
    for (let y = 0; y < 128; y += board) {
      context.fillStyle = "rgba(40, 24, 12, 0.35)";
      context.fillRect(0, y, 128, 3);
    }
  }
  context.restore();
}
