import { Link } from "@tanstack/react-router";
import { ViewToggle } from "./view-toggle";
import { UnitToggle } from "./unit-toggle";
import { twMerge } from "tailwind-merge";

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
      <div className="flex items-center gap-2">
        <UnitToggle />
        {view && onViewChange ? <ViewToggle view={view} onViewChange={onViewChange} /> : null}
      </div>
      <nav className="flex basis-full flex-wrap items-center gap-x-4 gap-y-2 text-sm lg:ml-auto lg:basis-auto">
        <Link to="/" className="hover:text-leaf">
          Gardens
        </Link>
        <Link to="/plants" className="hover:text-leaf">
          Catalogue
        </Link>
        {gardenId ? (
          <>
            <Link to="/gardens/$gardenId" params={{ gardenId }} className="hover:text-leaf">
              Plan
            </Link>
            <Link to="/gardens/$gardenId/jobs" params={{ gardenId }} className="hover:text-leaf">
              Jobs
            </Link>
          </>
        ) : null}
      </nav>
    </header>
  );
}
