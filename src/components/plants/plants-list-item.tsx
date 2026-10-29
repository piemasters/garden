import { Link } from "@tanstack/react-router";
import { GROUP_LABEL, KIND_LABEL, SUN_LABEL } from "#/domain/labels";
import type { Plant } from "#/domain/types";
import { Card } from "#/components/generic/card";

export const PlantsListItem = ({ plant }: { plant: Plant }) => {
  return (
    <Card className="p-0 transition hover:border-leaf">
      <Link
        to="/plants/$plantId"
        params={{ plantId: plant.id }}
        className="block p-5 outline-none focus-visible:outline-2 focus-visible:outline-leaf"
      >
        <p className="text-xl">{plant.commonName}</p>
        <p className="font-serif text-sm italic text-ink/70">{plant.scientificName}</p>
        <p className="mt-2 text-sm leading-relaxed">{plant.summary}</p>
        <p className="mt-2 text-xs uppercase tracking-wide text-soil">
          {GROUP_LABEL[plant.group]} · {KIND_LABEL[plant.kind]} · {plant.hardiness} ·{" "}
          {plant.sun.map((item) => SUN_LABEL[item]).join(", ")}
        </p>
        <p className="mt-3 text-sm text-leaf">Full details</p>
      </Link>
    </Card>
  );
};
