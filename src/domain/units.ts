import { formatOffset } from "./geometry";
import type { Point } from "./types";

export const METRES_PER_FOOT = 0.3048;

export type LengthUnit = "m" | "ft";

export function toMetres(value: number, unit: LengthUnit): number {
  return unit === "ft" ? value * METRES_PER_FOOT : value;
}

export function formatLength(metres: number, unit: LengthUnit): string {
  const value = unit === "ft" ? metres / METRES_PER_FOOT : metres;
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function formatLengthLabel(metres: number, unit: LengthUnit): string {
  return `${formatLength(metres, unit)} ${unit}`;
}

export function formatSizeIn(width: number, depth: number, unit: LengthUnit): string {
  return `${formatLength(width, unit)} × ${formatLength(depth, unit)} ${unit}`;
}

export function formatRange(range: [number, number], unit: LengthUnit): string {
  const [min, max] = range;
  return min === max
    ? formatLengthLabel(min, unit)
    : `${formatLength(min, unit)}–${formatLength(max, unit)} ${unit}`;
}

/** Under a foot, say inches. Under a metre, say centimetres. */
export function formatSpacingIn(metres: number, unit: LengthUnit): string {
  if (unit === "ft") {
    const feet = metres / METRES_PER_FOOT;
    if (feet < 1) return `${Math.round(feet * 12)} in`;
    return formatLengthLabel(metres, unit);
  }
  if (metres < 1) return `${Math.round(metres * 100)} cm`;
  return formatLengthLabel(metres, unit);
}

export function formatMove(by: Point, unit: LengthUnit): string {
  if (unit === "m") return formatOffset(by);
  const parts: string[] = [];
  if (by.y !== 0) {
    parts.push(`${formatLengthLabel(Math.abs(by.y), unit)} ${by.y > 0 ? "north" : "south"}`);
  }
  if (by.x !== 0) {
    parts.push(`${formatLengthLabel(Math.abs(by.x), unit)} ${by.x > 0 ? "east" : "west"}`);
  }
  return parts.length > 0 ? parts.join(" · ") : `0 ${unit}`;
}
