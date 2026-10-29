import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, TileLayer as LeafletTileLayer } from "leaflet";
import type { AddressChoice } from "#/server/site";
import { smallestOutlineAt, toLocalMetres } from "#/domain/geometry";
import { loadLeaflet } from "#/domain/leaflet";
import { drawPlots } from "./plot-draw";

const CLICK_GUARD_MS = 400;

export const AERIAL_ATTRIBUTION =
  "Imagery © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";

export type MapBase = "aerial" | "streets";

export function usePlotMap({
  choices,
  originLatitude,
  originLongitude,
  disabled,
  onChoose,
  onSearch,
  addressLabel,
}: {
  choices: AddressChoice[];
  originLatitude: number;
  originLongitude: number;
  disabled: boolean;
  onChoose: (choice: AddressChoice) => void;
  onSearch: (latitude: number, longitude: number) => void;
  addressLabel?: string | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const layers = useRef<{
    map?: LeafletMap;
    aerial?: LeafletTileLayer;
    streets?: LeafletTileLayer;
  }>({});
  const renderRef = useRef<(next: AddressChoice[], fit: boolean) => void>(() => {});
  const choicesRef = useRef(choices);
  const onChooseRef = useRef(onChoose);
  const onSearchRef = useRef(onSearch);
  const disabledRef = useRef(disabled);
  const addressRef = useRef(addressLabel);
  const baseRef = useRef<MapBase>("aerial");
  const [base, setBase] = useState<MapBase>("aerial");
  const [mapError, setMapError] = useState<string | null>(null);
  choicesRef.current = choices;
  onChooseRef.current = onChoose;
  onSearchRef.current = onSearch;
  disabledRef.current = disabled;
  addressRef.current = addressLabel;
  baseRef.current = base;

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let disposed = false;
    let map: LeafletMap | undefined;
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
          { attribution: AERIAL_ATTRIBUTION, maxZoom: 19 },
        );
        const streets = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: OSM_ATTRIBUTION,
          maxZoom: 19,
        });
        const plots = L.layerGroup().addTo(view);
        const pin = L.layerGroup().addTo(view);
        layers.current = { map: view, aerial, streets };
        (baseRef.current === "streets" ? streets : aerial).addTo(view);

        let lastPick = 0;
        const choose = (choice: AddressChoice) => {
          if (disabledRef.current) return;
          const now = Date.now();
          if (now - lastPick < CLICK_GUARD_MS) return;
          lastPick = now;
          onChooseRef.current(choice);
        };
        const render = (next: AddressChoice[], fit: boolean) => {
          drawPlots({
            leaflet: L,
            map: view,
            plots,
            choices: next,
            originLatitude,
            originLongitude,
            addressLabel: addressRef.current,
            fit,
            onChoose: choose,
          });
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
        view.getContainer().style.cursor = disabledRef.current ? "wait" : "crosshair";
        frame = requestAnimationFrame(() => view.invalidateSize());
      })
      .catch(() => {
        if (!disposed) setMapError("The map could not be loaded. Pick a plot from the list.");
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

  return { container, base, setBase, mapError };
}
