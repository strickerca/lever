import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Flame, Gauge } from "lucide-react";
import { LiftFamily, Anthropometry, LiftMetrics, Sex, LiftData, ComparisonResult } from "@/types";
import { createPoseSolver, getThrusterROMParts } from "@/lib/animation/movements";
import { getAnimationPhase, calculateRepCycle } from "@/lib/animation/Animator";
import { Pose2D, MovementOptions } from "@/lib/animation/types";
import { calculateMetabolicCost } from "@/lib/biomechanics/physics";
import { createSimpleProfile } from "@/lib/biomechanics/anthropometry";
import {
  BENCH_PAD_THICKNESS_M,
  BENCH_PAD_SURFACE_HEIGHT_M,
  PULLUP_BAR_HEIGHT_M,
  PULLUP_BAR_WIDTH_M,
} from "@/lib/animation/constants";
import { STANDARD_PLATE_RADIUS, SEGMENT_MASS_RATIOS } from "@/lib/biomechanics/constants";
import { ForceVelocitySlider } from "./ForceVelocitySlider";
import { LifterPanel } from "./LifterPanel";
import { LiftSelector } from "../comparison/LiftSelector";
import { PostSimulationStats } from "../results/PostSimulationStats";
import { Settings2, X, RefreshCw } from "lucide-react";

interface UnifiedMovementAnimationProps {
  lifterA: {
    name: string;
    anthropometry: Anthropometry;
  };
  lifterB: {
    name: string;
    anthropometry: Anthropometry;
  };
  movement: LiftFamily;
  optionsA: MovementOptions;
  optionsB: MovementOptions;
  repsA: number;
  repsB: number;
  metricsA: LiftMetrics;
  metricsB: LiftMetrics;
  initialTime: number;
  externalVelocityA?: number;
  externalVelocityB?: number;
  hideControls?: boolean;

  // Data for Live Adjustments
  liftDataA?: LiftData;
  liftDataB?: LiftData;
  onLiftDataChangeA?: (data: LiftData) => void;
  onLiftDataChangeB?: (data: LiftData) => void;
  onLiftFamilyChange?: (family: LiftFamily) => void;
  result?: ComparisonResult;
}

const COLORS = {
  lifterA: "#00E5FF", // Neon Cyan
  lifterB: "#FF4081", // Neon Pink/Red
  bar: "#E0E0E0", // Bright Silver/White
  bench: "#1F2937", // Dark Gray (Gray-800)
  pullupBar: "#374151", // Gray-700
  joint: "#FFFFFF",
  outline: "rgba(0, 229, 255, 0.5)", // Default Glow
  floor: "#374151", // Dark Gray
  equipment: "#1F2937",
};

const CYBER_PALETTE = {
  cyan: "#00F0FF",
  magenta: "#FF0055", // Cyberpunk Red/Pink
  electricBlue: "#007AFF",
  neonGreen: "#39FF14",
  deepPurple: "#4D00FF",
  warning: "#F59E0B",
  danger: "#EF4444",
  void: "#050505", // Deep black
  grid: "rgba(0, 240, 255, 0.1)",
};

/**
 * Returns color based on torque stress (0.0 - 1.0)
 * Cool Blue (0.0) -> Purple (0.5) -> Hot Red (1.0)
 */
function getJointColor(currentTorque: number, maxTorque: number): string {
  const t = Math.min(Math.max(currentTorque / (maxTorque || 1), 0), 1);

  // HSL Interpolation for better gradients
  // 0.0 -> Blue (240deg)
  // 0.5 -> Purple (280deg)
  // 1.0 -> Red (360/0deg) - let's stop at Pink/Magenta (320) or go to Red (0)
  // Let's do: Cyan (180) -> Blue (240) -> Purple (280) -> Red (0/360)

  // Simple RGB Lerp approach for "Cool" to "Hot"
  // Low (0-0.5): Cyan (#00E5FF) to Purple (#AA00FF)
  // High (0.5-1.0): Purple (#AA00FF) to Red (#FF0000)

  if (t < 0.5) {
    // 0.0 to 0.5 normalize to 0.0-1.0
    return lerpColor("#00E5FF", "#AA00FF", t * 2);
  } else {
    // 0.5 to 1.0 normalize to 0.0-1.0
    return lerpColor("#AA00FF", "#FF0000", (t - 0.5) * 2);
  }
}

function getPhaseColor(velocity: number): string {
  const THRESHOLD = 0.05; // m/s deadzone

  if (velocity > THRESHOLD) {
    // Concentric / Ascending -> HOT (Red/Orange)
    return "#FF3D00"; // Deep Orange / Neon Red
  } else if (velocity < -THRESHOLD) {
    // Eccentric / Descending -> COOL (Cyan/Blue)
    return "#00E5FF"; // Cyan
  } else {
    // Static / Transition -> WHITE/NEUTRAL or Retain previous
    return "#FFFFFF";
  }
}

