import { Link } from "@tanstack/react-router";
import { useGarden } from "#/lib/use-garden";
import { JobList } from "./job-list";

export function Jobs({ gardenId }: { gardenId: string }) {
  const { ready, garden } = useGarden(gardenId);
  if (!ready) return <p>Loading jobs…</p>;
  if (!garden) {
    return (
      <p>
        This garden is not saved in this browser.{" "}
        <Link to="/" className="text-leaf underline">
          Back to your gardens
        </Link>
      </p>
    );
  }
  return <JobList garden={garden} />;
}
