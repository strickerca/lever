"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { LiftFamily, Sex, ComparisonResult } from "@/types";
import { HeightWeightInput } from "@/components/anthropometry/HeightWeightInput";
import { LiftSelector } from "@/components/comparison/LiftSelector";
import { ResultsDisplay } from "@/components/comparison/ResultsDisplay";
import { ExplanationCards } from "@/components/comparison/ExplanationCards";
import { StickFigure } from "@/components/visualization/StickFigure";
import { ResultsSkeleton, StickFigureSkeleton } from "@/components/ui/Skeleton";
import { showToast, ToastContainer } from "@/components/ui/Toast";
import { createSimpleProfile } from "@/lib/biomechanics/anthropometry";
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
  });

  // Lifter B state - slightly taller male: 185cm, 88kg
  const [lifterB, setLifterB] = useState({
    height: 1.85,
    weight: 88,
    sex: Sex.MALE,
    name: "Lifter B",
  });

  // Lift state
  const [liftData, setLiftData] = useState({
    liftFamily: LiftFamily.SQUAT,
    variant: "highBar",
    load: 100,
    reps: 5,
  });

  // Results state
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleCompare = () => {
    // Analytics: comparison started
    console.log("[Analytics] comparison_started", {
      liftFamily: liftData.liftFamily,
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
    const liftValidation = validateLiftInputs(
      liftData.load,
      liftData.reps,
      liftData.liftFamily !== LiftFamily.PUSHUP
    );

    const errors = [
      ...lifterAValidation.errors,
      ...lifterBValidation.errors,
      ...liftValidation.errors,
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
        // Create anthropometry profiles
        const anthroA = createSimpleProfile(
          lifterA.height,
          lifterA.weight,
          lifterA.sex
        );
        const anthroB = createSimpleProfile(
          lifterB.height,
          lifterB.weight,
          lifterB.sex
        );

        // Compare lifts
        const comparisonResult = compareLifts(
          { anthropometry: anthroA, name: lifterA.name },
          { anthropometry: anthroB, name: lifterB.name },
          liftData.liftFamily,
          liftData.variant,
          liftData.variant, // Same variant for both
          { load: liftData.load, reps: liftData.reps }
        );

        // Check if kinematic solver failed
        if (
          liftData.liftFamily === LiftFamily.SQUAT &&
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
          liftData.liftFamily === LiftFamily.SQUAT &&
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

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-8">
        {/* Page Title */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Quick Comparison
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Compare two lifters with standard anthropometry
          </p>
        </div>

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

        {/* Input Section - Responsive */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Lifter A */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border-2 border-blue-200">
            <h2 className="text-lg sm:text-xl font-semibold text-blue-600 mb-4">
              Lifter A
            </h2>
            <HeightWeightInput
              height={lifterA.height}
              weight={lifterA.weight}
              sex={lifterA.sex}
              onChange={(data) => setLifterA({ ...lifterA, ...data })}
            />
          </div>

          {/* Lifter B */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border-2 border-orange-200">
            <h2 className="text-lg sm:text-xl font-semibold text-orange-600 mb-4">
              Lifter B
            </h2>
            <HeightWeightInput
              height={lifterB.height}
              weight={lifterB.weight}
              sex={lifterB.sex}
              onChange={(data) => setLifterB({ ...lifterB, ...data })}
            />
          </div>
        </div>

        {/* Lift Selector */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
            Lift Details (Lifter A Performance)
          </h2>
          <LiftSelector
            liftFamily={liftData.liftFamily}
            variant={liftData.variant}
            load={liftData.load}
            reps={liftData.reps}
            onChange={setLiftData}
          />
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
            {liftData.liftFamily === LiftFamily.SQUAT && <StickFigureSkeleton />}
            <ResultsSkeleton />
          </div>
        )}

        {/* Results Section */}
        {!isComparing && result && (
          <div id="results" className="space-y-6 sm:space-y-8">
            {/* Stick Figure Visualization */}
            {result.lifterA.kinematics && result.lifterB.kinematics && (
              <StickFigure
                kinematicsA={result.lifterA.kinematics}
                kinematicsB={result.lifterB.kinematics}
                heightA={lifterA.height}
                heightB={lifterB.height}
                showMomentArms={true}
              />
            )}

            {/* Results Display */}
            <ResultsDisplay result={result} />

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
