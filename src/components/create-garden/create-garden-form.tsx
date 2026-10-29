import { useForm } from "@tanstack/react-form";
import type { UseMutationResult } from "@tanstack/react-query";
import type { SiteLookup, SiteQuery } from "#/server/site";
import { Button } from "#/components/generic/button";
import { Input } from "#/components/generic/input";
import { errorMessage, type FoundResults } from "./types";

export function CreateGardenForm({
  lookup,
  setFound,
  error,
  setError,
}: {
  lookup: UseMutationResult<SiteLookup, Error, SiteQuery, unknown>;
  setFound: (v: FoundResults) => void;
  error: string | null;
  setError: (v: string | null) => void;
}) {
  const form = useForm({
    defaultValues: { name: "", address: "", postcode: "" },
    onSubmit: async ({ value }) => {
      const name = value.name.trim();
      const address = value.address.trim();
      const postcode = value.postcode.trim();

      if (!name) {
        setError("Give the garden a name.");
        return;
      }
      if (!address) {
        setError("Enter the first line of your address.");
        return;
      }
      if (!postcode) {
        setError("Enter a full UK postcode, such as SW1A 1AA.");
        return;
      }

      try {
        setError(null);
        const result = await lookup.mutateAsync({ address, postcode });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setFound({
          name,
          address,
          postcode,
          site: result,
        });
      } catch (err: unknown) {
        setError(errorMessage(err));
      }
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
      <form.Field name="name">
        {(field) => (
          <label className="block text-sm">
            Garden name
            <Input
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
            <Input
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
            <Input
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
        Enter a valid address and postcode to select your property on the map. This gathers the plot
        shape, size, soil, pH and aspect of your garden to then build your design from.
      </p>
      {error ? <p className="text-sm text-clay">{error}</p> : null}
      <Button variant="primary" type="submit" disabled={lookup.isPending}>
        {lookup.isPending ? "Looking up this garden…" : "Look up this garden"}
      </Button>
    </form>
  );
}
