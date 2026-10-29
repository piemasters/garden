import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "#/components/app-header/chrome";
import { Jobs } from "#/components/jobs/jobs";

export const Route = createFileRoute("/gardens/$gardenId/jobs")({
  component: JobsRoute,
  head: () => ({ meta: [{ title: "Jobs · Garden" }] }),
});

function JobsRoute() {
  const { gardenId } = Route.useParams();
  return (
    <>
      <AppHeader gardenId={gardenId} />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <Jobs gardenId={gardenId} />
      </main>
    </>
  );
}
