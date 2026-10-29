import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { Garden } from "#/domain/types";
import { fetchBuildings } from "#/server/buildings";

export function useLoadedBuildings(
  garden: Garden,
  update: (recipe: (current: Garden) => Garden) => void,
) {
  const appliedBuildings = useRef(false);
  const buildings = useQuery({
    queryKey: ["buildings", garden.id],
    enabled: !garden.buildingsLoaded,
    queryFn: () =>
      fetchBuildings({
        data: {
          latitude: garden.site.latitude,
          longitude: garden.site.longitude,
        },
      }),
  });

  useEffect(() => {
    if (garden.buildingsLoaded || appliedBuildings.current || !buildings.isFetched) return;
    appliedBuildings.current = true;
    const result = buildings.data;
    const buildingError =
      result == null
        ? "Building outlines could not be loaded. You can still draw shade blocks yourself."
        : result.ok
          ? null
          : result.error;
    update((current) => ({
      ...current,
      buildingsLoaded: true,
      buildingError,
      blocks: [
        ...(result?.ok ? result.blocks : []),
        ...current.blocks.filter((block) => block.source === "user"),
      ],
    }));
  }, [buildings.data, buildings.isFetched, garden.buildingsLoaded, update]);
}
