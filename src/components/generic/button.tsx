import type { ButtonHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export const Button = ({
  children,
  variant,
  type,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant: "primary" | "secondary" | "danger" }) => {
  return (
    <button
      type={type ? type : "button"}
      className={twMerge(
        "rounded-full px-4 py-2 text-sm transition",
        variant === "primary" && "bg-leaf hover:bg-leaf-dark text-white",
        variant === "secondary" && "border border-line bg-card text-ink hover:border-leaf",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variant === "danger" && "border border-line bg-card text-clay hover:border-leaf",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};
