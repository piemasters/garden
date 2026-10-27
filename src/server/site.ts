import { createServerFn } from "@tanstack/react-start";
import { choiceMatchingAddress, isAreaResult } from "../domain/address-match";
import {
  outlineAttribution,
  PLOT_NONE,
  PLOT_TOO_LARGE,
  selectPlotBoundary,
} from "../domain/boundary";
import {
  buildingHeight,
  footprintBlock,
  fromLocalMetres,
  smallestOutlineAt,
  toLocalMetres,
} from "../domain/geometry";
import type { TitlePlot } from "../domain/titles";
import { gridToWgs84, wgs84ToGrid } from "../domain/osgb";
import { describeSoilReading, parseBgsFeatureInfo, soilFromBgs } from "../domain/soil";
import type { Point, ShadeBlock, SoilType } from "../domain/types";

export interface AddressChoice {
  label: string;
  latitude: number;
  longitude: number;
  outline?: Point[];
  matched?: boolean;
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
  if (data.selected == null) {
    const aroundHouse = await plotsNear(
      result.admin_district ?? "",
      place.choice.latitude,
      place.choice.longitude,
      place.choice.latitude,
      place.choice.longitude,
      100,
      30,
      "the address",
    );
    if (aroundHouse.ok && aroundHouse.choices.length > 0) {
      const suggested = smallestOutlineAt({ x: 0, y: 0 }, aroundHouse.choices);
      const choices = aroundHouse.choices.map((choice) =>
        choice === suggested ? { ...choice, matched: true } : choice,
      );
      choices.sort((left, right) => Number(Boolean(right.matched)) - Number(Boolean(left.matched)));
      return {
        latitude: place.choice.latitude,
        longitude: place.choice.longitude,
        matchedAddress: place.choice.label,
        boundary: null,
        boundaryNote: suggested
          ? `${place.choice.label} is highlighted on the map. Click that plot to confirm it, or choose another if it is wrong.`
          : `${place.choice.label} is marked on the map. Click its coloured plot.`,
        attribution: null,
        choices,
      };
    }
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
      ? outlineAttribution(outline.year, outline.simplified)
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
  const listed = await plotsNear(
    result.admin_district ?? "",
    latitude,
    longitude,
    latitude,
    longitude,
    320,
    48,
  );
  if (!listed.ok || listed.choices.length === 0) return empty;
  const matched = choiceMatchingAddress(address, listed.choices);
  if (matched) return importedSite(result, matched, null);
  return {
    ...empty,
    boundaryNote:
      "The house is not pinpointed on the free map. Click the map where the house is, then click its coloured plot.",
    choices: listed.choices,
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
        const listed = await plotsNear(
          body.result?.admin_district ?? "",
          data.latitude,
          data.longitude,
          data.originLatitude,
          data.originLongitude,
          180,
          40,
        );
        if (!listed.ok) return { ok: false, error: listed.reason };
        if (listed.choices.length === 0) {
          return { ok: false, error: "No freehold plots were found there. Click another spot." };
        }
        return { ok: true, choices: listed.choices };
      } catch {
        return { ok: false, error: "Property outlines could not be loaded. Try the map again." };
      }
    },
  );

async function plotsNear(
  adminDistrict: string,
  latitude: number,
  longitude: number,
  originLatitude: number,
  originLongitude: number,
  pad: number,
  limit: number,
  anchor = "the postcode centre",
): Promise<{ ok: true; choices: AddressChoice[] } | { ok: false; reason: string }> {
  const { persistentParcelCache, titlesAround } = await import("./titles");
  if (persistentParcelCache()) {
    const grid = wgs84ToGrid(latitude, longitude);
    const { freeholdNearby } = await import("./parcels");
    const nearby = await freeholdNearby(adminDistrict, grid.easting, grid.northing, pad, limit);
    if (nearby.ok) {
      return {
        ok: true,
        choices: outlineChoices(nearby.plots, originLatitude, originLongitude, anchor),
      };
    }
  }
  const listed = await titlesAround(
    latitude,
    longitude,
    originLatitude,
    originLongitude,
    pad,
    limit,
  );
  if (!listed.ok) return listed;
  return {
    ok: true,
    choices: choicesFromPlots(listed.plots, originLatitude, originLongitude, anchor),
  };
}

function choicesFromPlots(
  plots: TitlePlot[],
  latitude: number,
  longitude: number,
  anchor: string,
): AddressChoice[] {
  return plots.map((plot) => {
    const geographic = fromLocalMetres({ x: plot.east, y: plot.north }, latitude, longitude);
    return {
      label: `Plot ${plot.width} × ${plot.depth} m, ${compass(plot.east, plot.north, anchor)}`,
      latitude: geographic.latitude,
      longitude: geographic.longitude,
      outline: plot.ring,
    };
  });
}

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
  anchor: string,
): AddressChoice[] {
  return plots.map((plot) => {
    const geographic = gridToWgs84(plot.easting, plot.northing);
    const local = toLocalMetres(geographic.latitude, geographic.longitude, latitude, longitude);
    return {
      label: `Plot ${plot.width} × ${plot.depth} m, ${compass(local.x, local.y, anchor)}`,
      latitude: geographic.latitude,
      longitude: geographic.longitude,
      outline: plot.ring.map(([easting, northing]) => {
        const corner = gridToWgs84(easting, northing);
        return toLocalMetres(corner.latitude, corner.longitude, latitude, longitude);
      }),
    };
  });
}

