import { plantPhoto } from "#/domain/plant-photos";

export function PlantImage({ plantId, className }: { plantId: string; className?: string }) {
  const photo = plantPhoto(plantId);
  if (!photo) return null;
  return <img src={photo.src} alt="" className={className} />;
}

export function PlantPhotoCredit({ plantId }: { plantId: string }) {
  const photo = plantPhoto(plantId);
  if (!photo) return null;
  return (
    <figcaption className="mt-2 text-xs leading-relaxed text-ink/60">
      Photograph{photo.artist ? ` by ${photo.artist}` : ""}, {photo.license}, via{" "}
      <a href={photo.source} className="underline">
        Wikimedia Commons
      </a>
    </figcaption>
  );
}
