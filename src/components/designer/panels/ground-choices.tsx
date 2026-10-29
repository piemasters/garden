import { SURFACE_COLOR, SURFACE_LABEL } from "#/domain/surface";
import { GROUND_SURFACES, type GroundSurface } from "#/domain/types";

export function GroundChoices({
  surface,
  hasOutline,
  onSurface,
}: {
  surface: GroundSurface;
  hasOutline: boolean;
  onSurface: (surface: GroundSurface) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-ink/60">Ground</p>
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
      <p className="mt-1 text-xs text-ink/60">
        {hasOutline
          ? "Fills the property outline."
          : "Fills the whole plan until a property outline is imported."}
      </p>
    </div>
  );
}
