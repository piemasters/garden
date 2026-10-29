import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "../../../components/app-header/chrome";
import { GardenDesigner } from "../../../components/designer/designer";

export const Route = createFileRoute("/gardens/$gardenId/")({
  component: DesignerRoute,
  head: () => ({ meta: [{ title: "Plan · Garden" }] }),
});

function DesignerRoute() {
  const { gardenId } = Route.useParams();
  const [view, setView] = useState<"plan" | "orbit">("plan");
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <AppHeader
        gardenId={gardenId}
        view={view}
        onViewChange={setView}
        className="max-lg:landscape:hidden"
      />
      <GardenDesigner gardenId={gardenId} view={view} />
    </div>
  );
}
