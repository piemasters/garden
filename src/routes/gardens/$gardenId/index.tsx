import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "../../../components/chrome";
import { GardenDesigner } from "../../../components/designer/designer";

export const Route = createFileRoute("/gardens/$gardenId/")({
  component: DesignerRoute,
  head: () => ({ meta: [{ title: "Plan · Garden" }] }),
});

function DesignerRoute() {
  const { gardenId } = Route.useParams();
  return (
    <>
      <AppHeader gardenId={gardenId} />
      <GardenDesigner gardenId={gardenId} />
    </>
  );
}
