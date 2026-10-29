import type { AddressChoice, SiteLookup } from "#/server/site";

export type FoundSite = Extract<SiteLookup, { ok: true }>;

export type FoundResults = {
  name: string;
  address: string;
  postcode: string;
  site: FoundSite;
} | null;

export type LookupSitePayload = {
  address: string;
  postcode: string;
  selected?: AddressChoice | null;
};

export type LookupPlotsPayload = {
  postcode: string;
  latitude: number;
  longitude: number;
  originLatitude: number;
  originLongitude: number;
};
