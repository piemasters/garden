import { useRef } from "react";
import { twMerge } from "tailwind-merge";

export const Tabs = <T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: readonly T[];
  labels?: Partial<Record<T, string>>;
  onChange: (value: T) => void;
  className?: string;
}) => {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const choose = (index: number) => {
    const option = options[index];
    if (option == null) return;
    onChange(option);
    buttons.current[index]?.focus();
  };
  return (
    <div
      className={twMerge("flex border-b border-line", className)}
      role="tablist"
      aria-label={label}
    >
      {options.map((option, index) => {
        const selected = value === option;
        return (
          <button
            key={option}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            className={twMerge(
              "-mb-px cursor-pointer border-b-2 border-transparent px-3 py-2 text-sm whitespace-nowrap text-ink/55 hover:text-ink",
              "outline-none focus-visible:outline-2 focus-visible:outline-leaf",
              selected && "border-leaf font-medium text-ink",
            )}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                choose((index + 1) % options.length);
              } else if (event.key === "ArrowLeft") {
                event.preventDefault();
                choose((index - 1 + options.length) % options.length);
              } else if (event.key === "Home") {
                event.preventDefault();
                choose(0);
              } else if (event.key === "End") {
                event.preventDefault();
                choose(options.length - 1);
              }
            }}
          >
            {labels?.[option] ?? option}
          </button>
        );
      })}
    </div>
  );
};
