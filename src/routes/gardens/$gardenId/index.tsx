import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "../../../components/app-header/chrome";
import { GardenDesigner } from "../../../components/designer/designer";
import { PlantFacts } from "../../../components/plants/plant-facts";
import { getPlant } from "../../../domain/plants";

export const Route = createFileRoute("/gardens/$gardenId/")({
  validateSearch: (search: Record<string, unknown>): { plant?: string } => {
    const plant = search.plant;
    if (typeof plant !== "string" || plant.length === 0) return {};
    return { plant };
  },
  component: DesignerRoute,
  head: () => ({ meta: [{ title: "Plan · Garden" }] }),
});

function DesignerRoute() {
  const { gardenId } = Route.useParams();
  const { plant: plantId } = Route.useSearch();
  const navigate = useNavigate();
  const [view, setView] = useState<"plan" | "orbit">("plan");
  const plant = plantId ? getPlant(plantId) : undefined;
  const closePlant = () => {
    void navigate({
      to: "/gardens/$gardenId",
      params: { gardenId },
      search: {},
      replace: true,
    });
  };
  useEffect(() => {
    if (!plantId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePlant();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [plantId, gardenId]);
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <AppHeader
        gardenId={gardenId}
        view={view}
        onViewChange={setView}
        className="max-lg:landscape:hidden"
      />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col" inert={plantId ? true : undefined}>
          <GardenDesigner gardenId={gardenId} view={view} />
        </div>
        {plantId ? (
          <div
            className="absolute inset-0 z-30 overflow-y-auto bg-paper px-5 py-8"
            role="dialog"
            aria-modal="true"
            aria-label={plant?.commonName ?? "Plant"}
          >
            {plant ? (
              <PlantFacts plant={plant} onBack={closePlant} />
            ) : (
              <p>
                <button type="button" className="text-sm text-leaf underline" onClick={closePlant}>
                  Back to the plan
                </button>
                <span className="mt-4 block">That plant is not in the catalogue.</span>
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
