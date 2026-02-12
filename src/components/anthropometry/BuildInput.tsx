"use client";

import { Sex } from "@/types";
import { useState, useEffect } from "react";

export type ArmProportion = "extraShort" | "short" | "average" | "long" | "extraLong";
export type TorsoLegProportion = "veryLongLegs" | "longLegs" | "average" | "longTorso" | "veryLongTorso";

interface BuildInputProps {
  height: number; // in meters
  weight: number; // in kg
  sex: Sex;
  torsoLegRatio: TorsoLegProportion;
  armLength: ArmProportion;
  onChange: (data: {
    height: number;
    weight: number;
    sex: Sex;
    torsoLegRatio: TorsoLegProportion;
    armLength: ArmProportion;
  }) => void;
}

// Map arm proportions to SD modifiers
export const ARM_PROPORTION_TO_SD: Record<ArmProportion, number> = {
  extraShort: -2,
  short: -1,
  average: 0,
  long: 1,
  extraLong: 2,
};

// Map torso-leg proportions to SD modifiers (inversely proportional)
export const TORSO_LEG_TO_SD: Record<TorsoLegProportion, { torso: number; legs: number }> = {
  veryLongLegs: { torso: -2, legs: 2 },    // Very long legs, very short torso
  longLegs: { torso: -1, legs: 1 },        // Long legs, short torso
  average: { torso: 0, legs: 0 },          // Average proportions
  longTorso: { torso: 1, legs: -1 },       // Long torso, short legs
  veryLongTorso: { torso: 2, legs: -2 },   // Very long torso, very short legs
};

// Archetype names based on segment combinations
function getArchetype(torsoLegRatio: TorsoLegProportion, armLength: ArmProportion): string {
  const torsoSD = TORSO_LEG_TO_SD[torsoLegRatio].torso;
  const legSD = TORSO_LEG_TO_SD[torsoLegRatio].legs;
  const armSD = ARM_PROPORTION_TO_SD[armLength];

  // Average build
  if (torsoSD === 0 && legSD === 0 && armSD === 0) {
    return "Average Build";
  }

  // Long legs builds
  if (legSD === 2) {
    if (armSD === 2) return "Extreme Long-Limbed";
    if (armSD === 1) return "Long-Limbed Athlete";
    if (armSD === -1) return "Long-Legged Sprinter";
    if (armSD === -2) return "Long-Legged, T-Rex Arms";
    return "Long-Legged, Short-Torso";
  }

  if (legSD === 1) {
    if (armSD === 2) return "Ape Index Pro";
    if (armSD === 1) return "Long Limbs, Short Torso";
    if (armSD === -1) return "Runner Build";
    return "Moderate Long Legs";
  }

  // Long torso builds
  if (torsoSD === 2) {
    if (armSD === 2) return "Long Torso, Ape Arms";
    if (armSD === 1) return "Long Torso, Long Arms";
    if (armSD === -1) return "Classic T-Rex";
    if (armSD === -2) return "Extreme T-Rex";
    return "Very Long-Torso, Short-Legged";
  }

  if (torsoSD === 1) {
    if (armSD === 2) return "Ape Index (Short Legs)";
    if (armSD === 1) return "Long Torso & Arms";
    if (armSD === -1) return "Bench Press Build";
    if (armSD === -2) return "T-Rex Build";
    return "Long-Torso, Short-Legged";
  }

  // Arm-dominated archetypes
  if (armSD === 2) {
    return "Ape Index (Long Arms)";
  }

  if (armSD === -2) {
    return "Short-Armed Build";
  }

  if (armSD === 1) {
    return "Long-Armed Build";
  }

  if (armSD === -1) {
    return "Short-Armed Build";
  }

  return "Mixed Proportions";
}

