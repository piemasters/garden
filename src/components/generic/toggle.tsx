import { twMerge } from "tailwind-merge";

export const Toggle = <T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  labels?: Partial<Record<T, string>>;
  onChange: (value: T) => void;
}) => {
  return (
    <div
      className="flex overflow-hidden rounded-full border border-line text-xs"
      role="group"
      aria-label={label}
    >
      {options.map((option) => (
        <button
          key={option}
          className={twMerge(
            "px-2.5 py-1 text-ink hover:text-leaf",
            value === option && "bg-leaf text-white",
          )}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {labels?.[option] ?? option}
        </button>
      ))}
    </div>
  );
};
