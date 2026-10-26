export const SOIL_TYPES = ["chalk", "clay", "loam", "sand"] as const;
export const MOISTURE_LEVELS = ["well-drained", "moist", "wet"] as const;
export const PH_LEVELS = ["acid", "neutral", "alkaline"] as const;
export const SUN_LEVELS = ["full-sun", "partial-sun", "shade"] as const;
export const ASPECTS = ["north", "east", "south", "west"] as const;
export const EXPOSURES = ["sheltered", "exposed"] as const;
export const HARDINESS = [
  "H1a",
  "H1b",
  "H1c",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "H7",
] as const;
export const PLANT_KINDS = ["plant", "bulb", "seed"] as const;
export const PLANT_GROUPS = ["flower", "vegetable", "fruit"] as const;
export const HABITS = ["bulb", "clump", "shrub", "tree", "annual"] as const;

export type SoilType = (typeof SOIL_TYPES)[number];
export type Moisture = (typeof MOISTURE_LEVELS)[number];
export type PhLevel = (typeof PH_LEVELS)[number];
export type SunLevel = (typeof SUN_LEVELS)[number];
export type Aspect = (typeof ASPECTS)[number];
export type Exposure = (typeof EXPOSURES)[number];
export type Hardiness = (typeof HARDINESS)[number];
export type PlantKind = (typeof PLANT_KINDS)[number];
export type PlantGroup = (typeof PLANT_GROUPS)[number];
export type Habit = (typeof HABITS)[number];
export type JobShift = "spring" | "autumn" | "none";

export interface MonthLook {
  foliage: boolean;
  flower?: string;
  flowerHex?: string;
  scent: boolean;
}

export interface PlantTask {
  month: number;
  day: number;
  shift: JobShift;
  title: string;
  detail: string;
}

export interface Plant {
  id: string;
  scientificName: string;
  commonName: string;
  kind: PlantKind;
  group: PlantGroup;
  habit: Habit;
  summary: string;
  cultivation: string;
  pests: string;
  soils: SoilType[];
  moisture: Moisture[];
  ph: PhLevel[];
  sun: SunLevel[];
  aspect: Aspect[];
  exposure: Exposure[];
  hardiness: Hardiness;
  maturity: string;
  heightM: [number, number];
  spreadM: [number, number];
  months: MonthLook[];
  jobs: PlantTask[];
}

export interface Point {
  x: number;
  y: number;
}

export interface ShadeBlock {
  id: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  /** Anticlockwise radians from east. Missing means the sides run with the axes. */
  rotation?: number;
  /** A fence or hedge: length can change, width stays put. */
  line?: boolean;
  source: "osm" | "user";
  label?: string;
}

export interface Bed {
  id: string;
  name: string;
  points: Point[];
  lightOverride: SunLevel | null;
  /** Fill colour as #rrggbb. Missing means the default soil brown. */
  color?: string;
}

export interface Placement {
  id: string;
  plantId: string;
  bedId: string;
  x: number;
  y: number;
}

export interface GardenSite {
  name: string;
  postcode: string;
  latitude: number;
  longitude: number;
  country: string;
  region: string;
  soil: SoilType;
  moisture: Moisture;
  ph: PhLevel;
  aspect: Aspect;
  exposure: Exposure;
  soilSuggestion: { soil: SoilType; label: string } | null;
  address: string | null;
}

export interface Garden {
  id: string;
  createdAt: string;
  updatedAt: string;
  site: GardenSite;
  blocks: ShadeBlock[];
  beds: Bed[];
  placements: Placement[];
  buildingsLoaded: boolean;
  buildingError: string | null;
  showUnsuitable: boolean;
  /** Plan labels on each bed. Missing means hidden. */
  showBedNames?: boolean;
  boundary: Point[] | null;
  attribution: string | null;
}

export const HARDINESS_RANK: Record<Hardiness, number> = {
  H1a: 1,
  H1b: 2,
  H1c: 3,
  H2: 4,
  H3: 5,
  H4: 6,
  H5: 7,
  H6: 8,
  H7: 9,
};

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
