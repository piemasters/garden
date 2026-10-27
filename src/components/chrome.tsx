import { Link } from "@tanstack/react-router";
import { useUnits } from "./units";

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
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-paper px-5 py-3 ${className ?? ""}`}
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

function ViewToggle({
  view,
  onViewChange,
}: {
  view: "plan" | "orbit";
  onViewChange: (view: "plan" | "orbit") => void;
}) {
  return (
    <div
      className="flex overflow-hidden rounded-full border border-line text-xs"
      role="group"
      aria-label="View"
    >
      {(
        [
          ["plan", "Plan"],
          ["orbit", "3D"],
        ] as const
      ).map(([option, label]) => (
        <button
          key={option}
          className={
            view === option
              ? "bg-leaf px-2.5 py-1 text-white"
              : "px-2.5 py-1 text-ink hover:text-leaf"
          }
          type="button"
          aria-pressed={view === option}
          onClick={() => onViewChange(option)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function UnitToggle() {
  const { unit, setUnit } = useUnits();
  return (
    <div
      className="flex overflow-hidden rounded-full border border-line text-xs"
      role="group"
      aria-label="Units"
    >
      {(["m", "ft"] as const).map((option) => (
        <button
          key={option}
          className={
            unit === option
              ? "bg-leaf px-2.5 py-1 text-white"
              : "px-2.5 py-1 text-ink hover:text-leaf"
          }
          type="button"
          aria-pressed={unit === option}
          onClick={() => setUnit(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export const inputClass =
  "mt-1 w-full rounded-md border border-line bg-card px-3 py-2 text-ink outline-none focus:border-leaf";

export const buttonClass =
  "rounded-full bg-leaf px-4 py-2 text-sm text-white transition hover:bg-leaf-dark disabled:cursor-not-allowed disabled:opacity-60";

export const quietButtonClass =
  "rounded-full border border-line bg-card px-4 py-2 text-sm text-ink hover:border-leaf";
