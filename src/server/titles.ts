import { ringsFromGeometry } from "#/domain/boundary";
import { toLocalMetres } from "#/domain/geometry";
import { searchPolygon, titlePlots, type TitlePlot } from "#/domain/titles";

const SOURCE = "https://www.planning.data.gov.uk/entity.geojson";

export function persistentParcelCache(): boolean {
  // A Netlify function has no council-file cache and no unzip binary. The title API is the lookup there.
  return (
    process.env.NETLIFY !== "true" &&
    !process.env.AWS_LAMBDA_FUNCTION_NAME &&
    !process.env.AWS_EXECUTION_ENV &&
    !process.env.LAMBDA_TASK_ROOT
  );
}

export async function titleAt(
  latitude: number,
  longitude: number,
): Promise<
  { ok: true; rings: Array<Array<[number, number]>>; year: number } | { ok: false; reason: string }
> {
  try {
    const features = await collect(
      new URLSearchParams({
        dataset: "title-boundary",
        latitude: String(latitude),
        longitude: String(longitude),
        limit: "20",
      }),
    );
    return {
      ok: true,
      rings: features.flatMap((feature) => localRings(feature, latitude, longitude)),
      year: datasetYear(features),
    };
  } catch {
    return { ok: false, reason: "Property outlines could not be loaded. Draw the plot yourself." };
  }
}

export async function titlesAround(
  latitude: number,
  longitude: number,
  originLatitude: number,
  originLongitude: number,
  pad: number,
  limit: number,
): Promise<{ ok: true; plots: TitlePlot[] } | { ok: false; reason: string }> {
  try {
    const features = await collect(
      new URLSearchParams({
        dataset: "title-boundary",
        geometry: searchPolygon(latitude, longitude, pad),
        geometry_relation: "intersects",
        limit: "500",
      }),
    );
    const rings = features.flatMap((feature) =>
      localRings(feature, originLatitude, originLongitude).map((ring) =>
        ring.map(([east, north]) => ({ x: east, y: north })),
      ),
    );
    const centre = toLocalMetres(latitude, longitude, originLatitude, originLongitude);
    return { ok: true, plots: titlePlots(rings, centre, pad).slice(0, limit) };
  } catch {
    return { ok: false, reason: "Property outlines could not be loaded. Draw the plot yourself." };
  }
}

interface TitleFeature {
  geometry?: { type?: string; coordinates?: unknown };
  properties?: Record<string, unknown>;
}

async function collect(params: URLSearchParams): Promise<TitleFeature[]> {
  const features: TitleFeature[] = [];
  let url: string | null = `${SOURCE}?${params}`;
  for (let page = 0; url && page < 4; page += 1) {
    const response = await fetch(url, {
      headers: {
        accept: "application/geo+json, application/json",
        "user-agent": "uk-garden-planner/1.0 (personal garden planner)",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Title boundaries responded ${response.status}.`);
    const body = (await response.json()) as {
      features?: TitleFeature[];
      links?: { next?: unknown };
    };
    const batch = body.features ?? [];
    features.push(...batch);
    const next = body.links?.next;
    url =
      typeof next === "string" && next.length > 0 ? next.replace(/^http:\/\//, "https://") : null;
    if (batch.length === 0) break;
  }
  return features;
}

function localRings(
  feature: TitleFeature,
  latitude: number,
  longitude: number,
): Array<Array<[number, number]>> {
  return ringsFromGeometry(feature.geometry, "title").map((ring) =>
    ring.coordinates.map(([pointLongitude, pointLatitude]) => {
      const point = toLocalMetres(pointLatitude, pointLongitude, latitude, longitude);
      return [point.x, point.y];
    }),
  );
}

function datasetYear(features: TitleFeature[]): number {
  let year = new Date().getFullYear();
  for (const feature of features) {
    const entry = feature.properties?.["entry-date"];
    if (typeof entry !== "string") continue;
    const parsed = Number(entry.slice(0, 4));
    if (Number.isInteger(parsed) && parsed > 1900) year = Math.max(year, parsed);
  }
  return year;
}
