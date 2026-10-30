import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { twMerge } from "tailwind-merge";
import { GROUP_LABEL } from "#/domain/labels";
import { seasonInMonth } from "#/domain/plants";
import { MONTH_NAMES, PLANT_GROUPS, type Plant, type PlantGroup } from "#/domain/types";
import { Select } from "#/components/generic/select";
import { PlantImage } from "#/components/plants/plant-image";
import type { groupPlantings } from "#/components/designer/panels/planted-groups";

type MonthFilter = "all" | (typeof MONTH_NAMES)[number];

const MONTH_LABEL = {
  all: "All year",
  ...Object.fromEntries(MONTH_NAMES.map((name) => [name, name])),
} as Record<MonthFilter, string>;

const GROUP_ORDER = Object.fromEntries(
  PLANT_GROUPS.map((group, index) => [group, index]),
) as Record<PlantGroup, number>;

export function PlantingTimeline({
  groups,
  today = new Date().getMonth(),
}: {
  groups: ReturnType<typeof groupPlantings>;
  today?: number;
}) {
  const [month, setMonth] = useState<MonthFilter>("all");
  const chosen = month === "all" ? null : MONTH_NAMES.indexOf(month);
  const marked = chosen ?? today;
  const rows = groups
    .filter(({ plant }) => chosen == null || seasonInMonth(plant, chosen))
    .sort(
      (a, b) =>
        GROUP_ORDER[a.plant.group] - GROUP_ORDER[b.plant.group] ||
        a.plant.commonName.localeCompare(b.plant.commonName),
    );
  return (
    <section className="mt-6" role="tabpanel">
      <p className="text-sm leading-relaxed text-ink/70">
        Flowers are marked while they are in bloom. Vegetables and fruit are marked while they are
        ready to pick.
      </p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-sm text-ink/60">
          {rows.length} {rows.length === 1 ? "plant" : "plants"}
          {month === "all" ? "" : ` in ${month}`}
        </p>
        <div className="w-40">
          <Select
            label="Month"
            value={month}
            options={["all", ...MONTH_NAMES]}
            labels={MONTH_LABEL}
            onChange={setMonth}
          />
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-ink/60">
          {groups.length === 0
            ? "Nothing planted yet."
            : `Nothing is in bloom or ready to pick in ${month}.`}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[44rem] table-fixed border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-[42vw] max-w-44 overflow-hidden bg-paper py-2 pr-3 text-left font-normal text-ink/50 sm:w-52 sm:max-w-none">
                  Plant
                </th>
                {MONTH_NAMES.map((name, index) => (
                  <th
                    key={name}
                    className={twMerge(
                      "px-0.5 py-2 text-center text-xs font-normal text-ink/50",
                      index === marked && "font-medium text-leaf",
                    )}
                  >
                    <abbr title={name} className="no-underline">
                      {name.slice(0, 3)}
                    </abbr>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ plant, count }, index) => {
                const previous = rows[index - 1]?.plant.group;
                return (
                  <TimelineRow
                    key={plant.id}
                    plant={plant}
                    count={count}
                    marked={marked}
                    heading={previous !== plant.group}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TimelineRow({
  plant,
  count,
  marked,
  heading,
}: {
  plant: Plant;
  count: number;
  marked: number;
  heading: boolean;
}) {
  const active = plant.months.map((_, month) => seasonInMonth(plant, month));
  const kind = plant.group === "flower" ? "In flower" : "Ready to pick";
  return (
    <>
      {heading ? (
        <tr>
          <th
            colSpan={13}
            className="pt-4 pb-1 text-left text-xs font-medium tracking-wide text-soil uppercase"
          >
            {GROUP_LABEL[plant.group]}
          </th>
        </tr>
      ) : null}
      <tr>
        <th
          className="sticky left-0 z-10 w-[42vw] max-w-44 overflow-hidden bg-paper py-1.5 pr-3 text-left align-middle font-normal sm:w-52 sm:max-w-none"
          scope="row"
        >
          <span className="flex items-center gap-2">
            <PlantImage plantId={plant.id} className="h-8 w-8 shrink-0 rounded object-cover" />
            <span className="min-w-0 flex-1 overflow-hidden">
              <Link
                to="/plants/$plantId"
                params={{ plantId: plant.id }}
                className="block truncate font-medium hover:text-leaf"
                title={plant.commonName}
              >
                {plant.commonName}
              </Link>
              <span className="block truncate text-xs text-ink/50">
                {plant.group === "flower" ? "Flowering" : "Harvest"}
                {count > 1 ? ` · ${count}` : ""}
              </span>
            </span>
          </span>
        </th>
        {active.map((on, month) => {
          const color = on ? (plant.months[month]?.flowerHex ?? "#2c6b4a") : null;
          const starts = on && !active[month - 1];
          const ends = on && !active[month + 1];
          return (
            <td
              key={month}
              className={twMerge("px-0 align-middle", month === marked && "bg-mist/80")}
            >
              <div className="flex h-11 items-center">
                <div
                  className={twMerge(
                    on ? "h-3 w-full" : "h-px w-full bg-line",
                    starts && "rounded-l-full",
                    ends && "rounded-r-full",
                    color && pale(color) && "ring-1 ring-ink/15 ring-inset",
                  )}
                  style={color ? { backgroundColor: color } : undefined}
                  title={on ? `${plant.commonName}, ${MONTH_NAMES[month]}: ${kind}` : undefined}
                >
                  <span className="sr-only">{on ? `${kind} in ${MONTH_NAMES[month]}` : "—"}</span>
                </div>
              </div>
            </td>
          );
        })}
      </tr>
    </>
  );
}

function pale(hex: string): boolean {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return false;
  const value = Number.parseInt(hex.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return red > 210 && green > 210 && blue > 190;
}
