export interface CouncilFile {
  name: string;
  path: string;
}

const GENERIC = new Set([
  "council",
  "borough",
  "district",
  "county",
  "metropolitan",
  "royal",
  "corporation",
  "unitary",
  "authority",
  "the",
  "of",
  "and",
  "city",
  "upon",
  "under",
]);

export function councilsFromDownloadPage(html: string): CouncilFile[] {
  const councils: CouncilFile[] = [];
  const pattern = /<th[^>]*>\s*([^<]+?)\s*<\/th>[\s\S]*?href="([^"]+\.zip)"/g;
  for (const match of html.matchAll(pattern)) {
    const name = match[1]?.replace(/\s+/g, " ").trim();
    const filePath = match[2];
    if (!name || !filePath) continue;
    councils.push({ name, path: filePath });
  }
  return councils;
}

export function matchCouncil(adminDistrict: string, councils: CouncilFile[]): CouncilFile | null {
  const wanted = tokens(adminDistrict);
  if (wanted.length === 0) return null;
  const keyed = councils.map((council) => ({ council, tokens: tokens(council.name) }));
  const exact = keyed.filter((entry) => sameTokens(entry.tokens, wanted));
  if (exact.length === 1) return exact[0]?.council ?? null;
  if (exact.length > 1) return null;
  const containing = keyed.filter((entry) => containsTokens(entry.tokens, wanted));
  if (containing.length === 1) return containing[0]?.council ?? null;
  const contained = keyed.filter(
    (entry) => entry.tokens.length > 0 && containsTokens(wanted, entry.tokens),
  );
  if (contained.length === 1) return contained[0]?.council ?? null;
  const richest = richestMatch(contained);
  return richest?.council ?? null;
}

export interface NearbyPlot {
  ring: Array<[number, number]>;
  easting: number;
  northing: number;
  width: number;
  depth: number;
  distance: number;
}

export function exteriorRingsNear(
  gml: string,
  easting: number,
  northing: number,
): Array<Array<[number, number]>> {
  const rings: Array<Array<[number, number]>> = [];
  const pattern = /<gml:exterior>\s*<gml:LinearRing>\s*<gml:posList>([^<]+)<\/gml:posList>/g;
  for (const match of gml.matchAll(pattern)) {
    const ring = parsePairs(match[1] ?? "");
    if (ring.length < 3 || distanceToBox(easting, northing, ringBox(ring)) > 0) continue;
    rings.push(ring);
  }
  return rings;
}

export function plotsAround(
  gml: string,
  easting: number,
  northing: number,
  pad: number,
): NearbyPlot[] {
  const plots: NearbyPlot[] = [];
  const pattern = /<gml:exterior>\s*<gml:LinearRing>\s*<gml:posList>([^<]+)<\/gml:posList>/g;
  for (const match of gml.matchAll(pattern)) {
    const ring = parsePairs(match[1] ?? "");
    if (ring.length < 3) continue;
    const box = ringBox(ring);
    const span = Math.max(box.maxEast - box.minEast, box.maxNorth - box.minNorth);
    if (span < 12 || span > 160) continue;
    const distance = distanceToBox(easting, northing, box);
    if (distance > pad) continue;
    const inside = interiorPoint(ring);
    plots.push({
      ring,
      easting: inside[0],
      northing: inside[1],
      width: Math.round(box.maxEast - box.minEast),
      depth: Math.round(box.maxNorth - box.minNorth),
      distance,
    });
  }
  return plots.sort((left, right) => left.distance - right.distance);
}

export function datasetYear(gml: string): number {
  const match = gml.match(/timeStamp="(\d{4})/);
  const year = Number(match?.[1]);
  return Number.isInteger(year) ? year : new Date().getFullYear();
}

function richestMatch(
  entries: Array<{ council: CouncilFile; tokens: string[] }>,
): { council: CouncilFile; tokens: string[] } | null {
  let best: { council: CouncilFile; tokens: string[] } | null = null;
  let tied = false;
  for (const entry of entries) {
    if (!best || entry.tokens.length > best.tokens.length) {
      best = entry;
      tied = false;
    } else if (entry.tokens.length === best.tokens.length) {
      tied = true;
    }
  }
  return tied ? null : best;
}

function tokens(name: string): string[] {
  const words = name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word && !GENERIC.has(word));
  return [...new Set(words)].sort();
}

function sameTokens(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((token, index) => token === right[index]);
}

function containsTokens(container: string[], needed: string[]): boolean {
  return needed.every((token) => container.includes(token));
}

function parsePairs(posList: string): Array<[number, number]> {
  const values = posList.trim().split(/\s+/).map(Number);
  const ring: Array<[number, number]> = [];
  for (let index = 0; index + 1 < values.length; index += 2) {
    const easting = values[index];
    const northing = values[index + 1];
    if (easting == null || northing == null) continue;
    if (!Number.isFinite(easting) || !Number.isFinite(northing)) return [];
    ring.push([easting, northing]);
  }
  return ring;
}

function ringBox(ring: Array<[number, number]>) {
  let minEast = Infinity;
  let maxEast = -Infinity;
  let minNorth = Infinity;
  let maxNorth = -Infinity;
  for (const [pointEast, pointNorth] of ring) {
    minEast = Math.min(minEast, pointEast);
    maxEast = Math.max(maxEast, pointEast);
    minNorth = Math.min(minNorth, pointNorth);
    maxNorth = Math.max(maxNorth, pointNorth);
  }
  return { minEast, maxEast, minNorth, maxNorth };
}

function distanceToBox(
  easting: number,
  northing: number,
  box: { minEast: number; maxEast: number; minNorth: number; maxNorth: number },
): number {
  const east =
    easting < box.minEast
      ? box.minEast - easting
      : easting > box.maxEast
        ? easting - box.maxEast
        : 0;
  const north =
    northing < box.minNorth
      ? box.minNorth - northing
      : northing > box.maxNorth
        ? northing - box.maxNorth
        : 0;
  return Math.hypot(east, north);
}

function interiorPoint(ring: Array<[number, number]>): [number, number] {
  let easting = 0;
  let northing = 0;
  for (const [pointEast, pointNorth] of ring) {
    easting += pointEast;
    northing += pointNorth;
  }
  easting /= ring.length;
  northing /= ring.length;
  const candidates: Array<[number, number]> = [[easting, northing]];
  for (const [pointEast, pointNorth] of ring) {
    candidates.push([(easting + pointEast) / 2, (northing + pointNorth) / 2]);
  }
  for (const candidate of candidates) {
    if (contains(candidate[0], candidate[1], ring)) return candidate;
  }
  return [easting, northing];
}

function contains(easting: number, northing: number, ring: Array<[number, number]>): boolean {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const current = ring[index];
    const prior = ring[previous];
    if (!current || !prior) continue;
    const crosses =
      current[1] > northing !== prior[1] > northing &&
      easting <
        ((prior[0] - current[0]) * (northing - current[1])) / (prior[1] - current[1]) + current[0];
    if (crosses) inside = !inside;
  }
  return inside;
}
