import { useUnits } from "#/lib/units";

export function ShadeHeight({
  height,
  onHeight,
}: {
  height: number;
  onHeight: (height: number) => void;
}) {
  const units = useUnits();
  return (
    <label className="block text-sm">
      <span className="block text-xs text-ink/60">Height {units.length(height)}</span>
      <input
        className="mt-1 w-full"
        type="range"
        min={0.5}
        max={20}
        step={0.5}
        value={height}
        onChange={(event) => onHeight(Number(event.target.value))}
      />
    </label>
  );
}
