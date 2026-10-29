import { Link } from "@tanstack/react-router";
import { ViewToggle } from "./view-toggle";
import { UnitToggle } from "./unit-toggle";
import { twMerge } from "tailwind-merge";

const globalLinkClass = "text-ink/50 hover:text-leaf aria-[current=page]:text-ink";
const gardenLinkClass = "font-medium text-ink hover:text-leaf aria-[current=page]:text-leaf";

export function AppHeader({
  gardenId,
  view,
  onViewChange,
  className,
}: {
  gardenId?: string;
  view?: "plan" | "orbit";
  onViewChange?: (view: "plan" | "orbit") => void;
  className?: string;
}) {
  return (
    <header
      className={twMerge(
        "flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3",
        "border-b border-line bg-paper",
        className,
      )}
    >
      <Link to="/" className="font-serif text-2xl text-ink max-lg:mr-auto">
        Garden
      </Link>
      <div className="flex items-center gap-2 lg:order-2 lg:ml-4 md:border-l border-line md:pl-6">
        <UnitToggle />
        {view && onViewChange ? <ViewToggle view={view} onViewChange={onViewChange} /> : null}
      </div>
      <nav className="flex basis-full flex-wrap items-center gap-x-6 gap-y-2 text-sm lg:order-1 lg:ml-auto lg:basis-auto">
        <div className="flex items-center gap-4">
          <Link to="/" activeOptions={{ exact: true }} className={globalLinkClass}>
            Gardens
          </Link>
          <Link to="/plants" activeOptions={{ exact: true }} className={globalLinkClass}>
            Catalogue
          </Link>
        </div>
        {gardenId ? (
          <div className="flex items-center gap-4 border-l border-line pl-5">
            <Link
              to="/gardens/$gardenId"
              params={{ gardenId }}
              activeOptions={{ exact: true }}
              className={gardenLinkClass}
            >
              Plan
            </Link>
            <Link
              to="/gardens/$gardenId/plantings"
              params={{ gardenId }}
              className={gardenLinkClass}
            >
              Planted
            </Link>
            <Link to="/gardens/$gardenId/jobs" params={{ gardenId }} className={gardenLinkClass}>
              Jobs
            </Link>
          </div>
        ) : null}
      </nav>
    </header>
  );
}
