import { describe, expect, it } from "vite-plus/test";
import type { Garden, Point } from "#/domain/types";
import type { AdjustGesture } from "../tools";
import { adjustShape } from "./adjust-shape";
import type { DrawSession } from "./draw-session";

function bed(id: string, name: string, y: number) {
  return {
    id,
    name,
    lightOverride: null,
    points: [
      { x: -2, y },
      { x: 2, y },
      { x: 2, y: y + 2 },
      { x: -2, y: y + 2 },
    ],
  };
}

function session(selectedBedId: string) {
  const garden = {
    beds: [bed("south", "South bed", -6), bed("north", "North bed", 3)],
    blocks: [],
    placements: [],
  } as unknown as Garden;
  const state = {
    bedId: selectedBedId,
    blockId: null as string | null,
    note: null as string | null,
  };
  const adjustRef = { current: null as AdjustGesture | null };
  const drawing = {
    garden,
    view: "plan",
    selectedBedId,
    selectedBlockId: null,
    adjustRef,
    setSelectedBedId: (id: string) => {
      state.bedId = id;
      drawing.selectedBedId = id;
    },
    setSelectedBlockId: (id: string | null) => {
      state.blockId = id;
    },
    setDrawNote: (note: string | null) => {
      state.note = note;
    },
  } as unknown as DrawSession;
  return { drawing, state, adjustRef };
}

describe("adjust handles", () => {
  const overNorth: Point = { x: 0, y: 4 };

  it("keeps the selected bed when a turn handle overlaps another bed", () => {
    const { drawing, state, adjustRef } = session("south");
    adjustShape(drawing, "rotate", overNorth, "down", undefined, true);
    expect(state.bedId).toBe("south");
    expect(state.blockId).toBeNull();
    expect(adjustRef.current?.bedId).toBe("south");
    expect(adjustRef.current?.kind).toBe("rotate");
  });

  it("starts turning the bed under the pointer when the drag is not from a handle", () => {
    const { drawing, state, adjustRef } = session("south");
    adjustShape(drawing, "rotate", overNorth, "down");
    expect(state.bedId).toBe("north");
    expect(adjustRef.current?.bedId).toBe("north");
  });
});
