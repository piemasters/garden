import { Card } from "#/components/generic/card";
import { useState } from "react";
import { CreateGardenForm } from "./create-garden-form";
import { errorMessage, isPlotMatch, type FoundResults } from "./types";
import { SelectMatch } from "./select-match";
import { useMutation } from "@tanstack/react-query";
import {
  lookupPlotsAround,
  lookupSite,
  type AddressChoice,
  type PlotsAroundQuery,
  type SiteQuery,
} from "#/server/site";
import { ConfirmSite } from "./confirm-site";
import { upsertGarden } from "#/lib/gardens";
import { useGardenList } from "#/lib/use-garden";
import { useNavigate } from "@tanstack/react-router";

export const CreateGarden = () => {
  const navigate = useNavigate();
  const { refresh: refreshGardenList } = useGardenList();

  const [found, setFound] = useState<FoundResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const plotMatch = isPlotMatch(found) ? found : null;
  const confirmingSite = found != null && plotMatch == null;

  const lookup = useMutation({
    mutationFn: (value: SiteQuery) => lookupSite({ data: value }),
  });

  const nearbyPlots = useMutation({
    mutationFn: (value: PlotsAroundQuery) => lookupPlotsAround({ data: value }),
  });

  function goBack() {
    setError(null);
    setFound(null);
  }

  async function searchHere(latitude: number, longitude: number) {
    if (!found) return;
    setError(null);
    try {
      const result = await nearbyPlots.mutateAsync({
        postcode: found.postcode,
        latitude,
        longitude,
        originLatitude: found.site.latitude,
        originLongitude: found.site.longitude,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFound({
        ...found,
        site: {
          ...found.site,
          choices: result.choices,
          boundaryNote:
            "Click a coloured plot to import it, or click the map again to look further along.",
        },
      });
    } catch (err: unknown) {
      setError(errorMessage(err));
    }
  }

  async function chooseAddress(choice: AddressChoice) {
    if (!found) return;
    setError(null);
    try {
      const result = await lookup.mutateAsync({
        address: found.address,
        postcode: found.postcode,
        selected: choice,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFound({ ...found, site: result });
    } catch (err: unknown) {
      setError(errorMessage(err));
    }
  }

  return (
    <section>
      <h1 className="text-sm uppercase tracking-wide text-soil font-thin">UK garden planner</h1>
      <h2 className="mt-2 text-5xl">Plan a bed around the soil and the sun.</h2>
      <p className="mt-4 max-w-xl leading-relaxed">
        Find your home on the map to instantly reveal your garden's soil profile. Sketch your garden
        beds and place shade-casting trees and structures to unlock plant recommendations tailored
        to your exact sunlight and soil. Once your design is set, view your personalised year-round
        task list to plant and maintain your perfect garden.
      </p>
      <Card className="mt-8">
        {plotMatch ? (
          <SelectMatch
            found={plotMatch}
            error={error}
            searchHere={searchHere}
            chooseAddress={chooseAddress}
            lookupPending={lookup.isPending}
            nearbyPlotsPending={nearbyPlots.isPending}
            onBack={goBack}
          />
        ) : confirmingSite && found ? (
          <ConfirmSite
            name={found.name}
            site={found.site}
            onBack={goBack}
            onSave={(garden) => {
              upsertGarden(garden);
              refreshGardenList();
              void navigate({
                to: "/gardens/$gardenId",
                params: { gardenId: garden.id },
              });
            }}
          />
        ) : (
          <>
            <h2 className="text-2xl pb-4">New garden</h2>
            <CreateGardenForm
              lookup={lookup}
              setFound={setFound}
              error={error}
              setError={setError}
            />
          </>
        )}
      </Card>
    </section>
  );
};
