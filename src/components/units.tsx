import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  formatLength,
  formatLengthLabel,
  formatMove,
  formatRange,
  formatSizeIn,
  formatSpacingIn,
  toMetres,
  type LengthUnit,
} from "../domain/units";
import type { Point } from "../domain/types";

const KEY = "uk-garden-planner.units";

type UnitsContextValue = {
  unit: LengthUnit;
  setUnit: (unit: LengthUnit) => void;
  length: (metres: number) => string;
  size: (width: number, depth: number) => string;
  spacing: (metres: number) => string;
  range: (values: [number, number]) => string;
  move: (by: Point) => string;
  toMetres: (value: number) => number;
};

const UnitsContext = createContext<UnitsContextValue | null>(null);

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [unit, setUnitState] = useState<LengthUnit>("m");

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (stored === "m" || stored === "ft") setUnitState(stored);
  }, []);

  const setUnit = (next: LengthUnit) => {
    setUnitState(next);
    localStorage.setItem(KEY, next);
  };

  const value: UnitsContextValue = {
    unit,
    setUnit,
    length: (metres) => formatLengthLabel(metres, unit),
    size: (width, depth) => formatSizeIn(width, depth, unit),
    spacing: (metres) => formatSpacingIn(metres, unit),
    range: (values) => formatRange(values, unit),
    move: (by) => formatMove(by, unit),
    toMetres: (amount) => toMetres(amount, unit),
  };

  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

export function useUnits(): UnitsContextValue {
  const value = useContext(UnitsContext);
  if (!value) throw new Error("useUnits must be used within UnitsProvider");
  return value;
}

export function formatEntry(value: string, from: LengthUnit, to: LengthUnit): string {
  if (!value.trim()) return "";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return formatLength(toMetres(amount, from), to);
}
