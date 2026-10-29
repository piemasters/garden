import { SUN_LABEL } from "#/domain/labels";
import { bedSurface } from "#/domain/surface";
import { SUN_LEVELS, type GroundSurface, type SunLevel } from "#/domain/types";
import { BedColours } from "./bed-colours";
import type { ShapeMenu as ShapeMenuState } from "../tools";

export function ShapeMenu({
  menu,
  bed,
  block,
  plantName,
  plantCount,
  onRename,
  onColour,
  onSurface,
  calculatedLight,
  onLight,
  onRaised,
  onDuplicateBed,
  onDeleteBed,
  onDuplicateBlock,
  onDeleteBlock,
  onRemovePlant,
}: {
  menu: ShapeMenuState;
  bed: {
    name: string;
    color?: string;
    surface?: GroundSurface;
    lightOverride: SunLevel | null;
    raised?: boolean;
  } | null;
  block: { label?: string; source: "osm" | "user" } | null;
  plantName: string | null;
  plantCount: number;
  onRename: (name: string) => void;
  onColour: (color: string) => void;
  onSurface: (surface: GroundSurface) => void;
  calculatedLight: SunLevel | null;
  onLight: (lightOverride: SunLevel | null) => void;
  onRaised: (raised: boolean) => void;
  onDuplicateBed: () => void;
  onDeleteBed: () => void;
  onDuplicateBlock: () => void;
  onDeleteBlock: () => void;
  onRemovePlant: () => void;
}) {
  const itemClass = "block w-full px-3 py-1.5 text-left hover:bg-paper";
  return (
    <div
      className={`fixed z-30 rounded-md border border-line bg-card py-1 text-sm shadow-lg ${menu.fills ? "w-72" : "w-52"}`}
      style={{ left: menu.x, top: menu.y }}
      data-shape-menu=""
      onContextMenu={(event) => event.preventDefault()}
    >
      {menu.kind === "bed" && bed ? (
        <>
          <label className="block px-3 py-1.5">
            <span className="text-xs text-ink/60">Name</span>
            <input
              className="mt-1 w-full rounded-md border border-line bg-paper px-2 py-1 text-sm outline-none focus:border-leaf"
              defaultValue={bed.name}
              aria-label="Bed name"
              onChange={(event) => onRename(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
            />
          </label>
          {menu.fills ? (
            <div className="space-y-2 px-3 py-1.5">
              <BedColours
                color={bed.color}
                surface={bedSurface(bed.surface)}
                onColour={onColour}
                onSurface={onSurface}
              />
              {calculatedLight ? (
                <label className="block text-sm">
                  Light for {bed.name}
                  <select
                    className="mt-1 w-full rounded-md border border-line bg-paper px-2 py-1"
                    value={bed.lightOverride ?? "calculated"}
                    onChange={(event) => {
                      const value = event.target.value;
                      onLight(value === "calculated" ? null : (value as SunLevel));
                    }}
                  >
                    <option value="calculated">
                      Use the sun calculation ({SUN_LABEL[calculatedLight]})
                    </option>
                    {SUN_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        Override: {SUN_LABEL[level]}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={bed.raised === true}
                  onChange={(event) => onRaised(event.target.checked)}
                />
                Raised bed
              </label>
            </div>
          ) : null}
          <button className={itemClass} type="button" onClick={onDuplicateBed}>
            Duplicate
          </button>
          <button className={`${itemClass} text-clay`} type="button" onClick={onDeleteBed}>
            {plantCount > 0 ? "Delete bed and plants" : "Delete bed"}
          </button>
        </>
      ) : null}
      {menu.kind === "block" && block ? (
        <>
          <p className="px-3 py-1.5 text-xs text-ink/60">
            {block.label ?? (block.source === "osm" ? "Building" : "Shade block")}
          </p>
          <button className={itemClass} type="button" onClick={onDuplicateBlock}>
            Duplicate
          </button>
          <button className={`${itemClass} text-clay`} type="button" onClick={onDeleteBlock}>
            Delete block
          </button>
        </>
      ) : null}
      {menu.kind === "plant" && plantName ? (
        <>
          <p className="px-3 py-1.5 text-xs text-ink/60">{plantName}</p>
          <button className={`${itemClass} text-clay`} type="button" onClick={onRemovePlant}>
            Remove plant
          </button>
        </>
      ) : null}
    </div>
  );
}
