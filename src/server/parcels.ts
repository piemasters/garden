import { execFile } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  councilsFromDownloadPage,
  datasetYear,
  exteriorRingsNear,
  matchCouncil,
  plotsAround,
  type CouncilFile,
  type NearbyPlot,
} from "#/domain/parcels";

const BASE = "https://use-land-property-data.service.gov.uk";
const CATALOGUE_URL = `${BASE}/datasets/inspire/download`;
const CATALOGUE_MS = 7 * 24 * 60 * 60 * 1000;
const FILE_MS = 32 * 24 * 60 * 60 * 1000;

export type FreeholdFile =
  | { ok: true; rings: Array<Array<[number, number]>>; year: number }
  | { ok: false; reason: string };

export async function freeholdNearby(
  adminDistrict: string,
  easting: number,
  northing: number,
  pad = 320,
  limit = 48,
): Promise<{ ok: true; year: number; plots: NearbyPlot[] } | { ok: false; reason: string }> {
  const loaded = await loadDistrictGml(adminDistrict);
  if ("reason" in loaded) return { ok: false, reason: loaded.reason };
  return {
    ok: true,
    year: datasetYear(loaded.gml),
    plots: plotsAround(loaded.gml, easting, northing, pad).slice(0, limit),
  };
}

export async function freeholdRings(
  adminDistrict: string,
  easting: number,
  northing: number,
): Promise<FreeholdFile> {
  const loaded = await loadDistrictGml(adminDistrict);
  if ("reason" in loaded) return { ok: false, reason: loaded.reason };
  return {
    ok: true,
    rings: exteriorRingsNear(loaded.gml, easting, northing),
    year: datasetYear(loaded.gml),
  };
}

async function loadDistrictGml(
  adminDistrict: string,
): Promise<{ gml: string } | { reason: string }> {
  try {
    const councils = await councilCatalogue();
    const council = matchCouncil(adminDistrict, councils);
    if (!council) {
      return { reason: "No freehold outline file matches this council. Draw the plot yourself." };
    }
    return { gml: await councilGml(council) };
  } catch {
    return { reason: "Property outlines could not be loaded. Draw the plot yourself." };
  }
}

async function councilCatalogue(): Promise<CouncilFile[]> {
  const file = path.join(cacheDir(), "councils.json");
  const cached = await readCached(file, CATALOGUE_MS);
  if (cached) return JSON.parse(cached) as CouncilFile[];
  const response = await landRegistry(CATALOGUE_URL);
  if (!response.ok) throw new Error("The Land Registry file list did not respond.");
  const councils = councilsFromDownloadPage(await response.text());
  if (councils.length < 100) throw new Error("The Land Registry file list was incomplete.");
  await mkdir(cacheDir(), { recursive: true });
  await writeFile(file, JSON.stringify(councils));
  return councils;
}

async function councilGml(council: CouncilFile): Promise<string> {
  const slug =
    council.path
      .split("/")
      .pop()
      ?.replace(/\.zip$/i, "") || "council";
  const gmlPath = path.join(cacheDir(), `${slug}.gml`);
  const cached = await readCached(gmlPath, FILE_MS);
  if (cached) return cached;
  const response = await landRegistry(new URL(council.path, BASE).href);
  if (!response.ok) throw new Error("The Land Registry download did not respond.");
  await mkdir(cacheDir(), { recursive: true });
  const zipPath = path.join(cacheDir(), `${slug}.zip`);
  await writeFile(zipPath, Buffer.from(await response.arrayBuffer()));
  const listing = await unzipText(["-Z1", zipPath]);
  const entry = listing
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.endsWith(".gml"));
  if (!entry) throw new Error("The Land Registry download has no polygon file.");
  const extracted = await unzipBuffer(["-p", zipPath, entry]);
  await writeFile(gmlPath, extracted);
  return extracted.toString("utf8");
}

function unzipText(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("unzip", args, { encoding: "utf8", maxBuffer: 1024 * 1024 }, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}

function unzipBuffer(args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    execFile(
      "unzip",
      args,
      { encoding: "buffer", maxBuffer: 256 * 1024 * 1024 },
      (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout);
      },
    );
  });
}

async function readCached(file: string, maxAge: number): Promise<string | null> {
  try {
    const info = await stat(file);
    if (Date.now() - info.mtimeMs > maxAge) return null;
    return await readFile(file, "utf8");
  } catch {
    return null;
  }
}

function cacheDir(): string {
  return path.join(process.cwd(), ".cache", "inspire");
}

async function landRegistry(url: string): Promise<Response> {
  const jar = new Map<string, string>();
  let current = url;
  for (let hop = 0; hop < 6; hop += 1) {
    const response = await fetch(current, {
      headers: requestHeaders(jar),
      redirect: "manual",
      signal: AbortSignal.timeout(60_000),
    });
    absorbCookies(jar, response);
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get("location");
    if (!location) throw new Error("The Land Registry download did not redirect.");
    const next = new URL(location, current);
    if (next.host !== new URL(current).host) jar.clear();
    current = next.href;
  }
  throw new Error("The Land Registry download redirected too many times.");
}

function requestHeaders(jar: Map<string, string>): HeadersInit {
  const headers: Record<string, string> = {
    accept: "*/*",
    "user-agent": "uk-garden-planner/1.0 (personal garden planner)",
  };
  if (jar.size > 0) headers.cookie = [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
  return headers;
}

function absorbCookies(jar: Map<string, string>, response: Response) {
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";")[0]?.trim();
    if (!pair) continue;
    const splitAt = pair.indexOf("=");
    if (splitAt <= 0) continue;
    jar.set(pair.slice(0, splitAt), pair.slice(splitAt + 1));
  }
}
