import type { LayerGroup, Map as LeafletMap, PathOptions } from "leaflet";
import type { AddressChoice } from "#/server/site";
import { fromLocalMetres, smallestOutlineAt, toLocalMetres } from "#/domain/geometry";
import type { loadLeaflet } from "#/domain/leaflet";

type Leaflet = Awaited<ReturnType<typeof loadLeaflet>>;

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

export function drawPlots({
  leaflet: L,
  map,
  plots,
  choices,
  originLatitude,
  originLongitude,
  addressLabel,
  fit,
  onChoose,
}: {
  leaflet: Leaflet;
  map: LeafletMap;
  plots: LayerGroup;
  choices: AddressChoice[];
  originLatitude: number;
  originLongitude: number;
  addressLabel?: string | null;
  fit: boolean;
  onChoose: (choice: AddressChoice) => void;
}) {
  plots.clearLayers();
  const positions: [number, number][] = [];
  let highlighted: ReturnType<Leaflet["polygon"]> | undefined;
  for (const [index, choice] of choices.entries()) {
    if (choice.outline && choice.outline.length >= 3) {
      const ring = ringFor(choice.outline, originLatitude, originLongitude);
      const fill = FILLS[index % FILLS.length] ?? FILLS[0];
      const resting = plotStyle(choice.matched, fill, false);
      const hovering = plotStyle(choice.matched, fill, true);
      const polygon = L.polygon(ring, {
        ...resting,
        bubblingMouseEvents: false,
      });
      polygon.bindTooltip(choice.matched ? `Matches the address. ${choice.label}` : choice.label, {
        sticky: true,
      });
      polygon.on("mouseover", () => polygon.setStyle(hovering));
      polygon.on("mouseout", () => polygon.setStyle(resting));
      polygon.on("click", (event) => {
        const local = toLocalMetres(
          event.latlng.lat,
          event.latlng.lng,
          originLatitude,
          originLongitude,
        );
        onChoose(smallestOutlineAt(local, choices) ?? choice);
      });
      polygon.addTo(plots);
      if (choice.matched) highlighted = polygon;
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
    marker.on("click", () => onChoose(choice));
    marker.addTo(plots);
    positions.push([choice.latitude, choice.longitude]);
  }
  highlighted?.bringToFront();
  if (highlighted && addressLabel) {
    L.circleMarker([originLatitude, originLongitude], {
      radius: 6,
      color: "#fffaf3",
      weight: 2,
      fillColor: "#1c2822",
      fillOpacity: 1,
      bubblingMouseEvents: false,
    })
      .bindTooltip(addressLabel, { permanent: true, direction: "top", offset: [0, -6] })
      .addTo(plots);
  }
  if (fit && positions.length > 0) {
    map.fitBounds(L.latLngBounds(positions), { padding: [36, 36], maxZoom: 17 });
  } else if (fit) {
    map.setView([originLatitude, originLongitude], 17);
  }
}

function plotStyle(matched: boolean | undefined, fill: string, hovering: boolean): PathOptions {
  if (matched) {
    return {
      color: "#1c2822",
      weight: hovering ? 5 : 4,
      fillColor: "#2c6b4a",
      fillOpacity: hovering ? 0.78 : 0.62,
    };
  }
  return {
    color: "#fffaf3",
    weight: hovering ? 3 : 2,
    fillColor: fill,
    fillOpacity: hovering ? 0.55 : 0.35,
  };
}

function ringFor(
  outline: NonNullable<AddressChoice["outline"]>,
  originLatitude: number,
  originLongitude: number,
): [number, number][] {
  return outline.map((point) => {
    const geographic = fromLocalMetres(point, originLatitude, originLongitude);
    return [geographic.latitude, geographic.longitude];
  });
}
