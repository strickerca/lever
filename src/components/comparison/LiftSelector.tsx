"use client";

import { useState, useEffect } from "react";
import {
  BenchArchStyle,
  BenchGripWidth,
  DeadliftVariant,
  LiftFamily,
  PullupGrip,
  SquatStance,
  SquatVariant,
  SumoStance,
} from "@/types";

interface LiftSelectorProps {
  liftFamily: LiftFamily;
  variant: string;
  load: number;
  reps: number;
  stance?: string;
  pushupWeight?: number;
  barStartHeightOffset?: number;
  onChange: (data: {
    liftFamily: LiftFamily;
    variant: string;
    load: number;
    reps: number;
    stance?: string;
    pushupWeight?: number;
    barStartHeightOffset?: number;
  }) => void;
  showLoadReps?: boolean;
  showLiftTypeNote?: boolean;
  showLiftType?: boolean;
}

const SQUAT_VARIANTS = [
  { value: SquatVariant.HIGH_BAR, label: "High Bar Back Squat" },
  { value: SquatVariant.LOW_BAR, label: "Low Bar Back Squat" },
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

const SQUAT_STANCES = [
  { value: SquatStance.NARROW, label: "Narrow" },
  { value: SquatStance.NORMAL, label: "Normal" },
  { value: SquatStance.WIDE, label: "Wide" },
  { value: SquatStance.ULTRA_WIDE, label: "Ultra Wide" },
];

const SUMO_STANCES = [
  { value: SumoStance.HYBRID, label: "Hybrid" },
  { value: SumoStance.NORMAL, label: "Normal" },
  { value: SumoStance.WIDE, label: "Wide" },
  { value: SumoStance.ULTRA_WIDE, label: "Ultra Wide" },
];

export function LiftSelector({
  liftFamily,
  variant,
  load,
  reps,
  stance = "normal",
  pushupWeight = 0,
  barStartHeightOffset = 0,
  onChange,
  showLoadReps = true,
  showLiftTypeNote = false,
  showLiftType = true,
}: LiftSelectorProps) {
  const [loadUnit, setLoadUnit] = useState<"kg" | "lbs">("kg");
  const [heightUnit, setHeightUnit] = useState<"cm" | "inches">("cm");
  const [loadInput, setLoadInput] = useState<string>("");
  const [repsInput, setRepsInput] = useState<string>("");
  const [pushupWeightInput, setpushupWeightInput] = useState<string>("0");
  const [barHeightOffsetInput, setBarHeightOffsetInput] = useState<string>("0");

  // Update local state when props change
  useEffect(() => {
    const displayLoad = loadUnit === "kg" ? load.toFixed(1) : (load * 2.20462).toFixed(1);
    setLoadInput(displayLoad);
  }, [load, loadUnit]);

  useEffect(() => {
    setRepsInput(reps.toString());
  }, [reps]);

  useEffect(() => {
    const displayWeight = loadUnit === "kg" ? pushupWeight.toFixed(1) : (pushupWeight * 2.20462).toFixed(1);
    setpushupWeightInput(displayWeight);
  }, [pushupWeight, loadUnit]);

  useEffect(() => {
    // Convert meters to cm or inches for display
    const displayHeight = heightUnit === "cm"
      ? (barStartHeightOffset * 100).toFixed(1)
      : (barStartHeightOffset * 39.3701).toFixed(1);
    setBarHeightOffsetInput(displayHeight);
  }, [barStartHeightOffset, heightUnit]);

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
    onChange({ liftFamily, variant, load: loadInKg, reps, stance, pushupWeight, barStartHeightOffset });
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

    onChange({ liftFamily, variant, load, reps: num, stance, pushupWeight, barStartHeightOffset });
  };

  const handlePushupWeightChange = (value: string) => {
    setpushupWeightInput(value);
  };

  const handlePushupWeightBlur = () => {
    const num = parseFloat(pushupWeightInput);
    if (isNaN(num) || num < 0) {
      const displayWeight = loadUnit === "kg" ? pushupWeight.toFixed(1) : (pushupWeight * 2.20462).toFixed(1);
      setpushupWeightInput(displayWeight);
      return;
    }

    const weightInKg = loadUnit === "kg" ? num : num / 2.20462;
    onChange({ liftFamily, variant, load, reps, stance, pushupWeight: weightInKg, barStartHeightOffset });
  };

  const handleBarHeightOffsetChange = (value: string) => {
    setBarHeightOffsetInput(value);
  };

  const handleBarHeightOffsetBlur = () => {
    const num = parseFloat(barHeightOffsetInput);
    if (isNaN(num)) {
      const displayHeight = heightUnit === "cm"
        ? (barStartHeightOffset * 100).toFixed(1)
        : (barStartHeightOffset * 39.3701).toFixed(1);
      setBarHeightOffsetInput(displayHeight);
      return;
    }

    // Convert to meters (negative values allowed for deficits)
    const offsetInMeters = heightUnit === "cm" ? num / 100 : num / 39.3701;
    onChange({ liftFamily, variant, load, reps, stance, pushupWeight, barStartHeightOffset: offsetInMeters });
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
    onChange({ liftFamily: newFamily, variant: newVariant, load, reps, stance: "normal", pushupWeight: 0, barStartHeightOffset: 0 });
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
  const needsStance = liftFamily === LiftFamily.SQUAT ||
    (liftFamily === LiftFamily.DEADLIFT && variant === "sumo");
  const isSumo = liftFamily === LiftFamily.DEADLIFT && variant === "sumo";
  const isPushup = liftFamily === LiftFamily.PUSHUP;

  return (
    <div className="space-y-4">
      {/* Lift Family Selector */}
      {showLiftType && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lift Type {showLiftTypeNote && <span className="text-gray-500 font-normal">(must be the same for both lifters)</span>}
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
      )}

      {/* Variant Selector */}
      {variants.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Variant
          </label>
          <select
            value={variant}
            onChange={(e) =>
              onChange({ liftFamily, variant: e.target.value, load, reps, stance, pushupWeight, barStartHeightOffset })
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

      {/* Stance Selector */}
      {needsStance && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stance Width
          </label>
          <select
            value={stance}
            onChange={(e) =>
              onChange({ liftFamily, variant, load, reps, stance: e.target.value, pushupWeight, barStartHeightOffset })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
          >
            {(isSumo ? SUMO_STANCES : SQUAT_STANCES).map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Bar Elevation Offset (Deadlift only) */}
      {liftFamily === LiftFamily.DEADLIFT && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bar Elevation (Deficit/Blocks)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={barHeightOffsetInput}
              onChange={(e) => handleBarHeightOffsetChange(e.target.value)}
              onBlur={handleBarHeightOffsetBlur}
              onKeyDown={(e) => e.key === "Enter" && handleBarHeightOffsetBlur()}
              onFocus={(e) => e.target.select()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
              step="0.5"
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
          <p className="mt-1 text-xs text-gray-500">
            Negative = deficit (bar lower), Positive = blocks (bar higher)
          </p>
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
                  onFocus={(e) => e.target.select()}
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

          {/* Push-up Added Weight */}
          {isPushup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Added Weight (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={pushupWeightInput}
                  onChange={(e) => handlePushupWeightChange(e.target.value)}
                  onBlur={handlePushupWeightBlur}
                  onKeyDown={(e) => e.key === "Enter" && handlePushupWeightBlur()}
                  onFocus={(e) => e.target.select()}
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
              <p className="mt-1 text-xs text-gray-500">
                Weight placed over middle back for physics calculations
              </p>
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
              onFocus={(e) => e.target.select()}
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
