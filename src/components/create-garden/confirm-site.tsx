import { useForm } from "@tanstack/react-form";
import {
  ASPECT_LABEL,
  EXPOSURE_LABEL,
  MOISTURE_LABEL,
  PH_LABEL,
  SOIL_LABEL,
} from "#/domain/labels";
import { describeSlope } from "#/domain/slope";
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
  type SoilType,
} from "#/domain/types";
import { createGarden, type GardenConditions } from "#/lib/gardens";
import { Button } from "#/components/generic/button";
import { Select } from "#/components/generic/select";
import type { FoundSite } from "./types";
import { Alert } from "#/components/generic/alert";

const DEFAULT_SOIL: SoilType = "loam";
const DEFAULT_MOISTURE: Moisture = "well-drained";
const DEFAULT_PH: PhLevel = "neutral";
const DEFAULT_ASPECT: Aspect = "south";
const DEFAULT_EXPOSURE: Exposure = "sheltered";

export const ConfirmSite = ({
  name,
  site,
  onBack,
  onSave,
}: {
  name: string;
  site: FoundSite;
  onBack: () => void;
  onSave: (garden: Garden) => void;
}) => {
  const slopeText = describeSlope(site.slope);
  const form = useForm({
    defaultValues: {
      soil: site.soilSuggestion?.soil ?? DEFAULT_SOIL,
      moisture: DEFAULT_MOISTURE,
      ph: DEFAULT_PH,
      aspect: DEFAULT_ASPECT,
      exposure: DEFAULT_EXPOSURE,
    } as GardenConditions,
    onSubmit: ({ value }) => {
      onSave(createGarden(name, site, value));
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
      <Alert variant="info">
        {site.boundary
          ? `Property outline imported (${site.boundary.length} corners). ${site.boundaryNote ?? ""}`
          : (site.boundaryNote ?? "No property outline was imported. Draw the plot yourself.")}
      </Alert>
      {site.soilSuggestion ? (
        <Alert variant="info">
          {site.soilSuggestion.label}. This is a hint from a national map, not a soil test. Change
          it if you know your soil type.
        </Alert>
      ) : (
        <Alert variant="info">
          No soil map reading came back for this point. Choose the soil you have, or the closest
          match.
        </Alert>
      )}
      {slopeText ? <Alert variant="info">Property slope: {slopeText}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <form.Field name="soil">
          {(field) => (
            <Select
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
            <Select
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
            <Select
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
            <Select
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
            <Select
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
        <Button variant="primary" type="submit">
          Start the plan
        </Button>
        <Button variant="secondary" onClick={onBack}>
          Change address
        </Button>
      </div>
      {site.attribution ? (
        <details className="text-xs text-ink/50">
          <summary className="cursor-pointer">Sources</summary>
          <p className="mt-1">{site.attribution}</p>
        </details>
      ) : null}
    </form>
  );
};
