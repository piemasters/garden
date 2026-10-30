import { Link } from "@tanstack/react-router";
import { GROUP_LABEL, KIND_LABEL, SUN_LABEL } from "#/domain/labels";
import type { Plant } from "#/domain/types";
import { Card } from "#/components/generic/card";
import { PlantImage } from "./plant-image";

export const PlantsListItem = ({ plant, layout }: { plant: Plant; layout: "grid" | "list" }) => {
  const facts = `${GROUP_LABEL[plant.group]} · ${KIND_LABEL[plant.kind]} · ${plant.hardiness} · ${plant.sun.map((item) => SUN_LABEL[item]).join(", ")}`;
  return (
    <Card className="overflow-hidden p-0 transition hover:border-leaf">
      <Link
        to="/plants/$plantId"
        params={{ plantId: plant.id }}
        className={
          layout === "list"
            ? "flex items-center gap-3 p-2 outline-none focus-visible:outline-2 focus-visible:outline-leaf"
            : "block outline-none focus-visible:outline-2 focus-visible:outline-leaf"
        }
      >
        <PlantImage
          plantId={plant.id}
          className={
            layout === "list"
              ? "h-14 w-14 shrink-0 rounded-md object-cover"
              : "aspect-[3/2] w-full object-cover"
          }
        />
        <div className={layout === "list" ? "min-w-0" : "p-5"}>
          <p className={layout === "list" ? "font-medium" : "text-xl"}>{plant.commonName}</p>
          <p className="font-serif text-sm italic text-ink/70">{plant.scientificName}</p>
          {layout === "grid" ? (
            <p className="mt-2 text-sm leading-relaxed">{plant.summary}</p>
          ) : null}
          <p
            className={
              layout === "list"
                ? "mt-0.5 truncate text-xs uppercase tracking-wide text-soil"
                : "mt-2 text-xs uppercase tracking-wide text-soil"
            }
          >
            {facts}
          </p>
          {layout === "grid" ? <p className="mt-3 text-sm text-leaf">Full details</p> : null}
        </div>
      </Link>
    </Card>
  );
};
