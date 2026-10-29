import { Link, createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "../../../components/app-header/chrome";
import { buildTimeline, formatJobDate, isColdRegion, jobsByMonth } from "../../../domain/jobs";
import { PLANTS } from "../../../domain/plants";
import { useGarden } from "../../../lib/use-garden";

export const Route = createFileRoute("/gardens/$gardenId/jobs")({
  component: JobsRoute,
  head: () => ({ meta: [{ title: "Jobs · Garden" }] }),
});

function JobsRoute() {
  const { gardenId } = Route.useParams();
  const { ready, garden } = useGarden(gardenId);
  return (
    <>
      <AppHeader gardenId={gardenId} />
      <main className="mx-auto max-w-3xl px-5 py-8">
        {!ready ? <p>Loading jobs…</p> : null}
        {ready && !garden ? (
          <p>
            This garden is not saved in this browser.{" "}
            <Link to="/" className="text-leaf underline">
              Back to your gardens
            </Link>
          </p>
        ) : null}
        {garden ? (
          <JobList
            gardenId={gardenId}
            country={garden.site.country}
            region={garden.site.region}
            latitude={garden.site.latitude}
            placements={garden.placements}
            name={garden.site.name}
          />
        ) : null}
      </main>
    </>
  );
}

function JobList({
  gardenId,
  country,
  region,
  latitude,
  placements,
  name,
}: {
  gardenId: string;
  country: string;
  region: string;
  latitude: number;
  placements: Array<{ plantId: string }>;
  name: string;
}) {
  const cold = isColdRegion(country, region, latitude);
  const groups = jobsByMonth(buildTimeline(PLANTS, placements, { country, region, latitude }));
  return (
    <>
      <p className="text-sm uppercase tracking-wide text-soil">{name}</p>
      <h1 className="mt-1 text-4xl">Jobs for the year</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/70">
        {cold
          ? "Spring jobs are a fortnight later here, and autumn jobs a fortnight earlier, because this postcode is in a colder part of the UK."
          : "These dates follow a mild southern calendar. Northern and Scottish gardens shift spring and autumn by a fortnight."}
      </p>
      {groups.length === 0 ? (
        <p className="mt-6">
          Place plants on the plan and their sowing, planting and pruning jobs will collect here.{" "}
          <Link to="/gardens/$gardenId" params={{ gardenId }} className="text-leaf underline">
            Back to the plan
          </Link>
        </p>
      ) : (
        <ol className="mt-8 space-y-8">
          {groups.map((group) => (
            <li key={group.month}>
              <h2 className="text-2xl">{group.label}</h2>
              <ul className="mt-3 space-y-4">
                {group.jobs.map((job) => (
                  <li
                    key={`${job.plantId}-${job.title}-${job.day}`}
                    className="border-l-2 border-leaf pl-3"
                  >
                    <p className="text-sm text-soil">{formatJobDate(job.month, job.day)}</p>
                    <p className="font-medium">
                      {job.title} · {job.plantName}
                    </p>
                    <p className="text-sm leading-relaxed">{job.detail}</p>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
