import { Toggle } from "#/components/generic/toggle";
import { useUnits } from "../../lib/units";

const UNITS = ["m", "ft"] as const;

export const UnitToggle = () => {
  const { unit, setUnit } = useUnits();
  return <Toggle label="Units" value={unit} options={UNITS} onChange={setUnit} />;
};
