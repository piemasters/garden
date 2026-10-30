import { SURFACE_COLOR, SURFACE_LABEL, bedSurface } from "#/domain/surface";
import { GROUND_SURFACES, type GroundSurface } from "#/domain/types";

export const BED_COLOURS = [
  { name: "Soil", value: "#a67c52" },
  { name: "Mulch", value: "#6b4a32" },
  { name: "Sand", value: "#d2c2a4" },
  { name: "Gravel", value: "#b7b1a6" },
  { name: "Slate", value: "#6d7c86" },
  { name: "Terracotta", value: "#c4654a" },
  { name: "Lawn", value: "#6f8f5a" },
  { name: "Moss", value: "#3f6b4a" },
] as const;

export function bedColour(color: string | undefined): string {
  return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : "#a67c52";
}

export function bedSwatch(bed: { color?: string; surface?: GroundSurface }): string {
  const surface = bedSurface(bed.surface);
  return surface ? SURFACE_COLOR[surface] : bedColour(bed.color);
}

export function SurfaceChoices({
  surface,
  onSurface,
}: {
  surface: GroundSurface | null;
  onSurface: (surface: GroundSurface) => void;
}) {
  return (
    <div>
      <p className="text-xs text-ink/60">Material</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {GROUND_SURFACES.map((id) => {
          const selected = surface === id;
          return (
            <button
              key={id}
              className={
                selected
                  ? "inline-flex min-h-8 items-center gap-1.5 rounded-full bg-leaf px-2.5 py-1 text-xs text-white"
                  : "inline-flex min-h-8 items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1 text-xs text-ink hover:border-leaf"
              }
              type="button"
              aria-pressed={selected}
              onClick={() => onSurface(id)}
            >
              <span
                className="h-3 w-3 rounded-full border border-white/70"
                style={{ background: SURFACE_COLOR[id] }}
              />
              {SURFACE_LABEL[id]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BedColours({
  color,
  surface,
  onColour,
  onSurface,
}: {
  color?: string;
  surface: GroundSurface | null;
  onColour: (color: string) => void;
  onSurface: (surface: GroundSurface) => void;
}) {
  const current = surface ? null : bedColour(color);
  return (
    <div className="space-y-2">
      <div>
        <p className="text-xs text-ink/60">Colour</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {BED_COLOURS.map((swatch) => (
            <button
              key={swatch.value}
              className={`h-6 w-6 rounded-full border shadow ${current === swatch.value ? "border-ink ring-2 ring-ink/25" : "border-white"}`}
              style={{ background: swatch.value }}
              type="button"
              aria-label={swatch.name}
              aria-pressed={current === swatch.value}
              onClick={() => onColour(swatch.value)}
            />
          ))}
          <input
            className="h-6 w-6 cursor-pointer rounded-full border border-line bg-transparent"
            type="color"
            aria-label="Custom bed colour"
            value={bedColour(color)}
            onChange={(event) => onColour(event.target.value)}
          />
        </div>
      </div>
      <SurfaceChoices surface={surface} onSurface={onSurface} />
    </div>
  );
}
