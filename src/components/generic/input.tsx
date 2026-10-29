import type { InputHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export const Input = ({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <input
      className={twMerge(
        "mt-1 w-full rounded-md px-3 py-2",
        "border border-line bg-card  text-ink",
        "outline-none focus:border-leaf",
        className,
      )}
      {...rest}
    />
  );
};
