import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "../../components/app-header/chrome";
import { PlantFacts } from "../../components/plants/plant-facts";
import { getPlant } from "../../domain/plants";

export const Route = createFileRoute("/plants/$plantId")({
  component: PlantPage,
  head: ({ params }) => ({
    meta: [{ title: `${getPlant(params.plantId)?.commonName ?? "Plant"} · Garden` }],
  }),
});

function PlantPage() {
  const { plantId } = Route.useParams();
  const plant = getPlant(plantId);
  return (
    <>
      <AppHeader />
      <main className="px-5 py-8">
        {plant ? <PlantFacts plant={plant} /> : <p>That plant is not in the catalogue.</p>}
      </main>
    </>
  );
}
