import type { AddressChoice, SiteLookup } from "#/server/site";

export type FoundSite = Extract<SiteLookup, { ok: true }>;

export type FoundResults = {
  name: string;
  address: string;
  postcode: string;
  site: FoundSite;
};

export type PlotMatch = FoundResults & {
  site: FoundSite & { choices: AddressChoice[] };
};

export function isPlotMatch(found: FoundResults | null): found is PlotMatch {
  return Boolean(found?.site.choices && found.site.choices.length > 0);
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Try again.";
}
