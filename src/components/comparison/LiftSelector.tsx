"use client";

import { useState, useEffect } from "react";
import {
  BenchArchStyle,
  BenchGripWidth,
  DeadliftVariant,
  LiftFamily,
  PullupGrip,
  SquatVariant,
} from "@/types";

interface LiftSelectorProps {
  liftFamily: LiftFamily;
  variant: string;
  load: number;
  reps: number;
  onChange: (data: {
    liftFamily: LiftFamily;
    variant: string;
    load: number;
    reps: number;
  }) => void;
  showLoadReps?: boolean;
}

const SQUAT_VARIANTS = [
  { value: SquatVariant.HIGH_BAR, label: "High Bar" },
  { value: SquatVariant.LOW_BAR, label: "Low Bar" },
  { value: SquatVariant.FRONT, label: "Front Squat" },
];

const DEADLIFT_VARIANTS = [
  { value: DeadliftVariant.CONVENTIONAL, label: "Conventional" },
  { value: DeadliftVariant.SUMO, label: "Sumo" },
];

const BENCH_VARIANTS = [
  { value: "narrow-flat", label: "Narrow Grip, Flat" },
  { value: "narrow-moderate", label: "Narrow Grip, Moderate Arch" },
  { value: "medium-flat", label: "Medium Grip, Flat" },
  { value: "medium-moderate", label: "Medium Grip, Moderate Arch" },
  { value: "wide-flat", label: "Wide Grip, Flat" },
  { value: "wide-competitive", label: "Wide Grip, Competitive Arch" },
];

const PULLUP_VARIANTS = [
  { value: PullupGrip.SUPINATED, label: "Chin-up (Supinated)" },
  { value: PullupGrip.NEUTRAL, label: "Neutral Grip" },
  { value: PullupGrip.PRONATED, label: "Pull-up (Pronated)" },
];

export function LiftSelector({
  liftFamily,
  variant,
  load,
  reps,
  onChange,
  showLoadReps = true,
}: LiftSelectorProps) {
  const [loadUnit, setLoadUnit] = useState<"kg" | "lbs">("kg");
  const [loadInput, setLoadInput] = useState<string>("");
  const [repsInput, setRepsInput] = useState<string>("");

  // Update local state when props change
  useEffect(() => {
    const displayLoad = loadUnit === "kg" ? load.toFixed(1) : (load * 2.20462).toFixed(1);
    setLoadInput(displayLoad);
  }, [load, loadUnit]);

  useEffect(() => {
    setRepsInput(reps.toString());
  }, [reps]);

  const handleLoadChange = (value: string) => {
    setLoadInput(value);
  };

  const handleLoadBlur = () => {
    const num = parseFloat(loadInput);
    if (isNaN(num) || num < 0) {
      setLoadInput(loadUnit === "kg" ? load.toFixed(1) : (load * 2.20462).toFixed(1));
      return;
    }

    const loadInKg = loadUnit === "kg" ? num : num / 2.20462;
    onChange({ liftFamily, variant, load: loadInKg, reps });
  };

  const handleRepsChange = (value: string) => {
    setRepsInput(value);
  };

  const handleRepsBlur = () => {
    const num = parseInt(repsInput);
    if (isNaN(num) || num < 1) {
      setRepsInput(reps.toString());
      return;
    }

    onChange({ liftFamily, variant, load, reps: num });
  };

  const getVariants = () => {
    switch (liftFamily) {
      case LiftFamily.SQUAT:
        return SQUAT_VARIANTS;
      case LiftFamily.DEADLIFT:
        return DEADLIFT_VARIANTS;
      case LiftFamily.BENCH:
        return BENCH_VARIANTS;
      case LiftFamily.PULLUP:
        return PULLUP_VARIANTS;
      case LiftFamily.PUSHUP:
        return [{ value: "standard", label: "Standard" }];
      case LiftFamily.OHP:
        return [{ value: "strict", label: "Strict Press" }];
      case LiftFamily.THRUSTER:
        return [{ value: "standard", label: "Standard" }];
      default:
        return [];
    }
  };

  const variants = getVariants();

  // Update variant when lift family changes
  const handleLiftFamilyChange = (newFamily: LiftFamily) => {
    const newVariants = getVariantsForFamily(newFamily);
    const newVariant = newVariants[0]?.value || "standard";
    onChange({ liftFamily: newFamily, variant: newVariant, load, reps });
  };

  const getVariantsForFamily = (family: LiftFamily) => {
    switch (family) {
      case LiftFamily.SQUAT:
        return SQUAT_VARIANTS;
      case LiftFamily.DEADLIFT:
        return DEADLIFT_VARIANTS;
      case LiftFamily.BENCH:
        return BENCH_VARIANTS;
      case LiftFamily.PULLUP:
        return PULLUP_VARIANTS;
      default:
        return [{ value: "standard", label: "Standard" }];
    }
  };

  const needsLoad = ![LiftFamily.PUSHUP].includes(liftFamily);

  return (
    <div className="space-y-4">
      {/* Lift Family Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lift Type
        </label>
        <select
          value={liftFamily}
          onChange={(e) => handleLiftFamilyChange(e.target.value as LiftFamily)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
        >
          <option value={LiftFamily.SQUAT}>Squat</option>
          <option value={LiftFamily.DEADLIFT}>Deadlift</option>
          <option value={LiftFamily.BENCH}>Bench Press</option>
          <option value={LiftFamily.PULLUP}>Pull-up / Chin-up</option>
          <option value={LiftFamily.PUSHUP}>Push-up</option>
          <option value={LiftFamily.OHP}>Overhead Press</option>
          <option value={LiftFamily.THRUSTER}>Thruster</option>
        </select>
      </div>

      {/* Variant Selector */}
      {variants.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Variant
          </label>
          <select
            value={variant}
            onChange={(e) =>
              onChange({ liftFamily, variant: e.target.value, load, reps })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
          >
            {variants.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {showLoadReps && (
        <>
          {/* Load Input */}
          {needsLoad && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Load
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={loadInput}
                  onChange={(e) => handleLoadChange(e.target.value)}
                  onBlur={handleLoadBlur}
                  onKeyDown={(e) => e.key === "Enter" && handleLoadBlur()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
                  min="0"
                  step="2.5"
                />
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setLoadUnit("kg")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      loadUnit === "kg"
                        ? "bg-blue-500 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    kg
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoadUnit("lbs")}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                      loadUnit === "lbs"
                        ? "bg-blue-500 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    lbs
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reps Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reps
            </label>
            <input
              type="number"
              value={repsInput}
              onChange={(e) => handleRepsChange(e.target.value)}
              onBlur={handleRepsBlur}
              onKeyDown={(e) => e.key === "Enter" && handleRepsBlur()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
              min="1"
              step="1"
            />
          </div>
        </>
      )}
    </div>
  );
}
