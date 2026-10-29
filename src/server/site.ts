import { createServerFn } from "@tanstack/react-start";
import { choiceMatchingAddress } from "#/domain/address-match";
import {
  outlineAttribution,
  PLOT_NONE,
  PLOT_TOO_LARGE,
  selectPlotBoundary,
} from "#/domain/boundary";
import { fromLocalMetres, smallestOutlineAt, toLocalMetres } from "#/domain/geometry";
import type { TitlePlot } from "#/domain/titles";
import { gridToWgs84, wgs84ToGrid } from "#/domain/osgb";
import type { GroundSlope, Point, SoilType } from "#/domain/types";
import { metresApart, searchAddress, type AddressChoice } from "./address";
import { suggestSlope, suggestSoil } from "./ground";

export type { AddressChoice };

export interface SiteQuery {
  address: string;
  postcode: string;
  selected?: AddressChoice | null;
}

export interface PlotsAroundQuery {
  postcode: string;
  latitude: number;
  longitude: number;
  originLatitude: number;
  originLongitude: number;
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
      /** Null while the address is still being chosen. */
      slope: GroundSlope | null;
    }
  | { ok: false; error: string };

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

function joinAttribution(...parts: Array<string | null>): string | null {
  const text = parts.filter((part): part is string => Boolean(part && part.length > 0)).join(" ");
  return text.length > 0 ? text : null;
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
      let slope: GroundSlope | null = null;
      let slopeAttribution: string | null = null;
      if (!located.choices) {
        try {
          soilSuggestion = await suggestSoil(located.latitude, located.longitude);
        } catch {
          soilSuggestion = null;
        }
        try {
          const ground = await suggestSlope(located.latitude, located.longitude, located.boundary);
          slope = ground.slope;
          slopeAttribution = ground.attribution;
        } catch {
          slope = { kind: "unknown" };
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
        attribution: joinAttribution(located.attribution, slopeAttribution),
        choices: located.choices,
        slope,
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
  .validator((input: PlotsAroundQuery) => ({
    postcode: input.postcode.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    originLatitude: input.originLatitude,
    originLongitude: input.originLongitude,
  }))
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
