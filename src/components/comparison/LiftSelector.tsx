"use client";

import { useState, useEffect } from "react";
import { useUnits } from "@/hooks/useUnits";
import {
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
  chestSize?: "small" | "average" | "large";
  squatDepth?: "parallel" | "belowParallel";
  onChange: (data: {
    liftFamily: LiftFamily;
    variant: string;
    load: number;
    reps: number;
    stance?: string;
    pushupWeight?: number;
    barStartHeightOffset?: number;
    chestSize?: "small" | "average" | "large";
    squatDepth?: "parallel" | "belowParallel";
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
  chestSize = "average",
  squatDepth = "parallel",
  onChange,
  showLoadReps = true,
  showLiftTypeNote = false,
  showLiftType = true,
  theme = "dark",
}: LiftSelectorProps & { theme?: "light" | "dark" }) {
  const { load: loadUnit, barHeight: heightUnit, setUnits } = useUnits();
  const [loadInput, setLoadInput] = useState<string>("");
  const [repsInput, setRepsInput] = useState<string>("");
  const [pushupWeightInput, setpushupWeightInput] = useState<string>("0");
  const [barHeightOffsetInput, setBarHeightOffsetInput] = useState<string>("0");

  // Determine styles based on theme
  const isDark = theme === "dark";
  const styles = {
    label: `block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? "text-slate-400" : "text-gray-600"}`,
    input: `w-full px-2 py-1 rounded-md text-xs font-medium transition-colors outline-none focus:ring-1 ${isDark
      ? "bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:ring-blue-500/50 focus:border-blue-500/50"
      : "bg-white border border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-transparent"
      }`,
    buttonActive: isDark ? "bg-blue-600 text-white" : "bg-blue-500 text-white",
    buttonInactive: isDark ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-white text-gray-700 hover:bg-gray-50",
    buttonContainer: isDark ? "border-slate-700" : "border-gray-300",
    note: isDark ? "text-slate-500" : "text-gray-500",
  };

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

    <div className="flex flex-col gap-1.5">
      {/* Lift Family Selector */}
      {showLiftType && (
        <div>
          <label className={styles.label}>
            Lift Type {showLiftTypeNote && <span className="text-gray-500 font-normal">(must be the same for both lifters)</span>}
          </label>
          <select
            value={liftFamily}
            onChange={(e) => handleLiftFamilyChange(e.target.value as LiftFamily)}
            className={styles.input}
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

      {/* Variant Selector (Full Width) */}
      {variants.length > 1 && (
        <div>
          <label className={styles.label}>
            Variant
          </label>
          <select
            value={variant}
            onChange={(e) =>
              onChange({ liftFamily, variant: e.target.value, load, reps, stance, pushupWeight, barStartHeightOffset })
            }
            className={styles.input}
          >
            {variants.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Secondary Options Grid (Stance, Depth, Chest, Elevation) */}
      <div className="grid grid-cols-2 gap-2">
        {/* Stance Selector */}
        {needsStance && (
          <div className={!needsLoad && !isPushup ? "col-span-2" : ""}>
            {/* If we have many options, keep col-span-1. If it's the only secondary, col-span-2 */}
            <label className={styles.label}>
              Stance Width
            </label>
            <select
              value={stance}
              onChange={(e) =>
                onChange({ liftFamily, variant, load, reps, stance: e.target.value, pushupWeight, barStartHeightOffset, chestSize, squatDepth })
              }
              className={styles.input}
            >
              {(isSumo ? SUMO_STANCES : SQUAT_STANCES).map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Squat Depth Selector */}
        {liftFamily === LiftFamily.SQUAT && (
          <div>
            <label className={styles.label}>
              Squat Depth
            </label>
            <select
              value={squatDepth}
              onChange={(e) =>
                onChange({ liftFamily, variant, load, reps, stance, pushupWeight, barStartHeightOffset, chestSize, squatDepth: e.target.value as "parallel" | "belowParallel" })
              }
              className={styles.input}
            >
              <option value="parallel">Parallel</option>
              <option value="belowParallel">Below Parallel (Deep)</option>
            </select>
          </div>
        )}

        {/* Bar Elevation Offset (Deadlift only) */}
        {liftFamily === LiftFamily.DEADLIFT && (
          <div className="col-span-2">
            <label className={styles.label}>
              Bar Elevation
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={barHeightOffsetInput}
                onChange={(e) => handleBarHeightOffsetChange(e.target.value)}
                onBlur={handleBarHeightOffsetBlur}
                onKeyDown={(e) => e.key === "Enter" && handleBarHeightOffsetBlur()}
                onFocus={(e) => e.target.select()}
                className={`${styles.input} flex-1 min-w-[3rem]`}
                step="0.5"
              />
              <div className={`flex rounded-lg border ${styles.buttonContainer} overflow-hidden`}>
                <button
                  type="button"
                  onClick={() => setUnits("metric")}
                  className={`px-1.5 py-1 text-[10px] font-bold transition-colors ${heightUnit === "cm"
                    ? styles.buttonActive
                    : styles.buttonInactive
                    }`}
                >
                  cm
                </button>
                <button
                  type="button"
                  onClick={() => setUnits("imperial")}
                  className={`px-1.5 py-1 text-[10px] font-bold transition-colors ${isDark ? "border-l border-slate-700" : "border-l border-gray-300"} ${heightUnit === "inches"
                    ? styles.buttonActive
                    : styles.buttonInactive
                    }`}
                >
                  in
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chest Size Selector (Bench & Pushup) */}
        {(liftFamily === LiftFamily.BENCH || liftFamily === LiftFamily.PUSHUP) && (
          <div>
            <label className={styles.label}>
              Chest Size
            </label>
            <select
              value={chestSize}
              onChange={(e) =>
                onChange({
                  liftFamily,
                  variant,
                  load,
                  reps,
                  stance,
                  pushupWeight,
                  barStartHeightOffset,
                  chestSize: e.target.value as "small" | "average" | "large",
                })
              }
              className={styles.input}
            >
              <option value="small">Small</option>
              <option value="average">Avg</option>
              <option value="large">Large</option>
            </select>
          </div>
        )}
      </div>

      {/* Load & Reps Grid */}
      {showLoadReps && (
        <div className="grid grid-cols-[3fr_1fr] gap-2">
          {/* Load Input */}
          {needsLoad && (
            <div>
              <label className={styles.label}>
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
                  className={`${styles.input} flex-1 min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                  min="0"
                  step="2.5"
                />
                <div className={`flex rounded-lg border ${styles.buttonContainer} overflow-hidden shrink-0`}>
                  <button
                    type="button"
                    onClick={() => setUnits("metric")}
                    className={`px-1.5 py-1 text-[10px] font-bold transition-colors ${loadUnit === "kg"
                      ? styles.buttonActive
                      : styles.buttonInactive
                      }`}
                  >
                    kg
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnits("imperial")}
                    className={`px-1.5 py-1 text-[10px] font-bold transition-colors ${isDark ? "border-l border-slate-700" : "border-l border-gray-300"} ${loadUnit === "lbs"
                      ? styles.buttonActive
                      : styles.buttonInactive
                      }`}
                  >
                    lb
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Push-up Added Weight */}
          {isPushup && (
            <div>
              <label className={styles.label}>
                Added Weight
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={pushupWeightInput}
                  onChange={(e) => handlePushupWeightChange(e.target.value)}
                  onBlur={handlePushupWeightBlur}
                  onKeyDown={(e) => e.key === "Enter" && handlePushupWeightBlur()}
                  onFocus={(e) => e.target.select()}
                  className={`${styles.input} flex-1 min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                  min="0"
                  step="2.5"
                />
                <div className={`flex rounded-lg border ${styles.buttonContainer} overflow-hidden shrink-0`}>
                  <button
                    type="button"
                    onClick={() => setUnits("metric")}
                    className={`px-1.5 py-1 text-[10px] font-bold transition-colors ${loadUnit === "kg"
                      ? styles.buttonActive
                      : styles.buttonInactive
                      }`}
                  >
                    kg
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnits("imperial")}
                    className={`px-1.5 py-1 text-[10px] font-bold transition-colors ${isDark ? "border-l border-slate-700" : "border-l border-gray-300"} ${loadUnit === "lbs"
                      ? styles.buttonActive
                      : styles.buttonInactive
                      }`}
                  >
                    lb
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reps Input */}
          <div>
            <label className={styles.label}>
              Reps
            </label>
            <input
              type="number"
              value={repsInput}
              onChange={(e) => handleRepsChange(e.target.value)}
              onBlur={handleRepsBlur}
              onKeyDown={(e) => e.key === "Enter" && handleRepsBlur()}
              onFocus={(e) => e.target.select()}
              className={`${styles.input} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
              min="1"
              step="1"
            />
          </div>
        </div>
      )}
    </div>
  );
}
