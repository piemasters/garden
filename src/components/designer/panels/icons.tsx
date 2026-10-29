export function PanelCaret({ up }: { up: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-5 w-5 ${up ? "" : "rotate-180"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m4 10 4-4 4 4" />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="8" cy="8" r="2.25" />
      <path d="M8 1.75v1.5M8 12.75v1.5M1.75 8h1.5M12.75 8h1.5M3.6 3.6l1.05 1.05M11.35 11.35l1.05 1.05M3.6 12.4l1.05-1.05M11.35 4.65l1.05-1.05" />
    </svg>
  );
}

export function DuplicateIcon() {
  const stroke = {
    viewBox: "0 0 16 16",
    className: "h-3.5 w-3.5 shrink-0",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  return (
    <svg {...stroke}>
      <rect x="2.25" y="4.75" width="7.5" height="7.5" rx="0.75" />
      <path d="M6.25 4.75V3.5A1.25 1.25 0 0 1 7.5 2.25h5A1.25 1.25 0 0 1 13.75 3.5v5A1.25 1.25 0 0 1 12.5 9.75H11" />
    </svg>
  );
}
