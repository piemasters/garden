import { isAreaResult } from "#/domain/address-match";
import { fromLocalMetres, toLocalMetres } from "#/domain/geometry";
import type { Point } from "#/domain/types";

export interface AddressChoice {
  label: string;
  latitude: number;
  longitude: number;
  outline?: Point[];
  matched?: boolean;
}

export function metresApart(
  latitude: number,
  longitude: number,
  originLatitude: number,
  originLongitude: number,
): number {
  const point = toLocalMetres(latitude, longitude, originLatitude, originLongitude);
  return Math.hypot(point.x, point.y);
}

export async function searchAddress(
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

interface NominatimPlace {
  lat?: string;
  lon?: string;
  display_name?: string;
  type?: string;
  addresstype?: string;
}
