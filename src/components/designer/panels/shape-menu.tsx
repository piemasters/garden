import { Select } from "#/components/generic/select";
import { SOIL_LABEL, SUN_LABEL } from "#/domain/labels";
import { bedSurface } from "#/domain/surface";
import {
  SOIL_TYPES,
  SUN_LEVELS,
  type GroundSurface,
  type SoilType,
  type SunLevel,
} from "#/domain/types";
import { isCustomShade } from "../drawing";
import { BedColours, SurfaceChoices } from "./bed-colours";
import { ShadeHeight } from "./shade-height";
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
  gardenSoil,
  onSoil,
  onRaised,
  onDuplicateBed,
  onDeleteBed,
  onDuplicateBlock,
  onDeleteBlock,
  onRemovePlant,
  onHeight,
}: {
  menu: ShapeMenuState;
  bed: {
    name: string;
    color?: string;
    surface?: GroundSurface;
    lightOverride: SunLevel | null;
    soilOverride?: SoilType | null;
    raised?: boolean;
  } | null;
  block: {
    label?: string;
    source: "osm" | "user";
    line?: boolean;
    surface?: GroundSurface;
    height: number;
  } | null;
  plantName: string | null;
  plantCount: number;
  onRename: (name: string) => void;
  onColour: (color: string) => void;
  onSurface: (surface: GroundSurface | null) => void;
  calculatedLight: SunLevel | null;
  onLight: (lightOverride: SunLevel | null) => void;
  gardenSoil: SoilType;
  onSoil: (soilOverride: SoilType | null) => void;
  onRaised: (raised: boolean) => void;
  onDuplicateBed: () => void;
  onDeleteBed: () => void;
  onDuplicateBlock: () => void;
  onDeleteBlock: () => void;
  onRemovePlant: () => void;
  onHeight: (height: number) => void;
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
                <Select
                  label={`Light for ${bed.name}`}
                  value={bed.lightOverride ?? "calculated"}
                  options={["calculated", ...SUN_LEVELS]}
                  labels={{
                    calculated: `Use the sun calculation (${SUN_LABEL[calculatedLight]})`,
                    "full-sun": `Override: ${SUN_LABEL["full-sun"]}`,
                    "partial-sun": `Override: ${SUN_LABEL["partial-sun"]}`,
                    shade: `Override: ${SUN_LABEL.shade}`,
                  }}
                  onChange={(value) => onLight(value === "calculated" ? null : value)}
                />
              ) : null}
              <Select
                label={`Soil for ${bed.name}`}
                value={bed.soilOverride ?? "garden"}
                options={["garden", ...SOIL_TYPES]}
                labels={{
                  garden: `Use the garden soil (${SOIL_LABEL[gardenSoil]})`,
                  chalk: `Override: ${SOIL_LABEL.chalk}`,
                  clay: `Override: ${SOIL_LABEL.clay}`,
                  loam: `Override: ${SOIL_LABEL.loam}`,
                  sand: `Override: ${SOIL_LABEL.sand}`,
                }}
                onChange={(value) => onSoil(value === "garden" ? null : value)}
              />
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
          <div className="px-3 py-1.5">
            <ShadeHeight height={block.height} onHeight={onHeight} />
          </div>
          {isCustomShade(block) ? (
            <div className="px-3 py-1.5">
              <SurfaceChoices
                surface={bedSurface(block.surface)}
                onSurface={onSurface}
                emptyLabel="Plain"
              />
            </div>
          ) : null}
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
