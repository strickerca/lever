import React, { useMemo, useRef, useState } from "react";
import { Info } from "lucide-react";

interface VelocityGaugeProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    unit?: "metric" | "imperial";
    theme?: "light" | "dark";
    disabled?: boolean;
    readOnly?: boolean;
    inputValue?: string; // Optional for backward compatibility/flexibility
    onInputChange?: (val: string) => void;
    onInputBlur?: () => void;
}

type StrengthZone = {
    label: string;
    min: number;
    max: number;
    color: string;
    gradientFrom: string;
    gradientTo: string;
    textColor: string;
    darkModeTextColor: string;
    description: string;
    loadRange: string;
};

const STRENGTH_ZONES: StrengthZone[] = [
    {
        label: "Absolute Strength",
        min: 0,
        max: 0.5,
        color: "#EF4444",
        gradientFrom: "#FECACA",
        gradientTo: "#EF4444",
        textColor: "text-red-900",
        darkModeTextColor: "text-red-400",
        description: "Maximal force production and neural drive.",
        loadRange: "85% – 100%",
    },
    {
        label: "Accelerative Strength",
        min: 0.5,
        max: 0.75,
        color: "#F97316",
        gradientFrom: "#FED7AA",
        gradientTo: "#F97316",
        textColor: "text-orange-900",
        darkModeTextColor: "text-orange-400",
        description: "Moving heavy loads with maximal intent; 'grinding' power.",
        loadRange: "65% – 85%",
    },
    {
        label: "Strength-Speed",
        min: 0.75,
        max: 1.0,
        color: "#EAB308",
        gradientFrom: "#FEF08A",
        gradientTo: "#EAB308",
        textColor: "text-yellow-900",
        darkModeTextColor: "text-yellow-400",
        description: "Moving moderate loads at moderate speeds (Strength-biased).",
        loadRange: "45% – 65%",
    },
    {
        label: "Speed-Strength",
        min: 1.0,
        max: 1.3,
        color: "#3B82F6",
        gradientFrom: "#BFDBFE",
        gradientTo: "#3B82F6",
        textColor: "text-blue-900",
        darkModeTextColor: "text-blue-400",
        description: "Moving light loads at high speeds (Speed-biased).",
        loadRange: "25% – 45%",
    },
    {
        label: "Starting Strength",
        min: 1.3,
        max: 99.0,
        color: "#8B5CF6",
        gradientFrom: "#DDD6FE",
        gradientTo: "#8B5CF6",
        textColor: "text-purple-900",
        darkModeTextColor: "text-purple-400",
        description: "Rapidly overcoming inertia from a dead stop.",
        loadRange: "0% – 25%",
    },
];

