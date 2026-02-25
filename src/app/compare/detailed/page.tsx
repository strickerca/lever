"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { LiftFamily, Sex, ComparisonResult, LiftData, SavedProfile } from "@/types";
import { HeightWeightInput } from "@/components/anthropometry/HeightWeightInput";
import { ManualSegmentLengths } from "@/components/anthropometry/ManualSegmentLengths";
import { LiftSelector } from "@/components/comparison/LiftSelector";
import { ResultsDisplay } from "@/components/comparison/ResultsDisplay";
import { ExplanationCards } from "@/components/comparison/ExplanationCards";
import { UnifiedMovementAnimation } from "@/components/visualization/UnifiedMovementAnimation";
import { ComparisonModeSelector } from "@/components/comparison/ComparisonModeSelector";
import { ResultsSkeleton, StickFigureSkeleton } from "@/components/ui/Skeleton";
import { showToast, ToastContainer } from "@/components/ui/Toast";
import {
  createProfileFromProportions,
  createProfileFromSegments,
  validateAnthropometry,
} from "@/lib/biomechanics/anthropometry";
import { compareLifts } from "@/lib/biomechanics/comparison";
import { useLeverStore } from "@/store";
import {
  validateLifterInputs,
  validateLiftInputs,
  getErrorMessage,
} from "@/lib/validation";
import { SEGMENT_RATIOS } from "@/lib/biomechanics/constants";
import { MovementOptions } from "@/lib/animation/types";
import { PersistenceDrawer } from "@/components/persistence/PersistenceDrawer";
import { PersistenceTrigger } from "@/components/persistence/PersistenceTrigger";

