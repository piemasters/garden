import type { Point, ShadeBlock } from "#/domain/types";
import { useUnits } from "#/lib/units";
import { bedSize } from "../drawing";
import { SELECT_TOOL, type Tool } from "../tools";
import { DuplicateIcon, RemoveIcon } from "./icons";
import { ToolButton } from "./tool-button";

export function SelectionBar({
  tool,
  onTool,
  selectionReady,
  onDuplicate,
  onRemove,
  drawNote,
  selectedBlock,
  selectedBed,
  selectedPlant,
}: {
  tool: Tool;
  onTool: (tool: Tool) => void;
  selectionReady: boolean;
  onDuplicate: () => void;
  onRemove: () => void;
  drawNote: string | null;
  selectedBlock: ShadeBlock | null;
  selectedBed: { name: string; points: Point[] } | null;
  selectedPlant: { name: string; bedName: string | null } | null;
}) {
  const units = useUnits();
  const selection = selectedPlant
    ? plantSelection(selectedPlant)
    : selectedBlock
      ? blockSelection(selectedBlock, units)
      : selectedBed
        ? `${selectedBed.name} · ${bedSize(selectedBed.points, units.unit)}`
        : null;
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        <ToolButton
          compact
          current={tool}
          tool={SELECT_TOOL.tool}
          title={SELECT_TOOL.help}
          onClick={onTool}
        >
          {SELECT_TOOL.label}
        </ToolButton>
        <button
          className="inline-flex min-h-8 items-center gap-1 rounded-full border border-line bg-card px-2 py-1 text-[11px] text-ink hover:border-leaf disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          disabled={!selectionReady}
          title="Copy the selected bed or shade area and place it beside the original."
          onClick={onDuplicate}
        >
          <DuplicateIcon />
          Duplicate
        </button>
        <ToolButton compact current={tool} tool="move" onClick={onTool}>
          Move
        </ToolButton>
        <ToolButton compact current={tool} tool="rotate" onClick={onTool}>
          Rotate
        </ToolButton>
        <ToolButton compact current={tool} tool="scale" onClick={onTool}>
          Scale
        </ToolButton>
        <button
          className="inline-flex min-h-8 items-center gap-1 rounded-full border border-line bg-card px-2 py-1 text-[11px] text-clay hover:border-clay disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          disabled={!selectionReady}
          title="Remove the selected bed or shade area."
          onClick={onRemove}
        >
          <RemoveIcon />
          Remove
        </button>
      </div>
      {tool === "select" || tool === "move" || tool === "rotate" || tool === "scale" ? (
        <div className="hidden lg:block">
          {tool === "select" ? (
            <p className="text-xs leading-snug text-ink/70">{SELECT_TOOL.help}</p>
          ) : null}
          {tool === "move" ? (
            <p className="text-xs leading-snug text-ink/70">
              Drag a bed to move it. The move snaps to {units.length(0.5)}, and plants come with it.
              {drawNote ? ` ${drawNote}` : ""}
            </p>
          ) : null}
          {tool === "rotate" ? (
            <p className="text-xs leading-snug text-ink/70">
              Drag a bed to turn it. The angle snaps to 5°, and plants in the bed turn with it.
              {drawNote ? ` ${drawNote}` : ""}
            </p>
          ) : null}
          {tool === "scale" ? (
            <p className="text-xs leading-snug text-ink/70">
              Drag from the edge of a bed. Pull outward to enlarge it, or inward to shrink it.
              {drawNote ? ` ${drawNote}` : ""}
            </p>
          ) : null}
        </div>
      ) : null}
      {selection ? (
        <p className="text-sm mt-2">
          Selected: <span className="pl-1 text-leaf">{selection}</span>
        </p>
      ) : null}
    </div>
  );
}

function blockSelection(block: ShadeBlock, units: ReturnType<typeof useUnits>): string {
  const name = block.label ?? (block.source === "osm" ? "Building" : "Shade");
  const size = block.line
    ? `${units.length(block.width)} long`
    : units.size(block.width, block.depth);
  return `${name} · ${size}`;
}

function plantSelection(plant: { name: string; bedName: string | null }): string {
  return plant.bedName ? `${plant.name} · ${plant.bedName}` : plant.name;
}
