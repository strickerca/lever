"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Sex } from "@/types";

interface SegmentInputProps {
  height: number;
  sex: Sex;
  sdTorso: number;
  sdUpperArm: number;
  sdForearm: number;
  sdFemur: number;
  sdTibia: number;
  onChange: (data: {
    sdTorso: number;
    sdUpperArm: number;
    sdForearm: number;
    sdFemur: number;
    sdTibia: number;
  }) => void;
  color: "blue" | "orange";
}

// Segment ratio constants (from anthropometry.ts)
const SEGMENT_RATIOS = {
  male: {
    headNeck: 0.104,
    torso: 0.288,
    upperArm: 0.186,
    forearm: 0.146,
    hand: 0.108,
    femur: 0.245,
    tibia: 0.246,
    foot: 0.152,
  },
  female: {
    headNeck: 0.104,
    torso: 0.295,
    upperArm: 0.174,
    forearm: 0.138,
    hand: 0.103,
    femur: 0.246,
    tibia: 0.247,
    foot: 0.144,
  },
};

const SD_VARIATION = 0.07; // 7% per SD

// Witty descriptors for each segment at different SD levels
const DESCRIPTORS = {
  torso: {
    "-4": "Compact Core",
    "-3": "Short Waisted",
    "-2": "Petite Torso",
    "-1": "Trim Trunk",
    "0": "Average",
    "1": "Long Torso",
    "2": "Tall Trunk",
    "3": "Giraffe Neck",
    "4": "Skyscraper Spine",
  },
  upperArm: {
    "-4": "T-Rex Arms",
    "-3": "Stubby Shoulders",
    "-2": "Compact Cannons",
    "-1": "Short Reach",
    "0": "Average",
    "1": "Long Levers",
    "2": "Orangutan Limbs",
    "3": "Gibbon Guns",
    "4": "Slenderman Status",
  },
  forearm: {
    "-4": "Tiny Levers",
    "-3": "Stub Sticks",
    "-2": "Short Shafts",
    "-1": "Compact",
    "0": "Average",
    "1": "Long Leverage",
    "2": "Popeye Poles",
    "3": "Extendo-Arms",
    "4": "Inspector Gadget",
  },
  femur: {
    "-4": "Stumpy Legs",
    "-3": "Short Stack",
    "-2": "Compact Quads",
    "-1": "Brief Bones",
    "0": "Average",
    "1": "Long Legs",
    "2": "Tall Stems",
    "3": "Flamingo Femurs",
    "4": "Daddy Long Legs",
  },
  tibia: {
    "-4": "Ankle Biter",
    "-3": "Low Rider",
    "-2": "Short Shins",
    "-1": "Compact Calves",
    "0": "Average",
    "1": "Long Shins",
    "2": "Tall Tibias",
    "3": "Stork Legs",
    "4": "Stilts",
  },
};

// Measurement instructions
const MEASUREMENT_INSTRUCTIONS = {
  torso: "Measure from the top of the shoulder (acromion) to the hip joint (greater trochanter). Stand straight and measure along the side of the body.",
  upperArm: "Measure from the shoulder joint (acromion) to the elbow joint (lateral epicondyle). Keep arm relaxed at side.",
  forearm: "Measure from the elbow joint (lateral epicondyle) to the wrist joint (ulnar styloid). Keep arm extended.",
  femur: "Measure from the hip joint (greater trochanter) to the knee joint (lateral femoral condyle). Stand straight with weight evenly distributed.",
  tibia: "Measure from the knee joint (lateral tibial condyle) to the ankle joint (lateral malleolus). Stand straight.",
};

