import type { ButtonHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export const Button = ({
  children,
  variant,
  type,
  compact,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant: "primary" | "secondary" | "danger";
  compact?: boolean;
}) => {
  return (
    <button
      type={type ? type : "button"}
      className={twMerge(
        "rounded-full transition inline-flex items-center cursor-pointer",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-leaf hover:bg-leaf-dark text-white",
        variant === "secondary" && "border border-line bg-card text-ink hover:border-leaf",
        variant === "danger" && "border border-line bg-card text-clay hover:border-clay",
        compact ? "gap-1 px-2 py-1 text-sm!" : "gap-2 px-4 py-2 text-base!",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};
