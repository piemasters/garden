import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { SOIL_LABEL, SUN_LABEL } from "#/domain/labels";
import { midsummerSamples } from "#/domain/sun";
import type { Garden, ShadeBlock } from "#/domain/types";
import { useUnits } from "#/lib/units";
import { SURFACE_LABEL } from "#/domain/surface";
import { bedSize, resolvedLight } from "../drawing";
import type { AdjustPreview, ShapeMenu } from "../tools";
import { bedSwatch } from "./bed-colours";
import { SettingsIcon, ShadeAreaIcon } from "./icons";
import { twMerge } from "tailwind-merge";
import { Card } from "#/components/generic/card";

const SHADE_KINDS = ["House", "Garage", "Shed", "Tree", "Hedge", "Fence"] as const;

function shadeKind(block: ShadeBlock): (typeof SHADE_KINDS)[number] | "Custom" {
  const shape = block.label?.replace(/ copy(?: \d+)?$/, "");
  if (shape && (SHADE_KINDS as readonly string[]).includes(shape)) {
    return shape as (typeof SHADE_KINDS)[number];
  }
  return block.source === "osm" ? "House" : "Custom";
}

function shadeName(block: ShadeBlock): string {
  if (block.label) return block.label;
  return block.source === "osm" ? "Building" : "Shade";
}

/** Scroll a row inside the panel, leaving the plan where it is. */
function scrollRowIntoView(row: HTMLElement) {
  let parent = row.parentElement;
  while (parent) {
    const style = getComputedStyle(parent);
    const scrolls = style.overflowY === "auto" || style.overflowY === "scroll";
    if (scrolls && parent.scrollHeight > parent.clientHeight) {
      const rowBox = row.getBoundingClientRect();
      const box = parent.getBoundingClientRect();
      if (rowBox.top < box.top) {
        parent.scrollBy({ top: rowBox.top - box.top - 8, behavior: "smooth" });
      } else if (rowBox.bottom > box.bottom) {
        parent.scrollBy({ top: rowBox.bottom - box.bottom + 8, behavior: "smooth" });
      }
      return;
    }
    parent = parent.parentElement;
  }
}

