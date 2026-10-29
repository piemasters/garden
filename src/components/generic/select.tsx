import type { InputHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export const Select = <T extends string>({
  label,
  options,
  labels,
  onBlur,
  onChange,
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLSelectElement>, "onChange"> & {
  label: string;
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onBlur: () => void;
  onChange: (value: T) => void;
}) => {
  return (
    <label className="block text-sm">
      {label}
      <div className="relative mt-1">
        <select
          className={twMerge(
            "w-full rounded-md pl-3 pr-10 py-2 appearance-none outline-none",
            "border border-line bg-card text-ink focus:border-leaf",
            className,
          )}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value as T)}
          {...rest}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {labels[option]}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-ink opacity-60">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </label>
  );
};
