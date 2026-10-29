import { Link } from "@tanstack/react-router";
import { SUN_LABEL } from "#/domain/labels";
import { midsummerSamples } from "#/domain/sun";
import type { Garden, ShadeBlock } from "#/domain/types";
import { useUnits } from "#/lib/units";
import { bedSize, resolvedLight } from "../drawing";
import type { AdjustPreview, ShapeMenu } from "../tools";
import { bedSwatch } from "./bed-colours";
import { SettingsIcon } from "./icons";

export function BedsPanel({
  beds,
  blocks,
  samples,
  adjust,
  showNames,
  onShowNames,
  menu,
  onSelectBed,
  onOpenSettings,
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
  onSelectBed: (id: string) => void;
  onOpenSettings: (id: string, clientX: number, clientY: number) => void;
  onCloseMenu: () => void;
  jobCount: number;
  gardenId: string;
}) {
  const units = useUnits();
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
        <ul className="mt-2 space-y-2 text-sm">
          {beds.map((bed) => {
            const points = adjust?.bedId === bed.id ? adjust.points : bed.points;
            const light = resolvedLight({ ...bed, points }, samples, blocks);
            const menuOpen = menu?.kind === "bed" && menu.id === bed.id;
            return (
              <li key={bed.id} className="flex items-start gap-1">
                <button
                  className="min-w-0 flex-1 text-left"
                  type="button"
                  onClick={() => onSelectBed(bed.id)}
                >
                  <span className="flex items-center gap-2 font-medium">
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
              </li>
            );
          })}
          {beds.length === 0 ? <li className="text-ink/60">No beds yet.</li> : null}
        </ul>
      </div>
      <p className="text-sm">
        <Link to="/gardens/$gardenId/jobs" params={{ gardenId }} className="text-leaf underline">
          {jobCount === 0 ? "Jobs will appear once you place plants" : `${jobCount} jobs this year`}
        </Link>
      </p>
    </div>
  );
}
