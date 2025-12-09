"use client";

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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                Load (kg)
              </label>
              <input
                type="number"
                value={load}
                onChange={(e) =>
                  onChange({
                    liftFamily,
                    variant,
                    load: parseFloat(e.target.value) || 0,
                    reps,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                step="2.5"
              />
            </div>
          )}

          {/* Reps Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reps
            </label>
            <input
              type="number"
              value={reps}
              onChange={(e) =>
                onChange({
                  liftFamily,
                  variant,
                  load,
                  reps: parseInt(e.target.value) || 1,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
              step="1"
            />
          </div>
        </>
      )}
    </div>
  );
}
