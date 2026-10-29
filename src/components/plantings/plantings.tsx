import { Link } from "@tanstack/react-router";
import { useGarden } from "#/lib/use-garden";
import { PlantingList } from "./planting-list";

export function Plantings({ gardenId }: { gardenId: string }) {
  const { ready, garden, update } = useGarden(gardenId);
  if (!ready) return <p>Loading plantings…</p>;
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
  return (
    <PlantingList
      garden={garden}
      onRemove={(plantId, bedId) =>
        update((current) => ({
          ...current,
          placements: current.placements.filter((item) => {
            if (item.plantId !== plantId) return true;
            return bedId != null && item.bedId !== bedId;
          }),
        }))
      }
    />
  );
}