export function BuildInput({
  height,
  weight,
  sex,
  torsoLegRatio,
  armLength,
  onChange,
}: BuildInputProps) {
  const [heightUnit, setHeightUnit] = useState<"cm" | "inches">("cm");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");

  // Local state for inputs to allow typing
  const [heightInput, setHeightInput] = useState<string>("");
  const [weightInput, setWeightInput] = useState<string>("");

  // Calculate archetype
  const archetype = getArchetype(torsoLegRatio, armLength);

  // Update local state when props change
  useEffect(() => {
    const displayHeight = heightUnit === "cm" ? (height * 100).toFixed(0) : (height * 39.3701).toFixed(1);
    setHeightInput(displayHeight);
  }, [height, heightUnit]);

  useEffect(() => {
    const displayWeight = weightUnit === "kg" ? weight.toFixed(1) : (weight * 2.20462).toFixed(1);
    setWeightInput(displayWeight);
  }, [weight, weightUnit]);

  const handleHeightChange = (value: string) => {
    setHeightInput(value);
  };

  const handleHeightBlur = () => {
    const num = parseFloat(heightInput);
    if (isNaN(num) || num <= 0) {
      // Reset to current value if invalid
      setHeightInput(heightUnit === "cm" ? (height * 100).toFixed(0) : (height * 39.3701).toFixed(1));
      return;
    }

    // Convert to meters
    const heightInMeters = heightUnit === "cm" ? num / 100 : num / 39.3701;
    onChange({ height: heightInMeters, weight, sex, torsoLegRatio, armLength });
  };

  const handleWeightChange = (value: string) => {
    setWeightInput(value);
  };

  const handleWeightBlur = () => {
    const num = parseFloat(weightInput);
    if (isNaN(num) || num <= 0) {
      // Reset to current value if invalid
      setWeightInput(weightUnit === "kg" ? weight.toFixed(1) : (weight * 2.20462).toFixed(1));
      return;
    }

    // Convert to kg
    const weightInKg = weightUnit === "kg" ? num : num / 2.20462;
    onChange({ height, weight: weightInKg, sex, torsoLegRatio, armLength });
  };

  return (
    <div className="space-y-4">
      {/* Height Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Height
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={heightInput}
            onChange={(e) => handleHeightChange(e.target.value)}
            onBlur={handleHeightBlur}
            onKeyDown={(e) => e.key === "Enter" && handleHeightBlur()}
            onFocus={(e) => e.target.select()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
            step={heightUnit === "cm" ? "1" : "0.1"}
          />
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              type="button"
              onClick={() => setHeightUnit("cm")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                heightUnit === "cm"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              cm
            </button>
            <button
              type="button"
              onClick={() => setHeightUnit("inches")}
              className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                heightUnit === "inches"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              in
            </button>
          </div>
        </div>
      </div>

      {/* Weight Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Weight
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={weightInput}
            onChange={(e) => handleWeightChange(e.target.value)}
            onBlur={handleWeightBlur}
            onKeyDown={(e) => e.key === "Enter" && handleWeightBlur()}
            onFocus={(e) => e.target.select()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
            step="0.1"
          />
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              type="button"
              onClick={() => setWeightUnit("kg")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                weightUnit === "kg"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              kg
            </button>
            <button
              type="button"
              onClick={() => setWeightUnit("lbs")}
              className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                weightUnit === "lbs"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              lbs
            </button>
          </div>
        </div>
      </div>

      {/* Sex Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sex
        </label>
        <select
          value={sex}
          onChange={(e) => onChange({ height, weight, sex: e.target.value as Sex, torsoLegRatio, armLength })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
        >
          <option value={Sex.MALE}>Male</option>
          <option value={Sex.FEMALE}>Female</option>
        </select>
      </div>

      {/* Body Proportions */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Body Proportions</h4>

        {/* Torso-to-Leg Ratio */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Torso-to-Leg Ratio
          </label>
          <select
            value={torsoLegRatio}
            onChange={(e) => onChange({ height, weight, sex, torsoLegRatio: e.target.value as TorsoLegProportion, armLength })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          >
            <option value="veryLongLegs">Very Long Legs / Very Short Torso</option>
            <option value="longLegs">Long Legs / Short Torso</option>
            <option value="average">Average Proportions</option>
            <option value="longTorso">Long Torso / Short Legs</option>
            <option value="veryLongTorso">Very Long Torso / Very Short Legs</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            For a given height, leg and torso length are inversely related
          </p>
        </div>

        {/* Arm Length */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Arm Length
          </label>
          <select
            value={armLength}
            onChange={(e) => onChange({ height, weight, sex, torsoLegRatio, armLength: e.target.value as ArmProportion })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          >
            <option value="extraShort">Extra Short</option>
            <option value="short">Short</option>
            <option value="average">Average</option>
            <option value="long">Long</option>
            <option value="extraLong">Extra Long</option>
          </select>
        </div>

        {/* Archetype Display */}
        <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <p className="text-xs font-medium text-gray-600 mb-1">Build Archetype</p>
          <p className="text-sm font-bold text-blue-900">{archetype}</p>
        </div>
      </div>
    </div>
  );
}
