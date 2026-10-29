import type { AddressChoice } from "#/server/site";
import { Button } from "#/components/generic/button";

export function PlotChoiceList({
  choices,
  disabled,
  onChoose,
}: {
  choices: AddressChoice[];
  disabled: boolean;
  onChoose: (choice: AddressChoice) => void;
}) {
  return (
    <ul className="space-y-2">
      {choices.map((choice, index) => (
        <li key={`${choice.label}-${choice.latitude}-${choice.longitude}-${index}`}>
          <Button
            variant={choice.matched ? "primary" : "secondary"}
            disabled={disabled}
            onClick={() => onChoose(choice)}
          >
            {choice.label}
          </Button>
        </li>
      ))}
    </ul>
  );
}
