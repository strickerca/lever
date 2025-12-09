"use client";

import { Sex } from "@/types";
import { useState } from "react";

interface HeightWeightInputProps {
  height: number; // in meters
  weight: number; // in kg
  sex: Sex;
  onChange: (data: { height: number; weight: number; sex: Sex }) => void;
}

export function HeightWeightInput({
  height,
  weight,
  sex,
  onChange,
}: HeightWeightInputProps) {
  const [heightUnit, setHeightUnit] = useState<"cm" | "inches">("cm");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");

  // Convert for display
  const heightDisplay =
    heightUnit === "cm" ? (height * 100).toFixed(0) : (height * 39.3701).toFixed(1);
  const weightDisplay =
    weightUnit === "kg" ? weight.toFixed(1) : (weight * 2.20462).toFixed(1);

  const handleHeightChange = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;

    // Convert to meters
    const heightInMeters = heightUnit === "cm" ? num / 100 : num / 39.3701;
    onChange({ height: heightInMeters, weight, sex });
  };

  const handleWeightChange = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;

    // Convert to kg
    const weightInKg = weightUnit === "kg" ? num : num / 2.20462;
    onChange({ height, weight: weightInKg, sex });
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
            value={heightDisplay}
            onChange={(e) => handleHeightChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            value={weightDisplay}
            onChange={(e) => handleWeightChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          onChange={(e) => onChange({ height, weight, sex: e.target.value as Sex })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value={Sex.MALE}>Male</option>
          <option value={Sex.FEMALE}>Female</option>
        </select>
      </div>
    </div>
  );
}
