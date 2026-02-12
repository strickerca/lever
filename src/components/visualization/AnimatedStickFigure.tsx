"use client";

import { KinematicSolution, Anthropometry } from "@/types";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

interface AnimatedStickFigureProps {
  kinematicsA: KinematicSolution;
  kinematicsB: KinematicSolution;
  anthropometryA: Anthropometry;
  anthropometryB: Anthropometry;
  reps: number;
  workA: number; // Total work in Joules
  workB: number;
  initialTime: number; // Time to complete all reps (seconds)
}

const COLORS = {
  lifterA: "#2563EB", // blue-600
  lifterB: "#EA580C", // orange-600
  bar: "#374151", // gray-700
  joint: "#FFFFFF", // white
  floor: "#9CA3AF", // gray-400
};

export function AnimatedStickFigure({
  kinematicsA,
  kinematicsB,
  anthropometryA,
  anthropometryB,
  reps,
  workA,
  workB,
  initialTime,
}: AnimatedStickFigureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [velocityUnit, setVelocityUnit] = useState<"metric" | "imperial">("metric");
  const [independentVelocity, setIndependentVelocity] = useState(false);

  // Calculate initial velocities from initialTime
  const displacementA = kinematicsA.displacement;
  const displacementB = kinematicsB.displacement;

  const initialVelocityA = (displacementA * reps * 2) / initialTime;
  const initialVelocityB = (displacementB * reps * 2) / initialTime;

  // State for velocities (in m/s)
  const [velocityA_ms, setVelocityA_ms] = useState(initialVelocityA);
  const [velocityB_ms, setVelocityB_ms] = useState(initialVelocityB);

  // Input state for velocity fields
  const [velocityInputA, setVelocityInputA] = useState(initialVelocityA.toFixed(2));
  const [velocityInputB, setVelocityInputB] = useState(initialVelocityB.toFixed(2));

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

  // Calculate actual velocities to use (linked or independent)
  const velocityA = independentVelocity ? velocityA_ms : velocityB_ms;
  const velocityB = velocityB_ms;

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
  // Now: 0 = top (standing), 0.5 = bottom (squat), 1 = top (standing)
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
    const padding = 80;
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

    // Draw progress indicators
    drawProgressBar(ctx, progressA, 50, 30, 200, 10, COLORS.lifterA);
    drawProgressBar(ctx, progressB, canvas.width - 250, 30, 200, 10, COLORS.lifterB);

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
    ctx.moveTo(offsetX - 100, offsetY);
    ctx.lineTo(offsetX + 100, offsetY);
    ctx.stroke();

    // Draw midfoot reference line (dashed vertical line at x=0)
    ctx.strokeStyle = "#22C55E"; // green-500
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    ctx.lineTo(offsetX, offsetY - 350);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw segments
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
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
    const jointRadius = 6;
    ctx.fillStyle = color;
    ctx.strokeStyle = COLORS.joint;
    ctx.lineWidth = 2;

    [ankle, knee, hip, shoulder].forEach((joint) => {
      ctx.beginPath();
      ctx.arc(joint.x, joint.y, jointRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Draw bar - larger circle for center
    ctx.fillStyle = COLORS.bar;
    ctx.strokeStyle = COLORS.joint;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bar.x, bar.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw bar line (the barbell)
    ctx.strokeStyle = COLORS.bar;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(bar.x - 40, bar.y);
    ctx.lineTo(bar.x + 40, bar.y);
    ctx.stroke();

    // Draw small weight plates at the ends
    ctx.fillStyle = COLORS.bar;
    ctx.beginPath();
    ctx.arc(bar.x - 40, bar.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bar.x + 40, bar.y, 7, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = color;
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, offsetX, 20);
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

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Animated Movement Comparison
        </h3>

        {/* Unit Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setVelocityUnit("metric")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              velocityUnit === "metric"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            m/s
          </button>
          <button
            onClick={() => setVelocityUnit("imperial")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              velocityUnit === "imperial"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            ft/s
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        className="w-full border border-gray-200 rounded-lg bg-gray-50"
      />

      {/* Velocity Controls */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={independentVelocity}
              onChange={(e) => {
                setIndependentVelocity(e.target.checked);
                if (!e.target.checked) {
                  // When linking, set A to match B
                  setVelocityA_ms(velocityB_ms);
                }
                handleReset();
              }}
              className="w-4 h-4 text-blue-600 rounded"
            />
            Independent Velocity Control
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Lifter A Velocity */}
          <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <label className="block text-sm font-semibold text-blue-900 mb-2">
              Lifter A Velocity
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={velocityInputA}
                onChange={(e) => handleVelocityChangeA(e.target.value)}
                onBlur={handleVelocityBlurA}
                onKeyDown={(e) => e.key === "Enter" && handleVelocityBlurA()}
                disabled={!independentVelocity}
                className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 font-medium ${
                  !independentVelocity ? "bg-gray-100 cursor-not-allowed" : ""
                }`}
                min="0.01"
                step="0.01"
              />
              <span className="text-sm font-medium text-gray-700">
                {velocityUnit === "metric" ? "m/s" : "ft/s"}
              </span>
            </div>
            {!independentVelocity && (
              <p className="text-xs text-gray-600 mt-2">
                Linked to Lifter B velocity
              </p>
            )}
          </div>

          {/* Lifter B Velocity */}
          <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
            <label className="block text-sm font-semibold text-orange-900 mb-2">
              Lifter B Velocity
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={velocityInputB}
                onChange={(e) => handleVelocityChangeB(e.target.value)}
                onBlur={handleVelocityBlurB}
                onKeyDown={(e) => e.key === "Enter" && handleVelocityBlurB()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 font-medium"
                min="0.01"
                step="0.01"
              />
              <span className="text-sm font-medium text-gray-700">
                {velocityUnit === "metric" ? "m/s" : "ft/s"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handlePlayPause}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          {isPlaying ? (
            <>
              <Pause className="w-5 h-5" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Play
            </>
          )}
        </button>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          <RotateCcw className="w-5 h-5" />
          Reset
        </button>
      </div>

      {/* Metrics Display */}
      <div className="grid grid-cols-2 gap-6">
        {/* Lifter A Metrics */}
        <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-3">Lifter A</h4>
          <div className="space-y-2 text-sm">
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
              <span className="text-gray-700">Distance/rep:</span>
              <span className="font-bold text-blue-700">
                {velocityUnit === "metric"
                  ? `${(displacementA * 2).toFixed(3)} m`
                  : `${(displacementA * 2 * 3.28084).toFixed(2)} ft`
                }
              </span>
            </div>
          </div>
        </div>

        {/* Lifter B Metrics */}
        <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
          <h4 className="font-semibold text-orange-900 mb-3">Lifter B</h4>
          <div className="space-y-2 text-sm">
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
              <span className="text-gray-700">Distance/rep:</span>
              <span className="font-bold text-orange-700">
                {velocityUnit === "metric"
                  ? `${(displacementB * 2).toFixed(3)} m`
                  : `${(displacementB * 2 * 3.28084).toFixed(2)} ft`
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-700">
          {independentVelocity ? (
            <>
              <strong>Independent Mode:</strong> Each lifter moves at their own specified velocity.
              Lifter A: {displayVelocityA.toFixed(2)} {velocityUnit === "metric" ? "m/s" : "ft/s"} ({timeA.toFixed(2)}s total).
              Lifter B: {displayVelocityB.toFixed(2)} {velocityUnit === "metric" ? "m/s" : "ft/s"} ({timeB.toFixed(2)}s total).
            </>
          ) : (
            <>
              <strong>Linked Mode:</strong> Both lifters move at {displayVelocityB.toFixed(2)} {velocityUnit === "metric" ? "m/s" : "ft/s"}.
              {timeA !== timeB && (
                <> The lifter with greater range of motion takes {Math.abs(timeA - timeB).toFixed(2)}s longer to complete the same reps.</>
              )}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
