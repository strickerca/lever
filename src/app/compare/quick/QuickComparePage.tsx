"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AlertCircle, Share2, Check } from "lucide-react";
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
import { useAutoName } from "@/hooks/useAutoName";
import { EngineRoom } from "@/components/results/EngineRoom";
import { useUnits } from "@/hooks/useUnits";
import { formatHeight, formatWeight } from "@/lib/formatters";

// --- URL State Serialization ---

const VALID_TORSO_LEG: TorsoLegProportion[] = ["veryLongLegs", "longLegs", "average", "longTorso", "veryLongTorso"];
const VALID_ARM: ArmProportion[] = ["extraShort", "short", "average", "long", "extraLong"];
const VALID_SEX = ["male", "female"] as const;
const VALID_LIFT_FAMILY = ["squat", "deadlift", "bench", "pullup", "pushup", "ohp", "thruster"] as const;

function parseSearchParams(sp: URLSearchParams) {
  const p = (key: string) => sp.get(key);
  const num = (key: string, fallback: number) => {
    const v = p(key);
    if (v === null) return fallback;
    const n = parseFloat(v);
    return isNaN(n) ? fallback : n;
  };
  const enumVal = <T extends string>(key: string, valid: readonly T[], fallback: T): T => {
    const v = p(key);
    return v && (valid as readonly string[]).includes(v) ? (v as T) : fallback;
  };

  return {
    lifterA: {
      height: num("ah", 1.75),
      weight: num("aw", 77),
      sex: enumVal("as", VALID_SEX, "male") as Sex,
      torsoLegRatio: enumVal("atl", VALID_TORSO_LEG, "average"),
      armLength: enumVal("aa", VALID_ARM, "average"),
    },
    lifterB: {
      height: num("bh", 1.85),
      weight: num("bw", 88),
      sex: enumVal("bs", VALID_SEX, "male") as Sex,
      torsoLegRatio: enumVal("btl", VALID_TORSO_LEG, "average"),
      armLength: enumVal("ba", VALID_ARM, "average"),
    },
    lift: {
      liftFamily: enumVal("lf", VALID_LIFT_FAMILY, "squat") as LiftFamily,
      variant: p("lv") ?? "highBar",
      load: num("ll", 100),
      reps: num("lr", 5),
    },
  };
}

function buildSearchParams(
  lifterA: { height: number; weight: number; sex: Sex; torsoLegRatio: TorsoLegProportion; armLength: ArmProportion },
  lifterB: { height: number; weight: number; sex: Sex; torsoLegRatio: TorsoLegProportion; armLength: ArmProportion },
  liftDataA: LiftData
): string {
  const params = new URLSearchParams();
  params.set("ah", lifterA.height.toString());
  params.set("aw", lifterA.weight.toString());
  params.set("as", lifterA.sex);
  params.set("atl", lifterA.torsoLegRatio);
  params.set("aa", lifterA.armLength);
  params.set("bh", lifterB.height.toString());
  params.set("bw", lifterB.weight.toString());
  params.set("bs", lifterB.sex);
  params.set("btl", lifterB.torsoLegRatio);
  params.set("ba", lifterB.armLength);
  params.set("lf", liftDataA.liftFamily);
  params.set("lv", liftDataA.variant);
  params.set("ll", liftDataA.load.toString());
  params.set("lr", liftDataA.reps.toString());
  return params.toString();
}

// --- Defaults ---

const DEFAULT_LIFTER_A = {
  height: 1.75,
  weight: 77,
  sex: Sex.MALE,
  name: "Lifter A",
  torsoLegRatio: "average" as TorsoLegProportion,
  armLength: "average" as ArmProportion,
};

const DEFAULT_LIFTER_B = {
  height: 1.85,
  weight: 88,
  sex: Sex.MALE,
  name: "Lifter B",
  torsoLegRatio: "average" as TorsoLegProportion,
  armLength: "average" as ArmProportion,
};

const DEFAULT_LIFT_DATA: LiftData = {
  liftFamily: LiftFamily.SQUAT,
  variant: "highBar",
  load: 100,
  reps: 5,
  stance: "normal",
  pushupWeight: 0,
  barStartHeightOffset: 0,
  chestSize: "average",
  squatDepth: "parallel",
};

