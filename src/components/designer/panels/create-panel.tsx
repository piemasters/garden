import type { FormEvent } from "react";
import { BUILTIN_BED_PRESETS, type BedPreset } from "#/lib/bed-presets";
import type { ShadeBlock } from "#/domain/types";
import { useUnits } from "#/lib/units";
import { presetIsLine } from "../drawing";
import { BED_TOOLS, CUSTOM_SHADE, SHADE_PRESETS, type ShadePreset, type Tool } from "../tools";
import { ShadeAreaIcon } from "./icons";
import { ShadeHeight } from "./shade-height";
import { ToolButton } from "./tool-button";
import { Button } from "#/components/generic/button";

export function CreatePanel({
  tool,
  onTool,
  drawNote,
  draftCount,
  onFinishBed,
  presets,
  preset,
  onArmPreset,
  onDeletePreset,
  presetWidth,
  presetDepth,
  onPresetWidth,
  onPresetDepth,
  onAddPreset,
  presetError,
  shadePreset,
  onArmShade,
  hasOutline,
  selectedBlock,
  onHeight,
}: {
  tool: Tool;
  onTool: (tool: Tool) => void;
  drawNote: string | null;
  draftCount: number;
  onFinishBed: () => void;
  presets: BedPreset[];
  preset: { width: number; depth: number } | null;
  onArmPreset: (width: number, depth: number) => void;
  onDeletePreset: (preset: BedPreset) => void;
  presetWidth: string;
  presetDepth: string;
  onPresetWidth: (value: string) => void;
  onPresetDepth: (value: string) => void;
  onAddPreset: (event: FormEvent) => void;
  presetError: string | null;
  shadePreset: ShadePreset | null;
  onArmShade: (preset: ShadePreset) => void;
  hasOutline: boolean;
  selectedBlock: ShadeBlock | null;
  onHeight: (height: number) => void;
}) {
  const units = useUnits();
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-medium text-ink/60">Create Beds</p>
        <div className="flex flex-wrap gap-1">
          {BED_TOOLS.map((item) => (
            <ToolButton
              key={item.tool}
              compact
              current={tool}
              tool={item.tool}
              title={item.help}
              onClick={onTool}
            >
              {item.label}
            </ToolButton>
          ))}
        </div>
        {BED_TOOLS.some((item) => item.tool === tool) ? (
          <p className="text-xs leading-snug text-ink/70">
            {BED_TOOLS.find((item) => item.tool === tool)?.help}
          </p>
        ) : null}
        {tool === "freeform" && drawNote ? <p className="text-xs text-ink/70">{drawNote}</p> : null}
        {tool === "bed" ? (
          <ToolButton compact disabled={draftCount < 3} onClick={onFinishBed}>
            Finish bed
          </ToolButton>
        ) : null}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-ink/60">Bed Presets</p>
        <div className="flex flex-wrap gap-1">
          {[...BUILTIN_BED_PRESETS, ...presets].map((item) => {
            const armed =
              tool === "place" &&
              preset !== null &&
              Math.abs(preset.width - item.widthM) < 0.05 &&
              Math.abs(preset.depth - item.depthM) < 0.05;
            const custom = !BUILTIN_BED_PRESETS.some((builtin) => builtin.id === item.id);
            return (
              <span key={item.id} className="inline-flex items-center">
                <ToolButton
                  compact
                  selected={armed}
                  onClick={() => onArmPreset(item.widthM, item.depthM)}
                >
                  {units.size(item.widthM, item.depthM)}
                </ToolButton>
                {custom ? (
                  <button
                    className="ml-0.5 min-h-8 px-1 text-xs text-ink/50 hover:text-ink"
                    type="button"
                    aria-label={`Remove ${units.size(item.widthM, item.depthM)} preset`}
                    onClick={() => onDeletePreset(item)}
                  >
                    ×
                  </button>
                ) : null}
              </span>
            );
          })}
        </div>
        {tool === "place" && preset ? (
          <p className="text-xs leading-snug text-ink/70">
            Click to place a north-south {units.size(preset.width, preset.depth)} bed, or drag to
            aim it. The angle snaps to 5°.
          </p>
        ) : null}
        <form className="flex flex-wrap items-end gap-1" onSubmit={onAddPreset}>
          <PresetSizeField label="Width" value={presetWidth} onChange={onPresetWidth} />
          <PresetSizeField label="Depth" value={presetDepth} onChange={onPresetDepth} />
          <Button variant="secondary" compact type="submit">
            Add
          </Button>
        </form>
        {presetError ? <p className="text-xs text-clay">{presetError}</p> : null}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-ink/60">Create Shade Areas</p>
        <div className="flex flex-wrap gap-1">
          {SHADE_PRESETS.map((item) => (
            <ToolButton
              key={item.label}
              compact
              selected={shadePreset?.label === item.label}
              icon={<ShadeAreaIcon kind={item.label} />}
              onClick={() => onArmShade(item)}
            >
              {item.label}
            </ToolButton>
          ))}
          <ToolButton
            compact
            selected={tool === "block" && !shadePreset}
            icon={<ShadeAreaIcon kind="Custom" />}
            title={CUSTOM_SHADE.help}
            onClick={() => onTool(CUSTOM_SHADE.tool)}
          >
            {CUSTOM_SHADE.label}
          </ToolButton>
        </div>
        {shadePreset ? (
          <p className="text-xs leading-snug text-ink/70">
            {presetIsLine(shadePreset)
              ? hasOutline
                ? `Drag to draw the ${shadePreset.label.toLowerCase()} as long as you need. Drag either end to stretch it. Near the property outline it snaps to that line.`
                : `Drag to draw the ${shadePreset.label.toLowerCase()} as long as you need. Drag either end to stretch it. Its width stays the same.`
              : `Click to place a ${shadePreset.label.toLowerCase()}, or drag to aim its long side.`}
          </p>
        ) : tool === "block" ? (
          <p className="text-xs leading-snug text-ink/70">{CUSTOM_SHADE.help}</p>
        ) : null}
        {selectedBlock ? <ShadeHeight height={selectedBlock.height} onHeight={onHeight} /> : null}
      </div>
    </div>
  );
}

function PresetSizeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { unit } = useUnits();
  return (
    <label className="flex flex-col text-[11px] text-ink/60">
      {label} ({unit})
      <input
        className="mt-1 w-16 rounded-md border border-line bg-card px-2 py-1 text-sm text-ink outline-none focus:border-leaf"
        inputMode="decimal"
        value={value}
        aria-label={`${label} in ${unit === "ft" ? "feet" : "metres"}`}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
