import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import {
  fromLocalMetres,
  smallestOutlineAt,
  toLocalMetres,
} from "../domain/geometry";
import type { AddressChoice } from "../server/site";
import { buttonClass, quietButtonClass } from "./chrome";

const FILLS = [
  "#6f8f72",
  "#c4a574",
  "#8d5b3c",
  "#4f6d7a",
  "#b85c38",
  "#7d8f69",
  "#d08c60",
  "#5c6b4a",
];

type LeafletModule = typeof import("leaflet");

async function loadLeaflet(): Promise<LeafletModule> {
  const loaded = (await import("leaflet")) as LeafletModule & {
    default?: LeafletModule;
  };
  if (typeof loaded.map === "function") return loaded;
  if (loaded.default && typeof loaded.default.map === "function")
    return loaded.default;
  return loaded;
}

export function PlotMap({
  choices,
  originLatitude,
  originLongitude,
  disabled,
  status,
  onChoose,
  onSearch,
}: {
  choices: AddressChoice[];
  originLatitude: number;
  originLongitude: number;
  disabled: boolean;
  status: string | null;
  onChoose: (choice: AddressChoice) => void;
  onSearch: (latitude: number, longitude: number) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const layers = useRef<{
    map?: Leaflet.Map;
    aerial?: Leaflet.TileLayer;
    streets?: Leaflet.TileLayer;
  }>({});
  const renderRef = useRef<(next: AddressChoice[], fit: boolean) => void>(
    () => {},
  );
  const choicesRef = useRef(choices);
  const onChooseRef = useRef(onChoose);
  const onSearchRef = useRef(onSearch);
  const disabledRef = useRef(disabled);
  const baseRef = useRef<"aerial" | "streets">("aerial");
  const [base, setBase] = useState<"aerial" | "streets">("aerial");
  const [mapError, setMapError] = useState<string | null>(null);
  choicesRef.current = choices;
  onChooseRef.current = onChoose;
  onSearchRef.current = onSearch;
  disabledRef.current = disabled;
  baseRef.current = base;

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let disposed = false;
    let map: Leaflet.Map | undefined;
    let frame = 0;
    setMapError(null);

    void loadLeaflet()
      .then((L) => {
        if (disposed) return;
        const view = L.map(element, {
          zoomControl: true,
          attributionControl: false,
        });
        map = view;
        const aerial = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          {
            attribution:
              "Imagery © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
            maxZoom: 19,
          },
        );
        const streets = L.tileLayer(
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution: "© OpenStreetMap contributors",
            maxZoom: 19,
          },
        );
        const plots = L.layerGroup().addTo(view);
        const pin = L.layerGroup().addTo(view);
        layers.current = { map: view, aerial, streets };
        (baseRef.current === "streets" ? streets : aerial).addTo(view);

        let lastPick = 0;
        const choose = (choice: AddressChoice) => {
          if (disabledRef.current) return;
          const now = Date.now();
          if (now - lastPick < 400) return;
          lastPick = now;
          onChooseRef.current(choice);
        };

        const render = (next: AddressChoice[], fit: boolean) => {
          plots.clearLayers();
          const positions: Leaflet.LatLngExpression[] = [];
          for (const [index, choice] of next.entries()) {
            const ring = ringFor(choice, originLatitude, originLongitude);
            if (choice.outline && choice.outline.length >= 3) {
              const polygon = L.polygon(ring, {
                color: "#fffaf3",
                weight: 2,
                fillColor: FILLS[index % FILLS.length] ?? "#6f8f72",
                fillOpacity: 0.35,
                bubblingMouseEvents: false,
              });
              polygon.bindTooltip(choice.label, { sticky: true });
              polygon.on("mouseover", () =>
                polygon.setStyle({ fillOpacity: 0.55, weight: 3 }),
              );
              polygon.on("mouseout", () =>
                polygon.setStyle({ fillOpacity: 0.35, weight: 2 }),
              );
              polygon.on("click", (event) => {
                const local = toLocalMetres(
                  event.latlng.lat,
                  event.latlng.lng,
                  originLatitude,
                  originLongitude,
                );
                choose(smallestOutlineAt(local, next) ?? choice);
              });
              polygon.addTo(plots);
              positions.push(...ring);
              continue;
            }
            const marker = L.circleMarker([choice.latitude, choice.longitude], {
              radius: 8,
              color: "#1e4632",
              weight: 2,
              fillColor: "#2c6b4a",
              fillOpacity: 0.9,
              bubblingMouseEvents: false,
            });
            marker.bindTooltip(choice.label, { sticky: true });
            marker.on("click", () => choose(choice));
            marker.addTo(plots);
            positions.push([choice.latitude, choice.longitude]);
          }
          if (fit && positions.length > 0) {
            view.fitBounds(L.latLngBounds(positions), {
              padding: [36, 36],
              maxZoom: 17,
            });
          } else if (fit) {
            view.setView([originLatitude, originLongitude], 17);
          }
        };
        renderRef.current = render;
        render(choicesRef.current, true);

        view.on("click", (event) => {
          if (disabledRef.current) return;
          const local = toLocalMetres(
            event.latlng.lat,
            event.latlng.lng,
            originLatitude,
            originLongitude,
          );
          if (smallestOutlineAt(local, choicesRef.current)) return;
          pin.clearLayers();
          L.circleMarker(event.latlng, {
            radius: 6,
            color: "#fffaf3",
            weight: 2,
            fillColor: "#a33b32",
            fillOpacity: 1,
          }).addTo(pin);
          onSearchRef.current(event.latlng.lat, event.latlng.lng);
        });
        view.getContainer().style.cursor = disabledRef.current
          ? "wait"
          : "crosshair";
        frame = requestAnimationFrame(() => view.invalidateSize());
      })
      .catch(() => {
        if (!disposed)
          setMapError(
            "The map could not be loaded. Pick a plot from the list.",
          );
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      renderRef.current = () => {};
      layers.current = {};
      map?.remove();
    };
  }, [originLatitude, originLongitude]);

  useEffect(() => {
    renderRef.current(choices, false);
  }, [choices]);

  useEffect(() => {
    const current = layers.current;
    if (!current.map || !current.aerial || !current.streets) return;
    const show = base === "aerial" ? current.aerial : current.streets;
    const hide = base === "aerial" ? current.streets : current.aerial;
    hide.remove();
    show.addTo(current.map);
  }, [base]);

  useEffect(() => {
    const map = layers.current.map;
    if (!map) return;
    map.getContainer().style.cursor = disabled ? "wait" : "crosshair";
  }, [disabled]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          className={base === "aerial" ? buttonClass : quietButtonClass}
          type="button"
          onClick={() => setBase("aerial")}
        >
          Aerial
        </button>
        <button
          className={base === "streets" ? buttonClass : quietButtonClass}
          type="button"
          onClick={() => setBase("streets")}
        >
          Streets
        </button>
      </div>
      <div
        ref={container}
        className="z-0 h-[32rem] w-full overflow-hidden rounded-md border border-line"
        role="application"
        aria-label="Map of freehold plots. Click empty ground to load plots there, or click a plot to import it."
      />
      {status ? <p className="text-sm text-ink/70">{status}</p> : null}
      {mapError ? <p className="text-sm text-clay">{mapError}</p> : null}
      <p className="text-xs text-ink/60">
        Click empty ground to load the freeholds around that spot, then click a
        coloured plot to import it.
      </p>
      <details className="text-xs text-ink/50">
        <summary className="cursor-pointer">Map sources</summary>
        <p className="mt-1">
          Imagery © Esri — Source: Esri, Maxar, Earthstar Geographics, and the
          GIS User Community. Streets © OpenStreetMap contributors.
        </p>
      </details>
    </div>
  );
}

function ringFor(
  choice: AddressChoice,
  originLatitude: number,
  originLongitude: number,
): [number, number][] {
  if (!choice.outline || choice.outline.length < 3) {
    return [[choice.latitude, choice.longitude]];
  }
  return choice.outline.map((point) => {
    const geographic = fromLocalMetres(point, originLatitude, originLongitude);
    return [geographic.latitude, geographic.longitude];
  });
}
