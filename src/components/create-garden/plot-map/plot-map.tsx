import type { AddressChoice } from "#/server/site";
import { Button } from "#/components/generic/button";
import { PlotChoiceList } from "./plot-choice-list";
import { AERIAL_ATTRIBUTION, OSM_ATTRIBUTION, usePlotMap } from "./use-plot-map";

export function PlotMap({
  choices,
  originLatitude,
  originLongitude,
  disabled,
  status,
  onChoose,
  onSearch,
  addressLabel,
}: {
  choices: AddressChoice[];
  originLatitude: number;
  originLongitude: number;
  disabled: boolean;
  status: string | null;
  onChoose: (choice: AddressChoice) => void;
  onSearch: (latitude: number, longitude: number) => void;
  addressLabel?: string | null;
}) {
  const { container, base, setBase, mapError } = usePlotMap({
    choices,
    originLatitude,
    originLongitude,
    disabled,
    onChoose,
    onSearch,
    addressLabel,
  });

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          variant={base === "aerial" ? "primary" : "secondary"}
          onClick={() => setBase("aerial")}
        >
          Aerial
        </Button>
        <Button
          variant={base === "streets" ? "primary" : "secondary"}
          onClick={() => setBase("streets")}
        >
          Streets
        </Button>
      </div>
      <div
        ref={container}
        className="z-0 h-128 w-full overflow-hidden rounded-md border border-line"
        role="application"
        aria-label="Map of freehold plots. Click empty ground to load plots there, or click a plot to import it."
      />
      {status ? <p className="text-sm text-ink/70">{status}</p> : null}
      {mapError ? (
        <div className="space-y-2">
          <p className="text-sm text-clay">{mapError}</p>
          <PlotChoiceList choices={choices} disabled={disabled} onChoose={onChoose} />
        </div>
      ) : (
        <p className="text-xs text-ink/60">
          {choices.some((choice) => choice.matched)
            ? "The dark dot matches the address. Click it to confirm, or click another plot if it is wrong."
            : "If your plot isn't highlighted, click on it to load the freeholds in that area, then select the coloured plot to import it."}
        </p>
      )}
      <details className="text-xs text-ink/50">
        <summary className="cursor-pointer">Map sources</summary>
        <p className="mt-1">
          {AERIAL_ATTRIBUTION}. Streets {OSM_ATTRIBUTION}.
        </p>
      </details>
    </div>
  );
}
