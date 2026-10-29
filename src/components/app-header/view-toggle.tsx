import { Toggle } from "#/components/generic/toggle";

const VIEWS = ["plan", "orbit"] as const;

export const ViewToggle = ({
  view,
  onViewChange,
}: {
  view: "plan" | "orbit";
  onViewChange: (view: "plan" | "orbit") => void;
}) => {
  return (
    <Toggle
      label="View"
      value={view}
      options={VIEWS}
      labels={{ plan: "Plan", orbit: "3D" }}
      onChange={onViewChange}
    />
  );
};
