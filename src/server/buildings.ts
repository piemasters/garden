import { createServerFn } from "@tanstack/react-start";
import { buildingHeight, footprintBlock, toLocalMetres } from "#/domain/geometry";
import type { ShadeBlock } from "#/domain/types";

export type BuildingLookup = { ok: true; blocks: ShadeBlock[] } | { ok: false; error: string };

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
