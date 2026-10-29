import { useState } from "react";
import { useGardenList } from "#/lib/use-garden";
import { Link } from "@tanstack/react-router";
import { Card } from "#/components/generic/card";
import { Button } from "#/components/generic/button";

export const SavedGardens = () => {
  const { ready, gardens, remove } = useGardenList();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  return (
    <section>
      <h2 className="text-2xl">Saved in this browser</h2>
      {!ready ? <p className="mt-3 text-sm">Loading gardens…</p> : null}
      {ready && gardens.length === 0 ? (
        <p className="mt-3 text-sm text-ink/70">No gardens yet.</p>
      ) : null}
      {gardens.length > 0 ? (
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
              {pendingDeleteId === garden.id ? (
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    onClick={() => {
                      remove(garden.id);
                      setPendingDeleteId(null);
                    }}
                  >
                    Confirm delete
                  </Button>
                  <Button variant="secondary" onClick={() => setPendingDeleteId(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button variant="danger" onClick={() => setPendingDeleteId(garden.id)}>
                  Delete
                </Button>
              )}
            </Card>
          ))}
        </ul>
      ) : null}
    </section>
  );
};
