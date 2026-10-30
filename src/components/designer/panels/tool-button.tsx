import type { ReactNode } from "react";
import { Button } from "#/components/generic/button";
import type { Tool } from "../tools";

type ToolButtonProps = {
  title?: string;
  compact?: boolean;
  disabled?: boolean;
  /** Clay text, used for Remove. */
  danger?: boolean;
  children: string;
} & (
  | {
      current: Tool;
      tool: Tool;
      onClick: (tool: Tool) => void;
    }
  | {
      icon?: ReactNode;
      selected?: boolean;
      onClick: () => void;
    }
);

export function ToolButton(props: ToolButtonProps) {
  const { title, compact = false, disabled = false, danger = false, children } = props;
  const action = !("tool" in props);
  const selected = action ? Boolean(props.selected) : props.current === props.tool;
  return (
    <Button
      variant={danger ? "danger" : selected ? "primary" : "secondary"}
      compact={compact}
      title={title}
      disabled={disabled}
      onClick={() => {
        if (action) props.onClick();
        else props.onClick(props.tool);
      }}
    >
      {action ? props.icon : compact ? <DrawToolIcon tool={props.tool} /> : null}
      {children}
    </Button>
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
