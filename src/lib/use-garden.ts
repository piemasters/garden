import { useEffect, useState } from "react";
import type { Garden } from "../domain/types";
import { deleteGarden, loadGardens, upsertGarden } from "./gardens";

export function useGardenList() {
  const [ready, setReady] = useState(false);
  const [gardens, setGardens] = useState<Garden[]>([]);

  useEffect(() => {
    setGardens(loadGardens());
    setReady(true);
  }, []);

  const refresh = () => {
    setGardens(loadGardens());
  };
  const remove = (id: string) => {
    deleteGarden(id);
    setGardens(loadGardens());
  };

  return { ready, gardens, refresh, remove };
}

export function useGarden(id: string) {
  const [ready, setReady] = useState(false);
  const [garden, setGarden] = useState<Garden | null>(null);

  useEffect(() => {
    setGarden(loadGardens().find((item) => item.id === id) ?? null);
    setReady(true);
  }, [id]);

  const update = (recipe: (current: Garden) => Garden) => {
    setGarden((current) => {
      if (!current) return current;
      const next = { ...recipe(current), updatedAt: new Date().toISOString() };
      upsertGarden(next);
      return next;
    });
  };

  return { ready, garden, update };
}
