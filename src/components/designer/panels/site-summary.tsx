import { ASPECT_LABEL, MOISTURE_LABEL, PH_LABEL, SOIL_LABEL } from "#/domain/labels";
import { MONTH_NAMES, type Garden, type GroundSurface } from "#/domain/types";
import { GroundChoices } from "./ground-choices";
import { PanelCaret } from "./icons";

export function SiteSummary({
  site,
  slopeText,
  month,
  onMonth,
  surface,
  hasOutline,
  onSurface,
  showShade,
  onShowShade,
  showSlope,
  onShowSlope,
  view,
  panelSize,
  onTogglePanel,
  attribution,
}: {
  site: Garden["site"];
  slopeText: string | null;
  month: number;
  onMonth: (month: number) => void;
  surface: GroundSurface;
  hasOutline: boolean;
  onSurface: (surface: GroundSurface) => void;
  showShade: boolean;
  onShowShade: (value: boolean) => void;
  showSlope: boolean;
  onShowSlope: (value: boolean) => void;
  view: "plan" | "orbit";
  panelSize: "short" | "tall" | "full";
  onTogglePanel: () => void;
  attribution: string | null;
}) {
  return (
    <div className="flex items-start gap-2">
      <details className="group min-w-0 flex-1">
        <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <h1 className="flex items-baseline gap-2 text-2xl lg:text-3xl">
            <span
              aria-hidden
              className="inline-block text-sm text-ink/50 transition-transform group-open:rotate-90"
            >
              ▸
            </span>
            {site.name}
          </h1>
          <p className="text-sm text-ink/70">
            {site.postcode} · {site.region}
          </p>
          {slopeText ? <p className="text-sm text-ink/70">{slopeText}</p> : null}
        </summary>
        <div className="mt-2 space-y-3">
          <p className="text-sm">
            {SOIL_LABEL[site.soil]} · {MOISTURE_LABEL[site.moisture]} · {PH_LABEL[site.ph]} ·{" "}
            {ASPECT_LABEL[site.aspect]}
          </p>
          {site.address ? <p className="text-sm text-ink/70">{site.address}</p> : null}
          {site.soilSuggestion ? (
            <p className="text-xs text-ink/60">{site.soilSuggestion.label}</p>
          ) : null}
          <GroundChoices surface={surface} hasOutline={hasOutline} onSurface={onSurface} />
          <label className="block text-sm">
            Month
            <input
              className="mt-1 w-full"
              type="range"
              min={0}
              max={11}
              value={month}
              onChange={(event) => onMonth(Number(event.target.value))}
            />
            <span className="font-medium">{MONTH_NAMES[month]}</span>
          </label>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={showShade}
                onChange={(event) => onShowShade(event.target.checked)}
              />
              Show shade
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={showSlope}
                onChange={(event) => onShowSlope(event.target.checked)}
              />
              Show slope
            </label>
          </div>
          {showShade ? (
            <p className="text-xs text-ink/60">
              Shadows show where shade falls in the middle of this month.
            </p>
          ) : null}
          {view === "plan" ? (
            <p className="text-xs leading-snug text-ink/60">
              Pinch or scroll to zoom. Drag empty ground to move around. Double-click to centre the
              plan.
            </p>
          ) : null}
          {attribution || hasOutline ? (
            <details className="text-xs text-ink/50">
              <summary className="cursor-pointer">Sources</summary>
              {hasOutline ? (
                <p className="mt-1">
                  Property outline from HM Land Registry. It is the indicative freehold extent, not
                  the legal title.
                </p>
              ) : null}
              {attribution ? <p className="mt-1">{attribution}</p> : null}
            </details>
          ) : null}
        </div>
      </details>
      <button
        className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink/70 hover:bg-card hover:text-leaf max-lg:portrait:inline-flex"
        type="button"
        aria-label={
          panelSize === "full"
            ? "Show the plan"
            : panelSize === "tall"
              ? "Fill the screen with the panel"
              : "Make the panel taller"
        }
        onClick={onTogglePanel}
      >
        <PanelCaret up={panelSize !== "full"} />
      </button>
    </div>
  );
}