// Helper to interpolate colors
const lerpColor = (a: string, b: string, amount: number) => {
  const ah = parseInt(a.replace(/#/g, ''), 16),
    bh = parseInt(b.replace(/#/g, ''), 16),
    ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
    br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
    rr = ar + amount * (br - ar),
    rg = ag + amount * (bg - ag),
    rb = ab + amount * (bb - ab);

  return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1);
};


// ... (props interface remains same)









// ... (Velocity state code)










export function UnifiedMovementAnimation({
  lifterA,
  lifterB,
  movement,
  optionsA,
  optionsB,
  repsA,
  repsB,
  metricsA,
  metricsB,
  initialTime,
  externalVelocityA,
  externalVelocityB,
  hideControls = false,
  liftDataA,
  liftDataB,
  onLiftDataChangeA,
  onLiftDataChangeB,
  onLiftFamilyChange,
  result
}: UnifiedMovementAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0); // NEW: Optimization ref

  // Color State for Dynamic Tension
  const colorRefA = useRef<string>(COLORS.lifterA);
  const colorRefB = useRef<string>(COLORS.lifterB);

  // Previous Pose for Velocity Calculation
  const prevPoseRefA = useRef<{ y: number; time: number } | null>(null);
  const prevPoseRefB = useRef<{ y: number; time: number } | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState(0); // Keep for UI sync (scrubber) if needed, but rarely used now.
  // Actually, we can remove 'currentTime' state usage in the loop.
  // We'll keep it for initialized state.
  const [velocityUnit, setVelocityUnit] = useState<"metric" | "imperial">("metric");
  const [syncByTime, setSyncByTime] = useState(false);
  // Initialize with placeholder, will be updated by useEffect on mount/change
  const [timeInput, setTimeInput] = useState("0.00");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(false);

  // Create pose solvers for this movement
  const solver = useMemo(() => createPoseSolver(movement), [movement]);

  // Calculate ROMs
  const romA = useMemo(
    () => solver.getROM({ anthropometry: lifterA.anthropometry, movement, options: optionsA }),
    [solver, lifterA.anthropometry, movement, optionsA]
  );
  const romB = useMemo(
    () => solver.getROM({ anthropometry: lifterB.anthropometry, movement, options: optionsB }),
    [solver, lifterB.anthropometry, movement, optionsB]
  );

  const thrusterRomPartsA = useMemo(() => {
    if (movement !== LiftFamily.THRUSTER) return null;
    return getThrusterROMParts(lifterA.anthropometry);
  }, [movement, lifterA.anthropometry]);

  const thrusterRomPartsB = useMemo(() => {
    if (movement !== LiftFamily.THRUSTER) return null;
    return getThrusterROMParts(lifterB.anthropometry);
  }, [movement, lifterB.anthropometry]);

  // Calculate Standard Time (Average Person @ Average Velocity)
  // Used for "Sync By Time" default and initial velocity reference
  const standardTime = useMemo(() => {
    // 1. Average Anthropometry (178cm Male, 80kg)
    const avgHeight = 1.78;
    const avgMass = 80;
    const avgAnthro = createSimpleProfile(avgHeight, avgMass, Sex.MALE);

    // 2. Standard ROM using Average Body + Default Options
    // We use the same 'options' structure but applied to average body
    // This assumes "standard" movement execution using the provided options (e.g. grip width)
    const avgRomA = solver.getROM({ anthropometry: avgAnthro, movement, options: optionsA });
    const avgRomB = solver.getROM({ anthropometry: avgAnthro, movement, options: optionsB });

    // 3. Calculate Time at Standard Velocity (0.55 m/s)
    const AVG_VELOCITY = 0.55; // m/s
    const timeA = (avgRomA * repsA * 2) / AVG_VELOCITY;
    const timeB = (avgRomB * repsB * 2) / AVG_VELOCITY;

    // Default to the time required for the longer duration set
    return Math.max(timeA, timeB);
  }, [movement, solver, repsA, repsB, optionsA, optionsB]);

  const [velocityA_ms, setVelocityA_ms] = useState(0.55);
  const [velocityB_ms, setVelocityB_ms] = useState(0.55);

  // Sync with external props if provided
  useEffect(() => {
    if (externalVelocityA !== undefined) {
      setVelocityA_ms(externalVelocityA);
    }
  }, [externalVelocityA]);

  useEffect(() => {
    if (externalVelocityB !== undefined) {
      setVelocityB_ms(externalVelocityB);
    }
  }, [externalVelocityB]);

  const [velocityInputA, setVelocityInputA] = useState("0.55");
  const [velocityInputB, setVelocityInputB] = useState("0.55");


  // Reset defaults when the compared lifters/movement change.
  useEffect(() => {
    setVelocityA_ms(0.55);
    setVelocityB_ms(0.55);
    setTimeInput(standardTime.toFixed(2));
    setSyncByTime(false);
    setIsPlaying(false);
    startTimeRef.current = 0;
    setCurrentTime(0);
    currentTimeRef.current = 0;
  }, [movement, repsA, repsB, standardTime]);

  const parsedTimeInput = parseFloat(timeInput);
  const targetTimeSeconds =
    !Number.isFinite(parsedTimeInput) || parsedTimeInput <= 0
      ? standardTime
      : parsedTimeInput;

  // Calculate actual velocities
  const velocityA = syncByTime
    ? (romA * repsA * 2) / targetTimeSeconds
    : velocityA_ms;
  const velocityB = syncByTime
    ? (romB * repsB * 2) / targetTimeSeconds
    : velocityB_ms;

  const handleVelocityChangeA = (val: string) => {
    setVelocityInputA(val);
    // Allow any input while typing, but update physics if valid
    // We parse immediately to see if it's a valid velocity number
    const num = parseFloat(val);
    // Allow any positive number >= 0.01. No upper limit for manual entry.
    if (!isNaN(num) && num >= 0.01) {
      const ms = velocityUnit === "metric" ? num : num / 3.28084;
      // Only update if significantly different to allow typing decimals
      if (Math.abs(ms - velocityA_ms) > 0.001) {
        // Prevent model jump when paused by scaling current time proportionally
        if (!isPlaying && velocityA_ms > 0) {
          const ratio = velocityA_ms / ms;
          const newTime = currentTimeRef.current * ratio;
          setCurrentTime(newTime);
          currentTimeRef.current = newTime;
        }
        setVelocityA_ms(ms);
      }
    }
  };

  const handleVelocityBlurA = () => {
    const num = parseFloat(velocityInputA);
    if (isNaN(num) || num < 0.01) {
      setVelocityInputA("0.10");
      setVelocityA_ms(velocityUnit === "metric" ? 0.10 : 0.10 / 3.28084);
    } else {
      setVelocityInputA(num.toFixed(2));
    }
  };

  const handleVelocityChangeB = (val: string) => {
    setVelocityInputB(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0.01) {
      const ms = velocityUnit === "metric" ? num : num / 3.28084;
      if (Math.abs(ms - velocityB_ms) > 0.001) {
        if (!isPlaying && velocityB_ms > 0) {
          const ratio = velocityB_ms / ms;
          const newTime = currentTimeRef.current * ratio;
          setCurrentTime(newTime);
          currentTimeRef.current = newTime;
        }
        setVelocityB_ms(ms);
      }
    }
  };

  const handleVelocityBlurB = () => {
    const num = parseFloat(velocityInputB);
    if (isNaN(num) || num < 0.01) {
      setVelocityInputB("0.10");
      setVelocityB_ms(velocityUnit === "metric" ? 0.10 : 0.10 / 3.28084);
    } else {
      setVelocityInputB(num.toFixed(2));
    }
  };

  const handleGaugeChangeA = (val: number) => {
    // Determine unit conversion
    const ms = velocityUnit === "metric" ? val : val / 3.28084;

    // Prevent jump
    if (!isPlaying && velocityA_ms > 0 && ms > 0) {
      const ratio = velocityA_ms / ms;
      const newTime = currentTimeRef.current * ratio;
      setCurrentTime(newTime);
      currentTimeRef.current = newTime;
    }

    setVelocityA_ms(ms);
    setVelocityInputA(val.toFixed(2));
  };

  const handleGaugeChangeB = (val: number) => {
    const ms = velocityUnit === "metric" ? val : val / 3.28084;

    if (!isPlaying && velocityB_ms > 0 && ms > 0) {
      const ratio = velocityB_ms / ms;
      const newTime = currentTimeRef.current * ratio;
      setCurrentTime(newTime);
      currentTimeRef.current = newTime;
    }

    setVelocityB_ms(ms);
    setVelocityInputB(val.toFixed(2));
  };

  const handleTimeChange = (val: string) => {
    setTimeInput(val);
  };

  const handleTimeBlur = () => {
    const val = parseFloat(timeInput);
    if (isNaN(val) || val <= 0) {
      setTimeInput(standardTime.toFixed(2));
    } else {
      // Format nicely
      setTimeInput(val.toFixed(2));
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    currentTimeRef.current = 0;
    startTimeRef.current = 0;
    setShowResults(false);
    setAnimationFinished(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  // Calculate times
  const timeA = (romA * repsA * 2) / velocityA;
  const timeB = (romB * repsB * 2) / velocityB;

  const handlePlayPause = () => {
    if (renderError) return;

    // Auto-restart if we are at the end
    if (!isPlaying && currentTimeRef.current >= Math.max(timeA, timeB) - 0.05) {
      setCurrentTime(0);
      currentTimeRef.current = 0;
      startTimeRef.current = 0;
      setShowResults(false);
    }

    if (isPlaying) {
      startTimeRef.current = 0;
    } else {
      setShowResults(false);
      setAnimationFinished(false);
    }
    setIsPlaying(!isPlaying);
  };

  // Spacebar Interaction
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault(); // Prevent scrolling
        handlePlayPause();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, currentTime, renderError, handlePlayPause]);

  // Power calculations (use metrics.totalWork isntead of passed work prop) - ensure positive
  const powerA = Math.abs(metricsA.totalWork) / timeA;
  const powerB = Math.abs(metricsB.totalWork) / timeB;

  // Dynamic Calorie Calculation
  // We use the time per rep derived from the current interactive velocity
  const timePerRepA = timeA / repsA;
  const timePerRepB = timeB / repsB;

  const dynamicCaloriesA = calculateMetabolicCost(
    Math.abs(metricsA.totalWork),
    metricsA.demandFactor,
    romA,
    repsA,
    timePerRepA
  );

  const dynamicCaloriesB = calculateMetabolicCost(
    Math.abs(metricsB.totalWork),
    metricsB.demandFactor,
    romB,
    repsB,
    timePerRepB
  );


  // Display velocities
  const displayVelocityA = velocityUnit === "metric" ? velocityA_ms : velocityA_ms * 3.28084;
  const displayVelocityB = velocityUnit === "metric" ? velocityB_ms : velocityB_ms * 3.28084;

  // Update input fields when unit changes or ext velocity updates
  // Only update if the value is significantly different to prevent cursor jumping while typing
  useEffect(() => {
    const current = parseFloat(velocityInputA);
    if (!isNaN(current) && Math.abs(current - displayVelocityA) < 0.01) return;
    setVelocityInputA(displayVelocityA.toFixed(2));
  }, [velocityUnit, displayVelocityA]);

  useEffect(() => {
    const current = parseFloat(velocityInputB);
    if (!isNaN(current) && Math.abs(current - displayVelocityB) < 0.01) return;
    setVelocityInputB(displayVelocityB.toFixed(2));
  }, [velocityUnit, displayVelocityB]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === 0) {
        // Calculate the "virtual" start time based on where we currently are in the animation
        startTimeRef.current = timestamp - (currentTime * 1000);
      }

      const elapsed = (timestamp - startTimeRef.current) / 1000;
      setCurrentTime(elapsed);

      const maxTime = Math.max(timeA, timeB);
      if (elapsed >= maxTime) {
        // Calculate progress here to use in the condition
        const progressA = elapsed >= timeA ? 1 : elapsed / timeA;
        const progressB = elapsed >= timeB ? 1 : elapsed / timeB;

        if (progressA >= 1.0 && progressB >= 1.0) {
          setIsPlaying(false);
          setCurrentTime(maxTime); // Ensure current time is set to max
          // Show results if we have them (assuming 'result' is available in scope or passed)
          // Note: 'result' is not defined in this scope. Assuming it refers to a state or prop.
          // For now, I'll assume `true` for demonstration or that `result` will be defined elsewhere.
          // If `result` is meant to be `metricsA` or `metricsB` or a combined result, it needs to be clarified.
          // For now, I'll use a placeholder `true` or remove the `if (result)` if it's not meant to be a specific variable.
          // Given the context, `setShowResults(true)` is likely intended to always happen when both are complete.
          setAnimationFinished(true);
          // setShowResults(true); // Changed: User initiates this manually now
          return;
        }
        // If elapsed >= maxTime but not both progress are 1.0, continue playing until both are 1.0
        // This case should ideally not happen if maxTime is correctly calculated based on both.
        // However, if one finishes much earlier, this logic might be intended to wait for the slower one.
        // For now, I'll keep the original behavior for the `elapsed >= maxTime` case if the new condition isn't met.
        setIsPlaying(false);
        setCurrentTime(maxTime);
        return;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, timeA, timeB]);

  // ---------------------------------------------------------------------------
  // OPTIMIZED DRAWING LOOP
  // ---------------------------------------------------------------------------

  const drawFrame = (currentSimTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // CLEAR CANVAS (Deep Black)
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate scale
    const segmentsA = lifterA.anthropometry.segments;
    const segmentsB = lifterB.anthropometry.segments;

    // 0. Draw Background Grid
    const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)"; // Faint White
      ctx.lineWidth = 1;
      const step = 50;
      ctx.beginPath();
      for (let x = 0; x <= w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let y = 0; y <= h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke();
    };
    drawGrid(ctx, canvas.width, canvas.height);

    const paddingTop = 60;
    const paddingBottom = 240;
    const availableHeight = canvas.height - paddingTop - paddingBottom;
    const floorY = canvas.height - paddingBottom;

    let requiredHeight = Math.max(segmentsA.height, segmentsB.height);
    if (movement === LiftFamily.PULLUP) requiredHeight = Math.max(requiredHeight, 2.5);
    if (movement === LiftFamily.OHP || movement === LiftFamily.THRUSTER) {
      // ... simplified overhead height check or trust existing logic
      // For brevity in replacement, let's use a safe overhead addition
      requiredHeight *= 1.4;
    }
    const scale = availableHeight / requiredHeight;

    try {
      // ... (Progress calculations)
      const progressA = currentSimTime >= timeA ? 1 : currentSimTime / timeA;
      const progressB = currentSimTime >= timeB ? 1 : currentSimTime / timeB;

      const repProgressA = (progressA * repsA) % 1;
      const repProgressB = (progressB * repsB) % 1;
      const cycleConfigA = calculateRepCycle(romA, velocityA);
      const cycleConfigB = calculateRepCycle(romB, velocityB);

      // ... (Phase calculations)
      // ... (Phase calculations)
      let phaseA, phaseB;
      if (movement === LiftFamily.THRUSTER) {
        const partsA = thrusterRomPartsA || { squatROM: 0, pressROM: 0 };
        const partsB = thrusterRomPartsB || { squatROM: 0, pressROM: 0 };
        phaseA = getAnimationPhase(movement, repProgressA, cycleConfigA, partsA.squatROM, partsA.pressROM);
        phaseB = getAnimationPhase(movement, repProgressB, cycleConfigB, partsB.squatROM, partsB.pressROM);
      } else {
        phaseA = getAnimationPhase(movement, repProgressA, cycleConfigA);
        phaseB = getAnimationPhase(movement, repProgressB, cycleConfigB);
      }

      // Solve - Logic
      const resultA = solver.solve({ anthropometry: lifterA.anthropometry, movement, options: optionsA, phase: phaseA });
      const resultB = solver.solve({ anthropometry: lifterB.anthropometry, movement, options: optionsB, phase: phaseB });

      // --- DYNAMIC TENSION UPDATE (Visual only, no state) ---
      const updateColor = (
        pose: Pose2D,
        prevRef: React.MutableRefObject<{ y: number; time: number } | null>,
        colorRef: React.MutableRefObject<string>
      ) => {
        // Use Bar Y or Shoulder Y (if no bar) for velocity
        const currentY = pose.bar ? pose.bar.y : pose.shoulder.y;
        const now = currentSimTime;

        if (prevRef.current) {
          const dt = now - prevRef.current.time;
          if (dt > 0.001) {
            const dy = currentY - prevRef.current.y;
            const velocity = dy / dt; // Positive = Ascending (Physical Up)

            const targetColor = getPhaseColor(velocity);
            // Smooth transition (Lerp)
            colorRef.current = lerpColor(colorRef.current, targetColor, 0.15); // 15% blend per frame
          }
        }
        prevRef.current = { y: currentY, time: now };
      };

      if (resultA.valid) updateColor(resultA.pose, prevPoseRefA, colorRefA);
      if (resultB.valid) updateColor(resultB.pose, prevPoseRefB, colorRefB);

      // Draw Figures
      const spacing = canvas.width / 4;

      // Draw Equipment
      // eslint-disable-next-line react-hooks/immutability
      drawEquipment(ctx, movement, spacing, floorY, scale);
      drawEquipment(ctx, movement, spacing * 3, floorY, scale);

      // Simplified Draw calls (Single Pass for now to ensure function valid)
      if (resultA.valid) {
        // eslint-disable-next-line react-hooks/immutability
        drawFigure(ctx, resultA.pose, spacing, floorY, scale, colorRefA.current, lifterA.name, lifterA.anthropometry, movement, optionsA);
      }
      if (resultB.valid) {
        drawFigure(ctx, resultB.pose, spacing * 3, floorY, scale, colorRefB.current, lifterB.name, lifterB.anthropometry, movement, optionsB);
      }





      // Draw Overlays (Torque & CoM) - Phase 2 Features
      // Lifter A
      // eslint-disable-next-line react-hooks/immutability
      drawCoMTracker(ctx, resultA.pose, lifterA.anthropometry, optionsA.load || 0, spacing, floorY, scale);
      // eslint-disable-next-line react-hooks/immutability
      drawTorqueOverlay(ctx, resultA.pose, spacing, floorY, scale, movement);

      // Lifter B
      drawCoMTracker(ctx, resultB.pose, lifterB.anthropometry, optionsB.load || 0, spacing * 3, floorY, scale);
      drawTorqueOverlay(ctx, resultB.pose, spacing * 3, floorY, scale, movement);

      // Stopwatch Drawer (Above Lifters)
      const drawStopwatch = (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        time: number,
        isFinished: boolean,
        color: string
      ) => {
        const size = 60;

        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // 1. Digital Time Display
        ctx.font = "900 48px monospace";
        // Glow effect if finished
        if (isFinished) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 15;
        }
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(time.toFixed(2), x, y);

        // "s" unit
        ctx.font = "bold 14px sans-serif";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("s", x + 50, y + 2);

        // Label
        ctx.font = "bold 10px sans-serif";
        ctx.fillStyle = isFinished ? color : "#64748b";
        ctx.fillText(isFinished ? "FINAL TIME" : "TIME", x, y - 25);

        ctx.restore();
      };

      // Stopwatch Logic
      const stopwatchY = 35;

      const currentA = Math.min(currentSimTime, timeA);
      const currentB = Math.min(currentSimTime, timeB);

      const finishedA = currentSimTime >= timeA;
      const finishedB = currentSimTime >= timeB;

      drawStopwatch(ctx, spacing, stopwatchY, currentA, finishedA, COLORS.lifterA);
      drawStopwatch(ctx, spacing * 3, stopwatchY, currentB, finishedB, COLORS.lifterB);

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setRenderError((prev) => (prev === message ? prev : message));
      // Log err to canvas
      if (ctx) {
        ctx.fillStyle = "#DC2626";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Animation error", canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillText(message, canvas.width / 2, canvas.height / 2 + 10);
      }
    }
  };

  // High-performance Animation Loop
  useEffect(() => {
    if (!isPlaying) {
      // When paused, draw static frame at current Ref time
      drawFrame(currentTimeRef.current);
      return;
    }

    const animate = (timestamp: number) => {
      if (startTimeRef.current === 0) {
        startTimeRef.current = timestamp - (currentTimeRef.current * 1000);
      }

      const elapsed = (timestamp - startTimeRef.current) / 1000;
      currentTimeRef.current = elapsed;

      const maxTime = Math.max(timeA, timeB);

      // Draw frame
      drawFrame(elapsed);

      // Check finish
      if (elapsed >= maxTime) {
        // Optionally update state to stop UI
        // To avoid race conditions, we can use a check in the next frame or just stop
        // But we need to update 'isPlaying' state to false.
        // This triggers a re-render.
        setIsPlaying(false);
        currentTimeRef.current = maxTime;
        setCurrentTime(maxTime); // Sync UI at end
        setAnimationFinished(true);
        return;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, timeA, timeB, movement, optionsA, optionsB, lifterA, lifterB, romA, romB, velocityA, velocityB, thrusterRomPartsA, thrusterRomPartsB]); // Add deps

  // Effect to re-draw when non-playing parameters change
  useEffect(() => {
    if (!isPlaying) {
      drawFrame(currentTimeRef.current);
    }
  }, [movement, optionsA, optionsB, lifterA, lifterB, timeA, timeB, romA, romB, thrusterRomPartsA, thrusterRomPartsB]);


  function drawEquipment(
    ctx: CanvasRenderingContext2D,
    movement: LiftFamily,
    offsetX: number,
    offsetY: number,
    scale: number
  ) {
    if (movement === LiftFamily.BENCH) {
      // Draw bench (to scale) - Behind View: We see the WIDTH (cross-section)
      const benchHeightM = BENCH_PAD_SURFACE_HEIGHT_M;
      const benchWidthM = 0.30;
      const benchThicknessM = BENCH_PAD_THICKNESS_M;

      const benchHalfWidthPx = (benchWidthM / 2) * scale;
      const benchThicknessPx = Math.max(6, benchThicknessM * scale);

      const benchSurfaceY = offsetY - benchHeightM * scale;
      const benchBottomY = benchSurfaceY + benchThicknessPx;

      ctx.fillStyle = COLORS.bench;
      ctx.fillRect(
        offsetX - benchHalfWidthPx,
        benchSurfaceY,
        benchHalfWidthPx * 2,
        benchThicknessPx
      );

      const legWidthPx = Math.max(4, 0.05 * scale);
      const legHeightPx = (offsetY - 1) - benchBottomY;
      const legInsetPx = benchHalfWidthPx * 0.6;

      ctx.fillRect(offsetX - legInsetPx, benchBottomY, legWidthPx, legHeightPx);
      ctx.fillRect(offsetX + legInsetPx - legWidthPx, benchBottomY, legWidthPx, legHeightPx);
    } else if (movement === LiftFamily.PULLUP) {
      // Draw pullup bar (to scale)
      const barHeightM = PULLUP_BAR_HEIGHT_M;
      const barWidthM = PULLUP_BAR_WIDTH_M;
      const barY = offsetY - barHeightM * scale;
      const halfWidthPx = (barWidthM / 2) * scale;
      ctx.strokeStyle = COLORS.pullupBar;
      ctx.lineWidth = Math.max(6, 0.035 * scale);
      ctx.beginPath();
      ctx.moveTo(offsetX - halfWidthPx, barY);
      ctx.lineTo(offsetX + halfWidthPx, barY);
      ctx.stroke();

      // Support posts
      ctx.fillStyle = COLORS.pullupBar;
      const postWidthPx = Math.max(4, 0.05 * scale);
      const postHeightPx = offsetY - barY;
      ctx.fillRect(offsetX - halfWidthPx, barY, postWidthPx, postHeightPx);
      ctx.fillRect(offsetX + halfWidthPx - postWidthPx, barY, postWidthPx, postHeightPx);
    }
  }
  // We need duplicatable logic or a mode arg? 
  // Let's make helper functions that share common logic.





  // ---------------------------------------------------------------------------
  // Advanced Visualizations (Phase 2)
  // ---------------------------------------------------------------------------

  /**
   * Calculates System Center of Mass (Body + Load)
   * Uses simplified segment mass distribution
   */
  function calculateSystemCoM(
    pose: Pose2D,
    anthropometry: Anthropometry,
    load: number
  ): number {
    // Segment mass fractions (De Leva / Winter simplified)
    const M_TRUNK = 0.50; // Head + Trunk + Arms (simplified upper body block)
    const M_THIGHS = 0.20;
    const M_SHANKS = 0.10;
    // Feet ~0.03 (neglect or assume fixed at 0)
    // Remaining ~0.17 distributed or approximate.
    // Let's normalize to 1.0 body mass for simplicity.
    // Better: Trunk+Head(58%), Arms(10%), Thighs(20%), Shanks(9%), Feet(3%).

    const mBody = anthropometry.mass;

    // Centers of Mass (X coordinates)
    // 1. Trunk (Midpoint Shoulder-Hip)
    // For Bench, we force the body segments to be centered (X=0) because the "pose" provided by the solver
    // only represents the right-side vector, but the physical body is symmetric around X=0.
    const isBench = pose.bar && pose.bar.y > 0 && Math.abs(pose.hip.x) < 0.01; // Quick heuristc or use prop?
    // Actually we don't have 'movement' passed here efficiently, but we can check if hip.x is 0 (Bench/Squat center) 
    // and shoulder is offset. Wait, Bench hip is 0, Shoulder is 0.22.
    // Squat: Hip 0, Shoulder 0? (Side view).
    // Let's rely on the fact that for Bench, the CoM X should be 0.
    // Or better: Pass movement type to this function? No, signature fixed.
    // Let's use the layout: If shoulder.x != hip.x and hip.x == 0... likely Bench bilateral.
    // But safer: just center it if it looks like Bench.
    // Actually, X=0 is safe for all "Frontal" views if centered.
    // But let's look at calculating it:

    // HACK: Detect Bench by hip=0 and shoulder!=0 (and pose.contacts.leftHand != null implies bilateral)
    const isBilateralBench = pose.contacts.leftHand && pose.hip.x === 0 && pose.shoulder.x > 0.1;

    const xTrunk = isBilateralBench ? 0 : (pose.shoulder.x + pose.hip.x) / 2;

    // 2. Thighs (Midpoint Hip-Knee)
    const xThighs = isBilateralBench ? 0 : (pose.hip.x + pose.knee.x) / 2;

    // 3. Shanks (Midpoint Knee-Ankle)
    const xShanks = isBilateralBench ? 0 : (pose.knee.x + pose.ankle.x) / 2;

    // 4. Bar (Load)
    const xBar = pose.bar ? pose.bar.x : xTrunk; // Default to body center if no bar

    // Moments
    const momentBody =
      (xTrunk * 0.60 * mBody) +
      (xThighs * 0.25 * mBody) +
      (xShanks * 0.15 * mBody);

    const momentSystem = momentBody + (xBar * load);
    const totalMass = mBody + load;

    return momentSystem / totalMass;
  }

  function drawCoMTracker(
    ctx: CanvasRenderingContext2D,
    pose: Pose2D,
    anthropometry: Anthropometry,
    load: number,
    offsetX: number,
    offsetY: number,
    scale: number
  ) {
    if (!pose.bar) return; // Only makes sense with load

    const comX = calculateSystemCoM(pose, anthropometry, load);

    // Draw CoM Dot on Floor
    const screenX = offsetX + comX * scale;
    const screenY = offsetY; // On floor line

    // Stability Zone (Midfoot +/- 10cm)
    const stabilityRadiusPx = 0.10 * scale;

    ctx.fillStyle = "rgba(16, 185, 129, 0.2)"; // Green fade
    ctx.beginPath();
    ctx.arc(offsetX, screenY, stabilityRadiusPx, 0, Math.PI * 2);
    ctx.fill();

    // Dot
    const isStable = Math.abs(comX) < 0.10;
    ctx.fillStyle = isStable ? "#10B981" : "#EF4444"; // Green or Red
    ctx.beginPath();
    ctx.arc(screenX, screenY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    ctx.fillStyle = isStable ? "#059669" : "#B91C1C";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CoM", screenX, screenY - 10);
  }

  function drawTorqueOverlay(
    ctx: CanvasRenderingContext2D,
    pose: Pose2D,
    offsetX: number,
    offsetY: number,
    scale: number,
    movement: LiftFamily
  ) {
    if (!pose.bar) return;
    if (movement === LiftFamily.BENCH || movement === LiftFamily.PULLUP || movement === LiftFamily.PUSHUP) return;

    const barX = pose.bar.x; // Line of Force (Gravity Vector)

    // Joints to analyze
    const joints = [
      { name: "Hip", pos: pose.hip },
      { name: "Knee", pos: pose.knee }
    ];

    joints.forEach(j => {
      const momentArmM = Math.abs(j.pos.x - barX);
      if (momentArmM < 0.02) return; // Ignore negligible torque

      const screenY = offsetY - j.pos.y * scale;
      const startX = offsetX + j.pos.x * scale;
      const endX = offsetX + barX * scale;

      // Color coding (Red > 15cm, Yellow > 5cm)
      let color = "#10B981"; // Green
      if (momentArmM > 0.15) color = "#EF4444"; // Red
      else if (momentArmM > 0.05) color = "#F59E0B"; // Yellow

      // Draw Vector
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(startX, screenY);
      ctx.lineTo(endX, screenY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Tick
      ctx.beginPath();
      ctx.arc(startX, screenY, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Label
      ctx.fillStyle = color;
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      // Offset text slightly above line
      const midX = (startX + endX) / 2;
      ctx.fillText(`${(momentArmM * 100).toFixed(0)}cm`, midX, screenY - 4);
    });
  }

  function drawFigure(
    ctx: CanvasRenderingContext2D,
    pose: Pose2D,
    offsetX: number,
    offsetY: number,
    scale: number,
    color: string,
    label: string,
    anthropometry: Anthropometry,
    movement: LiftFamily,
    options: MovementOptions
  ) {
    const toCanvas = (pos: { x: number; y: number }) => ({
      x: offsetX + pos.x * scale,
      y: offsetY - pos.y * scale,
    });

    // --- MOCK TORQUE CALCULATION (Visual Only) ---
    const kneeAngle = pose.angles.knee;
    const kneeStress = Math.max(0, Math.min(1, (180 - kneeAngle) / 100));
    const hipAngle = pose.angles.hip;
    const hipStress = Math.max(0, Math.min(1, (180 - hipAngle) / 80));
    const shoulderStress = 0.4; // Static for now

    const kneeColor = getJointColor(kneeStress, 1.0);
    const hipColor = getJointColor(hipStress, 1.0);
    const shoulderColor = getJointColor(shoulderStress, 1.0);
    const defaultOrbColor = getJointColor(0.1, 1.0);

    const ankle = toCanvas(pose.ankle);
    const knee = toCanvas(pose.knee);
    const hip = toCanvas(pose.hip);
    const shoulder = toCanvas(pose.shoulder);
    const elbow = pose.elbow ? toCanvas(pose.elbow) : null;
    const wrist = pose.wrist ? toCanvas(pose.wrist) : null;
    const toe = toCanvas(pose.toe);

    const segments = anthropometry.segments;
    const totalMass = anthropometry.mass;

    // --- HELPER: Bone radius approximation (visual only) ---
    const getSegmentRadiusM = (segmentId: keyof typeof SEGMENT_MASS_RATIOS.male, lengthM: number): number => {
      // Scale primarily with segment length (stylized skeleton; not muscle volume).
      const base = lengthM * 0.072;

      let factor = 1.0;
      if (segmentId === "femur") factor = 1.05;
      else if (segmentId === "tibia") factor = 1.0;
      else if (segmentId === "upperArm") factor = 0.95;
      else if (segmentId === "forearm") factor = 0.9;

      const radius = base * factor;
      return Math.max(0.016, Math.min(radius, 0.04));
    };

    // --- BONE RENDERER (Inner Layer) ---
    const drawBone = (from: { x: number; y: number }, to: { x: number; y: number }, widthM: number) => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.sqrt(dx * dx + dy * dy);

      ctx.save();
      ctx.translate(from.x, from.y);
      ctx.rotate(Math.atan2(dy, dx));

      // Style: Bone white + cyberpunk glow
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;

      // GEOMETRY FIX: Clamp width to avoid shape degeneration on short segments
      // Max width is 40% of length to ensure room for taper
      const maxW = len * 0.4;
      const rawWidthPx = Math.max(widthM * scale * 0.85, 4);
      const widthPx = Math.min(rawWidthPx, maxW);

      // REFINEMENT 3: Longer shafts, sharp expansion to ball ends

      const epiphysisW = widthPx * 0.78;
      const diaphysisW = widthPx * 0.32;
      const jointPad = Math.min(widthPx * 0.8, len * 0.1);

      // Shaft extension points
      // Expand "late": Shaft stays thin until very close to the ends
      let shaftStart = Math.max(len * 0.15, jointPad + epiphysisW * 0.8);
      let shaftEnd = Math.min(len * 0.85, len - (jointPad + epiphysisW * 0.8));

      // SAFETY: If bone is too short, the "long shaft" logic breaks.
      // If shaftStart >= shaftEnd, we have no room for a shaft. 
      // Fallback: Just draw two connected balls or a simple dogbone.
      const isShortBone = shaftStart >= shaftEnd;
      if (isShortBone) {
        shaftStart = len * 0.4;
        shaftEnd = len * 0.6;
        // Relax the width constraints for short bones
      }

      ctx.beginPath();

      // --- START END (Ball) ---
      // 1. Tip of Start Ball (Center of Joint roughly)
      ctx.moveTo(jointPad, -epiphysisW / 2);

      // 2. Round Cap (Ball end)
      ctx.bezierCurveTo(
        jointPad - epiphysisW * 0.6, -epiphysisW / 2,
        jointPad - epiphysisW * 0.6, epiphysisW / 2,
        jointPad, epiphysisW / 2
      );

      // 3. Sharp Taper to Shaft
      if (!isShortBone) {
        ctx.quadraticCurveTo(
          jointPad + epiphysisW * 0.5, epiphysisW / 2, // Check CP
          shaftStart, diaphysisW / 2
        );
        // 4. Manual Shaft (Bottom)
        ctx.lineTo(shaftEnd, diaphysisW / 2);
        // 5. Sharp Taper to End Ball
        ctx.quadraticCurveTo(
          len - (jointPad + epiphysisW * 0.5), epiphysisW / 2,
          len - jointPad, epiphysisW / 2
        );
      } else {
        // Simple curve for short bone
        ctx.quadraticCurveTo(len * 0.5, diaphysisW / 2, len - jointPad, epiphysisW / 2);
      }

      // 6. End Cap Rounding
      ctx.bezierCurveTo(
        len - jointPad + epiphysisW * 0.6, epiphysisW / 2,
        len - jointPad + epiphysisW * 0.6, -epiphysisW / 2,
        len - jointPad, -epiphysisW / 2
      );

      // 7. Sharp Taper to Shaft (Top)
      if (!isShortBone) {
        ctx.quadraticCurveTo(
          len - (jointPad + epiphysisW * 0.5), -epiphysisW / 2,
          shaftEnd, -diaphysisW / 2
        );
        // 8. Manual Shaft (Top)
        ctx.lineTo(shaftStart, -diaphysisW / 2);
        // 9. Sharp Taper back to Start Ball
        ctx.quadraticCurveTo(
          jointPad + epiphysisW * 0.5, -epiphysisW / 2,
          jointPad, -epiphysisW / 2
        );
      } else {
        ctx.quadraticCurveTo(len * 0.5, -diaphysisW / 2, jointPad, -epiphysisW / 2);
      }

      ctx.closePath();
      ctx.fill();

      // Subtle highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
      ctx.fill();

      // Neon tint pass (gives a cyber core)
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();

      // Cyber outline (multi-pass glow)
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = color;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.shadowColor = color;

      ctx.globalAlpha = 0.18;
      ctx.lineWidth = Math.max(2, widthPx * 0.28);
      ctx.shadowBlur = 40;
      ctx.stroke();

      ctx.globalAlpha = 0.45;
      ctx.lineWidth = Math.max(1.6, widthPx * 0.14);
      ctx.shadowBlur = 24;
      ctx.stroke();

      ctx.globalAlpha = 0.9;
      ctx.lineWidth = Math.max(1.2, widthPx * 0.07);
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.restore();
      ctx.restore();
    };

    // --- SPINE + RIBCAGE (Skeleton Torso) ---
    const drawSpine = (from: { x: number; y: number }, to: { x: number; y: number }, widthM: number, isBilateral: boolean) => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const angle = Math.atan2(dy, dx);

      // Use foot direction to infer "front" for side-view rib curvature.
      const toeDx = pose.toe.x - pose.ankle.x;
      const frontSign = Math.abs(toeDx) < 1e-6 ? 1 : Math.sign(toeDx);

      const BONE = "rgba(255, 255, 255, 0.92)";
      const BONE_OUTLINE = "rgba(255, 255, 255, 0.55)";

      // Keep torso bones slimmer than limbs to avoid a "pill body".
      const spinePx = Math.max(3, Math.min(11, widthM * scale * 0.65));
      const ribStroke = Math.max(1.2, spinePx * 0.35);

      ctx.save();
      ctx.translate(from.x, from.y);
      ctx.rotate(angle);

      // 1) Spine core
      ctx.save();
      ctx.strokeStyle = BONE_OUTLINE;
      ctx.lineWidth = Math.max(2, spinePx * 0.55);
      ctx.lineCap = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(len, 0);
      ctx.stroke();
      ctx.restore();

      // Cyber glow spine pass
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = color;
      ctx.lineWidth = spinePx * 0.9;
      ctx.lineCap = "round";
      ctx.globalAlpha = 0.18;
      ctx.shadowColor = color;
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(len, 0);
      ctx.stroke();
      ctx.restore();

      // 2) Vertebrae (simple stacked ovals)
      const vertebraCount = Math.max(7, Math.min(15, Math.round(len / (spinePx * 2.4))));
      const step = len / (vertebraCount + 1);
      ctx.save();
      ctx.fillStyle = BONE;
      ctx.shadowColor = color;
      ctx.shadowBlur = 5;
      for (let i = 1; i <= vertebraCount; i++) {
        const x = i * step;
        const t = i / (vertebraCount + 1);
        const bulge = 0.9 + 0.25 * Math.sin(Math.PI * t);
        const halfAlong = Math.max(step * 0.35, spinePx * 0.55);
        const halfAcross = spinePx * 0.95 * bulge;

        ctx.beginPath();
        ctx.ellipse(x, 0, halfAlong, halfAcross, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 3) Rib cage (stack of ribs + simple sternum)
      const thoracicStart = len * 0.28;
      const thoracicEnd = len * 0.86;
      const ribCount: number = 10;

      if (isBilateral) {
        // Front-ish view: ribs to both sides, sternum on midline.
        const halfWidth = len * 0.22;

        // Sternum
        ctx.save();
        ctx.strokeStyle = BONE;
        ctx.lineWidth = ribStroke * 1.2;
        ctx.lineCap = "round";
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(thoracicStart, 0);
        ctx.lineTo(thoracicEnd, 0);
        ctx.stroke();
        ctx.restore();

        // Ribs (left/right)
        ctx.save();
        ctx.strokeStyle = BONE;
        ctx.lineWidth = ribStroke;
        ctx.lineCap = "round";
        ctx.shadowColor = color;
        ctx.shadowBlur = 5;
        for (let i = 0; i < ribCount; i++) {
          const t = ribCount === 1 ? 0.5 : i / (ribCount - 1);
          const x = thoracicStart + (thoracicEnd - thoracicStart) * t;
          const bulge = Math.sin(Math.PI * t);
          const span = halfWidth * (0.55 + 0.45 * bulge);
          const back = len * (0.035 + 0.015 * (1 - t));

          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.quadraticCurveTo(x - back, -span * 0.55, x, -span);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.quadraticCurveTo(x - back, span * 0.55, x, span);
          ctx.stroke();
        }
        ctx.restore();
      } else {
        // Side view: ribs curve from spine (back) to sternum (front).
        const chestDepthMax = len * 0.3;
        const thoracicLen = thoracicEnd - thoracicStart;

        // Subtle outer contour so the cage reads as round, not boxy.
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = BONE_OUTLINE;
        ctx.lineWidth = Math.max(1, ribStroke * 0.95);
        ctx.lineCap = "round";
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        const outlineRadiusY = chestDepthMax * 0.55;
        const outlineCenterY = frontSign * outlineRadiusY;
        const outlineCenterX = (thoracicStart + thoracicEnd) / 2 - len * 0.01;
        const outlineRadiusX = (thoracicLen / 2) * 1.06;
        ctx.beginPath();
        ctx.ellipse(
          outlineCenterX,
          outlineCenterY,
          outlineRadiusX,
          outlineRadiusY,
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();
        ctx.restore();

        const sternumPoints: Array<{ x: number; y: number }> = [];

        // Ribs
        ctx.save();
        ctx.strokeStyle = BONE;
        ctx.lineWidth = ribStroke;
        ctx.lineCap = "round";
        ctx.shadowColor = color;
        ctx.shadowBlur = 5;
        for (let i = 0; i < ribCount; i++) {
          const t = ribCount === 1 ? 0.5 : i / (ribCount - 1);
          const x = thoracicStart + (thoracicEnd - thoracicStart) * t;
          const bulge = Math.sin(Math.PI * t);

          // Rounded depth profile (narrow at ends, fullest mid-thorax).
          const depth = chestDepthMax * (0.55 + 0.45 * bulge);
          const sternumY = frontSign * depth;

          // Lower ribs slope down more toward the sternum.
          const drop = len * (0.06 + 0.025 * (1 - t));
          const endX = x - drop;
          sternumPoints.push({ x: endX, y: sternumY });

          // Bezier arc to read as "round" instead of a flat slat.
          const c1x = x - drop * 0.18;
          const c1y = sternumY * (0.28 + 0.22 * bulge);
          const c2x = x - drop * 0.78;
          const c2y = sternumY * (0.92 + 0.06 * bulge);

          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.bezierCurveTo(c1x, c1y, c2x, c2y, endX, sternumY);
          ctx.stroke();
        }
        ctx.restore();

        // Sternum (curved through rib endpoints)
        if (sternumPoints.length >= 2) {
          ctx.save();
          ctx.strokeStyle = BONE;
          ctx.lineWidth = ribStroke * 1.2;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.shadowColor = color;
          ctx.shadowBlur = 6;
          ctx.globalAlpha = 0.9;

          ctx.beginPath();
          ctx.moveTo(sternumPoints[0].x, sternumPoints[0].y);
          for (let i = 1; i < sternumPoints.length; i++) {
            const prev = sternumPoints[i - 1];
            const curr = sternumPoints[i];
            const midX = (prev.x + curr.x) / 2;
            const midY = (prev.y + curr.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
          }
          const last = sternumPoints[sternumPoints.length - 1];
          ctx.lineTo(last.x, last.y);
          ctx.stroke();
          ctx.restore();
        }

      }

      ctx.restore();
    };

    // --- SHELL RENDERER (Outer Layer) ---
    const drawShell = (from: { x: number; y: number }, to: { x: number; y: number }, widthM: number) => {
      // Disabled
    };

    // --- ORB RENDERER ---
    const drawOrb = (p: { x: number; y: number }, radius: number, glowColor: string) => {
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      grad.addColorStop(0, "#FFFFFF");
      grad.addColorStop(0.4, glowColor);
      grad.addColorStop(1, "rgba(0,0,0,0)");

      ctx.save();
      ctx.fillStyle = grad;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    // Setup Floor
    ctx.strokeStyle = CYBER_PALETTE.grid;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(offsetX - 100, offsetY);
    ctx.lineTo(offsetX + 100, offsetY);
    ctx.stroke();

    // Midfoot Line
    if (movement !== LiftFamily.PULLUP && movement !== LiftFamily.BENCH) {
      ctx.strokeStyle = CYBER_PALETTE.grid;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
      ctx.lineTo(offsetX, offsetY - 350);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // --- RENDER SEGMENTS ---
    const isBilateral = movement === LiftFamily.BENCH;
    const mirror = (p: { x: number; y: number }) => ({ x: -p.x, y: p.y });

    // Calculate Dynamic Radii
    const rThigh = getSegmentRadiusM("femur", segments.femur);
    const rShin = getSegmentRadiusM("tibia", segments.tibia);
    const rFoot = rShin * 0.65; // Foot is thinner
    const rArm = getSegmentRadiusM("upperArm", segments.upperArm);
    const rForearm = getSegmentRadiusM("forearm", segments.forearm);
    const rHand = rForearm * 0.85; // Hand slightly thinner than forearm

    // Torso is special: Treat as volume cylinder roughly
    const torsoMass = totalMass * SEGMENT_MASS_RATIOS[anthropometry.sex].torso;
    const torsoLen = segments.torso;
    // r = sqrt(M / (rho * pi * h))
    const rTorso = Math.sqrt(torsoMass / (1060 * Math.PI * torsoLen)) * 1.8;

    // Render Function
    const renderLimb = (start: { x: number, y: number }, end: { x: number, y: number }, radius: number, isTorso: boolean = false) => {
      if (isTorso) {
        drawSpine(start, end, radius * 2, isBilateral);
      } else {
        drawBone(start, end, radius * 2);
      }
    };

    if (isBilateral) {
      const hipWidthPx = 0.35 * scale;
      const hipL = { x: hip.x - hipWidthPx / 2, y: hip.y };
      const hipR = { x: hip.x + hipWidthPx / 2, y: hip.y };
      const neck = toCanvas({ x: 0, y: pose.shoulder.y });

      // Torso - Pass rThigh for width matching!
      renderLimb(hip, neck, rThigh, true); // Spine

      // Shoulders/Clavicle (Approx)
      renderLimb(toCanvas(mirror(pose.shoulder)), shoulder, rArm * 0.6);

      // Legs
      renderLimb(hipR, knee, rThigh);
      renderLimb(knee, ankle, rShin);
      renderLimb(hipL, toCanvas(mirror(pose.knee)), rThigh);
      renderLimb(toCanvas(mirror(pose.knee)), toCanvas(mirror(pose.ankle)), rShin);

      // Feet (anthropometric + proportional)
      {
        const footFrontDx = pose.toe.x - pose.ankle.x;
        const footFrontSign = Math.abs(footFrontDx) < 1e-6 ? 1 : Math.sign(footFrontDx);
        const heelRatio = 0.33; // approx ankle->heel relative to ankle->toe

        const heelWorldR = { x: pose.ankle.x - segments.footLength * heelRatio * footFrontSign, y: pose.toe.y };
        const heelR = toCanvas(heelWorldR);
        const toeR = toe;

        const ankleL = toCanvas(mirror(pose.ankle));
        const toeL = toCanvas(mirror(pose.toe));
        const heelL = toCanvas(mirror(heelWorldR));

        renderLimb(ankle, toeR, rFoot);
        renderLimb(ankle, heelR, rFoot * 0.95);
        renderLimb(heelR, toeR, rFoot * 0.75);

        renderLimb(ankleL, heelL, rFoot * 0.95);
        renderLimb(heelL, toeL, rFoot * 0.75);
      }

      // Arms
      if (pose.elbow && pose.wrist) {
        const elbow = toCanvas(pose.elbow);
        const wrist = toCanvas(pose.wrist);

        renderLimb(shoulder, elbow, rArm);
        renderLimb(elbow, wrist, rForearm);

        renderLimb(toCanvas(mirror(pose.shoulder)), toCanvas(mirror(pose.elbow)), rArm);
        renderLimb(toCanvas(mirror(pose.elbow)), toCanvas(mirror(pose.wrist)), rForearm);
      }
    } else {
      // Unilateral (Side View)
      // Map pose points to canvas space individually
      const ankle = toCanvas(pose.ankle);
      const knee = toCanvas(pose.knee);
      const hip = toCanvas(pose.hip);
      const shoulder = toCanvas(pose.shoulder);
      const elbow = pose.elbow ? toCanvas(pose.elbow) : null;
      const wrist = pose.wrist ? toCanvas(pose.wrist) : null;
      const toe = toCanvas(pose.toe);
      const isHangingFoot = movement === LiftFamily.PULLUP;
      const heel = (() => {
        if (isHangingFoot) return null;

        const footFrontDx = pose.toe.x - pose.ankle.x;
        const footFrontSign = Math.abs(footFrontDx) < 1e-6 ? 1 : Math.sign(footFrontDx);
        const heelRatio = 0.33; // approx ankle->heel relative to ankle->toe
        const heelWorld = { x: pose.ankle.x - segments.footLength * heelRatio * footFrontSign, y: pose.toe.y };
        return toCanvas(heelWorld);
      })();

      // 1. Leg
      renderLimb(ankle, knee, rShin);
      renderLimb(knee, hip, rThigh);

      // 2. Foot
      renderLimb(ankle, toe, rFoot); // Forefoot
      if (heel) {
        renderLimb(ankle, heel, rFoot * 0.95); // Calcaneus
        renderLimb(heel, toe, rFoot * 0.75); // Metatarsals
      }

      // 3. Torso - Pass rThigh for width matching
      renderLimb(hip, shoulder, rThigh, true);

      // 4. Arm
      if (elbow && wrist) {
        renderLimb(shoulder, elbow, rArm);
        renderLimb(elbow, wrist, rForearm);

        // Hand Segment (Wrist to Bar/Grip)
        // Use either explicit bar position or calculate effective grip point
        const gripPoint = pose.bar ? toCanvas(pose.bar) : null;

        if (gripPoint) {
          // Ensure we don't draw zero-length if wrist == bar
          const dist = Math.hypot(gripPoint.x - wrist.x, gripPoint.y - wrist.y);
          if (dist > 2) {
            renderLimb(wrist, gripPoint, rHand);
          }
        }
      }
    }
    // --- HEAD ---
    let headCenterWorld;
    if (isBilateral) {
      headCenterWorld = { x: 0, y: pose.shoulder.y + segments.headNeck * 0.5 };
    } else {
      const dx = pose.shoulder.x - pose.hip.x;
      const dy = pose.shoulder.y - pose.hip.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      headCenterWorld = {
        x: pose.shoulder.x + (dx / len) * segments.headNeck * 0.65,
        y: pose.shoulder.y + (dy / len) * segments.headNeck * 0.65,
      };
    }
    const headCenter = toCanvas(headCenterWorld);
    const headRadius = Math.max(12, segments.headNeck * 0.35 * scale); // Fixed min size

    // Head (simple circle)
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();
    ctx.arc(headCenter.x, headCenter.y, headRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.4, headRadius * 0.08);
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(headCenter.x, headCenter.y, headRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.restore();

    // --- JOINTS (Orbs) ---
    const jointRadius = 6;
    if (isBilateral) {
      drawOrb(toCanvas(mirror(pose.knee)), jointRadius, kneeColor);
      drawOrb(knee, jointRadius, kneeColor);
      const hipL = { x: hip.x - (0.35 * scale) / 2, y: hip.y };
      const hipR = { x: hip.x + (0.35 * scale) / 2, y: hip.y };
      drawOrb(hipL, jointRadius, hipColor);
      drawOrb(hipR, jointRadius, hipColor);
      drawOrb(toCanvas(mirror(pose.shoulder)), jointRadius, shoulderColor);
      drawOrb(shoulder, jointRadius, shoulderColor);
    } else {
      drawOrb(knee, jointRadius, kneeColor);
      drawOrb(hip, jointRadius, hipColor);
      drawOrb(shoulder, jointRadius, shoulderColor);
    }

    // Elbows/Wrists/Ankles
    if (elbow) {
      drawOrb(elbow, jointRadius * 0.8, defaultOrbColor);
      if (isBilateral) drawOrb(toCanvas(mirror(pose.elbow!)), jointRadius * 0.8, defaultOrbColor);
    }
    drawOrb(ankle, jointRadius * 0.7, defaultOrbColor);
    if (isBilateral) drawOrb(toCanvas(mirror(pose.ankle)), jointRadius * 0.7, defaultOrbColor);
    if (wrist) {
      drawOrb(wrist, jointRadius * 0.7, defaultOrbColor);
      if (isBilateral) drawOrb(toCanvas(mirror(pose.wrist!)), jointRadius * 0.7, defaultOrbColor);
    }

    // --- BARBELL ---
    if (pose.bar) {
      const barCenter = toCanvas(pose.bar);
      const plateRadiusPx = STANDARD_PLATE_RADIUS * scale;

      const drawPlate = (c: { x: number, y: number }, edge: boolean) => {
        ctx.save();
        ctx.shadowColor = CYBER_PALETTE.cyan;
        ctx.shadowBlur = 8;
        ctx.strokeStyle = CYBER_PALETTE.cyan;
        ctx.fillStyle = "rgba(0, 240, 255, 0.15)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (edge) {
          ctx.rect(c.x - plateRadiusPx / 4, c.y - plateRadiusPx, plateRadiusPx / 2, plateRadiusPx * 2);
        } else {
          ctx.arc(c.x, c.y, plateRadiusPx, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      };

      if (movement === LiftFamily.DEADLIFT || movement === LiftFamily.OHP || movement === LiftFamily.THRUSTER || movement === LiftFamily.SQUAT) {
        drawPlate(barCenter, false);
      } else {
        // Simple front view bar
        const lenPx = 1.1 * scale; // Bar half length
        ctx.save();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 3;
        ctx.shadowColor = "#FFFFFF";
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.moveTo(barCenter.x - lenPx, barCenter.y);
        ctx.lineTo(barCenter.x + lenPx, barCenter.y);
        ctx.stroke();
        ctx.restore();

        drawPlate({ x: barCenter.x - lenPx, y: barCenter.y }, true);
        drawPlate({ x: barCenter.x + lenPx, y: barCenter.y }, true);
      }
    }

    // Pullup Hands (Simplified)
    if (movement === LiftFamily.PULLUP && pose.contacts.leftHand) {
      // Just small orbs for hands
      // Already handled by wrist logic mostly, but can add detailed grip later
    }
  }

  function drawProgressBar(
    ctx: CanvasRenderingContext2D,
    progress: number,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string
  ) {
    ctx.fillStyle = "#E5E7EB";
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = color;
    ctx.fillRect(x, y, width * progress, height);

    ctx.strokeStyle = "#9CA3AF";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
  }



  return (
    <div className="w-full">
      {/* 3-Column Command Center Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">

        {/* LEFT PANEL: Lifter A (Build & Performance) */}
        <div className="lg:col-span-1 h-[600px] lg:h-[700px]">
          <LifterPanel
            name={lifterA.name}
            lifterKey="lifterA"
            velocityValue={syncByTime ? velocityA : velocityA_ms}
            onVelocityChange={setVelocityA_ms}
            velocityInputValue={velocityInputA}
            onVelocityInputChange={handleVelocityChangeA}
            onVelocityBlur={handleVelocityBlurA}
            unit={velocityUnit}
            isSyncEnabled={syncByTime}
            displayPower={powerA}
            displayCalories={dynamicCaloriesA}
            displayTime={timeA}
            displayDistance={velocityUnit === "metric" ? romA * 2 : romA * 2 * 3.28084}
            liftData={liftDataA}
            onLiftDataChange={onLiftDataChangeA}
          />
        </div>

        <div
          onClick={handlePlayPause}
          className="lg:col-span-2 relative h-full flex flex-col justify-center overflow-hidden bg-slate-900/50 rounded-2xl border border-slate-800 shadow-2xl cursor-pointer group/stage"
        >

          {/* HEADER: Visualizer Feed Label */}
          <div className="absolute top-6 left-6 z-30 pointer-events-none">
            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-green-400 tracking-[0.2em] uppercase drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]">
                Visualizer Feed
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                <span className="text-[10px] font-bold text-white/40 tracking-widest uppercase">
                  Live Preview
                </span>
              </div>
            </div>
          </div>

          {/* TOP CONTROLS: Playback, Sync & Scrubber */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 right-6 flex flex-col items-end gap-3 z-30 pointer-events-auto"
          >

            {/* Control Buttons Row */}
            <div className="flex items-center gap-4">
              {/* Playback Group */}
              <div className="flex items-center gap-1 p-1 bg-slate-950/90 backdrop-blur-md rounded-xl border border-slate-800/50 shadow-2xl">
                <button
                  onClick={handlePlayPause}
                  className={`w-10 h-8 flex items-center justify-center rounded-lg transition-all transform hover:scale-105 active:scale-95 ${isPlaying
                    ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                    : "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20"
                    }`}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>

                <button
                  onClick={handleReset}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Sync Group */}
              <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-950/90 backdrop-blur-md rounded-xl border border-slate-800/50 shadow-2xl">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${syncByTime ? "bg-blue-500 border-blue-500" : "bg-slate-800 border-slate-600 group-hover:border-slate-500"
                    }`}>
                    {syncByTime && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={syncByTime}
                    onChange={(e) => {
                      setSyncByTime(e.target.checked);
                      handleReset();
                    }}
                  />
                  <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${syncByTime ? "text-blue-400" : "text-slate-500 group-hover:text-slate-400"
                    }`}>Sync</span>
                </label>

                <div className={`flex items-center gap-1 bg-slate-900 rounded px-1.5 py-0.5 border transition-colors ${syncByTime ? "border-blue-500/30 ring-1 ring-blue-500/20" : "border-slate-800 opacity-50 grayscale"
                  }`}>
                  <input
                    type="number"
                    value={timeInput}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    onBlur={handleTimeBlur}
                    onKeyDown={(e) => e.key === "Enter" && handleTimeBlur()}
                    onFocus={(e) => e.target.select()}
                    disabled={!syncByTime}
                    className="w-12 bg-transparent text-right font-mono font-bold text-white text-xs focus:outline-none disabled:cursor-not-allowed"
                  />
                  <span className="text-[10px] font-bold text-slate-500 pt-0.5">s</span>
                </div>
              </div>
            </div>

            {/* Scrubber Bar */}
            <div className="w-64 h-1.5 bg-slate-950/80 rounded-full relative group cursor-pointer overflow-hidden backdrop-blur-sm border border-slate-800/50 shadow-xl">
              <div
                className="absolute top-0 left-0 bottom-0 bg-blue-500 rounded-full group-hover:bg-blue-400 transition-colors"
                style={{ width: `${(currentTime / Math.max(timeA, timeB)) * 100}%` }}
              />
              <input
                type="range"
                min="0"
                max={Math.max(timeA, timeB)}
                step="0.01"
                value={currentTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCurrentTime(val);
                  setIsPlaying(false);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>

          </div>

          {/* CANVAS */}
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full h-full object-contain mix-blend-screen opacity-90 z-10 relative"
          />

          {/* BOTTOM DECKS: Configuration Inputs */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 left-6 right-6 flex flex-col items-center gap-4 z-30 pointer-events-auto"
          >
            {/* Central Lift Type Selector (Row 1) */}
            {onLiftFamilyChange && (
              <div className="flex-0 w-48 bg-slate-950/60 backdrop-blur-md border border-slate-800/50 rounded-2xl p-2 shadow-xl h-fit">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap pl-1">
                    Lift Type
                  </span>
                  <select
                    value={movement}
                    onChange={(e) => onLiftFamilyChange(e.target.value as LiftFamily)}
                    className="flex-1 px-2 py-1 rounded-md text-xs font-medium transition-colors outline-none focus:ring-1 bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:ring-blue-500/50 focus:border-blue-500/50 appearance-none text-center"
                    style={{ textAlignLast: 'center' }}
                  >
                    <option value={LiftFamily.SQUAT}>Squat</option>
                    <option value={LiftFamily.DEADLIFT}>Deadlift</option>
                    <option value={LiftFamily.BENCH}>Bench Press</option>
                    <option value={LiftFamily.PULLUP}>Pull-up</option>
                    <option value={LiftFamily.PUSHUP}>Push-up</option>
                    <option value={LiftFamily.OHP}>Overhead Press</option>
                    <option value={LiftFamily.THRUSTER}>Thruster</option>
                  </select>
                </div>
              </div>
            )}

            {/* Decks Row (Row 2) */}
            <div className="w-full flex items-end justify-between gap-12">
              {/* Deck A */}
              <div className="flex-1 max-w-xs bg-slate-950/60 backdrop-blur-md border border-slate-800/50 rounded-2xl p-3 shadow-xl h-fit">
                <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-3 h-3 text-blue-400" />
                    <span className="text-[10px] font-bold text-blue-400/80 uppercase tracking-widest">Lifter A</span>
                  </div>
                </div>

                {liftDataA && onLiftDataChangeA && (
                  <div className="w-full">
                    <LiftSelector
                      {...liftDataA}
                      onChange={onLiftDataChangeA}
                      showLiftType={false}
                      showLiftTypeNote={false}
                      showLoadReps={true}
                      theme="dark"
                    />
                  </div>
                )}
              </div>

              {/* Deck B */}
              <div className="flex-1 max-w-xs bg-slate-950/60 backdrop-blur-md border border-slate-800/50 rounded-2xl p-3 shadow-xl h-fit">
                <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-3 h-3 text-orange-400" />
                    <span className="text-[10px] font-bold text-orange-400/80 uppercase tracking-widest">Lifter B</span>
                  </div>
                </div>

                {liftDataB && onLiftDataChangeB && (
                  <div className="w-full">
                    <LiftSelector
                      {...liftDataB}
                      onChange={onLiftDataChangeB}
                      showLiftType={false}
                      showLiftTypeNote={false}
                      showLoadReps={true}
                      theme="dark"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>



        </div>

        {/* Right Panel (Lifter B) - Floating Glass */}
        <div className="lg:col-span-1 h-[600px] lg:h-[700px]">
          <LifterPanel
            name={lifterB.name}
            lifterKey="lifterB"
            velocityValue={velocityB_ms}
            onVelocityChange={handleGaugeChangeB}
            velocityInputValue={velocityInputB}
            onVelocityInputChange={handleVelocityChangeB}
            onVelocityBlur={handleVelocityBlurB}
            unit={velocityUnit}
            isSyncEnabled={syncByTime}
            displayPower={powerB}
            displayCalories={dynamicCaloriesB}
            displayTime={timeB}
            displayDistance={velocityUnit === "metric" ? romB * 2 : romB * 2 * 3.28084}
            liftData={liftDataB}
            onLiftDataChange={onLiftDataChangeB}
          />
        </div>

        {/* View Results Button Overlay */}
        {animationFinished && !showResults && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none pb-32">
            <button
              onClick={() => setShowResults(true)}
              className="pointer-events-auto flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold shadow-2xl shadow-blue-900/50 transform hover:scale-105 transition-all text-base animate-in fade-in zoom-in duration-300"
            >
              <Flame className="w-5 h-5" />
              View Results
            </button>
          </div>
        )}

        {/* Results Overlay */}
        {showResults && result && liftDataA && liftDataB && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-4xl max-h-[90%] overflow-y-auto rounded-xl shadow-2xl">
              <button
                onClick={() => setShowResults(false)}
                className="absolute top-2 right-2 z-10 p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <PostSimulationStats
                result={result}
                liftDataA={liftDataA!}
                liftDataB={liftDataB!}
                avgPowerA={powerA}
                avgPowerB={powerB}
                onReplay={() => {
                  setShowResults(false);
                  handleReset();
                  setTimeout(() => handlePlayPause(), 100);
                }}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
