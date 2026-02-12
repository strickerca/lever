import { useState } from "react";
import { ComparisonResult, LiftData } from "@/types";
import { Scale, Flame, Activity, Ruler, Dumbbell, RefreshCw, Zap, Info, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
// Custom tooltip implemented below to avoid dependencies
// Actually, checking installed packages is hard. I'll build a custom simple tooltip to be safe and avoid dependency errors.

interface PostSimulationStatsProps {
    result: ComparisonResult;
    liftDataA: LiftData;
    liftDataB: LiftData;
    avgPowerA: number;
    avgPowerB: number;
    onReplay?: () => void;
}

const METRIC_DEFINITIONS = {
    rom: "The total distance the barbell travels during a single repetition (concentric + eccentric phases).",
    totalRom: "The cumulative distance traveled across all completed repetitions (both up and down).",
    effectiveMass: "The total resistance moved, including the external load and a portion of the lifter's body weight where applicable (e.g., Squats).",
    workPerRep: "The amount of energy expended to complete one repetition, calculated as Force × Distance.",
    peakPower: "The maximum power output generated during the concentric (lifting) phase of the movement.",
    avgPower: "The average power output maintained across the entire set, calculated as Total Work / Total Time.",
    burnRate: "The rate of caloric expenditure estimated based on the mechanical work performed.",
    leverageScore: "A calculated score representing biomechanical efficiency. Higher means 'better' leverage (easier lift).",
    p4pScore: "Pound-for-Pound Score: A normalized efficiency rating comparing work done to body weight.",
    leverageDisadvantage: "The percentage difference in Leverage Score between the two lifters."
};

export function PostSimulationStats({
    result,
    liftDataA,
    liftDataB,
    avgPowerA,
    avgPowerB,
    onReplay
}: PostSimulationStatsProps) {
    const { lifterA, lifterB, comparison } = result;

    // 1. Identify Advantage/Disadvantage
    const isADisadvantaged = comparison.advantageDirection === 'advantage_B';
    const disadvantagedLifter = isADisadvantaged ? lifterA : lifterB;
    const moreWorkLifter = lifterA.metrics.totalWork > lifterB.metrics.totalWork ? lifterA : lifterB;
    const lessWorkLifter = lifterA.metrics.totalWork > lifterB.metrics.totalWork ? lifterB : lifterA;

    // Metrics
    const workA = lifterA.metrics.totalWork;
    const workB = lifterB.metrics.totalWork;
    const workDifference = Math.abs(workA - workB);

    // Convert to Calories for display (Metabolic Cost)
    const calA = lifterA.metrics.calories;
    const calB = lifterB.metrics.calories;
    const moreCalLifter = calA > calB ? lifterA : lifterB;
    const lessCalLifter = calA > calB ? lifterB : lifterA;
    const calDifference = Math.abs(calA - calB);

    const percentHarder = Math.abs(comparison.advantagePercentage).toFixed(1);

    // Catch-up math
    const workDeficit = workDifference;
    const lessWorkLifterData = moreWorkLifter === lifterA ? liftDataB : liftDataA;
    const lessWorkLifterMetrics = moreWorkLifter === lifterA ? lifterB.metrics : lifterA.metrics;
    const sensitivity = 9.81 * lessWorkLifterMetrics.displacement * lessWorkLifterData.reps;

    const addedRepsNeeded = workDeficit / lessWorkLifterMetrics.workPerRep;
    const addedLoadNeeded = workDeficit / sensitivity;

    return (
        <div className="w-full bg-slate-900/50 backdrop-blur-sm rounded-xl shadow-lg border border-slate-700 overflow-hidden mb-4 p-4">
            {/* Header: The Verdict */}
            <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-blue-400" />
                    <h3 className="text-base font-semibold text-white">
                        The Verdict
                    </h3 >
                </div >

                {onReplay && (
                    <button
                        onClick={onReplay}
                        className="flex items-center gap-2 px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded border border-blue-500/30 transition-all"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Replay
                    </button>
                )
                }
            </div >

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Section 1: Narrative & Catch-up */}
                <div className="lg:w-5/12 flex flex-col gap-4">
                    <div className="text-sm leading-relaxed text-slate-300 font-medium">
                        <p>
                            <span className={`font-bold ${moreCalLifter.name === lifterA.name ? "text-blue-400" : "text-orange-400"}`}>
                                {moreCalLifter.name}
                            </span> burned approx{" "}
                            <span className="font-bold text-white">{calDifference.toFixed(1)} kcal</span>{" "}
                            more energy{moreCalLifter === disadvantagedLifter ? (
                                <span>
                                    , and each lift had an approx{" "}
                                    <span className="font-bold text-red-400">{percentHarder}%</span>{" "}
                                    leverage disadvantage.
                                </span>
                            ) : (
                                <span>.</span>
                            )}
                        </p>
                    </div>

                    {/* Static Energy & Work Breakdown */}
                    <div className="border border-slate-800 rounded bg-slate-950/30 px-3 py-3 text-xs space-y-2">
                        <div className="flex justify-between items-end mb-2">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Output Breakdown</p>
                            <div className="flex gap-4 text-[10px] text-slate-500 font-bold tracking-wider">
                                <span className="w-16 text-right">ENERGY</span>
                                <span className="w-12 text-right">WORK</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center border-b border-slate-800/50 pb-1">
                            <span className={lifterA.name === moreCalLifter.name ? "text-blue-400 font-medium" : "text-orange-400 font-medium"}>
                                {moreCalLifter.name}
                            </span>
                            <div className="flex gap-4">
                                <span className="font-mono text-slate-300 font-bold w-16 text-right">{moreCalLifter.metrics.calories.toFixed(1)} <span className="text-[10px] font-normal text-slate-500">kcal</span></span>
                                <span className="font-mono text-slate-400 w-12 text-right">{moreCalLifter.metrics.totalWork.toFixed(0)} <span className="text-[10px] font-normal text-slate-600">J</span></span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                            <span className={lifterA.name === lessCalLifter.name ? "text-blue-400 font-medium" : "text-orange-400 font-medium"}>
                                {lessCalLifter.name}
                            </span>
                            <div className="flex gap-4">
                                <span className="font-mono text-slate-300 font-bold w-16 text-right">{lessCalLifter.metrics.calories.toFixed(1)} <span className="text-[10px] font-normal text-slate-500">kcal</span></span>
                                <span className="font-mono text-slate-400 w-12 text-right">{lessCalLifter.metrics.totalWork.toFixed(0)} <span className="text-[10px] font-normal text-slate-600">J</span></span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto">
                        <p className="text-[10px] text-slate-400 mb-2 font-medium leading-relaxed">
                            To match the same output of <span className={`${moreWorkLifter === lifterA ? "text-blue-400" : "text-orange-400"} font-bold`}>{moreWorkLifter.name}</span>, <span className={`${lessWorkLifter === lifterA ? "text-blue-400" : "text-orange-400"} font-bold`}>{lessWorkLifter.name}</span> would either have to add the following number of reps OR add the following amount of weight to their lift:
                        </p>
                        <div className="flex gap-3">
                            <div className="bg-slate-800/40 border border-slate-700/50 rounded px-3 py-2 flex-1 flex flex-col items-center group relative cursor-help">
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-950 border border-slate-700 rounded shadow-xl text-[10px] leading-snug text-slate-300 z-50 invisible group-hover:visible pointer-events-none text-center">
                                    The number of additional repetitions required to match the total work output.
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-slate-700" />
                                </div>
                                <span className="text-[10px] text-slate-400 border-b border-dotted border-slate-600 pb-0.5 mb-0.5">Add Reps</span>
                                <span className={`font-bold text-lg ${lessWorkLifter === lifterA ? "text-blue-200" : "text-orange-200"}`}>+{Math.ceil(addedRepsNeeded)}</span>
                            </div>
                            <div className="bg-slate-800/40 border border-slate-700/50 rounded px-3 py-2 flex-1 flex flex-col items-center group relative cursor-help">
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-950 border border-slate-700 rounded shadow-xl text-[10px] leading-snug text-slate-300 z-50 invisible group-hover:visible pointer-events-none text-center">
                                    The amount of additional weight to add to the bar for *every* rep to match the total work output.
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-slate-700" />
                                </div>
                                <span className="text-[10px] text-slate-400 border-b border-dotted border-slate-600 pb-0.5 mb-0.5">Add Load</span>
                                <span className={`font-bold text-lg ${lessWorkLifter === lifterA ? "text-blue-200" : "text-orange-200"}`}>+{addedLoadNeeded.toFixed(1)} <span className="text-xs font-normal opacity-70">kg</span></span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 2: Dense Stats Grid */}
                <div className="lg:w-7/12">
                    <div className="overflow-hidden rounded border border-slate-800 bg-slate-900/20">
                        <div className="grid grid-cols-[3fr_1fr_1fr] text-[10px] uppercase font-bold tracking-wider text-slate-500 border-b border-slate-800 bg-slate-900/80">
                            <div className="py-2 pl-3">Metric</div>
                            <div className="py-2 text-center text-blue-400">{lifterA.name}</div>
                            <div className="py-2 text-center text-orange-400">{lifterB.name}</div>
                        </div>

                        <div className="divide-y divide-slate-800/50">
                            <MetricRow
                                icon={<Ruler className="w-3 h-3 text-slate-500" />}
                                label="Range of Motion (Per Rep)"
                                valA={<span>{(lifterA.metrics.displacement * 100 * 2).toFixed(1)} <span className="text-slate-600">cm</span></span>}
                                valB={<span>{(lifterB.metrics.displacement * 100 * 2).toFixed(1)} <span className="text-slate-600">cm</span></span>}
                                tooltip={METRIC_DEFINITIONS.rom}
                            />
                            <MetricRow
                                icon={<Activity className="w-3 h-3 text-slate-500" />}
                                label="Total Range of Motion (All Reps)"
                                valA={<span>{(lifterA.metrics.displacement * liftDataA.reps * 2).toFixed(2)} <span className="text-slate-600">m</span></span>}
                                valB={<span>{(lifterB.metrics.displacement * liftDataB.reps * 2).toFixed(2)} <span className="text-slate-600">m</span></span>}
                                tooltip={METRIC_DEFINITIONS.totalRom}
                            />
                            <MetricRow
                                icon={<Dumbbell className="w-3 h-3 text-slate-500" />}
                                label="Effective Mass"
                                valA={<span>{lifterA.metrics.effectiveMass.toFixed(1)} <span className="text-slate-600">kg</span></span>}
                                valB={<span>{lifterB.metrics.effectiveMass.toFixed(1)} <span className="text-slate-600">kg</span></span>}
                                tooltip={METRIC_DEFINITIONS.effectiveMass}
                            />
                            <MetricRow
                                icon={<Zap className="w-3 h-3 text-slate-500" />}
                                label="Work Per Rep"
                                valA={<span>{lifterA.metrics.workPerRep.toFixed(0)} <span className="text-slate-600">J</span></span>}
                                valB={<span>{lifterB.metrics.workPerRep.toFixed(0)} <span className="text-slate-600">J</span></span>}
                                tooltip={METRIC_DEFINITIONS.workPerRep}
                            />
                            <MetricRow
                                icon={<Zap className="w-3 h-3 text-slate-500" />}
                                label="Peak Power Output"
                                valA={<span>{(lifterA.metrics.peakPower ?? 0).toFixed(0)} <span className="text-slate-600">W</span></span>}
                                valB={<span>{(lifterB.metrics.peakPower ?? 0).toFixed(0)} <span className="text-slate-600">W</span></span>}
                                tooltip={METRIC_DEFINITIONS.peakPower}
                            />
                            <MetricRow
                                icon={<Zap className="w-3 h-3 text-slate-500" />}
                                label="Average Power Output"
                                valA={<span>{avgPowerA.toFixed(0)} <span className="text-slate-600">W</span></span>}
                                valB={<span>{avgPowerB.toFixed(0)} <span className="text-slate-600">W</span></span>}
                                tooltip={METRIC_DEFINITIONS.avgPower}
                            />
                            <MetricRow
                                icon={<Flame className="w-3 h-3 text-slate-500" />}
                                label="Mean Burn Rate"
                                valA={<span>{(lifterA.metrics.burnRate ?? 0).toFixed(0)} <span className="text-slate-600">kcal/h</span></span>}
                                valB={<span>{(lifterB.metrics.burnRate ?? 0).toFixed(0)} <span className="text-slate-600">kcal/h</span></span>}
                                tooltip={METRIC_DEFINITIONS.burnRate}
                            />
                            <MetricRow
                                icon={<Activity className="w-3 h-3 text-slate-500" />}
                                label="Leverage Score"
                                valA={<span>{lifterA.metrics.demandFactor.toFixed(2)}</span>}
                                valB={<span>{lifterB.metrics.demandFactor.toFixed(2)}</span>}
                                tooltip={METRIC_DEFINITIONS.leverageScore}
                            />
                            <MetricRow
                                icon={<Activity className="w-3 h-3 text-slate-500" />}
                                label="Pound-for-Pound Score"
                                valA={<span>{lifterA.metrics.scoreP4P.toFixed(2)}</span>}
                                valB={<span>{lifterB.metrics.scoreP4P.toFixed(2)}</span>}
                                tooltip={METRIC_DEFINITIONS.p4pScore}
                            />
                            <div className="grid grid-cols-[3fr_1fr_1fr] bg-slate-800/30 group relative">
                                <div className="py-2 pl-3 flex items-center gap-2">
                                    <div className="relative group/icon cursor-help">
                                        <HelpCircle className="w-3 h-3 text-slate-500 opacity-50 group-hover:opacity-100" />
                                        <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-slate-950 border border-slate-700 rounded shadow-xl text-[10px] text-slate-300 z-50 invisible group-hover/icon:visible pointer-events-none">
                                            {METRIC_DEFINITIONS.leverageDisadvantage}
                                        </div>
                                    </div>
                                    <span className="text-xs font-semibold text-slate-300">Leverage Disadvantage</span>
                                </div>
                                <div className="py-2 text-center text-xs font-bold text-white flex items-center justify-center">
                                    {isADisadvantaged ? <span className="text-red-400">-{percentHarder}%</span> : <span className="text-slate-700">--</span>}
                                </div>
                                <div className="py-2 text-center text-xs font-bold text-white flex items-center justify-center">
                                    {!isADisadvantaged ? <span className="text-red-400">-{percentHarder}%</span> : <span className="text-slate-700">--</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}

function MetricRow({ icon, label, valA, valB, tooltip }: {
    icon: React.ReactNode,
    label: string,
    valA: React.ReactNode,
    valB: React.ReactNode,
    tooltip: string
}) {
    return (
        <div className="grid grid-cols-[3fr_1fr_1fr] hover:bg-slate-800/40 transition-colors group">
            <div className="py-1.5 pl-3 flex items-center gap-2">
                <div className="relative group/tooltip">
                    <div className="cursor-help opacity-70 hover:opacity-100 transition-opacity">
                        {icon}
                    </div>
                    {/* Tooltip Popup */}
                    <div className="absolute left-0 bottom-full mb-2 w-56 p-2 bg-slate-950 border border-slate-700 rounded shadow-xl text-[10px] leading-snug text-slate-300 z-50 invisible group-hover/tooltip:visible pointer-events-none">
                        {tooltip}
                        {/* Little arrow attempt */}
                        <div className="absolute top-full left-2 -mt-[1px] border-4 border-transparent border-t-slate-700" />
                    </div>
                </div>
                <span className="text-xs font-medium text-slate-300 cursor-default" title={tooltip}>
                    {label}
                </span>
            </div>
            <div className="py-1.5 text-center text-xs font-mono text-slate-200 flex items-center justify-center">
                {valA}
            </div>
            <div className="py-1.5 text-center text-xs font-mono text-slate-200 flex items-center justify-center">
                {valB}
            </div>
        </div>
    )
}
