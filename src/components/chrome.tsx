import { Link } from "@tanstack/react-router";

export function AppHeader({ gardenId }: { gardenId?: string }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper px-5 py-3">
      <Link to="/" className="font-serif text-2xl text-ink">
        Garden
      </Link>
      <nav className="flex flex-wrap items-center gap-4 text-sm">
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

export const inputClass =
  "mt-1 w-full rounded-md border border-line bg-card px-3 py-2 text-ink outline-none focus:border-leaf";

export const buttonClass =
  "rounded-full bg-leaf px-4 py-2 text-sm text-white transition hover:bg-leaf-dark disabled:cursor-not-allowed disabled:opacity-60";

export const quietButtonClass =
  "rounded-full border border-line bg-card px-4 py-2 text-sm text-ink hover:border-leaf";
