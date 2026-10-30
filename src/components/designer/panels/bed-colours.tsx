import { useEffect, useId, useState } from "react";
import { paintSurface, SURFACE_COLOR, SURFACE_LABEL, bedSurface } from "#/domain/surface";
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

const surfacePreviews = new Map<GroundSurface, string>();

function surfacePreview(surface: GroundSurface): string | null {
  const cached = surfacePreviews.get(surface);
  if (cached) return cached;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 48;
  canvas.height = 48;
  const context = canvas.getContext("2d");
  if (!context) return null;
  paintSurface(context, surface, 48, SURFACE_COLOR[surface]);
  const url = canvas.toDataURL();
  surfacePreviews.set(surface, url);
  return url;
}

function SurfaceSwatch({ surface }: { surface: GroundSurface }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(surfacePreview(surface));
  }, [surface]);
  return (
    <span
      className="h-5 w-5 shrink-0 rounded-sm border border-black/15"
      style={{
        backgroundColor: SURFACE_COLOR[surface],
        backgroundImage: url ? `url(${url})` : undefined,
        backgroundSize: "cover",
      }}
    />
  );
}

export function SurfaceChoices({
  surface,
  onSurface,
  label = "Material",
  emptyLabel = "Use the colour",
}: {
  surface: GroundSurface | null;
  onSurface: (surface: GroundSurface | null) => void;
  label?: string;
  /** Pass null when every choice is a material, as on the garden ground. */
  emptyLabel?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const choose = (next: GroundSurface | null) => {
    onSurface(next);
    setOpen(false);
  };
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-material-menu]")) return;
      setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [open]);
  return (
    <div
      className={`relative text-sm ${open ? "z-20" : ""}`}
      data-material-menu=""
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <p id={labelId} className="text-xs text-ink/60">
        {label}
      </p>
      <button
        className="mt-1 flex w-full items-center gap-2 rounded-md border border-line bg-transparent px-2 py-1.5 text-left"
        type="button"
        aria-label={`${label}, ${surface ? SURFACE_LABEL[surface] : emptyLabel}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {surface ? (
          <SurfaceSwatch surface={surface} />
        ) : (
          <span className="h-7 w-7 shrink-0 rounded-sm border border-line" />
        )}
        <span className="min-w-0 flex-1">{surface ? SURFACE_LABEL[surface] : emptyLabel}</span>
        <div className="pointer-events-none flex items-center pr-0.5 text-ink opacity-60">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open ? (
        <ul
          className="absolute z-10 mt-1 max-h-80 w-full overflow-y-auto rounded-md border border-line bg-card py-1 shadow-lg"
          role="listbox"
          aria-labelledby={labelId}
        >
          {emptyLabel ? (
            <li>
              <button
                className={`flex w-full items-center gap-2 px-2 py-1 text-left hover:bg-paper ${surface === null ? "bg-leaf/10" : ""}`}
                type="button"
                role="option"
                aria-selected={surface === null}
                onClick={() => choose(null)}
              >
                <span className="h-7 w-7 shrink-0 rounded-sm border border-line" />
                {emptyLabel}
              </button>
            </li>
          ) : null}
          {GROUND_SURFACES.map((id) => (
            <li key={id}>
              <button
                className={`flex w-full items-center gap-2 px-2 py-1 text-left hover:bg-paper ${surface === id ? "bg-leaf/10" : ""}`}
                type="button"
                role="option"
                aria-selected={surface === id}
                onClick={() => choose(id)}
              >
                <SurfaceSwatch surface={id} />
                {SURFACE_LABEL[id]}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
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
  onSurface: (surface: GroundSurface | null) => void;
}) {
  const current = surface ? null : bedColour(color);
  return (
    <div className="space-y-2">
      <div>
        <p className="text-xs text-ink/60">Colour</p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
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
