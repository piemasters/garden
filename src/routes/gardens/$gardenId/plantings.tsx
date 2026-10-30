import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "#/components/app-header/chrome";
import { Plantings } from "#/components/plantings/plantings";

export const Route = createFileRoute("/gardens/$gardenId/plantings")({
  component: PlantingsRoute,
  head: () => ({ meta: [{ title: "Plantings · Garden" }] }),
});

function PlantingsRoute() {
  const { gardenId } = Route.useParams();
  return (
    <>
      <AppHeader gardenId={gardenId} />
      <main className="mx-auto max-w-5xl px-5 py-8">
        <Plantings gardenId={gardenId} />
      </main>
    </>
  );
}
