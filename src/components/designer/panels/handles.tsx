import type { Point } from "#/domain/types";

/** A guide from Move out to Turn or Size, stopping short of both buttons. */
export function HandleStem({
  from,
  to,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const room = Math.max(length - 6, 0);
  const start = Math.min(15, room * 0.4);
  const end = Math.min(15, room * 0.4);
  return (
    <line
      x1={from.x + (dx / length) * start}
      y1={from.y + (dy / length) * start}
      x2={to.x - (dx / length) * end}
      y2={to.y - (dy / length) * end}
      stroke="#1c2822"
      strokeOpacity="0.45"
      strokeWidth="1.25"
      strokeDasharray="1.5 3"
      strokeLinecap="round"
    />
  );
}

export function BedHandle({
  label,
  at,
  kind,
  toPoint,
  adjust,
}: {
  label: string;
  at: { x: number; y: number };
  kind: "rotate" | "scale" | "move";
  toPoint: { current: (clientX: number, clientY: number) => Point | null };
  adjust: (kind: "rotate" | "scale" | "move", point: Point, phase: "down" | "move" | "up") => void;
}) {
  function atEvent(event: { clientX: number; clientY: number }, phase: "down" | "move" | "up") {
    const point = toPoint.current(event.clientX, event.clientY);
    if (point) adjust(kind, point, phase);
  }
  return (
    <button
      className="group absolute z-20 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded-full border border-white bg-leaf text-white shadow pointer-fine:h-7 pointer-fine:w-7 active:cursor-grabbing"
      style={{ left: at.x, top: at.y }}
      type="button"
      aria-label={label}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        event.preventDefault();
        const pointerId = event.pointerId;
        atEvent(event, "down");
        const move = (native: PointerEvent) => {
          if (native.pointerId !== pointerId) return;
          native.preventDefault();
          atEvent(native, "move");
        };
        const up = (native: PointerEvent) => {
          if (native.pointerId !== pointerId) return;
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          window.removeEventListener("pointercancel", up);
          atEvent(native, "up");
        };
        window.addEventListener("pointermove", move, { passive: false });
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", up);
      }}
    >
      <HandleIcon kind={kind} />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-paper opacity-0 shadow group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}

export function HandleIcon({ kind }: { kind: "rotate" | "scale" | "move" }) {
  const stroke = {
    viewBox: "0 0 16 16",
    className: "h-5 w-5 pointer-fine:h-3.5 pointer-fine:w-3.5",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (kind === "move") {
    return (
      <svg {...stroke}>
        <path d="M8 1.75v12.5M1.75 8h12.5" />
        <path d="m5.5 4.25 2.5-2.5 2.5 2.5M5.5 11.75 8 14.25l2.5-2.5M4.25 5.5 1.75 8l2.5 2.5M11.75 5.5 14.25 8l-2.5 2.5" />
      </svg>
    );
  }
  if (kind === "rotate") {
    return (
      <svg {...stroke}>
        <path d="M12.75 6.25a4.75 4.75 0 1 0 .4 4.4" />
        <path d="M12.75 2.75v3.5h-3.5" />
      </svg>
    );
  }
  return (
    <svg {...stroke}>
      <path d="M9.25 2.75h4v4M6.75 13.25h-4v-4" />
      <path d="m13.25 2.75-4.5 4.5M2.75 13.25l4.5-4.5" />
    </svg>
  );
}