export function VelocityGauge({
    value,
    onChange,
    min = 0.01,
    max = 2.0,
    unit = "metric",
    theme = "light",
    disabled = false,
    readOnly = false,
    inputValue,
    onInputChange,
    onInputBlur
}: VelocityGaugeProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Tooltip State
    const [hoveredZone, setHoveredZone] = useState<StrengthZone | null>(null);

    // Helpers
    const toDisplay = (val: number) => (unit === "metric" ? val : val * 3.28084);

    // Determine current zone
    const currentZone = useMemo(() => {
        return STRENGTH_ZONES.find((z) => value >= z.min && value < z.max) || STRENGTH_ZONES[STRENGTH_ZONES.length - 1];
    }, [value]);

    // Active Zone for Display (Hover or Current)
    const displayZone = hoveredZone || currentZone;

    const isExtreme = value > 2.0;
    const isDark = theme === "dark";

    // --- Gauge Geometry ---
    const radius = 80;
    const strokeWidth = 12;
    const centerX = 100;
    const centerY = 90; // Semicircle bottom
    // Angles: 180 degrees (left) to 0 degrees (right) for straight semi-circle? 
    // Usually gauges go from e.g. 150 to 30.
    // Let's do a standard 180 degree semi-circle: 180 (left) -> 0 (right).
    // Wait, SVG coords: 0 deg is 3 o'clock. 180 is 9 o'clock.
    // We want 180 -> 360 (or 0)??
    // Let's define startAngle = 180, endAngle = 0.

    // Calculate arc path for a zone
    const describeArc = (x: number, y: number, r: number, startA: number, endA: number) => {
        const start = polarToCartesian(x, y, r, endA);
        const end = polarToCartesian(x, y, r, startA);
        const largeArcFlag = endA - startA <= 180 ? "0" : "1";
        return [
            "M", start.x, start.y,
            "A", r, r, 0, largeArcFlag, 0, end.x, end.y
        ].join(" ");
    };

    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
        // Actually standard math: 0 is right. 180 is left.
        // If I want 180 (left) to 0 (right) via top.
        // angle 180 => x = cx + r*cos(180) = cx-r. y = cy + r*sin(180) = cy.
        // angle 90 => x = cx. y = cy-r (top).
        // angle 0 => x = cx+r. y = cy.
        // This coordinates system needs Y Up? No SVG is Y Down.
        // So angle 180 (rad PI) => cos=-1, sin=0 => x=cx-r, y=cy. Correct (Left).
        // angle 270 (rad 3PI/2) => cos=0, sin=-1 => x=cx, y=cy-r. Correct (Top).
        // angle 360/0 => x=cx+r, y=cy. Correct (Right).

        // My valueToAngle inputs: 180 (min) -> 0 (max)? No, that goes UNDER by default (CW).
        // I want CW from 180 to 360.
        // Let's use 180 (Min) -> 360 (Max).
        return {
            x: centerX + (radius * Math.cos(angleInDegrees * Math.PI / 180.0)),
            y: centerY + (radius * Math.sin(angleInDegrees * Math.PI / 180.0))
        };
    };

    // Correct logic: Screen Y is Down.
    // 180 deg = Left.
    // 270 deg = Top.
    // 360 deg = Right.
    // So range is 180 -> 360.
    const GAUGE_MIN_ANGLE = 180;
    const GAUGE_MAX_ANGLE = 360;

    const getAngle = (v: number) => {
        // If v > max, pin to max + jitter? 
        // For drawing arcs, we clamp.
        const effectiveMax = max;
        const clamped = Math.min(Math.max(v, min), effectiveMax);
        const pct = (clamped - min) / (effectiveMax - min);
        return GAUGE_MIN_ANGLE + (pct * (GAUGE_MAX_ANGLE - GAUGE_MIN_ANGLE));
    };

    // Interaction & Hover
    const calculateValueFromEvent = (
        e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>
    ) => {
        if (!svgRef.current) return null;

        let clientX: number;
        let clientY: number;
        if ("touches" in e && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            const mouseEvent = e as React.MouseEvent<SVGSVGElement>;
            clientX = mouseEvent.clientX;
            clientY = mouseEvent.clientY;
        }

        const rect = svgRef.current.getBoundingClientRect();
        const x = clientX - rect.left - (rect.width / 2);
        const y = clientY - rect.top - (rect.height * 0.9);

        let angleDeg = Math.atan2(y, x) * 180 / Math.PI;
        if (angleDeg < 0) angleDeg += 360;

        if (angleDeg < 180) {
            if (angleDeg > 90) angleDeg = 180;
            else angleDeg = 360;
        }

        const pct = (angleDeg - 180) / 180;
        const newVal = min + (pct * (max - min));
        return Math.max(min, Math.min(max, newVal));
    };

    const handleInteraction = (
        e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>
    ) => {
        if (readOnly || disabled) return;
        const newVal = calculateValueFromEvent(e);
        if (newVal !== null) {
            // Snap to step
            const stepVal = 0.01;
            const snapped = Math.round(newVal / stepVal) * stepVal;
            if (snapped !== value) onChange(snapped);
        }
    };

    const handleHover = (e: React.MouseEvent<SVGSVGElement>) => {
        const val = calculateValueFromEvent(e);
        if (val !== null) {
            const zone = STRENGTH_ZONES.find((z) => val >= z.min && val < z.max) || STRENGTH_ZONES[STRENGTH_ZONES.length - 1];
            setHoveredZone(zone);
        }
    };

    return (
        <div className={`flex flex-col select-none ${disabled ? "opacity-50" : ""} relative group`}>

            {/* Speedometer Gauge */}
            <div
                className="relative flex flex-col items-center mb-0"
                onMouseLeave={() => { setIsDragging(false); setHoveredZone(null); }}
            >
                <svg
                    ref={svgRef}
                    viewBox="0 -10 200 125"
                    className={`w-full max-w-[280px] overflow-visible ${readOnly ? '' : 'cursor-pointer'}`}
                    onMouseDown={(e) => { setIsDragging(true); handleInteraction(e); }}
                    onMouseMove={(e) => {
                        if (isDragging) handleInteraction(e);
                        else handleHover(e);
                    }}
                    onMouseUp={() => setIsDragging(false)}
                    onTouchStart={(e) => { setIsDragging(true); handleInteraction(e); }}
                    onTouchMove={(e) => { if (isDragging) handleInteraction(e); }}
                    onTouchEnd={() => setIsDragging(false)}
                >
                    {/* Decorative Border Track */}
                    <path
                        d={describeArc(centerX, centerY, radius, 180, 360)}
                        fill="none"
                        stroke={isDark ? "#334155" : "#cbd5e1"}
                        strokeWidth={strokeWidth + 4}
                        strokeLinecap="round"
                        className="drop-shadow-sm"
                    />
                    {/* Inner Track Background */}
                    <path d={describeArc(centerX, centerY, radius, 180, 360)} fill="none" stroke={isDark ? "#1e293b" : "#f1f5f9"} strokeWidth={strokeWidth} strokeLinecap="round" />

                    {/* Zone Arcs */}
                    {STRENGTH_ZONES.map((zone) => {
                        const zStart = Math.max(min, zone.min);
                        const zEnd = Math.min(max, zone.max);
                        if (zStart >= zEnd) return null;

                        const a1 = getAngle(zStart);
                        const a2 = getAngle(zEnd);

                        const isHovered = hoveredZone?.label === zone.label;

                        return (
                            <path
                                key={zone.label}
                                d={describeArc(centerX, centerY, radius, a1, a2)}
                                fill="none"
                                stroke={zone.color}
                                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                                style={{ filter: isHovered ? `drop-shadow(0 0 8px ${zone.color})` : 'none' }}
                                className="transition-all duration-200 ease-out"
                            />
                        );
                    })}

                    {/* Range Labels */}
                    {[0.5, 0.75, 1.0, 1.3, 2.0].map((val) => {
                        const angle = getAngle(val);
                        // Position text slightly outside radius
                        const rad = radius + 15;
                        const pos = polarToCartesian(centerX, centerY, rad, angle);

                        return (
                            <text
                                key={val}
                                x={pos.x}
                                y={pos.y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className={`text-[8px] font-bold ${isDark ? "fill-slate-500" : "fill-slate-400"} select-none pointer-events-none`}
                                style={{ fontSize: '8px' }}
                            >
                                {val}
                            </text>
                        )
                    })}
                    {/* Start Label */}
                    <text
                        x={polarToCartesian(centerX, centerY, radius + 15, 180).x}
                        y={polarToCartesian(centerX, centerY, radius + 15, 180).y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className={`text-[8px] font-bold ${isDark ? "fill-slate-500" : "fill-slate-400"} select-none pointer-events-none`}
                        style={{ fontSize: '8px' }}
                    >
                        0
                    </text>


                    {/* Gauge Label */}
                    <text
                        x={centerX}
                        y={centerY - 35}
                        textAnchor="middle"
                        className={`text-[10px] font-black ${isDark ? "fill-slate-600" : "fill-slate-300"} pointer-events-none uppercase tracking-widest`}
                    >
                        VELOCITY
                    </text>

                    {/* Needle */}
                    <g transform={`rotate(${getAngle(Math.min(value, max))} ${centerX} ${centerY})`} className="transition-transform duration-300 ease-out pointer-events-none">
                        {/* Needle Border (White Outline) */}
                        <line x1={centerX - 15} y1={centerY} x2={centerX + radius - 5} y2={centerY} stroke="white" strokeWidth="6" strokeLinecap="round" />
                        <circle cx={centerX} cy={centerY} r="8" fill="white" />

                        {/* Needle Core */}
                        <line x1={centerX - 15} y1={centerY} x2={centerX + radius - 5} y2={centerY} stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
                        <circle cx={centerX} cy={centerY} r="6" fill="#1e293b" />
                    </g>

                    {/* Off-scale Indicator */}
                    {isExtreme && (
                        <circle cx={190} cy={10} r="4" fill="#EF4444" className="animate-ping" />
                    )}
                </svg>



                {/* Center Value Input (Moved Below) */}
                <div className="flex flex-col items-center mt-2 z-10 pointer-events-auto">
                    <div className="relative group">
                        {!readOnly ? (
                            <input
                                type="number"
                                value={typeof inputValue !== 'undefined' ? inputValue : value}
                                onChange={(e) => {
                                    if (onInputChange) {
                                        onInputChange(e.target.value);
                                    } else {
                                        onChange(parseFloat(e.target.value));
                                    }
                                }}
                                onBlur={onInputBlur}
                                onFocus={(e) => e.target.select()}
                                className={`text-3xl font-black text-center bg-transparent w-24 focus:outline-none focus:ring-0 p-0 m-0 ${isDark ? "text-white" : ""}`}
                                style={{
                                    appearance: 'textfield',
                                    backgroundColor: 'transparent' // Explicitly clear
                                }}
                                step={0.01}
                            />
                        ) : (
                            <div className={`text-3xl font-black ${isDark ? displayZone.darkModeTextColor : ""}`} style={{ color: isDark ? undefined : displayZone.textColor }}>
                                {toDisplay(value).toFixed(2)}
                            </div>
                        )}
                        <span className={`block text-[10px] font-bold ${isDark ? "text-slate-500" : "text-slate-400"} text-center uppercase tracking-widest -mt-1`}>
                            {unit === "metric" ? "m/s" : "ft/s"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Info Panel (Bottom) */}
            <div className={`mt-4 p-5 rounded-xl border bg-gradient-to-r relative overflow-hidden transition-colors duration-500 shadow-sm flex flex-col justify-center min-h-[120px]`}
                style={{
                    borderColor: isDark ? `${displayZone.color}40` : displayZone.color,
                    backgroundColor: isDark ? `${displayZone.color}15` : `${displayZone.color}08`
                }}
            >
                {/* Decorative Background Blob */}
                <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full opacity-10 blur-2xl pointer-events-none"
                    style={{ backgroundColor: displayZone.color }}
                />

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className={`text-sm font-black uppercase tracking-widest transition-colors duration-300 pr-2 ${isDark ? displayZone.darkModeTextColor : displayZone.textColor}`}>
                            {displayZone.label}
                        </h4>
                        {isExtreme && !hoveredZone && (
                            <div className="flex items-center gap-1 text-amber-600 animate-pulse bg-white/50 px-2 py-0.5 rounded-full border border-amber-200">
                                <Info className="w-3 h-3" />
                                <span className="text-[9px] font-bold uppercase">Max</span>
                            </div>
                        )}
                    </div>

                    <p className={`text-xs ${isDark ? "text-slate-300" : "text-slate-600"} font-medium leading-relaxed mb-4 max-w-[90%] min-h-[2.5em]`}>
                        {displayZone.description}
                    </p>

                    <div className="flex items-center">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md ${isDark ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"} border shadow-sm w-fit transition-colors duration-300`}>
                            <span className={`text-[10px] font-bold ${isDark ? "text-slate-500" : "text-slate-400"} uppercase tracking-wider whitespace-nowrap`}>Load</span>
                            <span className={`text-xs font-black whitespace-nowrap ${isDark ? displayZone.darkModeTextColor : ""}`} style={{ color: isDark ? undefined : displayZone.textColor }}>
                                {displayZone.loadRange} <span className={`text-[9px] ${isDark ? "text-slate-500" : "text-slate-400"} font-bold ml-px`}>1RM</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
