"use client";

import { useState } from "react";
import { Sex, TorsoLegProportion, ArmProportion } from "@/types";
import { AnthropometryDropdown } from "@/components/ui/AnthropometryDropdown";
import { getArchetype } from "@/lib/archetypes";
import { useUnits } from "@/hooks/useUnits";

interface BuildInputProps {
  height: number;
  weight: number;
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
  // Live stats not used in this simplified version but kept for interface compat if needed
  liveStats?: { rom?: number };
  isCustomMode: boolean;
  onToggleMode?: (enabled: boolean) => void;
  customSegmentsSlot?: React.ReactNode;
  onSegmentHover?: (segment: string | string[] | null) => void;
  // Preview Props
  onPreviewTorsoLeg?: (ratio: TorsoLegProportion) => void;
  onPreviewArm?: (length: ArmProportion) => void;
  onPreviewHeight?: (height: number) => void;
  onPreviewEnd?: () => void;
}

export function BuildInput({
  height,
  weight,
  sex,
  torsoLegRatio,
  armLength,
  onChange,
  liveStats,
  isCustomMode = false,
  onToggleMode,
  customSegmentsSlot,
  onSegmentHover,
  onPreviewTorsoLeg,
  onPreviewArm,
  onPreviewHeight,
  onPreviewEnd,
}: BuildInputProps) {
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
  const [heightError, setHeightError] = useState<string | null>(null);

  // Calculate archetype
  const archetype = getArchetype(torsoLegRatio, armLength, sex);

  const displayHeightInput = heightUnit === "cm" ? (height * 100).toFixed(0) : (height * 39.3701).toFixed(1);
  const displayWeightInput = weightUnit === "kg" ? weight.toFixed(1) : (weight * 2.20462).toFixed(1);

  const handleHeightChange = (value: string) => {
    setHeightInput(value);

    // Live Preview Logic
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      const valInMeters = heightUnit === "cm" ? num / 100 : num / 39.3701;
      // Rough bounds check for preview (0.5m to 4m)
      if (valInMeters > 0.5 && valInMeters < 4) {
        onPreviewHeight?.(valInMeters);
      }
    }
  };

  const handleHeightBlur = () => {
    const num = parseFloat(heightInput);

    // Bounds: 3ft (~0.91m) to 10ft (~3.05m)
    // Constraint: Bench press height (0.45m) requires legs > ~0.85m total height for feet to touch floor.
    const minMeters = 0.9144;
    const maxMeters = 3.048;
    // Small epsilon to handle floating point precision issues
    const epsilon = 0.001;

    // Convert input to meters for validation
    const valInMeters = heightUnit === "cm" ? num / 100 : num / 39.3701;

    if (isNaN(num)) {
      setHeightError("Please enter a valid number");
      return;
    }

    if (valInMeters < minMeters - epsilon || valInMeters > maxMeters + epsilon) {
      setHeightError("Must be between 3ft (36in) and 10ft (120in) for standard equipment compatibility");
      return;
    }

    setHeightError(null);
    onChange({ height: valInMeters, weight, sex, torsoLegRatio, armLength });
    onPreviewEnd?.();
  };

  const handleWeightChange = (value: string) => {
    setWeightInput(value);
  };

  const handleWeightBlur = () => {
    const num = parseFloat(weightInput);
    if (isNaN(num)) return;

    const valKg = weightUnit === "kg"
      ? num
      : num / 2.20462;

    onChange({ height, weight: valKg, sex, torsoLegRatio, armLength });
  };

  // Helper: Format difference for UI
  const getDiffLabel = (ratioDiff: number, baseLengthRatio: number, isInches: boolean, label?: string) => {
    if (Math.abs(ratioDiff) < 0.001) return "";

    // Calculate raw length change based on height
    // Note: This is an approximation. Segment lengths scale with height.
    const deltaMeters = height * ratioDiff;

    if (isInches) {
      const val = deltaMeters * 39.37;
      const sign = val > 0 ? "+" : "";
      return ` (${sign}${val.toFixed(1)}in${label ? " " + label : ""})`;
    } else {
      const val = deltaMeters * 100;
      const sign = val > 0 ? "+" : "";
      return ` (${sign}${val.toFixed(0)}cm${label ? " " + label : ""})`;
    }
  };

  // Helper for dual labels (Legs/Torso trade-off)
  const getDualDiffLabel = (legRatioDiff: number, torsoRatioDiff: number) => {
    const isImp = heightUnit === "inches";

    const legLabel = getDiffLabel(legRatioDiff, 1, isImp, "Legs");
    const torsoLabel = getDiffLabel(torsoRatioDiff, 1, isImp, "Torso");

    // Remove parentheses to combine them cleanly: "(+X Legs) (-Y Torso)" -> "(+X Legs / -Y Torso)"
    const cleanLeg = legLabel.replace("(", "").replace(")", "");
    const cleanTorso = torsoLabel.replace("(", "").replace(")", "");

    return ` (${cleanTorso} / ${cleanLeg})`;
  };

  // Helper for Arm Length labels (approx 2.26% height change per SD)
  const getArmDiffLabel = (sd: number) => {
    const ratioDiff = sd * 0.0226;
    return getDiffLabel(ratioDiff, 1, isImp, "Reach");
  };

  const isImp = heightUnit === "inches";

  return (
    <div className="space-y-2">
      {/* Height Input */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-xs font-medium text-slate-400">
            Height
          </label>
          {liveStats?.rom !== undefined && (
            <span
              className={`text-xs font-bold ${(liveStats.rom * 100) < 40
                ? "text-green-400"
                : (liveStats.rom * 100) > 50
                  ? "text-red-400"
                  : "text-slate-500"
                } `}
            >
              Est. ROM: {(liveStats.rom * 100).toFixed(1)}cm
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            value={isHeightEditing ? heightInput : displayHeightInput}
            onChange={(e) => {
              if (!isHeightEditing) setIsHeightEditing(true);
              handleHeightChange(e.target.value);
              if (heightError) setHeightError(null);
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
            className={`flex-1 px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white bg-slate-950 font-medium text-sm ${heightError ? "border-red-500 bg-red-900/10" : "border-slate-700"
              } `}
            step={heightUnit === "cm" ? "1" : "0.1"}
            min={heightUnit === "cm" ? "91" : "36"} // 3 ft
            max={heightUnit === "cm" ? "305" : "120"} // 10 ft
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
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${heightUnit === "cm"
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                } `}
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
              className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-slate-700 ${heightUnit === "inches"
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                } `}
            >
              in
            </button>
          </div>
        </div>
        {heightError && (
          <p className="text-xs text-red-500 mt-1 font-medium">{heightError}</p>
        )}
      </div>

      {/* Weight Input */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
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
            className="flex-1 px-3 py-1.5 border border-slate-700 bg-slate-950 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white font-medium text-sm"
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
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${weightUnit === "kg"
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                } `}
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
              className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-slate-700 ${weightUnit === "lbs"
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                } `}
            >
              lbs
            </button>
          </div>
        </div>
      </div>

      {/* Sex Selector */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          Sex
        </label>
        <select
          value={sex}
          onChange={(e) => onChange({ height, weight, sex: e.target.value as Sex, torsoLegRatio, armLength })}
          className="w-full px-3 py-1.5 border border-slate-700 bg-slate-950 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white font-medium text-sm"
        >
          <option value={Sex.MALE}>Male</option>
          <option value={Sex.FEMALE}>Female</option>
        </select>
      </div>

      {/* Body Configuration Section */}
      <div className="border-t border-slate-700 pt-3">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-xs font-semibold text-slate-300">
            {isCustomMode ? "Custom Measurements" : "Body Proportions"}
          </h4>

          {/* Mode Toggle */}
          {onToggleMode && (
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-medium transition-colors ${!isCustomMode ? "text-blue-400" : "text-slate-500"}`}>
                Archetype
              </span>
              <button
                type="button"
                onClick={() => onToggleMode(!isCustomMode)}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isCustomMode ? "bg-blue-600" : "bg-slate-700"
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isCustomMode ? "translate-x-4" : "translate-x-0"
                    }`}
                />
              </button>
              <span className={`text-[10px] font-medium transition-colors ${isCustomMode ? "text-blue-400" : "text-slate-500"}`}>
                Custom
              </span>
            </div>
          )}
        </div>

        {isCustomMode && customSegmentsSlot ? (
          <div className="animate-in fade-in duration-200">
            {customSegmentsSlot}
          </div>
        ) : (
          <div className="animate-in fade-in duration-200">
            {/* Torso-to-Leg Ratio */}
            <div
              className="mb-2"
              onMouseEnter={() => onSegmentHover?.(["torso", "leg"])}
              onMouseLeave={() => onSegmentHover?.(null)}
            >
              <AnthropometryDropdown
                label="Torso-to-Leg Ratio"
                value={torsoLegRatio}
                onChange={(val) => onChange({ height, weight, sex, torsoLegRatio: val as TorsoLegProportion, armLength })}
                onPreview={(val) => onPreviewTorsoLeg?.(val as TorsoLegProportion)}
                onHoverEnd={() => onPreviewEnd?.()}
                options={[
                  { value: "veryLongLegs", label: "Very Long Legs", subLabel: getDualDiffLabel(0.033, -0.039) },
                  { value: "longLegs", label: "Long Legs", subLabel: getDualDiffLabel(0.017, -0.019) },
                  { value: "average", label: "Balanced Ratio" },
                  { value: "longTorso", label: "Long Torso", subLabel: getDualDiffLabel(-0.017, 0.019) },
                  { value: "veryLongTorso", label: "Very Long Torso", subLabel: getDualDiffLabel(-0.033, 0.039) },
                ]}
              />
            </div>

            {/* Arm Length */}
            <div
              className="mb-2"
              onMouseEnter={() => onSegmentHover?.("arm")}
              onMouseLeave={() => onSegmentHover?.(null)}
            >
              <AnthropometryDropdown
                label="Arm Length"
                value={armLength}
                onChange={(val) => onChange({ height, weight, sex, torsoLegRatio, armLength: val as ArmProportion })}
                onPreview={(val) => onPreviewArm?.(val as ArmProportion)}
                onHoverEnd={() => onPreviewEnd?.()}
                options={[
                  { value: "extraShort", label: "T-Rex Arms", subLabel: getArmDiffLabel(-2) },
                  { value: "short", label: "Short Arms", subLabel: getArmDiffLabel(-1) },
                  { value: "average", label: "Average Reach", subLabel: "Balanced" },
                  { value: "long", label: "Long Arms", subLabel: getArmDiffLabel(1) },
                  { value: "extraLong", label: "Ape Index", subLabel: getArmDiffLabel(2) },
                ]}
              />
            </div>

            {/* Archetype Display & Visualizer */}
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-3">
              <div className={`p-3 rounded-lg border bg-gradient-to-r ${archetype.theme.colors.background} ${archetype.theme.colors.accent} ${archetype.theme.colors.glow} shadow-lg transition-all duration-300 flex flex-col justify-center`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-white/60 tracking-wider">ARCHETYPE</span>
                  <span className={`text-xs font-black uppercase tracking-widest ${archetype.theme.colors.text}`}>
                    {archetype.name}
                  </span>
                </div>
                <p className="text-[10px] text-white/80 font-medium italic leading-relaxed">
                  &ldquo;{archetype.description}&rdquo;
                </p>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
