"use client";

import { KinematicSolution, Anthropometry, ComparisonResult } from "@/types";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

interface AnimatedComparisonWithControlsProps {
  result: ComparisonResult;
  reps: number;
  initialTime: number;
}

const COLORS = {
  lifterA: "#2563EB", // blue-600
  lifterB: "#EA580C", // orange-600
  bar: "#374151", // gray-700
  joint: "#FFFFFF", // white
  floor: "#9CA3AF", // gray-400
};

export function AnimatedComparisonWithControls({
  result,
  reps,
  initialTime,
}: AnimatedComparisonWithControlsProps) {
  const { lifterA, lifterB } = result;
  const kinematicsA = lifterA.kinematics!;
  const kinematicsB = lifterB.kinematics!;
  const anthropometryA = lifterA.anthropometry;
  const anthropometryB = lifterB.anthropometry;
  const workA = lifterA.metrics.totalWork;
  const workB = lifterB.metrics?.totalWork || 0;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [velocityUnit, setVelocityUnit] = useState<"metric" | "imperial">("metric");
  const [syncByTime, setSyncByTime] = useState(false);

  // Calculate initial velocities from initialTime
  const displacementA = kinematicsA.displacement;
  const displacementB = kinematicsB.displacement;

  // Start both lifters at the same velocity (average of their natural velocities)
  const initialVelocityA = (displacementA * reps * 2) / initialTime;
  const initialVelocityB = (displacementB * reps * 2) / initialTime;
  const initialVelocityAvg = (initialVelocityA + initialVelocityB) / 2;

  // State for velocities (in m/s) - both start at the same velocity
  const [velocityA_ms, setVelocityA_ms] = useState(initialVelocityAvg);
  const [velocityB_ms, setVelocityB_ms] = useState(initialVelocityAvg);
  const [timeInput, setTimeInput] = useState(initialTime.toFixed(2));

  // Input state for velocity fields
  const [velocityInputA, setVelocityInputA] = useState(initialVelocityAvg.toFixed(2));
  const [velocityInputB, setVelocityInputB] = useState(initialVelocityAvg.toFixed(2));

  // Convert velocities for display
  const displayVelocityA = velocityUnit === "metric" ? velocityA_ms : velocityA_ms * 3.28084; // m/s to ft/s
  const displayVelocityB = velocityUnit === "metric" ? velocityB_ms : velocityB_ms * 3.28084;

  // Update input fields when unit changes
  useEffect(() => {
    setVelocityInputA(displayVelocityA.toFixed(2));
  }, [velocityUnit, velocityA_ms]);

  useEffect(() => {
    setVelocityInputB(displayVelocityB.toFixed(2));
  }, [velocityUnit, velocityB_ms]);

  // Calculate actual velocities to use based on mode
  const velocityA = syncByTime
    ? (displacementA * reps * 2) / parseFloat(timeInput)
    : velocityA_ms;
  const velocityB = syncByTime
    ? (displacementB * reps * 2) / parseFloat(timeInput)
    : velocityB_ms;

  // Calculate times based on velocities
  const timeA = (displacementA * reps * 2) / velocityA;
  const timeB = (displacementB * reps * 2) / velocityB;

  // Power calculations
  const powerA = workA / timeA;
  const powerB = workB / timeB;

  // Animation progress (0 to 1)
  const getProgress = (time: number, duration: number) => {
    const cycleTime = time % duration;
    return cycleTime / duration;
  };

  // Calculate position for a single rep
  // 0 = top (standing), 0.5 = bottom (squat), 1 = top (standing)
  const getRepPhase = (progress: number) => {
    const repProgress = (progress * reps) % 1;
    // Ease in/out for smooth motion
    if (repProgress < 0.5) {
      // Going down (0 to 0.5 -> 1 to 0)
      const t = repProgress * 2;
      return 1 - easeInOutQuad(t);
    } else {
      // Going up (0.5 to 1 -> 0 to 1)
      const t = (repProgress - 0.5) * 2;
      return easeInOutQuad(t);
    }
  };

  // Easing function for smooth animation
  const easeInOutQuad = (t: number) => {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  };

  // Interpolate between bottom and top positions maintaining rigid segment lengths
  // The bar position rotates with the trunk, properly reflecting the fixed offset on the lifter's back
  const interpolatePosition = (
    kinematics: KinematicSolution,
    anthropometry: Anthropometry,
    phase: number // 0 = bottom, 1 = top (standing)
  ) => {
    const bottom = kinematics.positions;

    // Calculate angles at bottom position
    const calcAngle = (from: { x: number; y: number }, to: { x: number; y: number }) => {
      return Math.atan2(to.y - from.y, to.x - from.x);
    };

    // Bottom angles
    const tibiaAngleBottom = calcAngle(bottom.ankle, bottom.knee);
    const femurAngleBottom = calcAngle(bottom.knee, bottom.hip);
    const torsoAngleBottom = calcAngle(bottom.hip, bottom.shoulder);

    // Top angles (standing upright = 90 degrees = PI/2)
    const tibiaAngleTop = Math.PI / 2; // Vertical
    const femurAngleTop = Math.PI / 2; // Vertical
    const torsoAngleTop = Math.PI / 2; // Vertical

    // Interpolate angles
    const tibiaAngle = tibiaAngleBottom + (tibiaAngleTop - tibiaAngleBottom) * phase;
    const femurAngle = femurAngleBottom + (femurAngleTop - femurAngleBottom) * phase;
    const torsoAngle = torsoAngleBottom + (torsoAngleTop - torsoAngleBottom) * phase;

    // Segment lengths
    const tibiaLength = anthropometry.segments.tibia;
    const femurLength = anthropometry.segments.femur;
    const torsoLength = anthropometry.segments.torso;

    // Reconstruct positions from angles (maintaining segment lengths)
    const ankle = { x: 0, y: anthropometry.segments.footHeight };

    const knee = {
      x: ankle.x + tibiaLength * Math.cos(tibiaAngle),
      y: ankle.y + tibiaLength * Math.sin(tibiaAngle),
    };

    const hip = {
      x: knee.x + femurLength * Math.cos(femurAngle),
      y: knee.y + femurLength * Math.sin(femurAngle),
    };

    const shoulder = {
      x: hip.x + torsoLength * Math.cos(torsoAngle),
      y: hip.y + torsoLength * Math.sin(torsoAngle),
    };

    // Calculate bar position with proper rotation relative to trunk
    // Extract the bar offset from the bottom position (bar position relative to shoulder)
    // This offset is fixed on the lifter's back and rotates with trunk angle
    const barOffsetX_bottom = bottom.bar.x - bottom.shoulder.x;
    const barOffsetY_bottom = bottom.bar.y - bottom.shoulder.y;

    // Calculate the magnitude and angle of the bar offset at bottom position
    // The offset vector rotates with the trunk, so we need to track it in the trunk's local frame
    const offsetMagnitude = Math.sqrt(barOffsetX_bottom * barOffsetX_bottom + barOffsetY_bottom * barOffsetY_bottom);
    const offsetAngleRelativeToTorso = Math.atan2(barOffsetY_bottom, barOffsetX_bottom) - torsoAngleBottom;

    // Apply the offset at the current trunk angle (offset rotates with trunk)
    const currentOffsetAngle = torsoAngle + offsetAngleRelativeToTorso;
    const bar = {
      x: shoulder.x + offsetMagnitude * Math.cos(currentOffsetAngle),
      y: shoulder.y + offsetMagnitude * Math.sin(currentOffsetAngle),
    };

    return { ankle, knee, hip, shoulder, bar };
  };

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === 0) {
        startTimeRef.current = timestamp;
      }

      const elapsed = (timestamp - startTimeRef.current) / 1000; // Convert to seconds
      setCurrentTime(elapsed);

      // Check if animations are complete
      const maxTime = Math.max(timeA, timeB);
      if (elapsed >= maxTime) {
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

  // Draw to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scale to fit tallest figure
    const maxHeight = Math.max(
      anthropometryA.segments.height,
      anthropometryB.segments.height
    );
    const padding = 60;
    const availableHeight = canvas.height - padding * 2;
    const scale = availableHeight / maxHeight;

    // Get current phases for each lifter
    const progressA = currentTime >= timeA ? 1 : getProgress(currentTime, timeA);
    const progressB = currentTime >= timeB ? 1 : getProgress(currentTime, timeB);

    const phaseA = currentTime >= timeA ? 1 : getRepPhase(progressA); // 1 = standing (top)
    const phaseB = currentTime >= timeB ? 1 : getRepPhase(progressB);

    // Get interpolated positions
    const positionsA = interpolatePosition(kinematicsA, anthropometryA, phaseA);
    const positionsB = interpolatePosition(kinematicsB, anthropometryB, phaseB);

    // Draw both figures
    const spacing = canvas.width / 3;

    drawFigure(
      ctx,
      positionsA,
      spacing,
      canvas.height - padding,
      scale,
      COLORS.lifterA,
      "Lifter A"
    );

    drawFigure(
      ctx,
      positionsB,
      spacing * 2,
      canvas.height - padding,
      scale,
      COLORS.lifterB,
      "Lifter B"
    );

    // Draw horizontal reference lines at bar levels
    const barYA = (canvas.height - padding) - positionsA.bar.y * scale;
    const barYB = (canvas.height - padding) - positionsB.bar.y * scale;

    // Lifter A bar reference line
    ctx.strokeStyle = COLORS.lifterA;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, barYA);
    ctx.lineTo(canvas.width, barYA);
    ctx.stroke();

    // Lifter B bar reference line
    ctx.strokeStyle = COLORS.lifterB;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, barYB);
    ctx.lineTo(canvas.width, barYB);
    ctx.stroke();

    // Reset line dash for other drawing
    ctx.setLineDash([]);

    // Draw progress indicators
    drawProgressBar(ctx, progressA, 30, 20, 150, 8, COLORS.lifterA);
    drawProgressBar(ctx, progressB, canvas.width - 180, 20, 150, 8, COLORS.lifterB);

  }, [currentTime, kinematicsA, kinematicsB, anthropometryA, anthropometryB, timeA, timeB]);

  function drawFigure(
    ctx: CanvasRenderingContext2D,
    positions: { ankle: {x: number, y: number}, knee: {x: number, y: number}, hip: {x: number, y: number}, shoulder: {x: number, y: number}, bar: {x: number, y: number} },
    offsetX: number,
    offsetY: number,
    scale: number,
    color: string,
    label: string
  ) {
    const toCanvas = (pos: { x: number; y: number }) => ({
      x: offsetX + pos.x * scale,
      y: offsetY - pos.y * scale,
    });

    const ankle = toCanvas(positions.ankle);
    const knee = toCanvas(positions.knee);
    const hip = toCanvas(positions.hip);
    const shoulder = toCanvas(positions.shoulder);
    const bar = toCanvas(positions.bar);

    // Draw floor
    ctx.strokeStyle = COLORS.floor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(offsetX - 80, offsetY);
    ctx.lineTo(offsetX + 80, offsetY);
    ctx.stroke();

    // Draw midfoot reference line (dashed vertical line at x=0)
    ctx.strokeStyle = "#22C55E"; // green-500
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    ctx.lineTo(offsetX, offsetY - 300);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw segments
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";

    // Tibia
    ctx.beginPath();
    ctx.moveTo(ankle.x, ankle.y);
    ctx.lineTo(knee.x, knee.y);
    ctx.stroke();

    // Femur
    ctx.beginPath();
    ctx.moveTo(knee.x, knee.y);
    ctx.lineTo(hip.x, hip.y);
    ctx.stroke();

    // Torso
    ctx.beginPath();
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(shoulder.x, shoulder.y);
    ctx.stroke();

    // Draw bar-to-shoulder connection line (shows bar position offset)
    // This helps visualize high bar vs low bar placement
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.lineTo(bar.x, bar.y);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Draw joints
    const jointRadius = 5;
    ctx.fillStyle = color;
    ctx.strokeStyle = COLORS.joint;
    ctx.lineWidth = 2;

    [ankle, knee, hip, shoulder].forEach((joint) => {
      ctx.beginPath();
      ctx.arc(joint.x, joint.y, jointRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Draw bar - larger circle for the center weight
    ctx.fillStyle = COLORS.bar;
    ctx.strokeStyle = COLORS.joint;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bar.x, bar.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw bar line (the barbell)
    ctx.strokeStyle = COLORS.bar;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(bar.x - 30, bar.y);
    ctx.lineTo(bar.x + 30, bar.y);
    ctx.stroke();

    // Draw small weight plates at the ends
    ctx.fillStyle = COLORS.bar;
    ctx.beginPath();
    ctx.arc(bar.x - 30, bar.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bar.x + 30, bar.y, 6, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = color;
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, offsetX, 15);
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
    // Background
    ctx.fillStyle = "#E5E7EB";
    ctx.fillRect(x, y, width, height);

    // Progress
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width * progress, height);

    // Border
    ctx.strokeStyle = "#9CA3AF";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
  }

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (currentTime >= Math.max(timeA, timeB)) {
        // Reset if finished
        startTimeRef.current = 0;
        setCurrentTime(0);
      }
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    startTimeRef.current = 0;
    setCurrentTime(0);
  };

  const handleVelocityChangeA = (value: string) => {
    setVelocityInputA(value);
  };

  const handleVelocityBlurA = () => {
    const num = parseFloat(velocityInputA);
    if (isNaN(num) || num <= 0) {
      setVelocityInputA(displayVelocityA.toFixed(2));
      return;
    }
    // Convert to m/s if in imperial
    const velocityInMS = velocityUnit === "metric" ? num : num / 3.28084;
    setVelocityA_ms(velocityInMS);
    handleReset();
  };

  const handleVelocityChangeB = (value: string) => {
    setVelocityInputB(value);
  };

  const handleVelocityBlurB = () => {
    const num = parseFloat(velocityInputB);
    if (isNaN(num) || num <= 0) {
      setVelocityInputB(displayVelocityB.toFixed(2));
      return;
    }
    // Convert to m/s if in imperial
    const velocityInMS = velocityUnit === "metric" ? num : num / 3.28084;
    setVelocityB_ms(velocityInMS);
    handleReset();
  };

  const handleTimeChange = (value: string) => {
    setTimeInput(value);
  };

  const handleTimeBlur = () => {
    const num = parseFloat(timeInput);
    if (isNaN(num) || num <= 0) {
      setTimeInput(initialTime.toFixed(2));
      return;
    }
    handleReset();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Animated Movement Comparison
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Column: Animation */}
        <div className="space-y-4">
          <canvas
            ref={canvasRef}
            width={600}
            height={350}
            className="w-full border border-gray-200 rounded-lg bg-gray-50"
          />

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handlePlayPause}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Play
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        {/* Right Column: Controls & Metrics */}
        <div className="space-y-4">
          {/* Unit Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Velocity Units:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setVelocityUnit("metric")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-xs ${
                  velocityUnit === "metric"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                m/s
              </button>
              <button
                onClick={() => setVelocityUnit("imperial")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-xs ${
                  velocityUnit === "imperial"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                ft/s
              </button>
            </div>
          </div>

          {/* Sync Mode Toggle */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="syncByTime"
              checked={syncByTime}
              onChange={(e) => {
                setSyncByTime(e.target.checked);
                handleReset();
              }}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="syncByTime" className="text-sm font-medium text-gray-700 flex-1">
              Synchronize by Time
            </label>
            {syncByTime && (
              <div className="flex items-center gap-2">
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
                <span className="text-xs text-gray-600">sec</span>
              </div>
            )}
          </div>

          {!syncByTime && (
            <>
              {/* Velocity Controls */}
              <div className="grid grid-cols-2 gap-3">
                {/* Lifter A Velocity */}
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <label className="block text-xs font-semibold text-blue-900 mb-1.5">
                    {lifterA.name} Velocity
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={velocityInputA}
                      onChange={(e) => handleVelocityChangeA(e.target.value)}
                      onBlur={handleVelocityBlurA}
                      onKeyDown={(e) => e.key === "Enter" && handleVelocityBlurA()}
                      onFocus={(e) => e.target.select()}
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0.01"
                      step="0.01"
                    />
                    <span className="text-xs font-medium text-gray-700">
                      {velocityUnit === "metric" ? "m/s" : "ft/s"}
                    </span>
                  </div>
                </div>

                {/* Lifter B Velocity */}
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <label className="block text-xs font-semibold text-orange-900 mb-1.5">
                    {lifterB.name} Velocity
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={velocityInputB}
                      onChange={(e) => handleVelocityChangeB(e.target.value)}
                      onBlur={handleVelocityBlurB}
                      onKeyDown={(e) => e.key === "Enter" && handleVelocityBlurB()}
                      onFocus={(e) => e.target.select()}
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs text-gray-900 font-medium focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      min="0.01"
                      step="0.01"
                    />
                    <span className="text-xs font-medium text-gray-700">
                      {velocityUnit === "metric" ? "m/s" : "ft/s"}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Metrics Display */}
          <div className="grid grid-cols-2 gap-3">
            {/* Lifter A Metrics */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2 text-xs">{lifterA.name}</h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-700">Velocity:</span>
                  <span className="font-bold text-blue-700">
                    {velocityUnit === "metric"
                      ? `${velocityA.toFixed(2)} m/s`
                      : `${(velocityA * 3.28084).toFixed(2)} ft/s`
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Power:</span>
                  <span className="font-bold text-blue-700">{powerA.toFixed(0)} W</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Time:</span>
                  <span className="font-bold text-blue-700">{timeA.toFixed(2)} s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">ROM:</span>
                  <span className="font-bold text-blue-700">
                    {velocityUnit === "metric"
                      ? `${(displacementA * 2).toFixed(3)} m`
                      : `${(displacementA * 2 * 3.28084).toFixed(2)} ft`
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Trunk angle:</span>
                  <span className="font-bold text-blue-700">{kinematicsA.angles.trunk.toFixed(1)}°</span>
                </div>
              </div>
            </div>

            {/* Lifter B Metrics */}
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <h4 className="font-semibold text-orange-900 mb-2 text-xs">{lifterB.name}</h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-700">Velocity:</span>
                  <span className="font-bold text-orange-700">
                    {velocityUnit === "metric"
                      ? `${velocityB.toFixed(2)} m/s`
                      : `${(velocityB * 3.28084).toFixed(2)} ft/s`
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Power:</span>
                  <span className="font-bold text-orange-700">{powerB.toFixed(0)} W</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Time:</span>
                  <span className="font-bold text-orange-700">{timeB.toFixed(2)} s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">ROM:</span>
                  <span className="font-bold text-orange-700">
                    {velocityUnit === "metric"
                      ? `${(displacementB * 2).toFixed(3)} m`
                      : `${(displacementB * 2 * 3.28084).toFixed(2)} ft`
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Trunk angle:</span>
                  <span className="font-bold text-orange-700">{kinematicsB.angles.trunk.toFixed(1)}°</span>
                </div>
              </div>
            </div>
          </div>

          {/* ROM Difference Indicator */}
          {Math.abs(displacementA - displacementB) > 0.005 && (
            <div className="p-2 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-700">
              <span className="font-medium">ROM Difference: </span>
              {displacementA > displacementB ? (
                <span>
                  <span className="text-blue-600 font-semibold">{lifterA.name}</span> moves{" "}
                  <span className="font-semibold">{((displacementA - displacementB) * 100).toFixed(1)}cm</span> more per rep
                </span>
              ) : (
                <span>
                  <span className="text-orange-600 font-semibold">{lifterB.name}</span> moves{" "}
                  <span className="font-semibold">{((displacementB - displacementA) * 100).toFixed(1)}cm</span> more per rep
                </span>
              )}
            </div>
          )}

          {/* Equivalent Performance */}
          <div className="p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
            <h4 className="text-xs font-semibold text-orange-900 mb-2">
              To Match {lifterA.name}'s Performance
            </h4>
            <div className="space-y-2 text-xs text-gray-800">
              <p>
                <span className="font-semibold text-orange-700">{lifterB.name}</span> would need{" "}
                <span className="font-bold text-orange-700">{lifterB.equivalentLoad.toFixed(1)} kg</span>{" "}
                for {reps} reps to match the biomechanical demand.
              </p>
              <p>
                Or perform{" "}
                <span className="font-bold text-orange-700">{lifterB.equivalentReps} reps</span>{" "}
                at {lifterA.metrics.effectiveMass.toFixed(0)} kg to match work output.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
