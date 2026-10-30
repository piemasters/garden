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
  selectedBlock,
  selectedBed,
  selectedPlant,
}: {
  tool: Tool;
  onTool: (tool: Tool) => void;
  selectionReady: boolean;
  onDuplicate: () => void;
  onRemove: () => void;
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
        <ToolButton
          compact
          icon={<DuplicateIcon />}
          disabled={!selectionReady}
          title="Copy the selected bed or shade area and place it beside the original."
          onClick={onDuplicate}
        >
          Duplicate
        </ToolButton>
        <ToolButton
          compact
          danger
          icon={<RemoveIcon />}
          disabled={!selectionReady}
          title="Remove the selected bed or shade area."
          onClick={onRemove}
        >
          Remove
        </ToolButton>
        {/* <ToolButton compact current={tool} tool="move" onClick={onTool}>
          Move
        </ToolButton>
        <ToolButton compact current={tool} tool="rotate" onClick={onTool}>
          Rotate
        </ToolButton>
        <ToolButton compact current={tool} tool="scale" onClick={onTool}>
          Scale
        </ToolButton> */}
      </div>
      {selection ? (
        <p className="text-sm mt-4">
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
