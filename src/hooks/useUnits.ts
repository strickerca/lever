"use client";

import { useLeverStore } from "@/store";
import { resolveUnits, type ResolvedUnits } from "@/lib/units";

export function useUnits(): ResolvedUnits & {
  preference: "metric" | "imperial";
  setUnits: (pref: "metric" | "imperial") => void;
  toggle: () => void;
} {
  const unitPreference = useLeverStore((s) => s.unitPreference);
  const setUnits = useLeverStore((s) => s.setUnits);
  const resolved = resolveUnits(unitPreference);
  return {
    ...resolved,
    preference: unitPreference,
    setUnits,
    toggle: () => setUnits(unitPreference === "metric" ? "imperial" : "metric"),
  };
}
