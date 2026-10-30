import type { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";

export const Card = ({ className, children, ...props }: ComponentProps<"div">) => {
  return (
    <div className={twMerge("rounded-lg border border-line bg-card p-5", className)} {...props}>
      {children}
    </div>
  );
};
