"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { ComparisonResult } from "@/types";

interface ResultsDisplayProps {
  result: ComparisonResult;
}

export function ResultsDisplay({ result }: ResultsDisplayProps) {
  const { lifterA, lifterB, comparison } = result;
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Calculate bar widths (normalized to the larger value)
  const maxWork = Math.max(
    lifterA.metrics.workPerRep,
    lifterB.metrics?.workPerRep || 0
  );
  const widthA = (lifterA.metrics.workPerRep / maxWork) * 100;
  const widthB = ((lifterB.metrics?.workPerRep || 0) / maxWork) * 100;

  // Color coding for advantage
  const advantageColor =
    comparison.advantageDirection === "advantage_A"
      ? "text-blue-600"
      : comparison.advantageDirection === "advantage_B"
        ? "text-orange-600"
        : "text-gray-600";

  return (
    <div className="space-y-6">
      {/* Work Comparison */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Work Per Rep Comparison
        </h3>

        <div className="space-y-4">
          {/* Lifter A Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                {lifterA.name}
              </span>
              <span className="text-sm text-gray-600">
                {lifterA.metrics.workPerRep.toFixed(0)} J
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-6">
              <div
                className="bg-blue-500 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${widthA}%` }}
              >
                <span className="text-xs font-medium text-white">
                  {widthA.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Lifter B Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                {lifterB.name}
              </span>
              <span className="text-sm text-gray-600">
                {lifterB.metrics?.workPerRep.toFixed(0)} J
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-6">
              <div
                className="bg-orange-500 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${widthB}%` }}
              >
                <span className="text-xs font-medium text-white">
                  {widthB.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* P4P Scores */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Pound-for-Pound Scores
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">{lifterA.name}</div>
            <div className="text-2xl font-bold text-blue-600">
              {lifterA.metrics.scoreP4P.toFixed(1)}
            </div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">{lifterB.name}</div>
            <div className="text-2xl font-bold text-orange-600">
              {lifterB.metrics?.scoreP4P.toFixed(1)}
            </div>
          </div>
        </div>
      </div>

      {/* Equivalent Performance - Enhanced */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Equivalent Performance
        </h3>

        <div className="space-y-4">
          {/* Single Rep Comparison */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Single Rep Work</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">{lifterA.name}</div>
                <div className="text-lg font-bold text-blue-600">
                  {lifterA.metrics.workPerRep.toFixed(0)} J
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {(lifterA.metrics.scoreP4P / (lifterA.metrics.totalWork / lifterA.metrics.workPerRep)).toFixed(1)} P4P/rep
                </div>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">{lifterB.name}</div>
                <div className="text-lg font-bold text-orange-600">
                  {lifterB.metrics?.workPerRep.toFixed(0) || "—"} J
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {lifterB.metrics ? (lifterB.metrics.scoreP4P / (lifterB.metrics.totalWork / lifterB.metrics.workPerRep)).toFixed(1) : "—"} P4P/rep
                </div>
              </div>
            </div>
          </div>

          {/* Total Volume Comparison */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Total Volume</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">{lifterA.name}</div>
                <div className="text-lg font-bold text-blue-600">
                  {lifterA.metrics.totalWork.toFixed(0)} J
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {(lifterA.metrics.totalWork / lifterA.metrics.workPerRep).toFixed(0)} reps
                </div>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">{lifterB.name}</div>
                <div className="text-lg font-bold text-orange-600">
                  {lifterB.metrics?.totalWork.toFixed(0) || "—"} J
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {lifterB.metrics ? (lifterB.metrics.totalWork / lifterB.metrics.workPerRep).toFixed(0) : "—"} reps
                </div>
              </div>
            </div>
            {lifterB.metrics && (
              <div className="mt-2 text-center text-sm text-gray-600">
                {lifterA.metrics.totalWork > lifterB.metrics.totalWork
                  ? `${lifterA.name} performed ${((lifterA.metrics.totalWork / lifterB.metrics.totalWork - 1) * 100).toFixed(1)}% more work`
                  : `${lifterB.name} performed ${((lifterB.metrics.totalWork / lifterA.metrics.totalWork - 1) * 100).toFixed(1)}% more work`
                }
              </div>
            )}
          </div>

          {/* Equivalent Load Options */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">To Match {lifterA.name}'s Performance:</h4>

            <div className="space-y-2">
              {/* Option 1: Same reps, different load */}
              <div className="p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    <span className="font-semibold">{lifterB.name}</span> would need:
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-orange-700">
                      {lifterB.equivalentLoad.toFixed(1)} kg
                    </div>
                    <div className="text-xs text-gray-600">
                      for {(lifterA.metrics.totalWork / lifterA.metrics.workPerRep).toFixed(0)} reps
                    </div>
                  </div>
                </div>
              </div>

              {/* Option 2: Same load, different reps */}
              <div className="p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Or <span className="font-semibold">{lifterB.name}</span> would need:
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-orange-700">
                      {lifterB.equivalentReps} reps
                    </div>
                    <div className="text-xs text-gray-600">
                      at the same load
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fun Data Nerd Stats */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">📊 Deep Dive Metrics</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {/* ROM Comparison */}
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">ROM Difference</div>
                <div className="font-semibold text-gray-900">
                  {Math.abs((comparison.displacementRatio - 1) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {comparison.displacementRatio > 1 ? lifterB.name : lifterA.name} moves further
                </div>
              </div>

              {/* Effective Mass */}
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Effective Mass</div>
                <div className="font-semibold text-blue-600">
                  {lifterA.metrics.effectiveMass.toFixed(1)} kg
                </div>
                <div className="font-semibold text-orange-600 mt-1">
                  {lifterB.metrics?.effectiveMass.toFixed(1) || "—"} kg
                </div>
              </div>

              {/* Energy per kg moved */}
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Efficiency</div>
                <div className="font-semibold text-gray-900">
                  {(lifterA.metrics.workPerRep / lifterA.metrics.effectiveMass).toFixed(1)} J/kg
                </div>
                <div className="text-xs text-gray-500 mt-1">per rep</div>
              </div>

              {/* Peak Power Estimate */}
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Displacement</div>
                <div className="font-semibold text-blue-600">
                  {(lifterA.metrics.displacement * 100).toFixed(1)} cm
                </div>
                <div className="font-semibold text-orange-600 mt-1">
                  {lifterB.metrics ? (lifterB.metrics.displacement * 100).toFixed(1) : "—"} cm
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advantage Summary */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Mechanical Advantage
        </h3>
        <div className="text-center">
          {comparison.advantageDirection === "neutral" ? (
            <div className="text-gray-600">
              <div className="text-3xl font-bold mb-2">≈ 0%</div>
              <div className="text-sm">Similar mechanical demands</div>
            </div>
          ) : (
            <div className={advantageColor}>
              <div className="text-3xl font-bold mb-2">
                {Math.abs(comparison.advantagePercentage).toFixed(1)}%
              </div>
              <div className="text-sm">
                {comparison.advantageDirection === "advantage_A"
                  ? `${lifterA.name} has mechanical advantage`
                  : `${lifterB.name} has mechanical advantage`}
              </div>
            </div>
          )}
        </div>

        {/* Additional Metrics with Tooltips */}
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
          <div className="relative">
            <div className="flex items-center gap-1 text-gray-600">
              Displacement Ratio
              <button
                type="button"
                onClick={() => setActiveTooltip(activeTooltip === "displacement" ? null : "displacement")}
                className="text-blue-500 hover:text-blue-600 transition-colors"
                aria-label="What does displacement ratio mean?"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="font-semibold">
              {comparison.displacementRatio.toFixed(3)}×
            </div>
            {activeTooltip === "displacement" && (
              <div className="absolute z-10 left-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                <div className="font-semibold mb-1">Displacement Ratio = Range of Motion (ROM)</div>
                <p className="mb-2">
                  This shows how much further one lifter moves the bar compared to the other.
                </p>
                <p className="mb-2">
                  <strong>{comparison.displacementRatio > 1 ? lifterB.name : lifterA.name}</strong> has {Math.abs((comparison.displacementRatio - 1) * 100).toFixed(1)}% {comparison.displacementRatio > 1 ? "greater" : "less"} ROM
                  {comparison.displacementRatio > 1
                    ? `, meaning they squat ${((lifterB.metrics?.displacement || 0) * 100 - (lifterA.metrics.displacement * 100)).toFixed(1)}cm deeper.`
                    : `, meaning they have a shorter range of motion.`
                  }
                </p>
                <p className="text-gray-300 italic">
                  More ROM = More work per rep (all else equal)
                </p>
              </div>
            )}
          </div>
          <div className="relative">
            <div className="flex items-center gap-1 text-gray-600">
              Demand Ratio
              <button
                type="button"
                onClick={() => setActiveTooltip(activeTooltip === "demand" ? null : "demand")}
                className="text-blue-500 hover:text-blue-600 transition-colors"
                aria-label="What does demand ratio mean?"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="font-semibold">
              {comparison.demandRatio.toFixed(3)}×
            </div>
            {activeTooltip === "demand" && (
              <div className="absolute z-10 right-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                <div className="font-semibold mb-1">Demand Ratio = Biomechanical Difficulty</div>
                <p className="mb-2">
                  This combines ROM with leverage factors (moment arms) to show overall difficulty.
                </p>
                <p className="mb-2">
                  <strong>{comparison.demandRatio > 1 ? lifterB.name : lifterA.name}</strong> faces {Math.abs((comparison.demandRatio - 1) * 100).toFixed(1)}% {comparison.demandRatio > 1 ? "greater" : "less"} biomechanical demand.
                </p>
                <p className="text-gray-300 italic">
                  Higher demand = Need more strength to move the same weight
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTooltip(null)}
                  className="mt-2 text-blue-400 hover:text-blue-300 text-xs underline"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
