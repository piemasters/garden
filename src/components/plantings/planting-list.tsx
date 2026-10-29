import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { Garden } from "#/domain/types";
import { plantedCount } from "#/lib/fill-cap";
import { PlantedGroups, groupPlantings } from "#/components/designer/panels/planted-groups";
import { Tabs } from "#/components/generic/tabs";

type PlantingView = "beds" | "all";

export function PlantingList({
  garden,
  onRemove,
}: {
  garden: Garden;
  onRemove: (plantId: string, bedId?: string) => void;
}) {
  const [view, setView] = useState<PlantingView>("beds");
  const month = new Date().getMonth();
  const total = plantedCount(garden.placements);
  const totalGroups = groupPlantings(garden.placements);
  return (
    <>
      <p className="text-sm uppercase tracking-wide text-soil">{garden.site.name}</p>
      <h1 className="mt-1 text-4xl">Plantings</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/70">
        See the plants in each bed, or a total across the garden.{" "}
        <Link
          to="/gardens/$gardenId"
          params={{ gardenId: garden.id }}
          className="text-leaf underline"
        >
          Back to the plan
        </Link>
      </p>
      {garden.beds.length === 0 ? (
        <p className="mt-6">Draw a bed on the plan and the plants you place will collect here.</p>
      ) : (
        <>
          <Tabs
            className="mt-6"
            label="Plantings"
            value={view}
            options={["beds", "all"]}
            labels={{ beds: "Beds", all: "All" }}
            onChange={setView}
          />
          {view === "beds" ? (
            <div className="mt-8 space-y-8" role="tabpanel">
              {garden.beds.map((bed) => {
                const placements = garden.placements.filter((item) => item.bedId === bed.id);
                const groups = groupPlantings(placements);
                return (
                  <section key={bed.id}>
                    <h2 className="flex items-baseline justify-between text-2xl">
                      {bed.name}
                      <span className="text-base font-normal text-ink/60">
                        {plantedCount(placements)}
                      </span>
                    </h2>
                    {groups.length === 0 ? (
                      <p className="mt-2 text-sm text-ink/60">Nothing planted in this bed.</p>
                    ) : (
                      <PlantedGroups
                        groups={groups}
                        month={month}
                        scope={bed.name}
                        onRemove={(plantId) => onRemove(plantId, bed.id)}
                      />
                    )}
                  </section>
                );
              })}
            </div>
          ) : (
            <section className="mt-8" role="tabpanel">
              <h2 className="flex items-baseline justify-between text-2xl">
                All beds
                <span className="text-base font-normal text-ink/60">{total}</span>
              </h2>
              {totalGroups.length === 0 ? (
                <p className="mt-2 text-sm text-ink/60">Nothing planted yet.</p>
              ) : (
                <PlantedGroups
                  groups={totalGroups}
                  month={month}
                  scope="every bed"
                  onRemove={(plantId) => onRemove(plantId)}
                />
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}