export function BedsPanel({
  beds,
  blocks,
  samples,
  adjust,
  showNames,
  onShowNames,
  menu,
  selectedBedId,
  onSelectBed,
  selectedBlockId,
  onSelectBlock,
  onOpenSettings,
  onOpenBlockSettings,
  onCloseMenu,
  jobCount,
  gardenId,
}: {
  beds: Garden["beds"];
  blocks: ShadeBlock[];
  samples: ReturnType<typeof midsummerSamples>;
  adjust: AdjustPreview | null;
  showNames: boolean;
  onShowNames: (value: boolean) => void;
  menu: ShapeMenu | null;
  selectedBedId: string | null;
  onSelectBed: (id: string) => void;
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onOpenSettings: (id: string, clientX: number, clientY: number) => void;
  onOpenBlockSettings: (id: string, clientX: number, clientY: number) => void;
  onCloseMenu: () => void;
  jobCount: number;
  gardenId: string;
}) {
  const units = useUnits();
  const selectedRow = useRef<HTMLDivElement>(null);
  const selectedShadeRow = useRef<HTMLDivElement>(null);
  const highlightedBedId = selectedBlockId ? null : selectedBedId;
  useEffect(() => {
    if (selectedRow.current) scrollRowIntoView(selectedRow.current);
  }, [highlightedBedId]);
  useEffect(() => {
    if (selectedShadeRow.current) scrollRowIntoView(selectedShadeRow.current);
  }, [selectedBlockId]);
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg">Beds</h2>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={showNames}
              onChange={(event) => onShowNames(event.target.checked)}
            />
            Show names
          </label>
        </div>
        <ul className="mt-2 text-sm space-y-1">
          {beds.map((bed) => {
            const points = adjust?.bedId === bed.id ? adjust.points : bed.points;
            const light = resolvedLight({ ...bed, points }, samples, blocks);
            const menuOpen = menu?.kind === "bed" && menu.id === bed.id;
            const selected = bed.id === highlightedBedId;
            return (
              <Card
                key={bed.id}
                ref={selected ? selectedRow : undefined}
                className={twMerge("flex items-center gap-1 p-2", selected && "bg-leaf/10")}
              >
                <button
                  className="min-w-0 flex-1 text-left"
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelectBed(bed.id)}
                >
                  <span
                    className={`flex items-center gap-2 font-medium ${selected ? "text-leaf" : ""}`}
                  >
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-full border border-line"
                      style={{ background: bedSwatch(bed) }}
                    />
                    {bed.name}
                  </span>
                  <span className="block text-ink/70">
                    {bedSize(points, units.unit)} · {SUN_LABEL[light.light]} ·{" "}
                    {light.hours.toFixed(1)} h of midsummer sun
                    {bed.lightOverride ? " · override" : ""}
                    {bed.soilOverride ? ` · ${SOIL_LABEL[bed.soilOverride]}` : ""}
                  </span>
                </button>
                <button
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-ink/70 hover:border-leaf pointer-fine:h-8 pointer-fine:w-8"
                  type="button"
                  aria-label={`Settings for ${bed.name}`}
                  aria-expanded={menuOpen}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    if (menuOpen) {
                      onCloseMenu();
                      return;
                    }
                    const rect = event.currentTarget.getBoundingClientRect();
                    onOpenSettings(bed.id, rect.left, rect.bottom + 4);
                  }}
                >
                  <SettingsIcon />
                </button>
              </Card>
            );
          })}
          {beds.length === 0 ? <li className="text-ink/60">No beds yet.</li> : null}
        </ul>
      </div>
      <h2 className="flex items-baseline gap-2 text-lg">
        Shade areas
        <span className="text-sm font-normal text-ink/50">{blocks.length}</span>
      </h2>
      <ul className="mt-2 space-y-1 text-sm">
        {blocks.map((item) => {
          const block = adjust?.block?.id === item.id ? adjust.block : item;
          const selected = block.id === selectedBlockId;
          const menuOpen = menu?.kind === "block" && menu.id === block.id;
          return (
            <Card
              key={block.id}
              ref={selected ? selectedShadeRow : undefined}
              className={twMerge("flex items-center gap-1 p-2", selected && "bg-leaf/10")}
            >
              <button
                className="min-w-0 flex-1 text-left"
                type="button"
                aria-pressed={selected}
                onClick={() => onSelectBlock(block.id)}
              >
                <span
                  className={`flex items-center gap-2 font-medium ${selected ? "text-leaf" : ""}`}
                >
                  <ShadeAreaIcon kind={shadeKind(block)} />
                  {shadeName(block)}
                </span>
                <span className="block text-ink/70">
                  {block.line
                    ? `${units.length(block.width)} long`
                    : units.size(block.width, block.depth)}
                  {" · "}
                  {units.length(block.height)} high
                  {block.surface ? ` · ${SURFACE_LABEL[block.surface]}` : ""}
                </span>
              </button>
              <button
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-ink/70 hover:border-leaf pointer-fine:h-8 pointer-fine:w-8"
                type="button"
                aria-label={`Settings for ${shadeName(block)}`}
                aria-expanded={menuOpen}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  if (menuOpen) {
                    onCloseMenu();
                    return;
                  }
                  const rect = event.currentTarget.getBoundingClientRect();
                  onOpenBlockSettings(block.id, rect.left, rect.bottom + 4);
                }}
              >
                <SettingsIcon />
              </button>
            </Card>
          );
        })}
        {blocks.length === 0 ? <li className="text-ink/60">No shade areas yet.</li> : null}
      </ul>
      <p className="text-sm">
        <Link to="/gardens/$gardenId/jobs" params={{ gardenId }} className="text-leaf underline">
          {jobCount === 0 ? "Jobs will appear once you place plants" : `${jobCount} jobs this year`}
        </Link>
      </p>
    </div>
  );
}
