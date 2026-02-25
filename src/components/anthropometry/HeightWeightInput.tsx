"use client";

import { Sex } from "@/types";
import { useState } from "react";
import { useUnits } from "@/hooks/useUnits";

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
  const { height: heightUnit, weight: weightUnit, setUnits } = useUnits();

  // Local state for inputs to allow typing
  const [heightInput, setHeightInput] = useState<string>(
    heightUnit === "cm" ? (height * 100).toFixed(0) : (height * 39.3701).toFixed(1)
  );
  const [weightInput, setWeightInput] = useState<string>(
    weightUnit === "kg" ? weight.toFixed(1) : (weight * 2.20462).toFixed(1)
  );
  const [isHeightEditing, setIsHeightEditing] = useState(false);
  const [isWeightEditing, setIsWeightEditing] = useState(false);

  const displayHeightInput = heightUnit === "cm" ? (height * 100).toFixed(0) : (height * 39.3701).toFixed(1);
  const displayWeightInput = weightUnit === "kg" ? weight.toFixed(1) : (weight * 2.20462).toFixed(1);

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
    onChange({ height: heightInMeters, weight, sex });
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
    onChange({ height, weight: weightInKg, sex });
  };

  return (
    <div className="space-y-4">
      {/* Height Input */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-2">
          Height
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={isHeightEditing ? heightInput : displayHeightInput}
            onChange={(e) => {
              if (!isHeightEditing) setIsHeightEditing(true);
              handleHeightChange(e.target.value);
            }}
            onBlur={() => {
              setIsHeightEditing(false);
              handleHeightBlur();
            }}
            onKeyDown={(e) => e.key === "Enter" && handleHeightBlur()}
            onFocus={(e) => {
              setIsHeightEditing(true);
              setHeightInput(displayHeightInput);
              e.target.select();
            }}
            className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white font-medium"
            step={heightUnit === "cm" ? "1" : "0.1"}
          />
          <div className="flex rounded-lg border border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                const current = parseFloat(isHeightEditing ? heightInput : displayHeightInput);
                setUnits("metric");
                if (!isNaN(current)) {
                  const converted = heightUnit === "inches" ? current * 2.54 : current;
                  setHeightInput(converted.toFixed(0));
                }
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${heightUnit === "cm"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
            >
              cm
            </button>
            <button
              type="button"
              onClick={() => {
                const current = parseFloat(isHeightEditing ? heightInput : displayHeightInput);
                setUnits("imperial");
                if (!isNaN(current)) {
                  const converted = heightUnit === "cm" ? current / 2.54 : current;
                  setHeightInput(converted.toFixed(1));
                }
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors border-l border-slate-700 ${heightUnit === "inches"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
            >
              in
            </button>
          </div>
        </div>
      </div>

      {/* Weight Input */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-2">
          Weight
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={isWeightEditing ? weightInput : displayWeightInput}
            onChange={(e) => {
              if (!isWeightEditing) setIsWeightEditing(true);
              handleWeightChange(e.target.value);
            }}
            onBlur={() => {
              setIsWeightEditing(false);
              handleWeightBlur();
            }}
            onKeyDown={(e) => e.key === "Enter" && handleWeightBlur()}
            onFocus={(e) => {
              setIsWeightEditing(true);
              setWeightInput(displayWeightInput);
              e.target.select();
            }}
            className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white font-medium"
            step="0.1"
          />
          <div className="flex rounded-lg border border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                const current = parseFloat(isWeightEditing ? weightInput : displayWeightInput);
                setUnits("metric");
                if (!isNaN(current)) {
                  const converted = weightUnit === "lbs" ? current / 2.20462 : current;
                  setWeightInput(converted.toFixed(1));
                }
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${weightUnit === "kg"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
            >
              kg
            </button>
            <button
              type="button"
              onClick={() => {
                const current = parseFloat(isWeightEditing ? weightInput : displayWeightInput);
                setUnits("imperial");
                if (!isNaN(current)) {
                  const converted = weightUnit === "kg" ? current * 2.20462 : current;
                  setWeightInput(converted.toFixed(1));
                }
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors border-l border-slate-700 ${weightUnit === "lbs"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
            >
              lbs
            </button>
          </div>
        </div>
      </div>

      {/* Sex Selector */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-2">
          Sex
        </label>
        <select
          value={sex}
          onChange={(e) => onChange({ height, weight, sex: e.target.value as Sex })}
          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white font-medium"
        >
          <option value={Sex.MALE}>Male</option>
          <option value={Sex.FEMALE}>Female</option>
        </select>
      </div>
    </div>
  );
}
