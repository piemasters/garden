import type { Dispatch, SetStateAction } from "react";
import { translatePoints } from "#/domain/geometry";
import type { Garden, GroundSurface, SunLevel } from "#/domain/types";
import { copyName } from "./drawing";
import type { ShapeMenu as ShapeMenuState, Tool } from "./tools";

type EditSession = {
  garden: Garden;
  update: (recipe: (current: Garden) => Garden) => void;
  setSelectedBedId: Dispatch<SetStateAction<string | null>>;
  setSelectedBlockId: Dispatch<SetStateAction<string | null>>;
  setSelectedPlacementId: Dispatch<SetStateAction<string | null>>;
  setTool: (tool: Tool) => void;
  setMenu: Dispatch<SetStateAction<ShapeMenuState | null>>;
};

export function setBedColour(session: EditSession, id: string, color: string) {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return;
  session.update((current) => ({
    ...current,
    beds: current.beds.map((bed) =>
      bed.id === id ? { ...bed, color: color.toLowerCase(), surface: undefined } : bed,
    ),
  }));
}

export function setBedSurface(session: EditSession, id: string, surface: GroundSurface) {
  session.update((current) => ({
    ...current,
    beds: current.beds.map((bed) => (bed.id === id ? { ...bed, surface, color: undefined } : bed)),
  }));
}

export function setBedLight(session: EditSession, id: string, lightOverride: SunLevel | null) {
  session.update((current) => ({
    ...current,
    beds: current.beds.map((bed) => (bed.id === id ? { ...bed, lightOverride } : bed)),
  }));
}

export function setBedRaised(session: EditSession, id: string, raised: boolean) {
  session.update((current) => ({
    ...current,
    beds: current.beds.map((bed) => (bed.id === id ? { ...bed, raised } : bed)),
  }));
}

export function renameBed(session: EditSession, id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  session.update((current) => ({
    ...current,
    beds: current.beds.map((bed) => (bed.id === id ? { ...bed, name: trimmed } : bed)),
  }));
}

export function duplicateBed(session: EditSession, id: string) {
  const bed = session.garden.beds.find((item) => item.id === id);
  if (!bed) return;
  const copyId = crypto.randomUUID();
  const shift = { x: 1, y: 0 };
  session.update((current) => ({
    ...current,
    beds: [
      ...current.beds,
      {
        ...bed,
        id: copyId,
        name: copyName(
          bed.name,
          current.beds.map((item) => item.name),
        ),
        points: translatePoints(bed.points, shift),
      },
    ],
    placements: [
      ...current.placements,
      ...current.placements
        .filter((item) => item.bedId === id)
        .flatMap((item) => {
          const moved = translatePoints([item], shift)[0];
          return moved
            ? [
                {
                  ...item,
                  id: crypto.randomUUID(),
                  bedId: copyId,
                  x: moved.x,
                  y: moved.y,
                },
              ]
            : [];
        }),
    ],
  }));
  session.setSelectedBedId(copyId);
  session.setSelectedPlacementId(null);
  session.setSelectedBlockId(null);
  session.setTool("select");
  session.setMenu(null);
}

export function removeBed(session: EditSession, id: string) {
  session.update((current) => ({
    ...current,
    beds: current.beds.filter((item) => item.id !== id),
    placements: current.placements.filter((item) => item.bedId !== id),
  }));
  session.setSelectedBedId((current) => (current === id ? null : current));
  session.setMenu(null);
}

export function duplicateBlock(session: EditSession, id: string) {
  const block = session.garden.blocks.find((item) => item.id === id);
  if (!block) return;
  const copyId = crypto.randomUUID();
  session.update((current) => ({
    ...current,
    blocks: [
      ...current.blocks,
      {
        ...block,
        id: copyId,
        x: block.x + 1,
        y: block.y,
        source: "user",
        label: copyName(
          block.label ?? "Shade block",
          current.blocks.map((item) => item.label ?? "Shade block"),
        ),
      },
    ],
  }));
  session.setSelectedBlockId(copyId);
  session.setSelectedBedId(null);
  session.setSelectedPlacementId(null);
  session.setTool("select");
  session.setMenu(null);
}

export function removeBlock(session: EditSession, id: string) {
  session.update((current) => ({
    ...current,
    blocks: current.blocks.filter((item) => item.id !== id),
  }));
  session.setSelectedBlockId((current) => (current === id ? null : current));
  session.setMenu(null);
}

export function removePlant(session: EditSession, id: string) {
  session.update((current) => ({
    ...current,
    placements: current.placements.filter((item) => item.id !== id),
  }));
  session.setSelectedPlacementId((current) => (current === id ? null : current));
  session.setMenu(null);
}

export function removePlantsOf(session: EditSession, plantId: string, bedId?: string) {
  session.update((current) => ({
    ...current,
    placements: current.placements.filter((item) => {
      if (item.plantId !== plantId) return true;
      return bedId != null && item.bedId !== bedId;
    }),
  }));
  session.setSelectedPlacementId((current) => {
    const selected = session.garden.placements.find((item) => item.id === current);
    if (!selected || selected.plantId !== plantId) return current;
    if (bedId != null && selected.bedId !== bedId) return current;
    return null;
  });
  session.setMenu(null);
}
