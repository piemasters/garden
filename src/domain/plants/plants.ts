import type { MonthLook, Plant } from "../types";
import { FLOWERS } from "./flowers";
import { FRUIT } from "./fruit";
import { VEGETABLES } from "./vegetables";

export { FLOWERS, FRUIT, VEGETABLES };

export const PLANTS: Plant[] = [...FLOWERS, ...VEGETABLES, ...FRUIT];

export function getPlant(id: string): Plant | undefined {
  return PLANTS.find((entry) => entry.id === id);
}

export const FLOWER_COLOURS = [
  "white",
  "yellow",
  "orange",
  "red",
  "pink",
  "purple",
  "blue",
] as const;

export type FlowerColour = (typeof FLOWER_COLOURS)[number];

export const FLOWER_COLOUR_LABEL: Record<FlowerColour, string> = {
  white: "White",
  yellow: "Yellow",
  orange: "Orange",
  red: "Red",
  pink: "Pink",
  purple: "Purple",
  blue: "Blue",
};

const FLOWER_COLOUR_WORDS: Record<FlowerColour, readonly string[]> = {
  white: ["white"],
  yellow: ["yellow", "golden"],
  orange: ["orange"],
  red: ["red", "maroon"],
  pink: ["pink"],
  purple: ["purple", "violet", "lilac", "plum"],
  blue: ["blue"],
};

export function hasFlowerColour(plant: Plant, colour: FlowerColour): boolean {
  const words = FLOWER_COLOUR_WORDS[colour];
  return plant.months.some((month) => {
    if (!month.flower) return false;
    const tokens = month.flower.toLowerCase().split(/[^a-z]+/);
    return tokens.some((token) => words.includes(token));
  });
}

/** Crop colour shares the flower note. A month is in flower when that note is a blossom. */
const HARVEST_NOTE = /\b(fruit|root|stalks)\b/i;

export function flowersInMonth(plant: Plant, month: number): boolean {
  const note = plant.months[month]?.flower;
  return note != null && !HARVEST_NOTE.test(note);
}

export function harvestsInMonth(plant: Plant, month: number): boolean {
  const look = plant.months[month];
  if (!look) return false;
  if (look.harvest) return true;
  return look.flower != null && HARVEST_NOTE.test(look.flower);
}

export const SEASONS = [
  { id: "spring", label: "Spring", months: [2, 3, 4] },
  { id: "summer", label: "Summer", months: [5, 6, 7] },
  { id: "autumn", label: "Autumn", months: [8, 9, 10] },
  { id: "winter", label: "Winter", months: [11, 0, 1] },
] as const;

export function seasonLook(record: Plant, months: readonly number[]) {
  const rows = months
    .map((month) => record.months[month])
    .filter((row): row is MonthLook => row !== undefined);
  const flowers = [...new Set(rows.flatMap((row) => (row.flower ? [row.flower] : [])))];
  return {
    foliage: rows.some((row) => row.foliage),
    flowers,
    scent: rows.some((row) => row.scent),
  };
}