export function SegmentInput({
  height,
  sex,
  sdTorso,
  sdUpperArm,
  sdForearm,
  sdFemur,
  sdTibia,
  onChange,
  color,
}: SegmentInputProps) {
  const [inputMode, setInputMode] = useState<"proportions" | "direct">("proportions");
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Calculate actual segment lengths based on height and SD modifiers
  const calculateSegmentLength = (baseRatio: number, sd: number) => {
    const modifiedRatio = baseRatio * (1 + sd * SD_VARIATION);
    return height * modifiedRatio;
  };

  const ratios = SEGMENT_RATIOS[sex === Sex.MALE ? "male" : "female"];

  const segments = {
    torso: {
      key: "sdTorso" as const,
      label: "Torso",
      sd: sdTorso,
      length: calculateSegmentLength(ratios.torso, sdTorso),
      baseRatio: ratios.torso,
    },
    upperArm: {
      key: "sdUpperArm" as const,
      label: "Upper Arm",
      sd: sdUpperArm,
      length: calculateSegmentLength(ratios.upperArm, sdUpperArm),
      baseRatio: ratios.upperArm,
    },
    forearm: {
      key: "sdForearm" as const,
      label: "Forearm",
      sd: sdForearm,
      length: calculateSegmentLength(ratios.forearm, sdForearm),
      baseRatio: ratios.forearm,
    },
    femur: {
      key: "sdFemur" as const,
      label: "Femur (Thigh)",
      sd: sdFemur,
      length: calculateSegmentLength(ratios.femur, sdFemur),
      baseRatio: ratios.femur,
    },
    tibia: {
      key: "sdTibia" as const,
      label: "Tibia (Shin)",
      sd: sdTibia,
      length: calculateSegmentLength(ratios.tibia, sdTibia),
      baseRatio: ratios.tibia,
    },
  };

  const getDescriptor = (segmentKey: string, sd: number) => {
    const wholeSD = Math.floor(sd).toString();
    const descriptorKey = segmentKey as keyof typeof DESCRIPTORS;
    return DESCRIPTORS[descriptorKey][wholeSD as keyof typeof DESCRIPTORS[typeof descriptorKey]] || "Average";
  };

  // Handle direct measurement input
  const handleDirectMeasurement = (segmentKey: string, length: number) => {
    const segment = segments[segmentKey as keyof typeof segments];
    // Calculate SD from the direct measurement
    // length = height * baseRatio * (1 + sd * SD_VARIATION)
    // sd = ((length / (height * baseRatio)) - 1) / SD_VARIATION
    const calculatedSD = ((length / (height * segment.baseRatio)) - 1) / SD_VARIATION;
    const clampedSD = Math.max(-4, Math.min(4, calculatedSD));

    onChange({
      sdTorso: segmentKey === "torso" ? clampedSD : sdTorso,
      sdUpperArm: segmentKey === "upperArm" ? clampedSD : sdUpperArm,
      sdForearm: segmentKey === "forearm" ? clampedSD : sdForearm,
      sdFemur: segmentKey === "femur" ? clampedSD : sdFemur,
      sdTibia: segmentKey === "tibia" ? clampedSD : sdTibia,
    });
  };

  const colorClasses = {
    blue: {
      border: "border-blue-200",
      bg: "bg-blue-50",
      text: "text-blue-900",
      button: "bg-blue-600 text-white",
      buttonInactive: "bg-white text-blue-700 border-blue-300",
    },
    orange: {
      border: "border-orange-200",
      bg: "bg-orange-50",
      text: "text-orange-900",
      button: "bg-orange-600 text-white",
      buttonInactive: "bg-white text-orange-700 border-orange-300",
    },
  };

  const colors = colorClasses[color];

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 border-2 ${colors.border}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Segment Lengths
        </h3>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setInputMode("proportions")}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
              inputMode === "proportions" ? colors.button : colors.buttonInactive
            }`}
          >
            Body Proportions
          </button>
          <button
            onClick={() => setInputMode("direct")}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
              inputMode === "direct" ? colors.button : colors.buttonInactive
            }`}
          >
            Direct Measurements
          </button>
        </div>

        <p className="text-sm text-gray-600">
          {inputMode === "proportions"
            ? "Adjust segment proportions relative to average. 0 = average, ±4 = four standard deviations."
            : "Enter your exact segment measurements. Click the help icon for measurement instructions."}
        </p>
      </div>

      <div className="space-y-4">
        {Object.entries(segments).map(([segmentKey, segment]) => (
          <div key={segmentKey}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  {segment.label}
                </label>
                {inputMode === "direct" && (
                  <button
                    onClick={() => setActiveTooltip(activeTooltip === segmentKey ? null : segmentKey)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  {segment.length.toFixed(3)}m
                </div>
                {inputMode === "proportions" && (
                  <>
                    <div className="text-xs text-gray-600">
                      {segment.sd >= 0 ? "+" : ""}{segment.sd.toFixed(1)} SD
                    </div>
                    <div className={`text-xs font-medium ${colors.text}`}>
                      {getDescriptor(segmentKey, segment.sd)}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Measurement instruction tooltip */}
            {inputMode === "direct" && activeTooltip === segmentKey && (
              <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-gray-700">
                {MEASUREMENT_INSTRUCTIONS[segmentKey as keyof typeof MEASUREMENT_INSTRUCTIONS]}
              </div>
            )}

            {inputMode === "proportions" ? (
              // Slider input
              <input
                type="range"
                min="-4"
                max="4"
                step="0.1"
                value={segment.sd}
                onChange={(e) =>
                  onChange({
                    sdTorso,
                    sdUpperArm,
                    sdForearm,
                    sdFemur,
                    sdTibia,
                    [segment.key]: parseFloat(e.target.value),
                  })
                }
                className="w-full"
              />
            ) : (
              // Direct measurement input
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={segment.length.toFixed(3)}
                  onChange={(e) => handleDirectMeasurement(segmentKey, parseFloat(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
                  min="0.01"
                  step="0.001"
                />
                <span className="text-sm text-gray-600">meters</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
