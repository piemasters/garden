import { Link } from "@tanstack/react-router";
import { buildTimeline, isColdRegion, jobsByMonth } from "#/domain/jobs";
import { PLANTS } from "#/domain/plants";
import type { Garden } from "#/domain/types";
import { Job } from "./job";

export function JobList({ garden }: { garden: Garden }) {
  const cold = isColdRegion(garden.site.country, garden.site.region, garden.site.latitude);
  const groups = jobsByMonth(buildTimeline(PLANTS, garden.placements, garden.site));
  return (
    <>
      <p className="text-sm uppercase tracking-wide text-soil">{garden.site.name}</p>
      <h1 className="mt-1 text-4xl">Jobs for the year</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/70">
        {cold
          ? "Spring jobs are a fortnight later here, and autumn jobs a fortnight earlier, because this postcode is in a colder part of the UK."
          : "These dates follow a mild southern calendar. Northern and Scottish gardens shift spring and autumn by a fortnight."}
      </p>
      {groups.length === 0 ? (
        <p className="mt-6">
          Place plants on the plan and their sowing, planting and pruning jobs will collect here.{" "}
          <Link
            to="/gardens/$gardenId"
            params={{ gardenId: garden.id }}
            className="text-leaf underline"
          >
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
                  <Job key={`${job.plantId}-${job.title}-${job.day}`} job={job} />
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
