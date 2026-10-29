type LeafletModule = typeof import("leaflet");

export async function loadLeaflet(): Promise<LeafletModule> {
  const loaded = (await import("leaflet")) as LeafletModule & {
    default?: LeafletModule;
  };
  if (typeof loaded.map === "function") return loaded;
  if (loaded.default && typeof loaded.default.map === "function") return loaded.default;
  return loaded;
}