function compass(east: number, north: number, anchor: string): string {
  const distance = Math.hypot(east, north);
  if (distance < 12) return `at ${anchor}`;
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
  return `${Math.round(distance)} m ${names[index] ?? "from"} of ${anchor}`;
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
  const nominatim = await searchNominatim(address, postcode, latitude, longitude);
  if (nominatim.kind === "one" || nominatim.kind === "many") return nominatim;
  const photon = await searchPhoton(address, latitude, longitude);
  if (photon.kind === "one" || photon.kind === "many") return photon;
  if (nominatim.kind === "none" || photon.kind === "none") return { kind: "none" };
  return { kind: "down" };
}

async function searchNominatim(
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

const PHOTON_AREA = new Set([
  "highway",
  "place",
  "boundary",
  "landuse",
  "waterway",
  "natural",
  "railway",
]);

async function searchPhoton(
  address: string,
  latitude: number,
  longitude: number,
): Promise<
  | { kind: "down" }
  | { kind: "none" }
  | { kind: "one"; choice: AddressChoice }
  | { kind: "many"; choices: AddressChoice[] }
> {
  try {
    const west = fromLocalMetres({ x: -2_000, y: 0 }, latitude, longitude);
    const east = fromLocalMetres({ x: 2_000, y: 0 }, latitude, longitude);
    const south = fromLocalMetres({ x: 0, y: -2_000 }, latitude, longitude);
    const north = fromLocalMetres({ x: 0, y: 2_000 }, latitude, longitude);
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", address);
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("limit", "5");
    url.searchParams.set("lang", "en");
    url.searchParams.set(
      "bbox",
      `${west.longitude},${south.latitude},${east.longitude},${north.latitude}`,
    );
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "uk-garden-planner/1.0 (personal garden planner)",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return { kind: "down" };
    const body = (await response.json()) as {
      features?: Array<{
        geometry?: { coordinates?: number[] };
        properties?: {
          name?: string;
          housenumber?: string;
          street?: string;
          postcode?: string;
          countrycode?: string;
          osm_key?: string;
          osm_value?: string;
          type?: string;
        };
      }>;
    };
    const choices = (body.features ?? []).flatMap((feature) => {
      const properties = feature.properties ?? {};
      const coordinates = feature.geometry?.coordinates;
      const placeLongitude = coordinates?.[0];
      const placeLatitude = coordinates?.[1];
      if (placeLatitude == null || placeLongitude == null) return [];
      if (!Number.isFinite(placeLatitude) || !Number.isFinite(placeLongitude)) return [];
      if (properties.countrycode && properties.countrycode !== "GB") return [];
      if (PHOTON_AREA.has((properties.osm_key ?? "").toLowerCase())) return [];
      if (isAreaResult(properties.osm_value, properties.type)) return [];
      if (metresApart(placeLatitude, placeLongitude, latitude, longitude) > 2_000) return [];
      const label = photonLabel(properties, address);
      if (!photonAgrees(address, label)) return [];
      return [
        {
          label,
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

function photonAgrees(address: string, label: string): boolean {
  const number = address.match(/^\s*(\d+[a-z]?)/i)?.[1]?.toLowerCase();
  const street = address
    .replace(/^\s*\d+[a-z]?/i, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
  const text = label.toLowerCase();
  if (number && !new RegExp(`\\b${number}\\b`).test(text)) return false;
  return street.length === 0 || text.includes(street);
}

function photonLabel(
  properties: { name?: string; housenumber?: string; street?: string; postcode?: string },
  fallback: string,
): string {
  const number = properties.housenumber?.trim();
  const street = properties.street?.trim() || properties.name?.trim();
  const line =
    number && street && !street.toLowerCase().startsWith(number.toLowerCase())
      ? `${number} ${street}`
      : street || fallback;
  const postcode = properties.postcode?.trim();
  if (!postcode || line.toUpperCase().includes(postcode.toUpperCase())) return line;
  return `${line}, ${postcode}`;
}

async function importFreehold(
  adminDistrict: string,
  latitude: number,
  longitude: number,
): Promise<{ boundary: Point[] | null; reason: string | null; year: number; simplified: boolean }> {
  const { persistentParcelCache, titleAt } = await import("./titles");
  if (persistentParcelCache()) {
    const cached = await importCachedFreehold(adminDistrict, latitude, longitude);
    if (cached.boundary || cached.reason === PLOT_NONE || cached.reason === PLOT_TOO_LARGE) {
      return { ...cached, simplified: false };
    }
  }
  const titles = await titleAt(latitude, longitude);
  if (titles.ok && titles.rings.length > 0) {
    const outline = selectPlotBoundary(titles.rings, 0, 0, (east, north) => ({
      x: east,
      y: north,
    }));
    return {
      boundary: outline.boundary,
      reason: outline.reason,
      year: titles.year,
      simplified: true,
    };
  }
  return {
    boundary: null,
    reason: titles.ok ? PLOT_NONE : titles.reason,
    year: titles.ok ? titles.year : new Date().getFullYear(),
    simplified: true,
  };
}

async function importCachedFreehold(
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
  const street = parts[1];
  const line = street && /^\d+[a-z]?$/i.test(first) ? `${first} ${street}` : first;
  const postcode = parts.find((part) => /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(part));
  if (!postcode || postcode.toUpperCase() === line.toUpperCase()) return line;
  return `${line}, ${postcode}`;
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
