import type { Point } from "#/domain/types";
import { useUnits } from "#/lib/units";
import { BedHandle, HandleStem } from "./handles";

export function PlanChrome({
  view,
  armedName,
  drawingLabel,
  bedLabels,
  activeBedId,
  handleSpots,
  pointerRef,
  adjust,
  scale,
}: {
  view: "plan" | "orbit";
  armedName: string | null;
  drawingLabel: string | null;
  bedLabels: { id: string; name: string; x: number; y: number }[];
  activeBedId: string | null;
  handleSpots: {
    turn: { x: number; y: number };
    resize: { x: number; y: number };
    center: { x: number; y: number };
  } | null;
  pointerRef: { current: (clientX: number, clientY: number) => Point | null };
  adjust: (kind: "rotate" | "scale" | "move", point: Point, phase: "down" | "move" | "up") => void;
  scale: { metres: number; pixels: number } | null;
}) {
  const units = useUnits();
  return (
    <>
      {view === "plan" ? (
        <p className="pointer-events-none absolute top-3 left-1/2 z-10 -translate-x-1/2 text-xs tracking-widest text-ink/70">
          NORTH
        </p>
      ) : null}
      {armedName ? (
        <p className="absolute top-3 left-3 z-10 rounded-full bg-leaf px-3 py-1 text-sm text-white">
          Click a bed to plant {armedName}
        </p>
      ) : null}
      {drawingLabel ? (
        <p className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-ink px-3 py-1 text-sm text-white">
          {drawingLabel}
        </p>
      ) : null}
      {view === "plan"
        ? bedLabels.map((label) => {
            const beside = label.id === activeBedId && handleSpots;
            return (
              <p
                key={label.id}
                className={`pointer-events-none absolute z-10 -translate-y-1/2 rounded-full bg-paper/90 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-ink shadow-sm ${beside ? "" : "-translate-x-1/2"}`}
                style={{ left: label.x + (beside ? 20 : 0), top: label.y }}
              >
                {label.name}
              </p>
            );
          })
        : null}
      {view === "plan" && handleSpots ? (
        <>
          <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full">
            <HandleStem from={handleSpots.center} to={handleSpots.turn} />
            <HandleStem from={handleSpots.center} to={handleSpots.resize} />
          </svg>
          <BedHandle
            label="Move"
            at={handleSpots.center}
            kind="move"
            toPoint={pointerRef}
            adjust={adjust}
          />
          <BedHandle
            label="Turn"
            at={handleSpots.turn}
            kind="rotate"
            toPoint={pointerRef}
            adjust={adjust}
          />
          <BedHandle
            label="Size"
            at={handleSpots.resize}
            kind="scale"
            toPoint={pointerRef}
            adjust={adjust}
          />
        </>
      ) : null}
      {view === "plan" && scale ? (
        <div className="pointer-events-none absolute bottom-4 left-4 z-10 text-ink">
          <div className="flex items-end">
            <span className="h-2 w-px bg-ink" />
            <span className="mb-1 h-0.5 bg-ink" style={{ width: scale.pixels }} />
            <span className="h-2 w-px bg-ink" />
          </div>
          <p className="mt-1 text-center text-xs" style={{ width: scale.pixels }}>
            {units.length(scale.metres)}
          </p>
        </div>
      ) : null}
    </>
  );
}
