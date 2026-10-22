import { Link, createFileRoute } from "@tanstack/react-router";
import { CreateGarden } from "../components/create-garden";
import { AppHeader } from "../components/chrome";
import { useGardenList } from "../lib/use-garden";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({ meta: [{ title: "Gardens · Garden" }] }),
});

function Home() {
  const { ready, gardens, refresh, remove } = useGardenList();
  return (
    <>
      <AppHeader />
      <main className="mx-auto grid max-w-5xl gap-10 px-5 py-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <p className="text-sm uppercase tracking-wide text-soil">UK garden planner</p>
          <h1 className="mt-2 text-5xl">Plan a bed around the soil and the sun.</h1>
          <p className="mt-4 max-w-xl leading-relaxed">
            Start with an address and postcode, confirm the soil, then draw beds and place plants
            that can live there. The plan changes with the month, and the jobs follow the plants you
            chose.
          </p>
          <div className="mt-8 rounded-lg border border-line bg-card p-5">
            <h2 className="text-2xl">New garden</h2>
            <div className="mt-4">
              <CreateGarden onCreated={refresh} />
            </div>
          </div>
        </section>
        <section>
          <h2 className="text-2xl">Saved in this browser</h2>
          {!ready ? <p className="mt-3 text-sm">Loading gardens…</p> : null}
          {ready && gardens.length === 0 ? (
            <p className="mt-3 text-sm text-ink/70">No gardens yet.</p>
          ) : null}
          <ul className="mt-4 space-y-3">
            {gardens.map((garden) => (
              <li key={garden.id} className="rounded-lg border border-line bg-card p-4">
                <Link
                  to="/gardens/$gardenId"
                  params={{ gardenId: garden.id }}
                  className="text-xl hover:text-leaf"
                >
                  {garden.site.name}
                </Link>
                <p className="text-sm text-ink/70">
                  {garden.site.postcode} · {garden.beds.length} beds · {garden.placements.length}{" "}
                  plants
                </p>
                <button
                  className="mt-2 text-xs text-clay"
                  type="button"
                  onClick={() => remove(garden.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
