"use client";

import { useState, useEffect } from "react";
import { HelpCircle } from "lucide-react";
import { ComparisonResult, LiftFamily } from "@/types";
import { AnimatedMovementComparison } from "./AnimatedMovementComparison";

interface ResultsDisplayProps {
  result: ComparisonResult;
  showEquivalentPerformance?: boolean;
  liftFamily?: LiftFamily;
  variant?: string;
}

export function ResultsDisplay({ result, showEquivalentPerformance = true, liftFamily, variant }: ResultsDisplayProps) {
  const { lifterA, lifterB, comparison } = result;
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Calculate number of reps from the metrics
  const reps = lifterA.metrics.totalWork / lifterA.metrics.workPerRep;

  // Time input for power calculations (default: 2.5 seconds per rep)
  const [timeInput, setTimeInput] = useState<string>((reps * 2.5).toFixed(1));
  const [time, setTime] = useState(reps * 2.5);

  // Update time when reps change
  useEffect(() => {
    const defaultTime = reps * 2.5;
    setTimeInput(defaultTime.toFixed(1));
    setTime(defaultTime);
  }, [reps]);

  const handleTimeChange = (value: string) => {
    setTimeInput(value);
  };

  const handleTimeBlur = () => {
    const num = parseFloat(timeInput);
    if (isNaN(num) || num <= 0) {
      const defaultTime = reps * 2.5;
      setTimeInput(defaultTime.toFixed(1));
      setTime(defaultTime);
      return;
    }
    setTime(num);
  };

  // Power calculations (Watts = Joules / seconds)
  const powerA = lifterA.metrics.totalWork / time;
  const powerB = lifterB.metrics ? lifterB.metrics.totalWork / time : 0;
  const powerDifferencePercent = powerB > 0 ? ((powerB - powerA) / powerA) * 100 : 0;
  const powerDifferenceAbsolute = powerB - powerA;
  const powerRatio = powerB > 0 ? powerB / powerA : 0;

  // Metabolic cost calculations (non-linear with velocity)
  // Based on: Mechanical efficiency decreases exponentially with velocity
  // Reference: Gaesser & Brooks (1975), efficiency ~25% at moderate velocities
  const timePerRep = time / reps;
  const velocityA = lifterA.metrics.displacement / timePerRep; // m/s
  const velocityB = lifterB.metrics ? lifterB.metrics.displacement / timePerRep : 0;

  // Velocity-dependent efficiency: η(v) = 0.25 × e^(-α×v²)
  // Higher velocities = exponentially lower efficiency = higher metabolic cost
  const alpha = 0.5; // Scaling factor for velocity effect
  const efficiencyA = 0.25 * Math.exp(-alpha * Math.pow(velocityA, 2));
  const efficiencyB = velocityB > 0 ? 0.25 * Math.exp(-alpha * Math.pow(velocityB, 2)) : 0;

  // Metabolic energy (Joules) = Mechanical work / Efficiency
  const metabolicEnergyA = lifterA.metrics.totalWork / efficiencyA;
  const metabolicEnergyB = lifterB.metrics ? lifterB.metrics.totalWork / efficiencyB : 0;

  // Convert to kcal (1 kcal = 4184 J)
  const metabolicCostA_kcal = metabolicEnergyA / 4184;
  const metabolicCostB_kcal = metabolicEnergyB / 4184;

  // Acceleration effect (overcoming inertia adds metabolic cost)
  // Acceleration = 2 × displacement / time² (assuming constant acceleration model)
  const accelerationA = (2 * lifterA.metrics.displacement) / Math.pow(timePerRep, 2);
  const accelerationB = lifterB.metrics ? (2 * lifterB.metrics.displacement) / Math.pow(timePerRep, 2) : 0;

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
      {/* Animated Movement Comparison */}
      {liftFamily && variant && lifterA.kinematics && lifterB.kinematics && (
        <AnimatedMovementComparison
          lifterA={lifterA}
          lifterB={lifterB}
          liftFamily={liftFamily}
          variant={variant}
        />
      )}

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
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Pound-for-Pound Scores
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Total work output scaled allometrically by body mass (mass^0.67). The 2/3 power law accounts for the fact that muscle strength scales with cross-sectional area (mass^0.67), not linearly with body weight, enabling fair comparisons across different body sizes.
        </p>
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

      {/* Consolidated Performance Metrics */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Performance Metrics
        </h3>

        <div className="space-y-6">
          {/* Work & Power Output */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">Work & Power Output</h4>
              {/* Time Input */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">
                  Time for {reps.toFixed(0)} reps:
                </label>
                <input
                  type="number"
                  value={timeInput}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  onBlur={handleTimeBlur}
                  onKeyDown={(e) => e.key === "Enter" && handleTimeBlur()}
                  onFocus={(e) => e.target.select()}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-xs text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0.01"
                  step="0.01"
                />
                <span className="text-xs text-gray-500">s (avg: {(reps * 2.5).toFixed(1)}s)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Lifter A Work & Power */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="text-xs text-gray-600 mb-2 font-semibold">{lifterA.name}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-600">Work/Rep</div>
                    <div className="text-lg font-bold text-blue-600">{lifterA.metrics.workPerRep.toFixed(0)} J</div>
                    <div className="text-xs text-gray-500 mt-0.5">{(lifterA.metrics.scoreP4P / (lifterA.metrics.totalWork / lifterA.metrics.workPerRep)).toFixed(1)} P4P/rep</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Power/Rep</div>
                    <div className="text-lg font-bold text-blue-600">{(powerA / reps).toFixed(0)} W</div>
                    <div className="text-xs text-gray-500 mt-0.5">&nbsp;</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs text-gray-600">Total Work</div>
                      <div className="text-xl font-bold text-blue-600">{lifterA.metrics.totalWork.toFixed(0)} J</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-600">Total Power</div>
                      <div className="text-xl font-bold text-blue-600">{powerA.toFixed(0)} W</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{reps.toFixed(0)} reps in {time.toFixed(1)}s</div>
                </div>
              </div>

              {/* Lifter B Work & Power */}
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                <div className="text-xs text-gray-600 mb-2 font-semibold">{lifterB.name}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-600">Work/Rep</div>
                    <div className="text-lg font-bold text-orange-600">{lifterB.metrics?.workPerRep.toFixed(0) || "—"} J</div>
                    <div className="text-xs text-gray-500 mt-0.5">{lifterB.metrics ? (lifterB.metrics.scoreP4P / (lifterB.metrics.totalWork / lifterB.metrics.workPerRep)).toFixed(1) : "—"} P4P/rep</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Power/Rep</div>
                    <div className="text-lg font-bold text-orange-600">{lifterB.metrics ? (powerB / reps).toFixed(0) : "—"} W</div>
                    <div className="text-xs text-gray-500 mt-0.5">&nbsp;</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-orange-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs text-gray-600">Total Work</div>
                      <div className="text-xl font-bold text-orange-600">{lifterB.metrics?.totalWork.toFixed(0) || "—"} J</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-600">Total Power</div>
                      <div className="text-xl font-bold text-orange-600">{lifterB.metrics ? `${powerB.toFixed(0)} W` : "—"}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{lifterB.metrics ? `${reps.toFixed(0)} reps in ${time.toFixed(1)}s` : "—"}</div>
                </div>
              </div>
            </div>

            {/* Comparison Summary */}
            {lifterB.metrics && (
              <div className="mt-3 p-3 bg-gray-50 rounded text-center space-y-1 text-xs text-gray-600">
                <div>
                  {lifterA.metrics.totalWork > lifterB.metrics.totalWork
                    ? `${lifterA.name} performed ${((lifterA.metrics.totalWork / lifterB.metrics.totalWork - 1) * 100).toFixed(1)}% more work`
                    : `${lifterB.name} performed ${((lifterB.metrics.totalWork / lifterA.metrics.totalWork - 1) * 100).toFixed(1)}% more work`
                  }
                </div>
                <div className="font-medium">
                  {powerDifferencePercent > 0
                    ? `${lifterB.name} produced ${powerDifferencePercent.toFixed(1)}% more power (${powerDifferenceAbsolute.toFixed(0)}W)`
                    : `${lifterA.name} produced ${Math.abs(powerDifferencePercent).toFixed(1)}% more power (${Math.abs(powerDifferenceAbsolute).toFixed(0)}W)`
                  }
                </div>
              </div>
            )}
          </div>

          {/* Metabolic Energy Cost */}
          {lifterB.metrics && (
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">⚡ Metabolic Energy Cost</h4>
              <p className="text-xs text-gray-600 mb-3">
                Metabolic cost accounts for the non-linear energy demands of velocity and acceleration. Higher velocities result in exponentially lower mechanical efficiency.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {/* Lifter A Metabolic */}
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                  <div className="text-xs font-semibold text-gray-700 mb-2">{lifterA.name}</div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-gray-600">Rep Velocity</div>
                      <div className="text-lg font-bold text-purple-700">{velocityA.toFixed(2)} m/s</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-gray-600">Efficiency</div>
                        <div className="font-semibold text-gray-900">{(efficiencyA * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Accel</div>
                        <div className="font-semibold text-gray-900">{accelerationA.toFixed(2)} m/s²</div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-purple-300">
                      <div className="text-xs text-gray-600">Total Energy</div>
                      <div className="text-xl font-bold text-purple-700">{metabolicCostA_kcal.toFixed(2)} kcal</div>
                      <div className="text-xs text-gray-500">({metabolicEnergyA.toFixed(0)} J)</div>
                    </div>
                  </div>
                </div>

                {/* Lifter B Metabolic */}
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg border border-indigo-200">
                  <div className="text-xs font-semibold text-gray-700 mb-2">{lifterB.name}</div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-gray-600">Rep Velocity</div>
                      <div className="text-lg font-bold text-indigo-700">{velocityB.toFixed(2)} m/s</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-gray-600">Efficiency</div>
                        <div className="font-semibold text-gray-900">{(efficiencyB * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Accel</div>
                        <div className="font-semibold text-gray-900">{accelerationB.toFixed(2)} m/s²</div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-indigo-300">
                      <div className="text-xs text-gray-600">Total Energy</div>
                      <div className="text-xl font-bold text-indigo-700">{metabolicCostB_kcal.toFixed(2)} kcal</div>
                      <div className="text-xs text-gray-500">({metabolicEnergyB.toFixed(0)} J)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metabolic Comparison */}
              <div className="mt-3 p-3 bg-gray-50 rounded text-center text-xs text-gray-700">
                {metabolicCostA_kcal > metabolicCostB_kcal ? (
                  <>
                    <span className="font-semibold text-purple-700">{lifterA.name}</span> expends{" "}
                    <span className="font-bold text-purple-700">
                      {((metabolicCostA_kcal / metabolicCostB_kcal - 1) * 100).toFixed(1)}% more
                    </span>{" "}
                    ({(metabolicCostA_kcal - metabolicCostB_kcal).toFixed(2)} kcal) due to{" "}
                    {velocityA > velocityB ? "higher velocity" : "biomechanical differences"}.
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-indigo-700">{lifterB.name}</span> expends{" "}
                    <span className="font-bold text-indigo-700">
                      {((metabolicCostB_kcal / metabolicCostA_kcal - 1) * 100).toFixed(1)}% more
                    </span>{" "}
                    ({(metabolicCostB_kcal - metabolicCostA_kcal).toFixed(2)} kcal) due to{" "}
                    {velocityB > velocityA ? "higher velocity" : "biomechanical differences"}.
                  </>
                )}
              </div>

              {/* Scientific Reference */}
              <div className="mt-2 text-xs text-gray-600 italic text-center">
                <strong>Model:</strong> η(v) = 0.25 × e^(-0.5v²). Efficiency decreases exponentially with velocity
                (Gaesser & Brooks, 1975; Hill's force-velocity relationship).
              </div>
            </div>
          )}
        </div>
      </div>

      {/* To Match Performance Narrative */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {showEquivalentPerformance && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-3">To Match {lifterA.name}'s Performance:</h4>

            <div className="space-y-2 p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
              <p className="text-xs text-gray-800 leading-relaxed">
                <span className="font-semibold text-orange-700">{lifterB.name}</span> would need to lift{" "}
                <span className="font-bold text-orange-700">{lifterB.equivalentLoad.toFixed(1)} kg</span>{" "}
                for the same {reps.toFixed(0)} reps to match the biomechanical demand.
              </p>

              <p className="text-xs text-gray-800 leading-relaxed">
                Alternatively, at the same {lifterA.metrics.effectiveMass.toFixed(0)} kg effective load,{" "}
                <span className="font-semibold text-orange-700">{lifterB.name}</span> would need to perform{" "}
                <span className="font-bold text-orange-700">{lifterB.equivalentReps.toFixed(1)} reps</span>{" "}
                (instead of {reps.toFixed(0)}) to match the total work output.
              </p>

              {lifterB.metrics && (
                <>
                  <p className="text-xs text-gray-800 leading-relaxed border-t border-orange-200 pt-2">
                    To complete the same {reps.toFixed(0)} reps in {time.toFixed(1)} seconds,{" "}
                    <span className="font-semibold text-orange-700">{lifterB.name}</span> would need to produce{" "}
                    {powerDifferencePercent > 0 ? (
                      <>
                        <span className="font-bold text-orange-700">{powerDifferencePercent.toFixed(1)}% less power</span>{" "}
                        ({powerB.toFixed(0)}W vs {powerA.toFixed(0)}W)
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-orange-700">{Math.abs(powerDifferencePercent).toFixed(1)}% more power</span>{" "}
                        ({powerB.toFixed(0)}W vs {powerA.toFixed(0)}W)
                      </>
                    )}{" "}
                    due to their biomechanical differences.
                  </p>

                  <p className="text-xs text-gray-600 italic">
                    Power ratio: {powerRatio.toFixed(3)}× | {" "}
                    {powerRatio > 1
                      ? `${lifterB.name} needs ${((powerRatio - 1) * 100).toFixed(1)}% more power output`
                      : `${lifterB.name} needs ${((1 - powerRatio) * 100).toFixed(1)}% less power output`
                    }
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Fun Data Nerd Stats */}
      <div className="bg-white rounded-lg shadow-sm p-6">
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
            <div className="font-semibold text-gray-900">
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
            <div className="font-semibold text-gray-900">
              {comparison.demandRatio.toFixed(3)}×
            </div>
            {activeTooltip === "demand" && (
              <div className="absolute z-10 left-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Capacity-Adjusted Comparison (Research-Based) */}
      {result.capacityAdjusted && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg shadow-sm p-6 border-2 border-purple-200">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-purple-900">
              Research-Adjusted Comparison
            </h3>
            <span className="px-2 py-1 bg-purple-200 text-purple-800 text-xs font-semibold rounded">
              EXPERIMENTAL
            </span>
          </div>

          <p className="text-sm text-gray-700 mb-4">
            {result.capacityAdjusted.explanation}
          </p>

          <div className="bg-white rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">Load Capacity Factors</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600">{lifterA.name}</div>
                <div className="font-semibold text-blue-700">
                  {result.capacityAdjusted.lifterACapacityFactor.toFixed(3)}× capacity
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {result.capacityAdjusted.adjustedLoadA.toFixed(1)}kg difficulty equivalent
                </div>
              </div>
              <div>
                <div className="text-gray-600">{lifterB.name}</div>
                <div className="font-semibold text-orange-700">
                  {result.capacityAdjusted.lifterBCapacityFactor.toFixed(3)}× capacity
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {result.capacityAdjusted.adjustedLoadB.toFixed(1)}kg difficulty equivalent
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Adjusted Advantage</h4>
            <div className="flex items-baseline gap-3 mb-2">
              <div className="text-3xl font-bold text-purple-900">
                {result.capacityAdjusted.adjustedAdvantagePercentage >= 0 ? "+" : ""}
                {result.capacityAdjusted.adjustedAdvantagePercentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">
                (Pure physics: {comparison.advantagePercentage >= 0 ? "+" : ""}
                {comparison.advantagePercentage.toFixed(1)}%)
              </div>
            </div>
            <div className="text-sm">
              {result.capacityAdjusted.adjustedAdvantageDirection === "neutral" && (
                <div className="text-gray-700 p-2 bg-gray-100 rounded">
                  After capacity adjustment: Nearly identical difficulty
                </div>
              )}
              {result.capacityAdjusted.adjustedAdvantageDirection === "advantage_A" && (
                <div className="text-blue-700 p-2 bg-blue-100 rounded font-medium">
                  After capacity adjustment: {lifterA.name} performed a relatively harder lift
                </div>
              )}
              {result.capacityAdjusted.adjustedAdvantageDirection === "advantage_B" && (
                <div className="text-orange-700 p-2 bg-orange-100 rounded font-medium">
                  After capacity adjustment: {lifterB.name} performed a relatively harder lift
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 p-3 bg-purple-100 rounded-lg">
            <div className="text-xs text-purple-900">
              <div className="font-semibold mb-1">About this adjustment:</div>
              <p>
                This comparison accounts for research showing that different squat variants
                have different load capacities due to muscle recruitment patterns. Low bar squats
                allow ~7.5% more load due to reduced knee moment arm and stronger hip extensor
                recruitment. The adjustment "levels the playing field" by normalizing for these
                physiological differences.
              </p>
              <div className="mt-2 font-semibold">Pure Physics vs. Capacity-Adjusted:</div>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>
                  <strong>Pure physics</strong> (above): Compares actual biomechanical demands at parallel depth
                </li>
                <li>
                  <strong>Capacity-adjusted</strong> (this section): Accounts for variant-specific load capacity differences
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
