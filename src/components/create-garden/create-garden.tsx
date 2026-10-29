import { Card } from "#/components/generic/card";
import { useState } from "react";
import { CreateGardenForm } from "./create-garden-form";
import type { FoundResults, LookupPlotsPayload, LookupSitePayload } from "./types";
import { SelectMatch } from "./select-match";
import { useMutation } from "@tanstack/react-query";
import { lookupPlotsAround, lookupSite, type AddressChoice } from "#/server/site";
import { ConfirmSite } from "./confirm-site";
import { upsertGarden } from "#/lib/gardens";
import { useGardenList } from "#/lib/use-garden";
import { useNavigate } from "@tanstack/react-router";

export const CreateGarden = () => {
  const navigate = useNavigate();
  const { refresh: refreshGardenList } = useGardenList();

  const [found, setFound] = useState<FoundResults>(null);
  const [error, setError] = useState<string | null>(null);

  const multipleMatches = found?.site.choices && found.site.choices.length > 0;
  const singleMatch = !multipleMatches && found;

  const lookup = useMutation({
    mutationFn: (value: LookupSitePayload) => lookupSite({ data: value }),
  });

  const nearbyPlots = useMutation({
    mutationFn: (value: LookupPlotsPayload) => lookupPlotsAround({ data: value }),
  });

  async function searchHere(latitude: number, longitude: number) {
    if (!found) return;
    setError(null);
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
  }

  async function chooseAddress(choice: AddressChoice) {
    if (!found) return;
    setError(null);
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
        <h2 className="text-2xl pb-4">New garden</h2>
        {multipleMatches ? (
          <SelectMatch
            found={found}
            setFound={setFound}
            error={error}
            searchHere={searchHere}
            chooseAddress={chooseAddress}
            lookupPending={lookup.isPending}
            nearbyPlotsPending={nearbyPlots.isPending}
          />
        ) : singleMatch ? (
          <ConfirmSite
            name={found.name}
            site={found.site}
            onBack={() => setFound(null)}
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
          <CreateGardenForm lookup={lookup} setFound={setFound} error={error} setError={setError} />
        )}
      </Card>
    </section>
  );
};
