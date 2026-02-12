import { useState } from "react";
import { Flame, Gauge, Timer, Ruler, Settings2, X, ChevronDown, ChevronUp } from "lucide-react";
import { LiftMetrics, LiftData } from "@/types";
import { VelocityGauge } from "./VelocityGauge";
import { LiftSelector } from "../comparison/LiftSelector";

interface LifterPanelProps {
    name: string;
    lifterKey: "lifterA" | "lifterB";

    // Controls
    velocityValue: number;
    onVelocityChange: (val: number) => void;
    velocityInputValue: string;
    onVelocityInputChange: (val: string) => void;
    onVelocityBlur?: () => void;

    // Lift Data
    liftData?: LiftData;
    onLiftDataChange?: (data: LiftData) => void;

    // Settings
    unit: "metric" | "imperial";
    isSyncEnabled: boolean;

    // Display Data (Calculated by Parent)
    displayPower: number;
    displayCalories: number;
    displayTime: number;
    displayDistance: number;
}

const COLORS = {
    lifterA: {
        glass: "bg-slate-900/60 backdrop-blur-md border-slate-700/50",
        header: "bg-blue-900/20 border-blue-500/20",
        accent: "text-blue-400",
        accentBorder: "border-blue-500/30",
        MetricLabel: "text-slate-400",
        MetricValue: "text-slate-200",
        badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    lifterB: {
        glass: "bg-slate-900/60 backdrop-blur-md border-slate-700/50",
        header: "bg-orange-900/20 border-orange-500/20",
        accent: "text-orange-400",
        accentBorder: "border-orange-500/30",
        MetricLabel: "text-slate-400",
        MetricValue: "text-slate-200",
        badge: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    },
};

export function LifterPanel({
    name,
    lifterKey,
    velocityValue,
    onVelocityChange,
    velocityInputValue,
    onVelocityInputChange,
    onVelocityBlur,
    liftData,
    onLiftDataChange,
    unit,
    isSyncEnabled,
    displayPower,
    displayCalories,
    displayTime,
    displayDistance,
}: LifterPanelProps) {
    const styles = COLORS[lifterKey];

    return (
        <div className={`h-full max-h-[800px] flex flex-col rounded-2xl border ${styles.glass} shadow-xl overflow-hidden transition-all duration-300`}>
            {/* Header */}
            <div className={`px-5 py-3 border-b border-white/5 flex items-center justify-between ${styles.header}`}>
                <div className="flex items-center gap-3">
                    <h3 className={`font-bold text-base tracking-wide ${styles.accent}`}>
                        {name}
                    </h3>
                    {!isSyncEnabled && (
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${styles.badge}`}>
                            Interactive
                        </span>
                    )}
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto no-scrollbar relative">

                {/* MONITOR VIEW */}
                <div className="p-5 flex flex-col gap-6">

                    {/* Velocity Gauge Main Feature */}
                    <div className="flex flex-col items-center justify-center py-2">
                        <VelocityGauge
                            value={velocityValue}
                            onChange={onVelocityChange}
                            inputValue={velocityInputValue}
                            onInputChange={onVelocityInputChange}
                            onInputBlur={onVelocityBlur}
                            min={0.01}
                            max={2.0}
                            unit={unit}
                            theme="dark"
                            readOnly={isSyncEnabled}
                        />
                    </div>

                    {/* Divider */}
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                    {/* Metrics Grid */}
                    <div className="space-y-4">
                        {/* Power */}
                        <div className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-white/5 border border-white/5 group-hover:border-white/10 transition-colors`}>
                                    <Gauge className={`w-4 h-4 ${styles.accent}`} />
                                </div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Power</span>
                            </div>
                            <div className="text-right">
                                <div className="text-xl font-black text-white leading-none">
                                    {displayPower.toFixed(0)} <span className="text-xs font-medium text-slate-600">W</span>
                                </div>
                            </div>
                        </div>

                        {/* Calories */}
                        <div className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-white/5 border border-white/5 group-hover:border-white/10 transition-colors`}>
                                    <Flame className={`w-4 h-4 ${displayCalories > 10 ? 'text-rose-500 animate-pulse' : styles.accent}`} />
                                </div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Burn</span>
                            </div>
                            <div className="text-right">
                                <div className={`text-xl font-black leading-none ${displayCalories > 10 ? 'text-rose-400' : 'text-white'}`}>
                                    {displayCalories.toFixed(1)} <span className="text-xs font-medium text-slate-600">kcal</span>
                                </div>
                            </div>
                        </div>


                    </div>
                </div>

            </div>
        </div>
    );
}
