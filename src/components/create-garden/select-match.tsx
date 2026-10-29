import type { AddressChoice } from "#/server/site";
import { Button } from "#/components/generic/button";
import { PlotMap } from "./plot-map";
import type { PlotMatch } from "./types";

export const SelectMatch = ({
  found,
  error,
  lookupPending,
  nearbyPlotsPending,
  searchHere,
  chooseAddress,
  onBack,
}: {
  found: PlotMatch;
  error: string | null;
  lookupPending: boolean;
  nearbyPlotsPending: boolean;
  searchHere: (latitude: number, longitude: number) => void;
  chooseAddress: (choice: AddressChoice) => void;
  onBack: () => void;
}) => {
  return (
    <div className="space-y-3">
      <h2 className="text-2xl">{found.name}</h2>
      <p className="text-sm text-ink/70">
        {found.site.boundaryNote ??
          `Several addresses match ${found.address}, ${found.postcode}. Choose the correct property so its outline can be imported.`}
      </p>
      <PlotMap
        choices={found.site.choices}
        originLatitude={found.site.latitude}
        originLongitude={found.site.longitude}
        disabled={lookupPending || nearbyPlotsPending}
        status={
          nearbyPlotsPending
            ? "Loading plots around that point…"
            : lookupPending
              ? "Importing this plot…"
              : null
        }
        onChoose={chooseAddress}
        onSearch={searchHere}
        addressLabel={found.site.matchedAddress}
      />

      {error ? <p className="text-sm text-clay">{error}</p> : null}
      <Button variant="secondary" onClick={onBack}>
        Change address
      </Button>
    </div>
  );
};
