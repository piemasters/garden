import type { HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export const Alert = ({
  children,
  variant,
}: HTMLAttributes<HTMLDivElement> & { variant: "success" | "error" }) => {
  return (
    <div
      className={twMerge(
        "rounded-md px-3 py-2 text-sm",
        variant === "success" && "bg-mist",
        variant === "error" && "bg-clay text-white",
      )}
    >
      {children}
    </div>
  );
};
