import { useEffect, useState } from "react";
import type { Garden } from "../domain/types";
import { compactLargeFills } from "./fill-cap";
import { deleteGarden, loadSettledGardens, upsertGarden } from "./gardens";

export function useGardenList() {
  const [ready, setReady] = useState(false);
  const [gardens, setGardens] = useState<Garden[]>([]);

  useEffect(() => {
    setGardens(loadSettledGardens());
    setReady(true);
  }, []);

  const refresh = () => {
    setGardens(loadSettledGardens());
  };
  const remove = (id: string) => {
    deleteGarden(id);
    setGardens(loadSettledGardens());
  };

  return { ready, gardens, refresh, remove };
}

export function useGarden(id: string) {
  const [ready, setReady] = useState(false);
  const [garden, setGarden] = useState<Garden | null>(null);

  useEffect(() => {
    setGarden(loadSettledGardens().find((item) => item.id === id) ?? null);
    setReady(true);
  }, [id]);

  const update = (recipe: (current: Garden) => Garden) => {
    setGarden((current) => {
      if (!current) return current;
      const next = compactLargeFills({ ...recipe(current), updatedAt: new Date().toISOString() });
      upsertGarden(next);
      return next;
    });
  };

  return { ready, garden, update };
}
