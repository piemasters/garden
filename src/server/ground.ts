import { fromLocalMetres } from "#/domain/geometry";
import { describeSoilReading, parseBgsFeatureInfo, soilFromBgs } from "#/domain/soil";
import { fitSlope, slopeSamplePoints, type SlopeSample } from "#/domain/slope";
import type { GroundSlope, Point, SoilType } from "#/domain/types";

const EUDEM_ATTRIBUTION =
  "Ground slope from EU-DEM v1.1, produced using Copernicus data and information funded by the European Union.";
const COPERNICUS_ATTRIBUTION = "Ground slope from the Copernicus DEM GLO-90, via Open-Meteo.";

export async function suggestSoil(
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

export async function suggestSlope(
  latitude: number,
  longitude: number,
  boundary: Point[] | null,
): Promise<{ slope: GroundSlope; attribution: string | null }> {
  const local = slopeSamplePoints(boundary);
  const geographic = local.map((point) => fromLocalMetres(point, latitude, longitude));
  const sources = [
    { read: elevationsFromEuDem, attribution: EUDEM_ATTRIBUTION },
    { read: elevationsFromOpenMeteo, attribution: COPERNICUS_ATTRIBUTION },
  ];
  for (const source of sources) {
    const readings = await source.read(geographic);
    if (!readings) continue;
    const samples: SlopeSample[] = [];
    local.forEach((point, index) => {
      const elevation = readings[index];
      if (typeof elevation === "number") samples.push({ ...point, elevation });
    });
    const slope = fitSlope(samples);
    if (slope.kind !== "unknown") return { slope, attribution: source.attribution };
  }
  return { slope: { kind: "unknown" }, attribution: null };
}

async function elevationsFromEuDem(
  points: Array<{ latitude: number; longitude: number }>,
): Promise<Array<number | null> | null> {
  const url = new URL("https://api.opentopodata.org/v1/eudem25m");
  url.searchParams.set(
    "locations",
    points.map((point) => `${point.latitude},${point.longitude}`).join("|"),
  );
  const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    status?: string;
    results?: Array<{ elevation?: number | null }>;
  };
  if (body.status !== "OK" || body.results?.length !== points.length) return null;
  return body.results.map((row) => (typeof row.elevation === "number" ? row.elevation : null));
}

async function elevationsFromOpenMeteo(
  points: Array<{ latitude: number; longitude: number }>,
): Promise<Array<number | null> | null> {
  const url = new URL("https://api.open-meteo.com/v1/elevation");
  url.searchParams.set("latitude", points.map((point) => point.latitude).join(","));
  url.searchParams.set("longitude", points.map((point) => point.longitude).join(","));
  const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!response.ok) return null;
  const body = (await response.json()) as { elevation?: number[] };
  if (!body.elevation || body.elevation.length !== points.length) return null;
  return body.elevation.map((elevation) => (typeof elevation === "number" ? elevation : null));
}
