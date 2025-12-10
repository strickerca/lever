"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { LiftFamily, Sex, ComparisonResult, AnthropometryMode } from "@/types";
import { HeightWeightInput } from "@/components/anthropometry/HeightWeightInput";
import { LiftSelector } from "@/components/comparison/LiftSelector";
import { ResultsDisplay } from "@/components/comparison/ResultsDisplay";
import { ExplanationCards } from "@/components/comparison/ExplanationCards";
import { StickFigure } from "@/components/visualization/StickFigure";
import { ResultsSkeleton, StickFigureSkeleton } from "@/components/ui/Skeleton";
import { showToast, ToastContainer } from "@/components/ui/Toast";
import { createAdvancedProfile } from "@/lib/biomechanics/anthropometry";
import { compareLifts } from "@/lib/biomechanics/comparison";
import { useLeverStore } from "@/store";
import {
  validateLifterInputs,
  validateLiftInputs,
  getErrorMessage,
} from "@/lib/validation";

export default function DetailedComparePage() {
  const { addComparison } = useLeverStore();

  // Lifter A state
  const [lifterA, setLifterA] = useState({
    height: 1.75,
    weight: 77,
    sex: Sex.MALE,
    name: "Lifter A",
    // SD modifiers (0 = average)
    sdTorso: 0,
    sdUpperArm: 0,
    sdForearm: 0,
    sdFemur: 0,
    sdTibia: 0,
  });

  // Lifter B state
  const [lifterB, setLifterB] = useState({
    height: 1.85,
    weight: 88,
    sex: Sex.MALE,
    name: "Lifter B",
    sdTorso: 0,
    sdUpperArm: 0,
    sdForearm: 0,
    sdFemur: 0,
    sdTibia: 0,
  });

  // Lift state - can be different for each lifter
  const [liftDataA, setLiftDataA] = useState({
    liftFamily: LiftFamily.SQUAT,
    variant: "highBar",
    load: 100,
    reps: 5,
  });

  const [liftDataB, setLiftDataB] = useState({
    liftFamily: LiftFamily.SQUAT,
    variant: "highBar",
  });

  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleCompare = () => {
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
      liftDataA.load,
      liftDataA.reps,
      liftDataA.liftFamily !== LiftFamily.PUSHUP
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

    setTimeout(() => {
      try {
        // Create anthropometry profiles with SD modifiers
        const anthroA = createAdvancedProfile(
          lifterA.height,
          lifterA.weight,
          lifterA.sex,
          {
            torso: lifterA.sdTorso,
            upperArm: lifterA.sdUpperArm,
            forearm: lifterA.sdForearm,
            femur: lifterA.sdFemur,
            tibia: lifterA.sdTibia,
          }
        );
        const anthroB = createAdvancedProfile(
          lifterB.height,
          lifterB.weight,
          lifterB.sex,
          {
            torso: lifterB.sdTorso,
            upperArm: lifterB.sdUpperArm,
            forearm: lifterB.sdForearm,
            femur: lifterB.sdFemur,
            tibia: lifterB.sdTibia,
          }
        );

        // Compare lifts (can be different variants)
        const comparisonResult = compareLifts(
          { anthropometry: anthroA, name: lifterA.name },
          { anthropometry: anthroB, name: lifterB.name },
          liftDataA.liftFamily,
          liftDataA.variant,
          liftDataB.variant,
          { load: liftDataA.load, reps: liftDataA.reps }
        );

        setResult(comparisonResult);
        addComparison(comparisonResult);
        showToast("success", "Comparison completed successfully!");

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
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link
            href="/compare/quick"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Quick Compare</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
        {/* Page Title */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Detailed Comparison
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Advanced comparison with SD modifiers and cross-lift variants
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

        {/* Input Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Lifter A */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-blue-200">
              <h2 className="text-xl font-semibold text-blue-600 mb-4">
                Lifter A
              </h2>
              <HeightWeightInput
                height={lifterA.height}
                weight={lifterA.weight}
                sex={lifterA.sex}
                onChange={(data) => setLifterA({ ...lifterA, ...data })}
              />
            </div>

            {/* SD Modifiers for A */}
            <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Segment Length Modifiers (SD)
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Adjust individual segment lengths. 0 = average, +1 = 1 standard deviation longer, -1 = 1 SD shorter
              </p>
              <div className="space-y-4">
                {[
                  { key: "sdTorso" as const, label: "Torso" },
                  { key: "sdUpperArm" as const, label: "Upper Arm" },
                  { key: "sdForearm" as const, label: "Forearm" },
                  { key: "sdFemur" as const, label: "Femur" },
                  { key: "sdTibia" as const, label: "Tibia" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        {label}
                      </label>
                      <span className="text-sm text-gray-600">
                        {lifterA[key].toFixed(1)} SD
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-2"
                      max="2"
                      step="0.1"
                      value={lifterA[key]}
                      onChange={(e) =>
                        setLifterA({ ...lifterA, [key]: parseFloat(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Lift Details for A */}
            <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Lifter A Performance
              </h3>
              <LiftSelector
                liftFamily={liftDataA.liftFamily}
                variant={liftDataA.variant}
                load={liftDataA.load}
                reps={liftDataA.reps}
                onChange={setLiftDataA}
              />
            </div>
          </div>

          {/* Lifter B */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-orange-200">
              <h2 className="text-xl font-semibold text-orange-600 mb-4">
                Lifter B
              </h2>
              <HeightWeightInput
                height={lifterB.height}
                weight={lifterB.weight}
                sex={lifterB.sex}
                onChange={(data) => setLifterB({ ...lifterB, ...data })}
              />
            </div>

            {/* SD Modifiers for B */}
            <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-orange-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Segment Length Modifiers (SD)
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Adjust individual segment lengths. 0 = average, +1 = 1 standard deviation longer, -1 = 1 SD shorter
              </p>
              <div className="space-y-4">
                {[
                  { key: "sdTorso" as const, label: "Torso" },
                  { key: "sdUpperArm" as const, label: "Upper Arm" },
                  { key: "sdForearm" as const, label: "Forearm" },
                  { key: "sdFemur" as const, label: "Femur" },
                  { key: "sdTibia" as const, label: "Tibia" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        {label}
                      </label>
                      <span className="text-sm text-gray-600">
                        {lifterB[key].toFixed(1)} SD
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-2"
                      max="2"
                      step="0.1"
                      value={lifterB[key]}
                      onChange={(e) =>
                        setLifterB({ ...lifterB, [key]: parseFloat(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Lift Variant for B */}
            <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-orange-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Lifter B Variant
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Select variant for Lifter B (can be different from Lifter A)
              </p>
              <LiftSelector
                liftFamily={liftDataA.liftFamily}
                variant={liftDataB.variant}
                load={liftDataA.load}
                reps={liftDataA.reps}
                onChange={(data) => setLiftDataB({ ...liftDataB, variant: data.variant })}
                showLoadReps={false}
              />
            </div>
          </div>
        </div>

        {/* Compare Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={handleCompare}
            disabled={isComparing}
            className="w-full sm:w-auto bg-blue-600 text-white px-12 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isComparing ? "Comparing..." : "Compare Lifts"}
          </button>
        </div>

        {/* Loading State */}
        {isComparing && (
          <div id="results" className="space-y-8">
            {liftDataA.liftFamily === LiftFamily.SQUAT && <StickFigureSkeleton />}
            <ResultsSkeleton />
          </div>
        )}

        {/* Results Section */}
        {!isComparing && result && (
          <div id="results" className="space-y-8">
            {/* Stick Figure */}
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
            <div className="bg-white rounded-lg shadow-sm p-6">
              <ExplanationCards explanations={result.explanations} />
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isComparing && !result && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">
              Configure both lifters and click Compare to see results
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
