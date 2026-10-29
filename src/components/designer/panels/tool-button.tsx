import { buttonClass, quietButtonClass, type Tool } from "../tools";

export function ToolButton({
  current,
  tool,
  onClick,
  title,
  compact = false,
  children,
}: {
  current: Tool;
  tool: Tool;
  onClick: (tool: Tool) => void;
  title?: string;
  compact?: boolean;
  children: string;
}) {
  const selected = current === tool;
  const className = compact
    ? selected
      ? "inline-flex min-h-8 items-center gap-1 rounded-full bg-leaf px-2 py-1 text-[11px] text-white hover:bg-leaf-dark"
      : "inline-flex min-h-8 items-center gap-1 rounded-full border border-line bg-card px-2 py-1 text-[11px] text-ink hover:border-leaf"
    : selected
      ? buttonClass
      : quietButtonClass;
  return (
    <button className={className} type="button" title={title} onClick={() => onClick(tool)}>
      {compact ? <DrawToolIcon tool={tool} /> : null}
      {children}
    </button>
  );
}

export function DrawToolIcon({ tool }: { tool: Tool }) {
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
  if (tool === "select") {
    return (
      <svg {...stroke}>
        <path d="M4 2.25v9.2l2.15-2.35 2.05 4.15 1.7-.85-2.05-4.1H12Z" />
      </svg>
    );
  }
  if (tool === "rect") {
    return (
      <svg {...stroke}>
        <rect x="2.75" y="4.25" width="10.5" height="7.5" rx="0.5" />
      </svg>
    );
  }
  if (tool === "angled") {
    return (
      <svg {...stroke}>
        <path d="M5.25 3.75h8L10.75 12.25h-8Z" />
      </svg>
    );
  }
  if (tool === "freeform") {
    return (
      <svg {...stroke}>
        <path d="M3 8.25c1.4-3.4 3.4-4.6 5.2-3.2 1.6 1.2.8 3.2 2.6 3.5 1.5.2 2.3-1.5 2.7-2.3" />
        <path d="M3 8.25c.3 3.3 2.4 4.8 4.6 4 1.8-.6 2.2-2.2 4-2" />
      </svg>
    );
  }
  if (tool === "bed") {
    return (
      <svg {...stroke}>
        <path d="M3.25 11.25 6.5 3.5 13 6.25 10.25 12.75Z" />
        <circle cx="3.25" cy="11.25" r="1" fill="currentColor" stroke="none" />
        <circle cx="6.5" cy="3.5" r="1" fill="currentColor" stroke="none" />
        <circle cx="13" cy="6.25" r="1" fill="currentColor" stroke="none" />
        <circle cx="10.25" cy="12.75" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg {...stroke}>
      <path d="M2.75 5.75h7.5v7.5h-7.5Z" />
      <path d="M5.75 3.25h7.5v7.5" />
    </svg>
  );
}
