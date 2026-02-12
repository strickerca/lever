"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { LiftFamily, Anthropometry } from "@/types";
import { createPoseSolver } from "@/lib/animation/movements";
import { getAnimationPhase, calculateRepCycle } from "@/lib/animation/Animator";
import { Pose2D, MovementOptions } from "@/lib/animation/types";

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
  options: MovementOptions;
  reps: number;
  workA: number;
  workB: number;
  initialTime: number;
}

const COLORS = {
  lifterA: "#2563EB", // blue-600
  lifterB: "#EA580C", // orange-600
  bar: "#374151", // gray-700
  bench: "#8B4513", // brown
  pullupBar: "#4B5563", // gray-600
  joint: "#FFFFFF", // white
  floor: "#9CA3AF", // gray-400
  equipment: "#6B7280", // gray-500
};

export function UnifiedMovementAnimation({
  lifterA,
  lifterB,
  movement,
  options,
  reps,
  workA,
  workB,
  initialTime,
}: UnifiedMovementAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [velocityUnit, setVelocityUnit] = useState<"metric" | "imperial">("metric");
  const [independentVelocity, setIndependentVelocity] = useState(false);

  // Create pose solvers for this movement
  const solver = createPoseSolver(movement);

  // Calculate ROMs
  const romA = solver.getROM({ anthropometry: lifterA.anthropometry, movement, options });
  const romB = solver.getROM({ anthropometry: lifterB.anthropometry, movement, options });

  // Calculate initial velocities
  const initialVelocityA = (romA * reps * 2) / initialTime;
  const initialVelocityB = (romB * reps * 2) / initialTime;

  const [velocityA_ms, setVelocityA_ms] = useState(initialVelocityA);
  const [velocityB_ms, setVelocityB_ms] = useState(initialVelocityB);
  const [velocityInputA, setVelocityInputA] = useState(initialVelocityA.toFixed(2));
  const [velocityInputB, setVelocityInputB] = useState(initialVelocityB.toFixed(2));

  // Calculate actual velocities
  const velocityA = independentVelocity ? velocityA_ms : velocityB_ms;
  const velocityB = velocityB_ms;

  // Calculate times
  const timeA = (romA * reps * 2) / velocityA;
  const timeB = (romB * reps * 2) / velocityB;

  // Power calculations
  const powerA = workA / timeA;
  const powerB = workB / timeB;

  // Display velocities
  const displayVelocityA = velocityUnit === "metric" ? velocityA_ms : velocityA_ms * 3.28084;
  const displayVelocityB = velocityUnit === "metric" ? velocityB_ms : velocityB_ms * 3.28084;

  // Update input fields when unit changes
  useEffect(() => {
    setVelocityInputA(displayVelocityA.toFixed(2));
  }, [velocityUnit, velocityA_ms]);

  useEffect(() => {
    setVelocityInputB(displayVelocityB.toFixed(2));
  }, [velocityUnit, velocityB_ms]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === 0) {
        startTimeRef.current = timestamp;
      }

      const elapsed = (timestamp - startTimeRef.current) / 1000;
      setCurrentTime(elapsed);

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

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scale
    const maxHeight = Math.max(
      lifterA.anthropometry.segments.height,
      lifterB.anthropometry.segments.height
    );
    const padding = 80;
    const availableHeight = canvas.height - padding * 2;
    const scale = availableHeight / maxHeight;

    // Calculate current phases
    const progressA = currentTime >= timeA ? 1 : currentTime / timeA;
    const progressB = currentTime >= timeB ? 1 : currentTime / timeB;

    // Calculate animation phase for current rep
    const repProgressA = (progressA * reps) % 1;
    const repProgressB = (progressB * reps) % 1;

    // Create rep cycle configs
    const cycleConfigA = calculateRepCycle(romA, velocityA);
    const cycleConfigB = calculateRepCycle(romB, velocityB);

    const phaseA = getAnimationPhase(movement, repProgressA, cycleConfigA);
    const phaseB = getAnimationPhase(movement, repProgressB, cycleConfigB);

    // Solve for current poses
    const resultA = solver.solve({
      anthropometry: lifterA.anthropometry,
      movement,
      options,
      phase: phaseA,
    });

    const resultB = solver.solve({
      anthropometry: lifterB.anthropometry,
      movement,
      options,
      phase: phaseB,
    });

    if (!resultA.valid || !resultB.valid) {
      return;
    }

    // Draw both figures
    const spacing = canvas.width / 3;

    // Draw equipment first (so it's behind the lifters)
    drawEquipment(ctx, movement, spacing, canvas.height - padding, scale);
    drawEquipment(ctx, movement, spacing * 2, canvas.height - padding, scale);

    drawFigure(
      ctx,
      resultA.pose,
      spacing,
      canvas.height - padding,
      scale,
      COLORS.lifterA,
      lifterA.name,
      movement
    );

    drawFigure(
      ctx,
      resultB.pose,
      spacing * 2,
      canvas.height - padding,
      scale,
      COLORS.lifterB,
      lifterB.name,
      movement
    );

    // Draw progress bars
    drawProgressBar(ctx, progressA, 50, 30, 200, 10, COLORS.lifterA);
    drawProgressBar(ctx, progressB, canvas.width - 250, 30, 200, 10, COLORS.lifterB);
  }, [currentTime, movement, options, lifterA, lifterB, timeA, timeB, romA, romB, solver]);

  function drawEquipment(
    ctx: CanvasRenderingContext2D,
    movement: LiftFamily,
    offsetX: number,
    offsetY: number,
    scale: number
  ) {
    if (movement === LiftFamily.BENCH) {
      // Draw bench
      const benchHeight = 0.45; // meters
      const benchY = offsetY - benchHeight * scale;
      ctx.fillStyle = COLORS.bench;
      ctx.fillRect(offsetX - 50, benchY, 100, 15);

      // Bench legs
      ctx.fillRect(offsetX - 45, benchY, 5, 50);
      ctx.fillRect(offsetX + 40, benchY, 5, 50);
    } else if (movement === LiftFamily.PULLUP) {
      // Draw pullup bar
      const barHeight = 2.5; // meters
      const barY = offsetY - barHeight * scale;
      ctx.strokeStyle = COLORS.pullupBar;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(offsetX - 80, barY);
      ctx.lineTo(offsetX + 80, barY);
      ctx.stroke();

      // Support posts
      ctx.fillStyle = COLORS.pullupBar;
      ctx.fillRect(offsetX - 75, barY, 5, offsetY - barY);
      ctx.fillRect(offsetX + 70, barY, 5, offsetY - barY);
    }
  }

  function drawFigure(
    ctx: CanvasRenderingContext2D,
    pose: Pose2D,
    offsetX: number,
    offsetY: number,
    scale: number,
    color: string,
    label: string,
    movement: LiftFamily
  ) {
    const toCanvas = (pos: { x: number; y: number }) => ({
      x: offsetX + pos.x * scale,
      y: offsetY - pos.y * scale,
    });

    const ankle = toCanvas(pose.ankle);
    const knee = toCanvas(pose.knee);
    const hip = toCanvas(pose.hip);
    const shoulder = toCanvas(pose.shoulder);
    const elbow = pose.elbow ? toCanvas(pose.elbow) : null;
    const wrist = pose.wrist ? toCanvas(pose.wrist) : null;

    // Draw floor (except for bench which has lifter lying down)
    if (movement !== LiftFamily.BENCH) {
      ctx.strokeStyle = COLORS.floor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(offsetX - 100, offsetY);
      ctx.lineTo(offsetX + 100, offsetY);
      ctx.stroke();

      // Midfoot reference (not for pullup where feet aren't on ground)
      if (movement !== LiftFamily.PULLUP) {
        ctx.strokeStyle = "#22C55E";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
        ctx.lineTo(offsetX, offsetY - 350);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw segments
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";

    // Lower body
    ctx.beginPath();
    ctx.moveTo(ankle.x, ankle.y);
    ctx.lineTo(knee.x, knee.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(knee.x, knee.y);
    ctx.lineTo(hip.x, hip.y);
    ctx.stroke();

    // Torso
    ctx.beginPath();
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(shoulder.x, shoulder.y);
    ctx.stroke();

    // Arms (if present)
    if (elbow && wrist) {
      ctx.beginPath();
      ctx.moveTo(shoulder.x, shoulder.y);
      ctx.lineTo(elbow.x, elbow.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(elbow.x, elbow.y);
      ctx.lineTo(wrist.x, wrist.y);
      ctx.stroke();
    }

    // Draw joints
    const jointRadius = 6;
    ctx.fillStyle = color;
    ctx.strokeStyle = COLORS.joint;
    ctx.lineWidth = 2;

    [ankle, knee, hip, shoulder, elbow, wrist].forEach((joint) => {
      if (joint) {
        ctx.beginPath();
        ctx.arc(joint.x, joint.y, jointRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });

    // Draw bar (if present)
    if (pose.bar) {
      const bar = toCanvas(pose.bar);

      // Bar center
      ctx.fillStyle = COLORS.bar;
      ctx.strokeStyle = COLORS.joint;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bar.x, bar.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Barbell with rotation
      const barAngle = pose.barAngle || 0;
      const barLength = 40;

      ctx.strokeStyle = COLORS.bar;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(
        bar.x - barLength * Math.cos(barAngle),
        bar.y - barLength * Math.sin(barAngle)
      );
      ctx.lineTo(
        bar.x + barLength * Math.cos(barAngle),
        bar.y + barLength * Math.sin(barAngle)
      );
      ctx.stroke();

      // Weight plates
      ctx.fillStyle = COLORS.bar;
      ctx.beginPath();
      ctx.arc(
        bar.x - barLength * Math.cos(barAngle),
        bar.y - barLength * Math.sin(barAngle),
        7,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.beginPath();
      ctx.arc(
        bar.x + barLength * Math.cos(barAngle),
        bar.y + barLength * Math.sin(barAngle),
        7,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Draw hand contacts for pullup
    if (pose.contacts.leftHand && pose.contacts.rightHand) {
      const leftHand = toCanvas(pose.contacts.leftHand);
      const rightHand = toCanvas(pose.contacts.rightHand);

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(leftHand.x, leftHand.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rightHand.x, rightHand.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

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
    ctx.fillStyle = "#E5E7EB";
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = color;
    ctx.fillRect(x, y, width * progress, height);

    ctx.strokeStyle = "#9CA3AF";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
  }

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (currentTime >= Math.max(timeA, timeB)) {
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
              {lifterA.name} Velocity
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
                Linked to {lifterB.name} velocity
              </p>
            )}
          </div>

          {/* Lifter B Velocity */}
          <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
            <label className="block text-sm font-semibold text-orange-900 mb-2">
              {lifterB.name} Velocity
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
          <h4 className="font-semibold text-blue-900 mb-3">{lifterA.name}</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">Velocity:</span>
              <span className="font-bold text-blue-700">
                {velocityUnit === "metric"
                  ? `${velocityA.toFixed(2)} m/s`
                  : `${(velocityA * 3.28084).toFixed(2)} ft/s`}
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
                  ? `${(romA * 2).toFixed(3)} m`
                  : `${(romA * 2 * 3.28084).toFixed(2)} ft`}
              </span>
            </div>
          </div>
        </div>

        {/* Lifter B Metrics */}
        <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
          <h4 className="font-semibold text-orange-900 mb-3">{lifterB.name}</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">Velocity:</span>
              <span className="font-bold text-orange-700">
                {velocityUnit === "metric"
                  ? `${velocityB.toFixed(2)} m/s`
                  : `${(velocityB * 3.28084).toFixed(2)} ft/s`}
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
                  ? `${(romB * 2).toFixed(3)} m`
                  : `${(romB * 2 * 3.28084).toFixed(2)} ft`}
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
              {lifterA.name}: {displayVelocityA.toFixed(2)} {velocityUnit === "metric" ? "m/s" : "ft/s"} ({timeA.toFixed(2)}s total).
              {lifterB.name}: {displayVelocityB.toFixed(2)} {velocityUnit === "metric" ? "m/s" : "ft/s"} ({timeB.toFixed(2)}s total).
            </>
          ) : (
            <>
              <strong>Linked Mode:</strong> Both lifters move at {displayVelocityB.toFixed(2)} {velocityUnit === "metric" ? "m/s" : "ft/s"}.
              {Math.abs(timeA - timeB) > 0.01 && (
                <> The lifter with greater range of motion takes {Math.abs(timeA - timeB).toFixed(2)}s longer to complete the same reps.</>
              )}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
