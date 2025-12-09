"use client";

import { ComparisonResult } from "@/types";

interface ResultsDisplayProps {
  result: ComparisonResult;
}

export function ResultsDisplay({ result }: ResultsDisplayProps) {
  const { lifterA, lifterB, comparison } = result;

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

      {/* Equivalent Load */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Equivalent Performance
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">
              {lifterA.name}'s lift is equivalent to:
            </span>
            <span className="text-lg font-bold text-gray-900">
              {lifterB.equivalentLoad.toFixed(1)} kg × {lifterB.equivalentReps} reps
            </span>
          </div>
          <div className="text-center text-sm text-gray-600">
            for {lifterB.name}
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

        {/* Additional Metrics */}
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-600">Displacement Ratio</div>
            <div className="font-semibold">
              {comparison.displacementRatio.toFixed(3)}×
            </div>
          </div>
          <div>
            <div className="text-gray-600">Demand Ratio</div>
            <div className="font-semibold">
              {comparison.demandRatio.toFixed(3)}×
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
