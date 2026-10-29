import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "../../components/app-header/chrome";

import { PlantsList } from "#/components/plants/plants-list";

export const Route = createFileRoute("/plants/")({
  component: Catalogue,
  head: () => ({ meta: [{ title: "Catalogue · Garden" }] }),
});

function Catalogue() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-5xl px-5 py-8">
        <h1 className="text-4xl">Catalogue</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/70">
          A UK garden set of plants, bulbs and seeds, with the conditions, size and seasonal colour
          you need to choose. These notes are written for this planner.
        </p>
        <PlantsList />
      </main>
    </>
  );
}