export default function DetailedComparePage() {
  const addComparison = useLeverStore((s) => s.addComparison);
  const savedProfiles = useLeverStore((s) => s.savedProfiles);
  const comparisonHistory = useLeverStore((s) => s.comparisonHistory);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"history" | "profiles">("history");

  // Lifter A state
  const [lifterA, setLifterA] = useState({
    height: 1.75,
    weight: 77,
    sex: Sex.MALE,
    name: "Lifter A",
  });

  const [customSegmentsA, setCustomSegmentsA] = useState({
    enabled: false,
    segments: {
      torso: 0.50,
      upperArm: 0.32,
      forearm: 0.25,
      femur: 0.43,
      tibia: 0.43,
    }
  });

  // Lifter B state
  const [lifterB, setLifterB] = useState({
    height: 1.85,
    weight: 88,
    sex: Sex.MALE,
    name: "Lifter B",
  });

  const [customSegmentsB, setCustomSegmentsB] = useState({
    enabled: false,
    segments: {
      torso: 0.53,
      upperArm: 0.34,
      forearm: 0.27,
      femur: 0.45,
      tibia: 0.45,
    }
  });

  // Handler helpers
  const updateCustomSegmentsA = (segments: typeof customSegmentsA.segments) =>
    setCustomSegmentsA(prev => ({ ...prev, segments }));

  const updateCustomSegmentsB = (segments: typeof customSegmentsB.segments) =>
    setCustomSegmentsB(prev => ({ ...prev, segments }));

  // Toggle handlers that auto-fill defaults if zeros
  const toggleCustomA = (enabled: boolean) => {
    if (enabled && customSegmentsA.segments.torso === 0.50) {
      const r = SEGMENT_RATIOS[lifterA.sex];
      setCustomSegmentsA({
        enabled,
        segments: {
          torso: parseFloat((lifterA.height * r.torso).toFixed(3)),
          upperArm: parseFloat((lifterA.height * r.upperArm).toFixed(3)),
          forearm: parseFloat((lifterA.height * r.forearm).toFixed(3)),
          femur: parseFloat((lifterA.height * r.femur).toFixed(3)),
          tibia: parseFloat((lifterA.height * r.tibia).toFixed(3)),
        }
      })
    } else {
      setCustomSegmentsA(prev => ({ ...prev, enabled }));
    }
  }

  const toggleCustomB = (enabled: boolean) => {
    if (enabled && customSegmentsB.segments.torso === 0.53) {
      const r = SEGMENT_RATIOS[lifterB.sex];
      setCustomSegmentsB({
        enabled,
        segments: {
          torso: parseFloat((lifterB.height * r.torso).toFixed(3)),
          upperArm: parseFloat((lifterB.height * r.upperArm).toFixed(3)),
          forearm: parseFloat((lifterB.height * r.forearm).toFixed(3)),
          femur: parseFloat((lifterB.height * r.femur).toFixed(3)),
          tibia: parseFloat((lifterB.height * r.tibia).toFixed(3)),
        }
      })
    } else {
      setCustomSegmentsB(prev => ({ ...prev, enabled }));
    }
  }

  // Lift state - can be different for each lifter
  const [liftDataA, setLiftDataA] = useState<LiftData>({
    liftFamily: LiftFamily.SQUAT,
    variant: "highBar",
    load: 100,
    reps: 5,
    stance: "normal",
    pushupWeight: 0,
    barStartHeightOffset: 0,
  });

  const [liftDataB, setLiftDataB] = useState<LiftData>({
    liftFamily: LiftFamily.SQUAT,
    variant: "highBar",
    load: 100,
    reps: 5,
    stance: "normal",
    pushupWeight: 0,
    barStartHeightOffset: 0,
  });

  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleLiftDataAChange = (data: LiftData) => {
    setLiftDataA({
      ...data,
      stance: data.stance ?? "normal",
      pushupWeight: data.pushupWeight ?? 0,
      barStartHeightOffset: data.barStartHeightOffset ?? 0,
    });
  };

  const handleLiftDataBChange = (data: LiftData) => {
    setLiftDataB({
      liftFamily: data.liftFamily,
      variant: data.variant,
      load: data.load,
      reps: data.reps,
      stance: data.stance ?? "normal",
      pushupWeight: data.pushupWeight ?? 0,
      barStartHeightOffset: data.barStartHeightOffset ?? 0,
    });
  };

  const toMovementOptions = (data: LiftData): MovementOptions => {
    const [benchGripRaw, benchArchRaw] = data.variant.split("-");

    return {
      squatVariant: data.liftFamily === LiftFamily.SQUAT ? (data.variant as MovementOptions["squatVariant"]) : undefined,
      squatStance: data.liftFamily === LiftFamily.SQUAT ? (data.stance as MovementOptions["squatStance"]) : undefined,
      deadliftVariant: data.liftFamily === LiftFamily.DEADLIFT ? (data.variant as MovementOptions["deadliftVariant"]) : undefined,
      sumoStance: data.liftFamily === LiftFamily.DEADLIFT ? (data.stance as MovementOptions["sumoStance"]) : undefined,
      deadliftBarOffset: data.liftFamily === LiftFamily.DEADLIFT ? data.barStartHeightOffset : undefined,
      benchGrip: data.liftFamily === LiftFamily.BENCH ? (benchGripRaw as MovementOptions["benchGrip"]) : undefined,
      benchArch: data.liftFamily === LiftFamily.BENCH ? (benchArchRaw as MovementOptions["benchArch"]) : undefined,
      pullupGrip: data.liftFamily === LiftFamily.PULLUP ? (data.variant as MovementOptions["pullupGrip"]) : undefined,
      pushupWidth:
        data.liftFamily === LiftFamily.PUSHUP
          ? ((data.variant === "standard" ? "normal" : data.variant) as MovementOptions["pushupWidth"])
          : undefined,
      pushupWeight: data.liftFamily === LiftFamily.PUSHUP ? data.pushupWeight : undefined,
    };
  };

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

    setTimeout(() => {
      try {
        // Create anthropometry profiles
        // If custom segments are enabled, use them. Otherwise use simple profile.
        // Lifter A
        let anthroA;
        if (customSegmentsA.enabled) {
          anthroA = createProfileFromSegments(
            lifterA.height,
            lifterA.weight,
            lifterA.sex,
            customSegmentsA.segments
          );
        } else {
          anthroA = createProfileFromProportions(
            lifterA.height,
            lifterA.weight,
            lifterA.sex,
            0,
            0,
            0
          );
        }

        // Lifter B
        let anthroB;
        if (customSegmentsB.enabled) {
          anthroB = createProfileFromSegments(
            lifterB.height,
            lifterB.weight,
            lifterB.sex,
            customSegmentsB.segments
          );
        } else {
          anthroB = createProfileFromProportions(
            lifterB.height,
            lifterB.weight,
            lifterB.sex,
            0,
            0,
            0
          );
        }

        const anthroValidationA = validateAnthropometry(anthroA);
        const anthroValidationB = validateAnthropometry(anthroB);
        if (!anthroValidationA.valid || !anthroValidationB.valid) {
          const anthropometryErrors = [
            ...anthroValidationA.errors.map((e) => `Lifter A: ${e}`),
            ...anthroValidationB.errors.map((e) => `Lifter B: ${e}`),
          ];
          setValidationErrors(anthropometryErrors);
          showToast("error", anthropometryErrors[0] || "Invalid anthropometry values");
          setIsComparing(false);
          return;
        }

        // Compare lifts
        const comparisonResult = compareLifts(
          { anthropometry: anthroA, name: lifterA.name },
          { anthropometry: anthroB, name: lifterB.name },
          liftDataA.liftFamily,
          liftDataA.variant,
          liftDataB.variant,
          { load: liftDataA.load, reps: liftDataA.reps },
          { load: liftDataB.load, reps: liftDataB.reps },
          liftDataA.stance,
          liftDataB.stance,
          liftDataA.pushupWeight,
          liftDataB.pushupWeight,
          liftDataA.barStartHeightOffset,
          liftDataB.barStartHeightOffset,
          liftDataA.squatDepth,
          liftDataB.squatDepth,
          (liftDataA.chestSize as "small" | "average" | "large" | undefined) ?? "average",
          (liftDataB.chestSize as "small" | "average" | "large" | undefined) ?? "average"
        );

        setResult(comparisonResult);
        addComparison(comparisonResult, {
          liftFamily: liftDataA.liftFamily,
          variantA: liftDataA.variant,
          variantB: liftDataB.variant,
          loadA: liftDataA.load,
          loadB: liftDataB.load,
          repsA: liftDataA.reps,
          repsB: liftDataB.reps,
          stanceA: liftDataA.stance,
          stanceB: liftDataB.stance,
          pushupWeightA: liftDataA.pushupWeight,
          pushupWeightB: liftDataB.pushupWeight,
        });
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

  // --- Drawer callbacks ---
  const handleLoadHistory = (entry: ComparisonResult) => {
    if (entry.snapshot) {
      const s = entry.snapshot;
      setLiftDataA((prev) => ({
        ...prev,
        liftFamily: s.liftFamily,
        variant: s.variantA,
        load: s.loadA,
        reps: s.repsA,
        stance: s.stanceA ?? prev.stance,
        pushupWeight: s.pushupWeightA ?? 0,
      }));
      setLiftDataB((prev) => ({
        ...prev,
        liftFamily: s.liftFamily,
        variant: s.variantB,
        load: s.loadB,
        reps: s.repsB,
        stance: s.stanceB ?? prev.stance,
        pushupWeight: s.pushupWeightB ?? 0,
      }));
    }
    setLifterA((prev) => ({
      ...prev,
      name: entry.lifterA.name,
      height: entry.lifterA.anthropometry.segments.height,
      weight: entry.lifterA.anthropometry.mass,
      sex: entry.lifterA.anthropometry.sex,
    }));
    setLifterB((prev) => ({
      ...prev,
      name: entry.lifterB.name,
      height: entry.lifterB.anthropometry.segments.height,
      weight: entry.lifterB.anthropometry.mass,
      sex: entry.lifterB.anthropometry.sex,
    }));
    setResult(null);
    showToast("success", "Comparison inputs restored — click Compare to recalculate");
  };

  const handleLoadProfileAsA = (profile: SavedProfile) => {
    setLifterA({
      height: profile.height,
      weight: profile.weight,
      sex: profile.sex,
      name: profile.name,
    });
    if (profile.customSegments) {
      setCustomSegmentsA({ enabled: true, segments: profile.customSegments });
    } else {
      setCustomSegmentsA((prev) => ({ ...prev, enabled: false }));
    }
  };

  const handleLoadProfileAsB = (profile: SavedProfile) => {
    setLifterB({
      height: profile.height,
      weight: profile.weight,
      sex: profile.sex,
      name: profile.name,
    });
    if (profile.customSegments) {
      setCustomSegmentsB({ enabled: true, segments: profile.customSegments });
    } else {
      setCustomSegmentsB((prev) => ({ ...prev, enabled: false }));
    }
  };

  const openDrawer = (tab: "history" | "profiles") => {
    setDrawerTab(tab);
    setDrawerOpen(true);
  };

  return (
    <div className="min-h-screen bg-transparent">
      <ToastContainer />

      {/* Comparison Mode Selector */}
      <ComparisonModeSelector currentMode="detailed" />

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
        <div className="flex justify-end mb-4">
          <PersistenceTrigger
            onClick={() => openDrawer("history")}
            historyCount={comparisonHistory.length}
            profileCount={savedProfiles.length}
          />
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-950/50 border border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-200 mb-2">
                  Please fix the following errors:
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-300">
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
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-lg shadow-sm p-6 border border-blue-500/30 ring-1 ring-blue-500/10">
              <h2 className="text-xl font-semibold text-blue-400 mb-4">
                Lifter A Build
              </h2>
              <HeightWeightInput
                height={lifterA.height}
                weight={lifterA.weight}
                sex={lifterA.sex}
                onChange={(data) => setLifterA({ ...lifterA, ...data })}
              />
            </div>

            {/* Segment Length Input for A */}
            <ManualSegmentLengths
              height={lifterA.height}
              sex={lifterA.sex}
              segments={customSegmentsA.segments}
              onChange={updateCustomSegmentsA}
              enabled={customSegmentsA.enabled}
              onToggle={toggleCustomA}
              color="blue"
            />

            {/* Lift Details for A */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-lg shadow-sm p-6 border border-blue-500/30 ring-1 ring-blue-500/10">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">
                Lifter A Performance
              </h3>
              <LiftSelector
                liftFamily={liftDataA.liftFamily}
                variant={liftDataA.variant}
                load={liftDataA.load}
                reps={liftDataA.reps}
                stance={liftDataA.stance}
                pushupWeight={liftDataA.pushupWeight}
                barStartHeightOffset={liftDataA.barStartHeightOffset}
                onChange={handleLiftDataAChange}
                showLiftType={false}
              />
            </div>
          </div>

          {/* Lifter B */}
          <div className="space-y-6">
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-lg shadow-sm p-6 border border-orange-500/30 ring-1 ring-orange-500/10">
              <h2 className="text-xl font-semibold text-orange-400 mb-4">
                Lifter B Build
              </h2>
              <HeightWeightInput
                height={lifterB.height}
                weight={lifterB.weight}
                sex={lifterB.sex}
                onChange={(data) => setLifterB({ ...lifterB, ...data })}
              />
            </div>

            {/* Segment Length Input for B */}
            <ManualSegmentLengths
              height={lifterB.height}
              sex={lifterB.sex}
              segments={customSegmentsB.segments}
              onChange={updateCustomSegmentsB}
              enabled={customSegmentsB.enabled}
              onToggle={toggleCustomB}
              color="orange"
            />

            {/* Lift Details for B */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-lg shadow-sm p-6 border border-orange-500/30 ring-1 ring-orange-500/10">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">
                Lifter B Performance
              </h3>
              <LiftSelector
                liftFamily={liftDataB.liftFamily}
                variant={liftDataB.variant}
                load={liftDataB.load}
                reps={liftDataB.reps}
                stance={liftDataB.stance}
                pushupWeight={liftDataB.pushupWeight}
                barStartHeightOffset={liftDataB.barStartHeightOffset}
                onChange={handleLiftDataBChange}
                showLiftType={false}
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
            {/* Animated Movement Comparison with Controls */}
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
              optionsA={toMovementOptions(liftDataA)}
              optionsB={toMovementOptions(liftDataB)}
              repsA={liftDataA.reps}
              repsB={liftDataB.reps}
              metricsA={result.lifterA.metrics}
              metricsB={result.lifterB.metrics}
              initialTime={liftDataA.reps * 2.5}
            />

            {/* Biomechanical Analysis */}
            <ResultsDisplay
              result={result}
              showEquivalentPerformance={false}
              liftFamily={liftDataA.liftFamily}
              variant={liftDataA.variant}
            />

            {/* Explanations */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-lg shadow-sm p-6 border border-slate-800">
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

      <PersistenceDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        initialTab={drawerTab}
        onLoadHistory={handleLoadHistory}
        onLoadProfileAsA={handleLoadProfileAsA}
        onLoadProfileAsB={handleLoadProfileAsB}
      />
    </div>
  );
}