export default function QuickCompareClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { height: heightUnit, weight: weightUnit } = useUnits();

  // Parse URL params on mount
  const initialFromURL = useRef(parseSearchParams(searchParams));

  // Store
  const addComparison = useLeverStore((s) => s.addComparison);
  const savedProfiles = useLeverStore((s) => s.savedProfiles);
  const comparisonHistory = useLeverStore((s) => s.comparisonHistory);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"history" | "profiles">("history");

  // Share state
  const [justCopied, setJustCopied] = useState(false);

  // Auto-name hooks
  const autoNameUnit = heightUnit === "inches" ? "inches" as const : "cm" as const;
  const autoNameA = useAutoName(autoNameUnit);
  const autoNameB = useAutoName(autoNameUnit);

  // Lifter A state
  const [lifterA, setLifterA] = useState(() => ({
    ...DEFAULT_LIFTER_A,
    ...initialFromURL.current.lifterA,
    name: "Lifter A",
  }));

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
  const [lifterB, setLifterB] = useState(() => ({
    ...DEFAULT_LIFTER_B,
    ...initialFromURL.current.lifterB,
    name: "Lifter B",
  }));

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

  // Preview State
  const [previewA, setPreviewA] = useState<{ torsoLegRatio?: TorsoLegProportion, armLength?: ArmProportion, height?: number } | null>(null);
  const [previewB, setPreviewB] = useState<{ torsoLegRatio?: TorsoLegProportion, armLength?: ArmProportion, height?: number } | null>(null);

  const toggleCustomA = (enabled: boolean) => {
    const h = lifterA.height;
    if (enabled && customSegmentsA.segments.torso === 0.50) {
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

  // Lift state
  const [liftDataA, setLiftDataA] = useState<LiftData>(() => ({
    ...DEFAULT_LIFT_DATA,
    liftFamily: initialFromURL.current.lift.liftFamily,
    variant: initialFromURL.current.lift.variant,
    load: initialFromURL.current.lift.load,
    reps: initialFromURL.current.lift.reps,
  }));

  const [liftDataB, setLiftDataB] = useState<LiftData>(() => ({
    ...DEFAULT_LIFT_DATA,
    liftFamily: initialFromURL.current.lift.liftFamily,
    variant: initialFromURL.current.lift.variant,
    load: initialFromURL.current.lift.load,
    reps: initialFromURL.current.lift.reps,
  }));

  // --- Auto-name: generate initial names on mount ---
  useEffect(() => {
    autoNameA.maybeUpdateName(lifterA.name, lifterA, (name) =>
      setLifterA((prev) => ({ ...prev, name }))
    );
    autoNameB.maybeUpdateName(lifterB.name, lifterB, (name) =>
      setLifterB((prev) => ({ ...prev, name }))
    );
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- URL state sync (debounced write) ---
  const urlSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncURL = useCallback(() => {
    if (urlSyncTimer.current) clearTimeout(urlSyncTimer.current);
    urlSyncTimer.current = setTimeout(() => {
      const qs = buildSearchParams(lifterA, lifterB, liftDataA);
      router.replace(`?${qs}`, { scroll: false });
    }, 800);
  }, [lifterA, lifterB, liftDataA, router]);

  useEffect(() => {
    syncURL();
    return () => {
      if (urlSyncTimer.current) clearTimeout(urlSyncTimer.current);
    };
  }, [syncURL]);

  // Live Comparison Hook
  const { result, isCalculating, validationErrors } = useLiveComparison({
    lifterA: { ...lifterA, customSegments: customSegmentsA },
    lifterB: { ...lifterB, customSegments: customSegmentsB },
    liftDataA,
    liftDataB,
  });

  // Sync to store when result changes
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

  // Lift family change handler
  const handleLiftFamilyChange = (newFamily: LiftFamily) => {
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

  const handleLiftDataAChange = (data: LiftData) => setLiftDataA(data);
  const handleLiftDataBChange = (data: LiftData) => setLiftDataB(data);

  // Lifter A change handler — auto-name aware
  const handleLifterAChange = (data: { height: number; weight: number; sex: Sex; torsoLegRatio: TorsoLegProportion; armLength: ArmProportion }) => {
    const newLifter = { ...lifterA, ...data };
    autoNameA.maybeUpdateName(lifterA.name, newLifter, (name) => {
      newLifter.name = name;
    });
    setLifterA(newLifter);
  };

  // Lifter B change handler — auto-name aware
  const handleLifterBChange = (data: { height: number; weight: number; sex: Sex; torsoLegRatio: TorsoLegProportion; armLength: ArmProportion }) => {
    const newLifter = { ...lifterB, ...data };
    autoNameB.maybeUpdateName(lifterB.name, newLifter, (name) => {
      newLifter.name = name;
    });
    setLifterB(newLifter);
  };

  // Hover state for visualizer
  const [hoveredSegment, setHoveredSegment] = useState<{
    lifter: "A" | "B";
    segment: string | string[] | null;
  }>({ lifter: "A", segment: null });

  // Derived state for display
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

  // --- Share handler ---
  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setJustCopied(true);
      showToast("success", "Link copied to clipboard");
      setTimeout(() => setJustCopied(false), 2000);
    } catch {
      showToast("error", "Could not copy link");
    }
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border border-slate-700/60 text-slate-400 hover:border-blue-800/60 hover:text-blue-300 transition-all duration-200 cursor-pointer"
              title="Copy shareable link"
            >
              {justCopied ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              {justCopied ? "Copied" : "Share"}
            </button>
            <PersistenceTrigger
              onClick={() => openDrawer("history")}
              historyCount={comparisonHistory.length}
              profileCount={savedProfiles.length}
            />
          </div>
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
                  <input
                    type="text"
                    value={lifterA.name}
                    onChange={(e) => setLifterA({ ...lifterA, name: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    className="text-xl font-bold text-blue-400 bg-transparent border-none p-0 focus:ring-0 w-auto min-w-[100px] max-w-[200px] placeholder-blue-900"
                    placeholder="Lifter A"
                  />
                  <div className="h-4 w-[1px] bg-slate-800" />
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span>{formatHeight(lifterA.height, heightUnit === "inches" ? "inches" : "cm")}</span>
                    <span>&bull;</span>
                    <span>{formatWeight(lifterA.weight, weightUnit)}</span>
                  </div>
                </div>

                <BuildInput
                  height={lifterA.height}
                  weight={lifterA.weight}
                  sex={lifterA.sex}
                  torsoLegRatio={lifterA.torsoLegRatio}
                  armLength={lifterA.armLength}
                  onChange={handleLifterAChange}
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
              <div className="hidden lg:block relative h-full px-2 border-x border-slate-800/50 bg-slate-900/30 rounded-lg mx-2 min-h-[400px]">
                <div className="absolute top-2 left-0 right-0 text-center z-10 pointer-events-none">
                  <div className="text-[10px] uppercase font-bold text-slate-600 tracking-widest bg-slate-950/50 inline-block px-2 rounded-full backdrop-blur-sm">Live Comparison</div>
                </div>

                <div className="absolute inset-0 flex items-end justify-center gap-4 pb-12 pt-8">
                  <div className="relative w-1/2 h-full flex items-end">
                    <ProportionVisualizer
                      lifter={displayLifterA}
                      referenceMaxHeight={Math.max(lifterA.height, lifterB.height, 2.4)}
                      hoveredSegment={hoveredSegment.lifter === "A" ? hoveredSegment.segment : null}
                      color="blue"
                      className="w-full h-full absolute inset-0"
                    />
                  </div>
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

                <div className="absolute bottom-4 left-0 right-0 text-center z-10 pointer-events-none">
                  <div className="px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[10px] font-medium text-slate-400 inline-block backdrop-blur-md">
                    &Delta; {(Math.abs(lifterA.height - lifterB.height) * 100).toFixed(0)}cm
                  </div>
                </div>
              </div>

              {/* Right: Lifter B Config */}
              <div className="space-y-4">
                <div className="flex items-center justify-end gap-3 mb-2 border-b border-orange-900/30 pb-2">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span>{formatHeight(lifterB.height, heightUnit === "inches" ? "inches" : "cm")}</span>
                    <span>&bull;</span>
                    <span>{formatWeight(lifterB.weight, weightUnit)}</span>
                  </div>
                  <div className="h-4 w-[1px] bg-slate-800" />
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
                  onChange={handleLifterBChange}
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
        <div>
          {isCalculating ? (
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl shadow-lg border border-slate-700 p-12 text-center animate-pulse">
              <div className="text-xl font-bold text-slate-400">Loading Biomechanics Engine...</div>
            </div>
          ) : result ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <EngineRoom
                result={result}
                inputs={{ lifterA, lifterB, liftDataA, liftDataB }}
                onLiftDataChangeA={handleLiftDataAChange}
                onLiftDataChangeB={handleLiftDataBChange}
                onLiftFamilyChange={handleLiftFamilyChange}
              />

              <div className="text-center pt-8 border-t border-slate-800 text-slate-400 text-sm">
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
