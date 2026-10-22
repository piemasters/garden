import { createServerFn } from "@tanstack/react-start";
import { choiceMatchingAddress, isAreaResult } from "../domain/address-match";
import { outlineAttribution, selectPlotBoundary } from "../domain/boundary";
import { buildingHeight, footprintBlock, toLocalMetres } from "../domain/geometry";
import { gridToWgs84, wgs84ToGrid } from "../domain/osgb";
import { describeSoilReading, parseBgsFeatureInfo, soilFromBgs } from "../domain/soil";
import type { Point, ShadeBlock, SoilType } from "../domain/types";

export interface AddressChoice {
  label: string;
  latitude: number;
  longitude: number;
  outline?: Point[];
}

export interface SiteQuery {
  address: string;
  postcode: string;
  selected?: AddressChoice | null;
}

export type SiteLookup =
  | {
      ok: true;
      postcode: string;
      latitude: number;
      longitude: number;
      country: string;
      region: string;
      soilSuggestion: { soil: SoilType; label: string } | null;
      matchedAddress: string | null;
      boundary: Point[] | null;
      boundaryNote: string | null;
      attribution: string | null;
      choices: AddressChoice[] | null;
    }
  | { ok: false; error: string };

export type BuildingLookup = { ok: true; blocks: ShadeBlock[] } | { ok: false; error: string };

interface PostcodeResult {
  postcode?: string;
  latitude?: number | null;
  longitude?: number | null;
  country?: string | null;
  region?: string | null;
  admin_district?: string | null;
}

function formatPostcode(compact: string): string {
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

async function suggestSoil(
  latitude: number,
  longitude: number,
): Promise<{ soil: SoilType; label: string } | null> {
  const delta = 0.002;
  const url = new URL("https://map.bgs.ac.uk/arcgis/services/UKSO/UKSO_BGS/MapServer/WMSServer");
  url.searchParams.set("service", "WMS");
  url.searchParams.set("version", "1.1.1");
  url.searchParams.set("request", "GetFeatureInfo");
  url.searchParams.set("layers", "Parent.Material.Soil.texture");
  url.searchParams.set("query_layers", "Parent.Material.Soil.texture");
  url.searchParams.set("styles", "");
  url.searchParams.set("srs", "EPSG:4326");
  url.searchParams.set(
    "bbox",
    `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}`,
  );
  url.searchParams.set("width", "101");
  url.searchParams.set("height", "101");
  url.searchParams.set("x", "50");
  url.searchParams.set("y", "50");
  url.searchParams.set("info_format", "text/plain");
  const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!response.ok) return null;
  const reading = parseBgsFeatureInfo(await response.text());
  const soil = soilFromBgs(reading);
  if (!soil) return null;
  return { soil, label: describeSoilReading(reading, soil) };
}

