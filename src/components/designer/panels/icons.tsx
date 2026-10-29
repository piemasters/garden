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

const shadeIcon = {
  viewBox: "0 0 16 16",
  className: "h-3.5 w-3.5 shrink-0",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function ShadeAreaIcon({
  kind,
}: {
  kind: "House" | "Garage" | "Shed" | "Tree" | "Hedge" | "Fence" | "Custom";
}) {
  if (kind === "House") {
    return (
      <svg {...shadeIcon}>
        <path d="M2.75 7.6 8 3.15 13.25 7.6" />
        <path d="M4.15 7.15V13.1h7.7V7.15" />
        <path d="M7.05 13.1V9.7h1.9v3.4" />
      </svg>
    );
  }
  if (kind === "Garage") {
    return (
      <svg {...shadeIcon}>
        <path d="M2.15 7.15 8 4.35 13.85 7.15" />
        <path d="M3.15 6.85V13.1h9.7V6.85" />
        <path d="M4.7 13.1V8.7h6.6v4.4" />
        <path d="M4.7 10.9h6.6" />
      </svg>
    );
  }
  if (kind === "Shed") {
    return (
      <svg {...shadeIcon}>
        <path d="M3.6 8.35 8 3.2 12.4 8.35" />
        <path d="M4.7 8.05V13.1h6.6V8.05" />
        <path d="M7.15 13.1v-2.35h1.7V13.1" />
      </svg>
    );
  }
  if (kind === "Tree") {
    return (
      <svg {...shadeIcon}>
        <circle cx="8" cy="6" r="3.15" />
        <path d="M8 9.15v4.2M6.15 13.35h3.7" />
      </svg>
    );
  }
  if (kind === "Hedge") {
    return (
      <svg {...shadeIcon}>
        <path d="M1.7 12.6c0-2.6.9-3.5 1.8-3.5s1.8.9 1.8 3.5" />
        <path d="M6.2 12.6c0-2.9 1-4 1.8-4s1.8 1.1 1.8 4" />
        <path d="M10.7 12.6c0-2.6.9-3.5 1.8-3.5s1.8.9 1.8 3.5" />
        <path d="M1.4 12.6h13.2" />
      </svg>
    );
  }
  if (kind === "Fence") {
    return (
      <svg {...shadeIcon}>
        <path d="M2.6 13.2V6.2L4.3 4.2 6 6.2v7" />
        <path d="M6.3 13.2V6.2L8 4.2l1.7 2v7" />
        <path d="M10 13.2V6.2l1.7-2 1.7 2v7" />
        <path d="M2.6 9.3h10.8" />
      </svg>
    );
  }
  return (
    <svg {...shadeIcon}>
      <rect x="2.5" y="5" width="7.25" height="7.25" rx="0.6" />
      <path d="M6.25 2.75h7.25v7.25" />
    </svg>
  );
}

export function RemoveIcon() {
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
      <path d="M3.25 4.6h9.5" />
      <path d="M6.35 4.6V3.25h3.3V4.6" />
      <path d="M4.55 4.6 5.15 12.75h5.7l.6-8.15" />
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
