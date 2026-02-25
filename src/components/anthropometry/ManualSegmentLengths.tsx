"use client";

import { useState } from "react";
import { HelpCircle, ChevronRight, ChevronDown } from "lucide-react";
import { Sex } from "@/types";

interface ManualSegmentLengthsProps {
    height: number;
    sex: Sex;
    segments: {
        torso: number;
        upperArm: number;
        forearm: number;
        femur: number;
        tibia: number;
    };
    onChange: (segments: {
        torso: number;
        upperArm: number;
        forearm: number;
        femur: number;
        tibia: number;
    }) => void;
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    headless?: boolean;
    color: "blue" | "orange";
    onSegmentHover?: (segment: "torso" | "arm" | "leg" | null) => void;
}

// Measurement instructions
const MEASUREMENT_INSTRUCTIONS = {
    torso: "Top of shoulder (acromion) to hip joint (greater trochanter).",
    upperArm: "Shoulder joint (acromion) to elbow joint (lateral epicondyle).",
    forearm: "Elbow joint (lateral epicondyle) to wrist joint (ulnar styloid).",
    femur: "Hip joint (greater trochanter) to knee joint (lateral femoral condyle).",
    tibia: "Knee joint (lateral tibial condyle) to ankle joint (lateral malleolus).",
};

// Helper component for individual inputs
function SegmentInput({
    valueMeters,
    unit,
    onChange,
    className
}: {
    valueMeters: number;
    unit: "cm" | "in";
    onChange: (val: number) => void;
    className?: string;
}) {
    // Convert incoming value to display unit
    const toDisplay = (m: number) => unit === "cm" ? m * 100 : m / 0.0254;
    const fromDisplay = (d: number) => unit === "cm" ? d / 100 : d * 0.0254;

    const [localVal, setLocalVal] = useState(() => toDisplay(valueMeters).toFixed(2));
    const [isFocused, setIsFocused] = useState(false);
    const displayValue = isFocused ? localVal : toDisplay(valueMeters).toFixed(2);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setLocalVal(newVal);

        const num = parseFloat(newVal);
        if (!isNaN(num)) {
            onChange(fromDisplay(num));
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        const num = parseFloat(localVal);
        if (!isNaN(num)) {
            setLocalVal(num.toFixed(2));
        }
    };

    return (
        <input
            type="number"
            value={displayValue}
            onChange={handleChange}
            onFocus={(e) => {
                setIsFocused(true);
                setLocalVal(toDisplay(valueMeters).toFixed(2));
                e.target.select();
            }}
            onBlur={handleBlur}
            onKeyDown={(e) => {
                if (e.key === "Enter") handleBlur();
            }}
            step="0.1"
            className={className}
        />
    );
}

export function ManualSegmentLengths({
    segments,
    onChange,
    enabled,
    onToggle,
    color,
    headless = false,
    onSegmentHover,
}: ManualSegmentLengthsProps) {
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
    const [unit, setUnit] = useState<"cm" | "in">("cm");

    // Handle unit toggle
    const toggleUnit = (newUnit: "cm" | "in") => {
        setUnit(newUnit);
    };

    const colorClasses = {
        blue: {
            border: "border-blue-500/30",
            bg: "bg-blue-900/20",
            text: "text-blue-200",
            accent: "text-blue-400",
            switchActive: "bg-blue-600",
            ring: "focus:ring-blue-500",
        },
        orange: {
            border: "border-orange-500/30",
            bg: "bg-orange-900/20",
            text: "text-orange-200",
            accent: "text-orange-400",
            switchActive: "bg-orange-600",
            ring: "focus:ring-orange-500",
        },
    };

    const colors = colorClasses[color];

    const content = (
        <div className={`space-y-4 animate-in slide-in-from-top-2 fade-in duration-200 ${headless ? "" : "p-4"}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-800/50 border border-slate-700 rounded text-sm text-slate-400 flex-1 mr-4">
                    Enter lengths in <strong>{unit === "cm" ? "centimeters" : "inches"}</strong>. Hover over labels for measurement instructions.
                </div>

                {/* Unit Toggle */}
                <div className="flex rounded-lg border border-slate-700 overflow-hidden shrink-0">
                    <button
                        type="button"
                        onClick={() => toggleUnit("cm")}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors ${unit === "cm"
                            ? "bg-slate-700 text-white"
                            : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                            }`}
                    >
                        cm
                    </button>
                    <button
                        type="button"
                        onClick={() => toggleUnit("in")}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-slate-700 ${unit === "in"
                            ? "bg-slate-700 text-white"
                            : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                            }`}
                    >
                        in
                    </button>
                </div>
            </div>

            {Object.entries(segments).map(([key, value]) => {
                const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim();
                const segmentKey = key as keyof typeof segments;

                return (
                    <div
                        key={key}
                        className="relative"
                        onMouseEnter={() => {
                            setActiveTooltip(key);
                            if (key === "torso") onSegmentHover?.("torso");
                            else if (key === "upperArm" || key === "forearm") onSegmentHover?.("arm");
                            else if (key === "femur" || key === "tibia") onSegmentHover?.("leg");
                        }}
                        onMouseLeave={() => {
                            setActiveTooltip(null);
                            onSegmentHover?.(null);
                        }}
                    >
                        <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-slate-300 cursor-help border-b border-dotted border-slate-600">{label}</label>
                                <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                            </div>
                        </div>

                        {/* Tooltip - Positioned conditionally */}
                        {activeTooltip === key && (
                            <div className="absolute z-20 bottom-full left-0 mb-2 w-64 bg-slate-800 text-white text-xs p-3 rounded shadow-xl animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                                <div className="font-semibold mb-1 text-slate-200">How to measure:</div>
                                {MEASUREMENT_INSTRUCTIONS[segmentKey]}
                                {/* Little triangle arrow */}
                                <div className="absolute bottom-0 left-4 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-800"></div>
                            </div>
                        )}

                        <div className="relative">
                            <SegmentInput
                                valueMeters={value}
                                unit={unit}
                                onChange={(newMeters) => onChange({ ...segments, [key]: newMeters })}
                                className={`w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-md focus:outline-none focus:ring-2 ${colors.ring} focus:border-transparent font-mono text-sm`}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">{unit}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    if (headless) {
        return content;
    }

    return (
        <div className={`bg-slate-900/50 backdrop-blur-sm rounded-lg shadow-sm border transition-colors duration-300 ${enabled ? colors.border : "border-slate-800"}`}>

            {/* Header Toggle */}
            <div
                onClick={() => onToggle(!enabled)}
                className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/50 transition-colors rounded-t-lg ${enabled ? "rounded-b-none border-b " + colors.border : "rounded-b-lg"}`}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${enabled ? colors.bg : "bg-slate-800"}`}>
                        {enabled ? <ChevronDown className={`w-5 h-5 ${colors.accent}`} /> : <ChevronRight className="w-5 h-5 text-slate-500" />}
                    </div>
                    <div>
                        <h3 className={`font-semibold ${enabled ? "text-slate-200" : "text-slate-400"}`}>Custom Segment Lengths</h3>
                        <p className="text-xs text-slate-500">Override standard body proportions</p>
                    </div>
                </div>

                {/* Toggle Switch */}
                <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${enabled ? colors.switchActive : "bg-slate-700"}`}>
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${enabled ? "translate-x-6" : "translate-x-0"}`} />
                </div>
            </div>

            {/* Expanded Content */}
            {enabled && content}
        </div>
    );
}
