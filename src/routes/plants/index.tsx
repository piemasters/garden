import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppHeader } from "../../components/chrome";
import { inputClass } from "../../components/chrome";
import { KIND_LABEL, SUN_LABEL } from "../../domain/labels";
import { PLANTS } from "../../domain/plants";
import { PLANT_KINDS, SUN_LEVELS, type PlantKind, type SunLevel } from "../../domain/types";

export const Route = createFileRoute("/plants/")({
  component: Catalogue,
  head: () => ({ meta: [{ title: "Catalogue · Garden" }] }),
});

function Catalogue() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<PlantKind | "all">("all");
  const [sun, setSun] = useState<SunLevel | "all">("all");
  const plants = useMemo(
    () =>
      PLANTS.filter((plant) => {
        const haystack = `${plant.commonName} ${plant.scientificName}`.toLowerCase();
        if (query && !haystack.includes(query.trim().toLowerCase())) return false;
        if (kind !== "all" && plant.kind !== kind) return false;
        if (sun !== "all" && !plant.sun.includes(sun)) return false;
        return true;
      }),
    [kind, query, sun],
  );

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-5xl px-5 py-8">
        <h1 className="text-4xl">Catalogue</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/70">
          A UK garden set of plants, bulbs and seeds, with the conditions, size and seasonal colour
          you need to choose. These notes are written for this planner.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            Search
            <input
              className={inputClass}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tulip, rose, bean"
            />
          </label>
          <label className="text-sm">
            Kind
            <select
              className={inputClass}
              value={kind}
              onChange={(event) => setKind(event.target.value as PlantKind | "all")}
            >
              <option value="all">All</option>
              {PLANT_KINDS.map((item) => (
                <option key={item} value={item}>
                  {KIND_LABEL[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Sun
            <select
              className={inputClass}
              value={sun}
              onChange={(event) => setSun(event.target.value as SunLevel | "all")}
            >
              <option value="all">Any</option>
              {SUN_LEVELS.map((item) => (
                <option key={item} value={item}>
                  {SUN_LABEL[item]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-4 text-sm text-ink/60">{plants.length} plants</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {plants.map((plant) => (
            <li key={plant.id} className="rounded-lg border border-line bg-card p-4">
              <Link
                to="/plants/$plantId"
                params={{ plantId: plant.id }}
                className="text-xl hover:text-leaf"
              >
                {plant.commonName}
              </Link>
              <p className="font-serif text-sm italic text-ink/70">{plant.scientificName}</p>
              <p className="mt-2 text-sm leading-relaxed">{plant.summary}</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-soil">
                {KIND_LABEL[plant.kind]} · {plant.hardiness} ·{" "}
                {plant.sun.map((item) => SUN_LABEL[item]).join(", ")}
              </p>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
