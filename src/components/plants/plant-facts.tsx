import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useUnits } from "#/lib/units";
import {
  ASPECT_LABEL,
  EXPOSURE_LABEL,
  GROUP_LABEL,
  KIND_LABEL,
  MOISTURE_LABEL,
  PH_LABEL,
  SOIL_LABEL,
  SUN_LABEL,
} from "#/domain/labels";
import { SEASONS, seasonLook } from "#/domain/plants";
import { MONTH_NAMES, type Plant } from "#/domain/types";
import { formatJobDate } from "#/domain/jobs";
import { Card } from "#/components/generic/card";
import { plantPhoto } from "#/domain/plant-photos";
import { PlantImage, PlantPhotoCredit } from "./plant-image";

export function PlantFacts({ plant, onBack }: { plant: Plant; onBack?: () => void }) {
  const { range } = useUnits();
  const height = range(plant.heightM);
  const spread = range(plant.spreadM);
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <p>
        {onBack ? (
          <button type="button" className="text-sm text-leaf underline" onClick={onBack}>
            Back to the plan
          </button>
        ) : (
          <Link to="/plants" className="text-sm text-leaf underline">
            Back to the catalogue
          </Link>
        )}
      </p>
      <header>
        <p className="text-sm uppercase tracking-wide text-soil">
          {GROUP_LABEL[plant.group]} · {KIND_LABEL[plant.kind]}
        </p>
        <h1 className="mt-1 text-4xl">{plant.commonName}</h1>
        <p className="mt-1 font-serif text-xl italic text-ink/80">{plant.scientificName}</p>
        {plantPhoto(plant.id) ? (
          <figure className="mt-5">
            <PlantImage
              plantId={plant.id}
              className="aspect-[3/2] w-full rounded-lg object-cover"
            />
            <PlantPhotoCredit plantId={plant.id} />
          </figure>
        ) : null}
        <p className="mt-4 max-w-2xl leading-relaxed">{plant.summary}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Fact title="Growing conditions">
          <Row label="Soil" value={plant.soils.map((soil) => SOIL_LABEL[soil]).join(", ")} />
          <Row
            label="Moisture"
            value={plant.moisture.map((level) => MOISTURE_LABEL[level]).join(", ")}
          />
          <Row label="pH" value={plant.ph.map((level) => PH_LABEL[level]).join(", ")} />
        </Fact>
        <Fact title="Position">
          <Row label="Sun" value={plant.sun.map((sun) => SUN_LABEL[sun]).join(", ")} />
          <Row
            label="Aspect"
            value={plant.aspect.map((aspect) => ASPECT_LABEL[aspect]).join(", ")}
          />
          <Row
            label="Exposure"
            value={plant.exposure.map((exposure) => EXPOSURE_LABEL[exposure]).join(", ")}
          />
          <Row label="Hardiness" value={plant.hardiness} />
        </Fact>
        <Fact title="Size">
          <Row label="Time to maturity" value={plant.maturity} />
          <Row label="Max height" value={height} />
          <Row label="Max spread" value={spread} />
        </Fact>
        <Fact title="In the garden">
          <p className="text-sm leading-relaxed">{plant.cultivation}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink/80">{plant.pests}</p>
        </Fact>
      </section>

      <section>
        <h2 className="text-2xl">Colour and scent</h2>
        <p className="mt-1 text-sm text-ink/70">
          A mark in a season means the plant is doing that for at least part of it.
        </p>
        <table className="mt-3 w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="py-2 font-medium">Season</th>
              <th className="py-2 font-medium">Foliage</th>
              <th className="py-2 font-medium">Flower</th>
              <th className="py-2 font-medium">Scent</th>
            </tr>
          </thead>
          <tbody>
            {SEASONS.map((season) => {
              const look = seasonLook(plant, season.months);
              return (
                <tr key={season.id} className="border-b border-line/80">
                  <td className="py-2">{season.label}</td>
                  <td className="py-2">{look.foliage ? "Leaves" : "—"}</td>
                  <td className="py-2">{look.flowers.join(", ") || "—"}</td>
                  <td className="py-2">{look.scent ? "Scented" : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <ol className="mt-4 grid grid-cols-3 gap-2 text-xs sm:grid-cols-6">
          {plant.months.map((month, index) => (
            <li key={MONTH_NAMES[index]} className="rounded-md border border-line bg-card p-2">
              <span className="block text-ink/60">{MONTH_NAMES[index]?.slice(0, 3)}</span>
              <span className="mt-1 block">
                {month.flower ?? (month.foliage ? "Foliage" : "Dormant")}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-2xl">Jobs</h2>
        <p className="mt-1 text-sm text-ink/70">
          These dates suit a mild southern garden. A northern or Scottish plan shifts spring and
          autumn jobs by a fortnight.
        </p>
        <ul className="mt-3 space-y-3">
          {plant.jobs.map((job) => (
            <li key={`${job.title}-${job.month}`} className="border-l-2 border-leaf pl-3">
              <p className="text-sm text-soil">{formatJobDate(job.month, job.day)}</p>
              <p className="font-medium">{job.title}</p>
              <p className="text-sm leading-relaxed">{job.detail}</p>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}

function Fact({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="text-xl">{title}</h2>
      <div className="mt-2">{children}</div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between gap-4 border-b border-line/70 py-1 text-sm last:border-0">
      <span className="text-ink/60">{label}</span>
      <span className="text-right">{value}</span>
    </p>
  );
}