export const lookupSite = createServerFn({ method: "POST" })
  .validator((input: SiteQuery) => ({
    address: input.address.trim(),
    postcode: input.postcode.trim(),
    selected: cleanChoice(input.selected),
  }))
  .handler(async ({ data }): Promise<SiteLookup> => {
    const compact = data.postcode.toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/.test(compact)) {
      return { ok: false, error: "Enter a full UK postcode, such as SW1A 1AA." };
    }
    try {
      const response = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(compact)}`,
        {
          signal: AbortSignal.timeout(12_000),
        },
      );
      if (response.status === 404) return { ok: false, error: "That postcode was not found." };
      if (!response.ok)
        return { ok: false, error: "The postcode service did not respond. Try again in a moment." };
      const body = (await response.json()) as { result?: PostcodeResult };
      const result = body.result;
      if (result?.latitude == null || result.longitude == null) {
        return { ok: false, error: "That postcode has no map coordinates we can use." };
      }
      const postcode = result.postcode ?? formatPostcode(compact);
      const located = await locateAddress(data, result);
      let soilSuggestion: { soil: SoilType; label: string } | null = null;
      if (!located.choices) {
        try {
          soilSuggestion = await suggestSoil(located.latitude, located.longitude);
        } catch {
          soilSuggestion = null;
        }
      }
      return {
        ok: true,
        postcode,
        latitude: located.latitude,
        longitude: located.longitude,
        country: result.country ?? "United Kingdom",
        region: result.region || result.country || "United Kingdom",
        soilSuggestion,
        matchedAddress: located.matchedAddress,
        boundary: located.boundary,
        boundaryNote: located.boundaryNote,
        attribution: located.attribution,
        choices: located.choices,
      };
    } catch {
      return {
        ok: false,
        error:
          "The postcode service did not respond. You can still describe the soil by hand if you try again later.",
      };
    }
  });

async function locateAddress(
  data: SiteQuery,
  result: PostcodeResult,
): Promise<{
  latitude: number;
  longitude: number;
  matchedAddress: string | null;
  boundary: Point[] | null;
  boundaryNote: string | null;
  attribution: string | null;
  choices: AddressChoice[] | null;
}> {
  const latitude = result.latitude ?? 0;
  const longitude = result.longitude ?? 0;
  const empty = {
    latitude,
    longitude,
    matchedAddress: null,
    boundary: null,
    attribution: null,
    choices: null,
  };
  if (!data.address) {
    return {
      ...empty,
      boundaryNote: "No house address was given, so no property outline was imported.",
    };
  }
  if (result.country !== "England" && result.country !== "Wales") {
    return {
      ...empty,
      boundaryNote:
        "Property outlines cover registered freehold land in England and Wales. Draw the plot yourself.",
    };
  }
  const place =
    data.selected != null
      ? { kind: "one" as const, choice: data.selected }
      : await searchAddress(data.address, result.postcode ?? "", latitude, longitude);
  if (place.kind === "down" || place.kind === "none") {
    const nearby = await chooseNearbyPlot(data.address, result, null);
    if (nearby.boundary || nearby.choices) return nearby;
    return {
      ...empty,
      boundaryNote:
        place.kind === "down"
          ? "The address search did not respond, so the plan uses the postcode centre and no property outline."
          : "That address was not matched, so the plan uses the postcode centre and no property outline.",
    };
  }
  if (place.kind === "many") {
    return {
      ...empty,
      boundaryNote: "Several addresses match. Choose the property.",
      choices: place.choices,
    };
  }
  if (metresApart(place.choice.latitude, place.choice.longitude, latitude, longitude) > 2_000) {
    return {
      ...empty,
      boundaryNote:
        "That address is not in this postcode, so the plan uses the postcode centre and no property outline.",
    };
  }
  const imported = await importedSite(result, place.choice, null);
  if (imported.boundary) return imported;
  return chooseNearbyPlot(data.address, result, imported.boundaryNote);
}

async function importedSite(
  result: PostcodeResult,
  choice: AddressChoice,
  missedNote: string | null,
): Promise<{
  latitude: number;
  longitude: number;
  matchedAddress: string | null;
  boundary: Point[] | null;
  boundaryNote: string | null;
  attribution: string | null;
  choices: AddressChoice[] | null;
}> {
  const outline = await importFreehold(
    result.admin_district ?? "",
    choice.latitude,
    choice.longitude,
  );
  return {
    latitude: choice.latitude,
    longitude: choice.longitude,
    matchedAddress: choice.label,
    boundary: outline.boundary,
    boundaryNote: outline.boundary
      ? (missedNote ??
        "HM Land Registry freehold extent. This is the indicative position of the registered property, not the legal title.")
      : outline.reason,
    attribution: outline.boundary
      ? outlineAttribution(outline.year)
      : "Address location © OpenStreetMap contributors.",
    choices: null,
  };
}

async function chooseNearbyPlot(
  address: string,
  result: PostcodeResult,
  fallbackNote: string | null,
): Promise<{
  latitude: number;
  longitude: number;
  matchedAddress: string | null;
  boundary: Point[] | null;
  boundaryNote: string | null;
  attribution: string | null;
  choices: AddressChoice[] | null;
}> {
  const latitude = result.latitude ?? 0;
  const longitude = result.longitude ?? 0;
  const empty = {
    latitude,
    longitude,
    matchedAddress: null,
    boundary: null,
    boundaryNote: fallbackNote,
    attribution: null,
    choices: null,
  };
  const grid = wgs84ToGrid(latitude, longitude);
  const { freeholdNearby } = await import("./parcels");
  const nearby = await freeholdNearby(
    result.admin_district ?? "",
    grid.easting,
    grid.northing,
    320,
    48,
  );
  if (!nearby.ok || nearby.plots.length === 0) return empty;
  const choices = outlineChoices(nearby.plots, latitude, longitude);
  const matched = choiceMatchingAddress(address, choices);
  if (matched) return importedSite(result, matched, null);
  return {
    ...empty,
    boundaryNote:
      "The house is not pinpointed on the free map. Click the map where the house is, then click its coloured plot.",
    choices,
  };
}

export const lookupPlotsAround = createServerFn({ method: "POST" })
  .validator(
    (input: {
      postcode: string;
      latitude: number;
      longitude: number;
      originLatitude: number;
      originLongitude: number;
    }) => ({
      postcode: input.postcode.trim(),
      latitude: input.latitude,
      longitude: input.longitude,
      originLatitude: input.originLatitude,
      originLongitude: input.originLongitude,
    }),
  )
  .handler(
    async ({
      data,
    }): Promise<{ ok: true; choices: AddressChoice[] } | { ok: false; error: string }> => {
      if (!Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) {
        return { ok: false, error: "Click a point on the map." };
      }
      const compact = data.postcode.toUpperCase().replace(/\s+/g, "");
      try {
        const response = await fetch(
          `https://api.postcodes.io/postcodes/${encodeURIComponent(compact)}`,
          { signal: AbortSignal.timeout(12_000) },
        );
        if (!response.ok) {
          return { ok: false, error: "The postcode service did not respond. Try the map again." };
        }
        const body = (await response.json()) as { result?: PostcodeResult };
        const district = body.result?.admin_district ?? "";
        const grid = wgs84ToGrid(data.latitude, data.longitude);
        const { freeholdNearby } = await import("./parcels");
        const nearby = await freeholdNearby(district, grid.easting, grid.northing, 180, 40);
        if (!nearby.ok) return { ok: false, error: nearby.reason };
        if (nearby.plots.length === 0) {
          return { ok: false, error: "No freehold plots were found there. Click another spot." };
        }
        return {
          ok: true,
          choices: outlineChoices(nearby.plots, data.originLatitude, data.originLongitude),
        };
      } catch {
        return { ok: false, error: "Property outlines could not be loaded. Try the map again." };
      }
    },
  );

