"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { LiftFamily, Sex, ComparisonResult } from "@/types";
import { BuildInput, ArmProportion, TorsoLegProportion, ARM_PROPORTION_TO_SD, TORSO_LEG_TO_SD } from "@/components/anthropometry/BuildInput";
import { LiftSelector } from "@/components/comparison/LiftSelector";
import { ResultsDisplay } from "@/components/comparison/ResultsDisplay";
import { ExplanationCards } from "@/components/comparison/ExplanationCards";
import { UnifiedMovementAnimation } from "@/components/visualization/UnifiedMovementAnimation";
import { ComparisonModeSelector } from "@/components/comparison/ComparisonModeSelector";
import { ResultsSkeleton, StickFigureSkeleton } from "@/components/ui/Skeleton";
import { showToast, ToastContainer } from "@/components/ui/Toast";
import { createProfileFromProportions } from "@/lib/biomechanics/anthropometry";
import { compareLifts } from "@/lib/biomechanics/comparison";
import { useLeverStore } from "@/store";
import {
  validateLifterInputs,
  validateLiftInputs,
  getErrorMessage,
} from "@/lib/validation";

export default function QuickComparePage() {
  // Store
  const { addComparison } = useLeverStore();

  // Lifter A state - average male: 175cm, 77kg
  const [lifterA, setLifterA] = useState({
    height: 1.75,
    weight: 77,
    sex: Sex.MALE,
    name: "Lifter A",
    torsoLegRatio: "average" as TorsoLegProportion,
    armLength: "average" as ArmProportion,
  });

  // Lifter B state - slightly taller male: 185cm, 88kg
  const [lifterB, setLifterB] = useState({
    height: 1.85,
    weight: 88,
    sex: Sex.MALE,
    name: "Lifter B",
    torsoLegRatio: "average" as TorsoLegProportion,
    armLength: "average" as ArmProportion,
  });

  // Lift state - now separate for each lifter
  const [liftDataA, setLiftDataA] = useState({
    liftFamily: LiftFamily.SQUAT,
    variant: "highBar",
    load: 100,
    reps: 5,
    stance: "normal",
    pushupWeight: 0,
  });

  const [liftDataB, setLiftDataB] = useState({
    liftFamily: LiftFamily.SQUAT,
    variant: "highBar",
    load: 100,
    reps: 5,
    stance: "normal",
    pushupWeight: 0,
  });

  // Results state
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Handler for centralized lift family change
  const handleLiftFamilyChange = (newFamily: LiftFamily) => {
    // Update both lifters with the new lift family and reset variants
    // Each lift family has its own default variant format
    const defaultVariant =
      newFamily === LiftFamily.SQUAT ? "highBar" :
      newFamily === LiftFamily.DEADLIFT ? "conventional" :
      newFamily === LiftFamily.BENCH ? "medium-moderate" :
      newFamily === LiftFamily.PULLUP ? "pronated" :
      newFamily === LiftFamily.PUSHUP ? "standard" :
      newFamily === LiftFamily.OHP ? "standard" :
      newFamily === LiftFamily.THRUSTER ? "standard" :
      "standard";

    setLiftDataA({
      ...liftDataA,
      liftFamily: newFamily,
      variant: defaultVariant,
      stance: "normal",
      pushupWeight: 0,
    });

    setLiftDataB({
      ...liftDataB,
      liftFamily: newFamily,
      variant: defaultVariant,
      stance: "normal",
      pushupWeight: 0,
    });
  };

  const handleLiftDataAChange = (data: {
    liftFamily: LiftFamily;
    variant: string;
    load: number;
    reps: number;
    stance?: string;
    pushupWeight?: number;
  }) => {
    setLiftDataA({
      ...data,
      stance: data.stance ?? "normal",
      pushupWeight: data.pushupWeight ?? 0,
    });
  };

  const handleLiftDataBChange = (data: {
    liftFamily: LiftFamily;
    variant: string;
    load: number;
    reps: number;
    stance?: string;
    pushupWeight?: number;
  }) => {
    setLiftDataB({
      ...data,
      stance: data.stance ?? "normal",
      pushupWeight: data.pushupWeight ?? 0,
    });
  };

  const handleCompare = () => {
    // Analytics: comparison started
    console.log("[Analytics] comparison_started", {
      liftFamily: liftDataA.liftFamily,
      heightA: lifterA.height,
      heightB: lifterB.height,
    });

    // Validate inputs
    const lifterAValidation = validateLifterInputs(
      lifterA.height,
      lifterA.weight,
      lifterA.sex
    );
    const lifterBValidation = validateLifterInputs(
      lifterB.height,
      lifterB.weight,
      lifterB.sex
    );
    const liftValidationA = validateLiftInputs(
      liftDataA.load,
      liftDataA.reps,
      liftDataA.liftFamily !== LiftFamily.PUSHUP
    );
    const liftValidationB = validateLiftInputs(
      liftDataB.load,
      liftDataB.reps,
      liftDataB.liftFamily !== LiftFamily.PUSHUP
    );

    const errors = [
      ...lifterAValidation.errors,
      ...lifterBValidation.errors,
      ...liftValidationA.errors,
      ...liftValidationB.errors,
    ];

    if (errors.length > 0) {
      setValidationErrors(errors.map((e) => e.message));
      showToast("error", getErrorMessage(errors));
      return;
    }

    setValidationErrors([]);
    setIsComparing(true);

    // Simulate async operation for smooth UX
    setTimeout(() => {
      try {
        // Create anthropometry profiles with segment proportions
        const anthroA = createProfileFromProportions(
          lifterA.height,
          lifterA.weight,
          lifterA.sex,
          TORSO_LEG_TO_SD[lifterA.torsoLegRatio].torso,
          ARM_PROPORTION_TO_SD[lifterA.armLength],
          TORSO_LEG_TO_SD[lifterA.torsoLegRatio].legs
        );
        const anthroB = createProfileFromProportions(
          lifterB.height,
          lifterB.weight,
          lifterB.sex,
          TORSO_LEG_TO_SD[lifterB.torsoLegRatio].torso,
          ARM_PROPORTION_TO_SD[lifterB.armLength],
          TORSO_LEG_TO_SD[lifterB.torsoLegRatio].legs
        );

        // Compare lifts with individual performance for each lifter
        const comparisonResult = compareLifts(
          { anthropometry: anthroA, name: lifterA.name },
          { anthropometry: anthroB, name: lifterB.name },
          liftDataA.liftFamily, // Must be same for both
          liftDataA.variant,
          liftDataB.variant,
          { load: liftDataA.load, reps: liftDataA.reps },
          { load: liftDataB.load, reps: liftDataB.reps },
          liftDataA.stance,
          liftDataB.stance,
          liftDataA.pushupWeight,
          liftDataB.pushupWeight
        );

        // Check if kinematic solver failed
        if (
          liftDataA.liftFamily === LiftFamily.SQUAT &&
          comparisonResult.lifterA.kinematics &&
          !comparisonResult.lifterA.kinematics.valid
        ) {
          showToast(
            "error",
            "Kinematic solver failed for Lifter A. Results may be inaccurate. Try adjusting height or mobility settings.",
            7000
          );
        }

        if (
          liftDataA.liftFamily === LiftFamily.SQUAT &&
          comparisonResult.lifterB.kinematics &&
          !comparisonResult.lifterB.kinematics.valid
        ) {
          showToast(
            "error",
            "Kinematic solver failed for Lifter B. Results may be inaccurate. Try adjusting height or mobility settings.",
            7000
          );
        }

        setResult(comparisonResult);
        addComparison(comparisonResult);
        showToast("success", "Comparison completed successfully!");

        // Scroll to results
        setTimeout(() => {
          document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } catch (error) {
        console.error("Comparison error:", error);
        showToast(
          "error",
          `Error performing comparison: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      } finally {
        setIsComparing(false);
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer />

      {/* Comparison Mode Selector */}
      <ComparisonModeSelector currentMode="quick" />

      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-8">

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-2">
                  Please fix the following errors:
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
                  {validationErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Centralized Lift Type Selector */}
        <div className="max-w-md mx-auto mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-orange-50 rounded-lg shadow-sm p-4 sm:p-6 border-2 border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lift Type
            </label>
            <select
              value={liftDataA.liftFamily}
              onChange={(e) => handleLiftFamilyChange(e.target.value as LiftFamily)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
            >
              <option value={LiftFamily.SQUAT}>Squat</option>
              <option value={LiftFamily.DEADLIFT}>Deadlift</option>
              <option value={LiftFamily.BENCH}>Bench Press</option>
              <option value={LiftFamily.PULLUP}>Pull-up / Chin-up</option>
              <option value={LiftFamily.PUSHUP}>Push-up</option>
              <option value={LiftFamily.OHP}>Overhead Press</option>
              <option value={LiftFamily.THRUSTER}>Thruster</option>
            </select>
            <p className="mt-2 text-xs text-gray-600 text-center">
              This applies to both lifters
            </p>
          </div>
        </div>

        {/* Input Section - Responsive */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Lifter A */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border-2 border-blue-200">
              <h2 className="text-lg sm:text-xl font-semibold text-blue-600 mb-4">
                Lifter A Build
              </h2>
              <BuildInput
                height={lifterA.height}
                weight={lifterA.weight}
                sex={lifterA.sex}
                torsoLegRatio={lifterA.torsoLegRatio}
                armLength={lifterA.armLength}
                onChange={(data) => setLifterA({ ...lifterA, ...data })}
              />
            </div>

            {/* Lift Details for A */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border-2 border-blue-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                Lifter A Performance
              </h3>
              <LiftSelector
                liftFamily={liftDataA.liftFamily}
                variant={liftDataA.variant}
                load={liftDataA.load}
                reps={liftDataA.reps}
                stance={liftDataA.stance}
                pushupWeight={liftDataA.pushupWeight}
                onChange={handleLiftDataAChange}
                showLiftType={false}
              />
            </div>
          </div>

          {/* Lifter B */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border-2 border-orange-200">
              <h2 className="text-lg sm:text-xl font-semibold text-orange-600 mb-4">
                Lifter B Build
              </h2>
              <BuildInput
                height={lifterB.height}
                weight={lifterB.weight}
                sex={lifterB.sex}
                torsoLegRatio={lifterB.torsoLegRatio}
                armLength={lifterB.armLength}
                onChange={(data) => setLifterB({ ...lifterB, ...data })}
              />
            </div>

            {/* Lift Details for B */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border-2 border-orange-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                Lifter B Performance
              </h3>
              <LiftSelector
                liftFamily={liftDataA.liftFamily}
                variant={liftDataB.variant}
                load={liftDataB.load}
                reps={liftDataB.reps}
                stance={liftDataB.stance}
                pushupWeight={liftDataB.pushupWeight}
                onChange={handleLiftDataBChange}
                showLiftType={false}
              />
            </div>
          </div>
        </div>

        {/* Compare Button - Touch-friendly */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <button
            onClick={handleCompare}
            disabled={isComparing}
            className="w-full sm:w-auto bg-blue-600 text-white px-8 sm:px-12 py-3 sm:py-4 rounded-lg text-base sm:text-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed touch-manipulation"
          >
            {isComparing ? "Comparing..." : "Compare Lifts"}
          </button>
        </div>

        {/* Loading State */}
        {isComparing && (
          <div id="results" className="space-y-6 sm:space-y-8">
            {liftDataA.liftFamily === LiftFamily.SQUAT && <StickFigureSkeleton />}
            <ResultsSkeleton />
          </div>
        )}

        {/* Results Section */}
        {!isComparing && result && (
          <div id="results" className="space-y-6 sm:space-y-8">
            {/* Animated Movement Comparison with Controls */}
            {result.lifterA.kinematics && result.lifterB.kinematics && (
              <UnifiedMovementAnimation
                lifterA={{
                  name: lifterA.name,
                  anthropometry: result.lifterA.anthropometry,
                }}
                lifterB={{
                  name: lifterB.name,
                  anthropometry: result.lifterB.anthropometry,
                }}
                movement={liftDataA.liftFamily}
                options={{
                  squatVariant: liftDataA.liftFamily === LiftFamily.SQUAT ? liftDataA.variant as any : undefined,
                  squatStance: liftDataA.liftFamily === LiftFamily.SQUAT ? liftDataA.stance as any : undefined,
                  deadliftVariant: liftDataA.liftFamily === LiftFamily.DEADLIFT ? liftDataA.variant as any : undefined,
                  sumoStance: liftDataA.liftFamily === LiftFamily.DEADLIFT ? liftDataA.stance as any : undefined,
                  benchGrip: liftDataA.liftFamily === LiftFamily.BENCH ? liftDataA.variant.split('-')[0] as any : undefined,
                  benchArch: liftDataA.liftFamily === LiftFamily.BENCH ? liftDataA.variant.split('-')[1] as any : undefined,
                  pullupGrip: liftDataA.liftFamily === LiftFamily.PULLUP ? liftDataA.variant as any : undefined,
                  pushupWidth: liftDataA.liftFamily === LiftFamily.PUSHUP ? liftDataA.variant as any : undefined,
                  pushupWeight: liftDataA.liftFamily === LiftFamily.PUSHUP ? liftDataA.pushupWeight : undefined,
                }}
                reps={liftDataA.reps}
                workA={result.lifterA.metrics.totalWork}
                workB={result.lifterB.metrics?.totalWork || 0}
                initialTime={liftDataA.reps * 2.5}
              />
            )}

            {/* Biomechanical Analysis */}
            <ResultsDisplay
              result={result}
              showEquivalentPerformance={false}
              liftFamily={liftDataA.liftFamily}
              variant={liftDataA.variant}
            />

            {/* Explanations */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <ExplanationCards explanations={result.explanations} />
            </div>

            {/* Advanced Options Link */}
            <div className="text-center">
              <Link
                href="/compare/detailed"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm sm:text-base"
              >
                Need more control? Try detailed comparison
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </Link>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isComparing && !result && (
          <div className="text-center py-8 sm:py-12 text-gray-500">
            <p className="text-base sm:text-lg px-4">
              Enter anthropometry and lift details, then click Compare to see
              results
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
