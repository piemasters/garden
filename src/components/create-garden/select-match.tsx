import type { AddressChoice } from "#/server/site";
import { Button } from "#/components/generic/button";
import { PlotMap } from "./plot-map";
import type { FoundResults } from "./types";

export const SelectMatch = ({
  found,
  error,
  lookupPending,
  nearbyPlotsPending,
  searchHere,
  chooseAddress,
  setFound,
}: {
  found: FoundResults;
  error: string | null;
  lookupPending: boolean;
  nearbyPlotsPending: boolean;
  searchHere: (latitude: number, longitude: number) => void;
  chooseAddress: (choice: AddressChoice) => void;
  setFound: (val: FoundResults) => void;
}) => {
  if (!found?.site.choices) return;
  return (
    <div className="space-y-3">
      <h2 className="text-2xl">{found.name}</h2>
      <p className="text-sm text-ink/70">
        {found.site?.boundaryNote ??
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
        onChoose={(choice) => chooseAddress(choice)}
        onSearch={(latitude, longitude) => searchHere(latitude, longitude)}
        addressLabel={found.site.matchedAddress}
      />

      {error ? <p className="text-sm text-clay">{error}</p> : null}
      <Button variant="secondary" onClick={() => setFound(null)}>
        Change address
      </Button>
    </div>
  );
};