function outlineChoices(
  plots: Array<{
    ring: Array<[number, number]>;
    easting: number;
    northing: number;
    width: number;
    depth: number;
  }>,
  latitude: number,
  longitude: number,
): AddressChoice[] {
  return plots.map((plot) => {
    const geographic = gridToWgs84(plot.easting, plot.northing);
    const local = toLocalMetres(geographic.latitude, geographic.longitude, latitude, longitude);
    return {
      label: `Plot ${plot.width} × ${plot.depth} m, ${compass(local.x, local.y)}`,
      latitude: geographic.latitude,
      longitude: geographic.longitude,
      outline: plot.ring.map(([easting, northing]) => {
        const corner = gridToWgs84(easting, northing);
        return toLocalMetres(corner.latitude, corner.longitude, latitude, longitude);
      }),
    };
  });
}

function compass(east: number, north: number): string {
  const distance = Math.hypot(east, north);
  if (distance < 12) return "at the postcode centre";
  const names = [
    "north",
    "north-east",
    "east",
    "south-east",
    "south",
    "south-west",
    "west",
    "north-west",
  ];
  const index = Math.round(Math.atan2(east, north) / (Math.PI / 4) + 8) % 8;
  return `${Math.round(distance)} m ${names[index] ?? "from"} of the postcode centre`;
}

async function searchAddress(
  address: string,
  postcode: string,
  latitude: number,
  longitude: number,
): Promise<
  | { kind: "down" }
  | { kind: "none" }
  | { kind: "one"; choice: AddressChoice }
  | { kind: "many"; choices: AddressChoice[] }
> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "5");
    url.searchParams.set("countrycodes", "gb");
    url.searchParams.set("q", `${address}, ${postcode}`);
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "uk-garden-planner/1.0 (personal garden planner)",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return { kind: "down" };
    const body = (await response.json()) as NominatimPlace[];
    const choices = body.flatMap((place) => {
      const placeLatitude = Number(place.lat);
      const placeLongitude = Number(place.lon);
      if (!Number.isFinite(placeLatitude) || !Number.isFinite(placeLongitude)) return [];
      if (metresApart(placeLatitude, placeLongitude, latitude, longitude) > 2_000) return [];
      if (isAreaResult(place.addresstype, place.type)) return [];
      return [
        {
          label: addressLabel(place.display_name ?? address),
          latitude: placeLatitude,
          longitude: placeLongitude,
        },
      ];
    });
    const unique = dedupeChoices(choices);
    const only = unique[0];
    if (!only) return { kind: "none" };
    if (unique.length === 1) return { kind: "one", choice: only };
    return { kind: "many", choices: unique };
  } catch {
    return { kind: "down" };
  }
}

async function importFreehold(
  adminDistrict: string,
  latitude: number,
  longitude: number,
): Promise<{ boundary: Point[] | null; reason: string | null; year: number }> {
  const grid = wgs84ToGrid(latitude, longitude);
  const { freeholdRings } = await import("./parcels");
  const file = await freeholdRings(adminDistrict, grid.easting, grid.northing);
  if (!file.ok) return { boundary: null, reason: file.reason, year: new Date().getFullYear() };
  const outline = selectPlotBoundary(
    file.rings,
    grid.easting,
    grid.northing,
    (easting, northing) => {
      const geographic = gridToWgs84(easting, northing);
      return toLocalMetres(geographic.latitude, geographic.longitude, latitude, longitude);
    },
  );
  return { boundary: outline.boundary, reason: outline.reason, year: file.year };
}

function cleanChoice(choice: AddressChoice | null | undefined): AddressChoice | null {
  if (!choice) return null;
  if (!Number.isFinite(choice.latitude) || !Number.isFinite(choice.longitude)) return null;
  const label = choice.label?.trim().slice(0, 180);
  if (!label) return null;
  return { label, latitude: choice.latitude, longitude: choice.longitude };
}

function addressLabel(displayName: string): string {
  const parts = displayName
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const first = parts[0] ?? displayName;
  const postcode = parts.find((part) => /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(part));
  if (!postcode || postcode.toUpperCase() === first.toUpperCase()) return first;
  return `${first}, ${postcode}`;
}

function dedupeChoices(choices: AddressChoice[]): AddressChoice[] {
  const seen = new Set<string>();
  return choices.filter((choice) => {
    const key = `${choice.latitude.toFixed(5)},${choice.longitude.toFixed(5)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function metresApart(
  latitude: number,
  longitude: number,
  originLatitude: number,
  originLongitude: number,
): number {
  const point = toLocalMetres(latitude, longitude, originLatitude, originLongitude);
  return Math.hypot(point.x, point.y);
}

interface NominatimPlace {
  lat?: string;
  lon?: string;
  display_name?: string;
  type?: string;
  addresstype?: string;
}

interface OverpassWay {
  type?: string;
  id?: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
}

export const fetchBuildings = createServerFn({ method: "POST" })
  .validator((input: { latitude: number; longitude: number }) => input)
  .handler(async ({ data }): Promise<BuildingLookup> => {
    if (!Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) {
      return { ok: false, error: "A map point is required." };
    }
    const query = `[out:json][timeout:20];way["building"](around:80,${data.latitude},${data.longitude});out tags geom;`;
    try {
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          accept: "application/json",
          "user-agent": "uk-garden-planner/1.0 (local garden planning)",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) return { ok: false, error: "Building outlines could not be loaded." };
      const body = (await response.json()) as { elements?: OverpassWay[] };
      const blocks: ShadeBlock[] = [];
      for (const element of body.elements ?? []) {
        if (!element.geometry || element.id == null) continue;
        const points = element.geometry.map((node) =>
          toLocalMetres(node.lat, node.lon, data.latitude, data.longitude),
        );
        const block = footprintBlock(
          points,
          buildingHeight(element.tags ?? {}),
          `osm-${element.id}`,
          "osm",
        );
        if (block) blocks.push(block);
        if (blocks.length >= 40) break;
      }
      return { ok: true, blocks };
    } catch {
      return {
        ok: false,
        error: "Building outlines could not be loaded. You can still draw shade blocks yourself.",
      };
    }
  });
