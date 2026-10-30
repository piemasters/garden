import { FLOWER_PHOTOS } from "./flower-photos";
import { FRUIT_PHOTOS } from "./fruit-photos";
import { VEGETABLE_PHOTOS } from "./vegetable-photos";

export { FLOWER_PHOTOS, FRUIT_PHOTOS, VEGETABLE_PHOTOS };

export interface PlantPhoto {
  src: string;
  artist: string;
  license: string;
  source: string;
}

/** Photographs for the catalogue. Each file is credited on the plant page. */
export const PLANT_PHOTOS: Record<string, PlantPhoto> = {
  ...FLOWER_PHOTOS,
  ...VEGETABLE_PHOTOS,
  ...FRUIT_PHOTOS,
};

export function plantPhoto(id: string): PlantPhoto | undefined {
  return PLANT_PHOTOS[id];
}
