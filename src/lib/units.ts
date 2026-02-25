import type { UnitPreference } from "@/store";

export interface ResolvedUnits {
  height: "cm" | "inches";
  weight: "kg" | "lbs";
  load: "kg" | "lbs";
  barHeight: "cm" | "inches";
}

export function resolveUnits(pref: UnitPreference): ResolvedUnits {
  const imperial = pref === "imperial";
  return {
    height: imperial ? "inches" : "cm",
    weight: imperial ? "lbs" : "kg",
    load: imperial ? "lbs" : "kg",
    barHeight: imperial ? "inches" : "cm",
  };
}

export const cmToInches = (cm: number) => cm / 2.54;
export const inchesToCm = (inches: number) => inches * 2.54;
export const kgToLbs = (kg: number) => kg * 2.20462;
export const lbsToKg = (lbs: number) => lbs / 2.20462;
export const mToInches = (m: number) => m * 39.3701;
export const inchesToM = (inches: number) => inches / 39.3701;
export const mToCm = (m: number) => m * 100;
export const cmToM = (cm: number) => cm / 100;
