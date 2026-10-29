import { useGardenList } from "#/lib/use-garden";
import { Link } from "@tanstack/react-router";
import { Card } from "../generic/card";
import { Button } from "../generic/button";

export const SavedGardens = () => {
  const { ready, gardens, remove } = useGardenList();

  return (
    <section>
      <h2 className="text-2xl">Saved in this browser</h2>
      {!ready ? <p className="mt-3 text-sm">Loading gardens…</p> : null}
      {ready && gardens.length === 0 ? (
        <p className="mt-3 text-sm text-ink/70">No gardens yet.</p>
      ) : null}
      <ul className="mt-4 space-y-3">
        {gardens.map((garden) => (
          <Card key={garden.id} className="flex justify-between">
            <div className="flex flex-col">
              <Link
                to="/gardens/$gardenId"
                params={{ gardenId: garden.id }}
                className="text-xl hover:text-leaf"
              >
                {garden.site.name}
              </Link>
              <p className="text-sm text-ink/70 pb-2">
                {garden.site.postcode} · {garden.beds.length} beds · {garden.placements.length}{" "}
                plants
              </p>
            </div>
            <Button variant="danger" onClick={() => remove(garden.id)}>
              Delete
            </Button>
          </Card>
        ))}
      </ul>
    </section>
  );
};
