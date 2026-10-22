import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ASPECTS,
  EXPOSURES,
  MOISTURE_LEVELS,
  PH_LEVELS,
  SOIL_TYPES,
  type Aspect,
  type Exposure,
  type Garden,
  type Moisture,
  type PhLevel,
} from "../domain/types";
import {
  ASPECT_LABEL,
  EXPOSURE_LABEL,
  MOISTURE_LABEL,
  PH_LABEL,
  SOIL_LABEL,
} from "../domain/labels";
import { upsertGarden } from "../lib/gardens";
import { lookupPlotsAround, lookupSite, type AddressChoice, type SiteLookup } from "../server/site";
import { buttonClass, inputClass, quietButtonClass } from "./chrome";
import { PlotMap } from "./plot-map.tsx";

type FoundSite = Extract<SiteLookup, { ok: true }>;

export function CreateGarden({ onCreated }: { onCreated: () => void }) {
  const navigate = useNavigate();
  const [found, setFound] = useState<{
    name: string;
    address: string;
    postcode: string;
    site: FoundSite;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lookup = useMutation({
    mutationFn: (value: { address: string; postcode: string; selected?: AddressChoice | null }) =>
      lookupSite({ data: value }),
  });
  const nearbyPlots = useMutation({
    mutationFn: (value: {
      postcode: string;
      latitude: number;
      longitude: number;
      originLatitude: number;
      originLongitude: number;
    }) => lookupPlotsAround({ data: value }),
  });

  const form = useForm({
    defaultValues: { name: "", address: "", postcode: "" },
    onSubmit: async ({ value }) => {
      setError(null);
      if (!value.name.trim()) {
        setError("Give the garden a name.");
        return;
      }
      const result = await lookup.mutateAsync({
        address: value.address,
        postcode: value.postcode,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFound({
        name: value.name.trim(),
        address: value.address.trim(),
        postcode: value.postcode.trim(),
        site: result,
      });
    },
  });

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

  if (found?.site.choices && found.site.choices.length > 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-2xl">{found.name}</h2>
        <p className="text-sm text-ink/70">
          {found.site.boundaryNote ??
            `Several addresses match ${found.address}, ${found.postcode}. Choose the property so its outline can be imported.`}
        </p>
        <PlotMap
          choices={found.site.choices}
          originLatitude={found.site.latitude}
          originLongitude={found.site.longitude}
          disabled={lookup.isPending || nearbyPlots.isPending}
          status={
            nearbyPlots.isPending
              ? "Loading plots around that point…"
              : lookup.isPending
                ? "Importing this plot…"
                : null
          }
          onChoose={(choice) => void chooseAddress(choice)}
          onSearch={(latitude, longitude) => void searchHere(latitude, longitude)}
        />
        <p className="text-sm text-ink/70">Or pick a plot from the list.</p>
        <div className="max-h-48 space-y-2 overflow-y-auto">
          {found.site.choices.map((choice) => (
            <button
              key={`${choice.latitude},${choice.longitude}`}
              className={`${buttonClass} block w-full text-left`}
              type="button"
              disabled={lookup.isPending || nearbyPlots.isPending}
              onClick={() => void chooseAddress(choice)}
            >
              {choice.label}
            </button>
          ))}
        </div>
        {error ? <p className="text-sm text-clay">{error}</p> : null}
        <button className={quietButtonClass} type="button" onClick={() => setFound(null)}>
          Change address
        </button>
      </div>
    );
  }

  if (found) {
    return (
      <ConfirmSite
        name={found.name}
        site={found.site}
        onBack={() => setFound(null)}
        onSave={(garden) => {
          upsertGarden(garden);
          onCreated();
          void navigate({ to: "/gardens/$gardenId", params: { gardenId: garden.id } });
        }}
      />
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field name="name">
        {(field) => (
          <label className="block text-sm">
            Garden name
            <input
              className={inputClass}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="Front garden"
            />
          </label>
        )}
      </form.Field>
      <form.Field name="address">
        {(field) => (
          <label className="block text-sm">
            House and street
            <input
              className={inputClass}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="10 Downing Street"
            />
          </label>
        )}
      </form.Field>
      <form.Field name="postcode">
        {(field) => (
          <label className="block text-sm">
            UK postcode
            <input
              className={inputClass}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="SW1A 1AA"
              autoCapitalize="characters"
            />
          </label>
        )}
      </form.Field>
      <p className="text-sm text-ink/70">
        Enter the house and street to import the registered freehold outline. The postcode still
        places the sun path and suggests a soil from the national map. If the house is not on the
        free map, click that spot on the aerial photo and then click its plot. You confirm the soil,
        pH and aspect before anything is filtered.
      </p>
      {error ? <p className="text-sm text-clay">{error}</p> : null}
      <button className={buttonClass} type="submit" disabled={lookup.isPending}>
        {lookup.isPending ? "Looking up this garden…" : "Look up this garden"}
      </button>
    </form>
  );
}

function ConfirmSite({
  name,
  site,
  onBack,
  onSave,
}: {
  name: string;
  site: FoundSite;
  onBack: () => void;
  onSave: (garden: Garden) => void;
}) {
  const form = useForm({
    defaultValues: {
      soil: site.soilSuggestion?.soil ?? "loam",
      moisture: "well-drained" as Moisture,
      ph: "neutral" as PhLevel,
      aspect: "south" as Aspect,
      exposure: "sheltered" as Exposure,
    },
    onSubmit: ({ value }) => {
      const now = new Date().toISOString();
      onSave({
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        buildingsLoaded: false,
        buildingError: null,
        showUnsuitable: false,
        boundary: site.boundary,
        attribution: site.attribution,
        blocks: [],
        beds: [],
        placements: [],
        site: {
          name,
          address: site.matchedAddress,
          postcode: site.postcode,
          latitude: site.latitude,
          longitude: site.longitude,
          country: site.country,
          region: site.region,
          soil: value.soil,
          moisture: value.moisture,
          ph: value.ph,
          aspect: value.aspect,
          exposure: value.exposure,
          soilSuggestion: site.soilSuggestion,
        },
      });
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div>
        <h2 className="text-2xl">{name}</h2>
        <p className="text-sm text-ink/70">
          {site.matchedAddress ? `${site.matchedAddress} · ` : null}
          {site.postcode} · {site.region}
        </p>
      </div>
      <p className="rounded-md bg-mist px-3 py-2 text-sm">
        {site.boundary
          ? `Property outline imported (${site.boundary.length} corners). ${site.boundaryNote ?? ""}`
          : (site.boundaryNote ?? "No property outline was imported. Draw the plot yourself.")}
      </p>
      {site.attribution ? <p className="text-xs text-ink/60">{site.attribution}</p> : null}
      {site.soilSuggestion ? (
        <p className="rounded-md bg-mist px-3 py-2 text-sm">
          {site.soilSuggestion.label}. This is a hint from a national map, not a soil test. Change
          it if you know the bed.
        </p>
      ) : (
        <p className="rounded-md bg-mist px-3 py-2 text-sm">
          No soil map reading came back for this point. Choose the soil you have, or the closest
          match.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <form.Field name="soil">
          {(field) => (
            <Choice
              label="Soil"
              value={field.state.value}
              options={SOIL_TYPES}
              labels={SOIL_LABEL}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
            />
          )}
        </form.Field>
        <form.Field name="moisture">
          {(field) => (
            <Choice
              label="Moisture"
              value={field.state.value}
              options={MOISTURE_LEVELS}
              labels={MOISTURE_LABEL}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
            />
          )}
        </form.Field>
        <form.Field name="ph">
          {(field) => (
            <Choice
              label="pH"
              value={field.state.value}
              options={PH_LEVELS}
              labels={PH_LABEL}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
            />
          )}
        </form.Field>
        <form.Field name="aspect">
          {(field) => (
            <Choice
              label="Garden faces"
              value={field.state.value}
              options={ASPECTS}
              labels={ASPECT_LABEL}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
            />
          )}
        </form.Field>
        <form.Field name="exposure">
          {(field) => (
            <Choice
              label="Exposure"
              value={field.state.value}
              options={EXPOSURES}
              labels={EXPOSURE_LABEL}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
            />
          )}
        </form.Field>
      </div>
      <div className="flex gap-2">
        <button className={buttonClass} type="submit">
          Start the plan
        </button>
        <button className={quietButtonClass} type="button" onClick={onBack}>
          Change address
        </button>
      </div>
    </form>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  labels,
  onBlur,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onBlur: () => void;
  onChange: (value: T) => void;
}) {
  return (
    <label className="block text-sm">
      {label}
      <select
        className={inputClass}
        value={value}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
