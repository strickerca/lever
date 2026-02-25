"use client";

import { useState, useEffect, useRef } from "react";
import { AlertCircle } from "lucide-react";
import { LiftFamily, Sex, LiftData, TorsoLegProportion, ArmProportion, SavedProfile, ComparisonResult } from "@/types";
import { BuildInput } from "@/components/anthropometry/BuildInput";
import { ProportionVisualizer } from "@/components/anthropometry/ProportionVisualizer";
import { ManualSegmentLengths } from "@/components/anthropometry/ManualSegmentLengths";
import { SEGMENT_RATIOS } from "@/lib/biomechanics/constants";
import { ToastContainer, showToast } from "@/components/ui/Toast";
import { PersistenceDrawer } from "@/components/persistence/PersistenceDrawer";
import { PersistenceTrigger } from "@/components/persistence/PersistenceTrigger";
import { useLeverStore } from "@/store";
import { useLiveComparison } from "@/hooks/useLiveComparison";
import { EngineRoom } from "@/components/results/EngineRoom";

export default function QuickComparePage() {
  // Store
  const addComparison = useLeverStore((s) => s.addComparison);
  const savedProfiles = useLeverStore((s) => s.savedProfiles);
  const comparisonHistory = useLeverStore((s) => s.comparisonHistory);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"history" | "profiles">("history");

  // Lifter A state - average male: 175cm, 77kg
  const [lifterA, setLifterA] = useState({
    height: 1.75,
    weight: 77,
    sex: Sex.MALE,
    name: "Lifter A",
    torsoLegRatio: "average" as TorsoLegProportion,
    armLength: "average" as ArmProportion,
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

  // Lifter B state - slightly taller male: 185cm, 88kg
  const [lifterB, setLifterB] = useState({
    height: 1.85,
    weight: 88,
    sex: Sex.MALE,
    name: "Lifter B",
    torsoLegRatio: "average" as TorsoLegProportion,
    armLength: "average" as ArmProportion,
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

  // Custom Segment Handlers
  const updateCustomSegmentsA = (segments: typeof customSegmentsA.segments) =>
    setCustomSegmentsA(prev => ({ ...prev, segments }));

  const updateCustomSegmentsB = (segments: typeof customSegmentsB.segments) =>
    setCustomSegmentsB(prev => ({ ...prev, segments }));

  // Preview State (Real-time visualizer updates on hover/input)
  const [previewA, setPreviewA] = useState<{ torsoLegRatio?: TorsoLegProportion, armLength?: ArmProportion, height?: number } | null>(null);
  const [previewB, setPreviewB] = useState<{ torsoLegRatio?: TorsoLegProportion, armLength?: ArmProportion, height?: number } | null>(null);

  const toggleCustomA = (enabled: boolean) => {
    // Determine target height to use for auto-fill
    // Either use current lifter height, or default if not set? Lifter height is always set in this state.
    const h = lifterA.height;

    if (enabled && customSegmentsA.segments.torso === 0.50) {
      // Auto-fill with standard ratios for current height/sex if it looks like default/generic values
      const r = SEGMENT_RATIOS[lifterA.sex];
      setCustomSegmentsA({
        enabled,
        segments: {
          torso: parseFloat((h * r.torso).toFixed(3)),
          upperArm: parseFloat((h * r.upperArm).toFixed(3)),
          forearm: parseFloat((h * r.forearm).toFixed(3)),
          femur: parseFloat((h * r.femur).toFixed(3)),
          tibia: parseFloat((h * r.tibia).toFixed(3)),
        }
      })
    } else {
      setCustomSegmentsA(prev => ({ ...prev, enabled }));
    }
  }

  const toggleCustomB = (enabled: boolean) => {
    const h = lifterB.height;
    if (enabled && customSegmentsB.segments.torso === 0.53) {
      const r = SEGMENT_RATIOS[lifterB.sex];
      setCustomSegmentsB({
        enabled,
        segments: {
          torso: parseFloat((h * r.torso).toFixed(3)),
          upperArm: parseFloat((h * r.upperArm).toFixed(3)),
          forearm: parseFloat((h * r.forearm).toFixed(3)),
          femur: parseFloat((h * r.femur).toFixed(3)),
          tibia: parseFloat((h * r.tibia).toFixed(3)),
        }
      })
    } else {
      setCustomSegmentsB(prev => ({ ...prev, enabled }));
    }
  }

  // Lift state - now separate for each lifter
  const [liftDataA, setLiftDataA] = useState<LiftData>({
    liftFamily: LiftFamily.SQUAT,
    variant: "highBar",
    load: 100,
    reps: 5,
    stance: "normal",
    pushupWeight: 0,
    barStartHeightOffset: 0,
    chestSize: "average",
    squatDepth: "parallel",
  });

  const [liftDataB, setLiftDataB] = useState<LiftData>({
    liftFamily: LiftFamily.SQUAT,
    variant: "highBar",
    load: 100,
    reps: 5,
    stance: "normal",
    pushupWeight: 0,
    barStartHeightOffset: 0,
    chestSize: "average",
    squatDepth: "parallel",
  });

  // Live Comparison Hook
  const { result, isCalculating, validationErrors } = useLiveComparison({
    lifterA: { ...lifterA, customSegments: customSegmentsA },
    lifterB: { ...lifterB, customSegments: customSegmentsB },
    liftDataA,
    liftDataB,
  });

  // Sync to store when result changes (debounced)
  useEffect(() => {
    if (result) {
      addComparison(result, {
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, addComparison]);

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
      barStartHeightOffset: 0,
      chestSize: "average",
      squatDepth: "parallel",
    });

    setLiftDataB({
      ...liftDataB,
      liftFamily: newFamily,
      variant: defaultVariant,
      stance: "normal",
      pushupWeight: 0,
      barStartHeightOffset: 0,
      chestSize: "average",
      squatDepth: "parallel",
    });
  };

  const handleLiftDataAChange = (data: LiftData) => {
    setLiftDataA(data);
  };

  const handleLiftDataBChange = (data: LiftData) => {
    setLiftDataB(data);
  };

  // Hover state for visualizer
  const [hoveredSegment, setHoveredSegment] = useState<{
    lifter: "A" | "B";
    segment: string | string[] | null;
  }>({ lifter: "A", segment: null });

  // Derived state for display (includes hover previews for ratios AND height)
  const displayLifterA = {
    ...lifterA,
    height: previewA?.height ?? lifterA.height,
    torsoLegRatio: previewA?.torsoLegRatio ?? lifterA.torsoLegRatio,
    armLength: previewA?.armLength ?? lifterA.armLength,
    isCustom: customSegmentsA.enabled,
    customSegments: customSegmentsA.segments,
  };

  const displayLifterB = {
    ...lifterB,
    height: previewB?.height ?? lifterB.height,
    torsoLegRatio: previewB?.torsoLegRatio ?? lifterB.torsoLegRatio,
    armLength: previewB?.armLength ?? lifterB.armLength,
    isCustom: customSegmentsB.enabled,
    customSegments: customSegmentsB.segments,
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
    showToast("success", "Comparison restored");
  };

  const handleLoadProfileAsA = (profile: SavedProfile) => {
    setLifterA({
      height: profile.height,
      weight: profile.weight,
      sex: profile.sex,
      name: profile.name,
      torsoLegRatio: profile.torsoLegRatio,
      armLength: profile.armLength,
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
      torsoLegRatio: profile.torsoLegRatio,
      armLength: profile.armLength,
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

      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-8">
        <div className="flex justify-between items-start mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Biomechanical Comparison
            </h1>
            <p className="text-slate-400 max-w-3xl">
              Compare two lifters to see how biomechanics affect performance. Enter basic height and weight for quick estimation, or toggle &quot;Custom Segment Lengths&quot; to input specific measurements for advanced accuracy. Hover over any custom field for measurement instructions.
            </p>
          </div>
          <PersistenceTrigger
            onClick={() => openDrawer("history")}
            historyCount={comparisonHistory.length}
            profileCount={savedProfiles.length}
          />
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-950/20 border border-red-500/30 rounded-lg p-4 mb-6">
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

        {/* Calculating Pulse */}
        {isCalculating && (
          <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2 animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
            <span className="text-sm font-medium">Calculating...</span>
          </div>
        )}



        {/* Unified Input Section */}
        <div className="relative bg-slate-950/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl mb-8">
          {/* Header/Banner Effect */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-slate-800 to-orange-600 opacity-50 rounded-t-2xl" />

          <div className="p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px_1fr] gap-8 lg:gap-4">

              {/* Left: Lifter A Config */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2 border-b border-blue-900/30 pb-2">
                  {/* Name Input A */}
                  <input
                    type="text"
                    value={lifterA.name}
                    onChange={(e) => setLifterA({ ...lifterA, name: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    className="text-xl font-bold text-blue-400 bg-transparent border-none p-0 focus:ring-0 w-auto min-w-[100px] max-w-[200px] placeholder-blue-900"
                    placeholder="Lifter A"
                  />
                  <div className="h-4 w-[1px] bg-slate-800" />
                  {/* Basic Stats A */}
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span>{lifterA.height}m</span>
                    <span>•</span>
                    <span>{lifterA.weight}kg</span>
                  </div>
                </div>

                <BuildInput
                  height={lifterA.height}
                  weight={lifterA.weight}
                  sex={lifterA.sex}
                  torsoLegRatio={lifterA.torsoLegRatio}
                  armLength={lifterA.armLength}
                  onChange={(data) => setLifterA({ ...lifterA, ...data })}
                  isCustomMode={customSegmentsA.enabled}
                  onToggleMode={toggleCustomA}
                  onSegmentHover={(seg) => setHoveredSegment({ lifter: "A", segment: seg })}
                  customSegmentsSlot={
                    <ManualSegmentLengths
                      height={lifterA.height}
                      sex={lifterA.sex}
                      segments={customSegmentsA.segments}
                      onChange={updateCustomSegmentsA}
                      enabled={customSegmentsA.enabled}
                      onToggle={toggleCustomA}
                      color="blue"
                      headless={true}
                      onSegmentHover={(seg) => setHoveredSegment({ lifter: "A", segment: seg })}
                    />
                  }
                  onPreviewTorsoLeg={(v) => setPreviewA(p => ({ ...p, torsoLegRatio: v }))}
                  onPreviewArm={(v) => setPreviewA(p => ({ ...p, armLength: v }))}
                  onPreviewHeight={(v) => setPreviewA(p => ({ ...p, height: v }))}
                  onPreviewEnd={() => setPreviewA(null)}
                />
              </div>

              {/* Center: Live Visualizer Feed */}
              {/* Center: Live Visualizer Feed */}
              <div className="hidden lg:block relative h-full px-2 border-x border-slate-800/50 bg-slate-900/30 rounded-lg mx-2 min-h-[400px]">
                {/* Header Overlay */}
                <div className="absolute top-2 left-0 right-0 text-center z-10 pointer-events-none">
                  <div className="text-[10px] uppercase font-bold text-slate-600 tracking-widest bg-slate-950/50 inline-block px-2 rounded-full backdrop-blur-sm">Live Comparison</div>
                </div>

                {/* Full Container Visualizers */}
                <div className="absolute inset-0 flex items-end justify-center gap-4 pb-12 pt-8">
                  {/* Visualizer A */}
                  <div className="relative w-1/2 h-full flex items-end">
                    <ProportionVisualizer
                      lifter={displayLifterA}
                      referenceMaxHeight={Math.max(lifterA.height, lifterB.height, 2.4)}
                      hoveredSegment={hoveredSegment.lifter === "A" ? hoveredSegment.segment : null}
                      color="blue"
                      className="w-full h-full absolute inset-0"
                    />
                  </div>

                  {/* Visualizer B */}
                  <div className="relative w-1/2 h-full flex items-end">
                    <ProportionVisualizer
                      lifter={displayLifterB}
                      referenceMaxHeight={Math.max(lifterA.height, lifterB.height, 2.4)}
                      hoveredSegment={hoveredSegment.lifter === "B" ? hoveredSegment.segment : null}
                      color="orange"
                      className="w-full h-full absolute inset-0"
                    />
                  </div>
                </div>

                {/* Footer Overlay */}
                <div className="absolute bottom-4 left-0 right-0 text-center z-10 pointer-events-none">
                  <div className="px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[10px] font-medium text-slate-400 inline-block backdrop-blur-md">
                    Δ {(Math.abs(lifterA.height - lifterB.height) * 100).toFixed(0)}cm
                  </div>
                </div>
              </div>

              {/* Right: Lifter B Config */}
              <div className="space-y-4">
                <div className="flex items-center justify-end gap-3 mb-2 border-b border-orange-900/30 pb-2">
                  {/* Basic Stats B */}
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span>{lifterB.height}m</span>
                    <span>•</span>
                    <span>{lifterB.weight}kg</span>
                  </div>
                  <div className="h-4 w-[1px] bg-slate-800" />
                  {/* Name Input B */}
                  <input
                    type="text"
                    value={lifterB.name}
                    onChange={(e) => setLifterB({ ...lifterB, name: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    className="text-xl font-bold text-orange-400 bg-transparent border-none p-0 focus:ring-0 w-auto min-w-[100px] max-w-[200px] text-right placeholder-orange-900"
                    placeholder="Lifter B"
                  />
                </div>

                <BuildInput
                  height={lifterB.height}
                  weight={lifterB.weight}
                  sex={lifterB.sex}
                  torsoLegRatio={lifterB.torsoLegRatio}
                  armLength={lifterB.armLength}
                  onChange={(data) => setLifterB({ ...lifterB, ...data })}
                  isCustomMode={customSegmentsB.enabled}
                  onToggleMode={toggleCustomB}
                  onSegmentHover={(seg) => setHoveredSegment({ lifter: "B", segment: seg })}
                  customSegmentsSlot={
                    <ManualSegmentLengths
                      height={lifterB.height}
                      sex={lifterB.sex}
                      segments={customSegmentsB.segments}
                      onChange={updateCustomSegmentsB}
                      enabled={customSegmentsB.enabled}
                      onToggle={toggleCustomB}
                      color="orange"
                      headless={true}
                      onSegmentHover={(seg) => setHoveredSegment({ lifter: "B", segment: seg })}
                    />
                  }
                  onPreviewTorsoLeg={(v) => setPreviewB(p => ({ ...p, torsoLegRatio: v }))}
                  onPreviewArm={(v) => setPreviewB(p => ({ ...p, armLength: v }))}
                  onPreviewHeight={(v) => setPreviewB(p => ({ ...p, height: v }))}
                  onPreviewEnd={() => setPreviewB(null)}
                />
              </div>

            </div>
          </div>
        </div>

        {/* Results Section */}
        <div ref={resultsRef}>
          {isCalculating ? (
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl shadow-lg border border-slate-700 p-12 text-center animate-pulse">
              <div className="text-xl font-bold text-slate-400">Loading Biomechanics Engine...</div>
            </div>
          ) : result ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* 1. The Engine Room (Visualizer + Control) */}
              <EngineRoom
                result={result}
                inputs={{ lifterA, lifterB, liftDataA, liftDataB }}
                onLiftDataChangeA={handleLiftDataAChange}
                onLiftDataChangeB={handleLiftDataBChange}
                onLiftFamilyChange={handleLiftFamilyChange}
              />

              {/* Advanced Options Link */}
              <div className="text-center pt-8 border-t border-slate-200 text-slate-400 text-sm">
                Lever Biomechanics
              </div>
            </div>
          ) : null}
        </div>
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
