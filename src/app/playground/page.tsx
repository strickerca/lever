"use client";

import { useEffect, useRef, useState } from "react";
import { LiftFamily, Sex } from "@/types";
import { createSimpleProfile } from "@/lib/biomechanics/anthropometry";
import { createPoseSolver } from "@/lib/animation/movements";
import { getAnimationPhase, calculateRepCycle } from "@/lib/animation/Animator";
import { Pose2D, MovementOptions } from "@/lib/animation/types";

const SCALE_PX_PER_METER = 200; // 200 pixels per meter

export default function AnimationPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const [frameCount, setFrameCount] = useState(0);
  const [time, setTime] = useState(0);
  const [p, setP] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [showSegmentLengths, setShowSegmentLengths] = useState(false);
  const [movement, setMovement] = useState<LiftFamily>(LiftFamily.SQUAT);
  const [lastError, setLastError] = useState<string>("");

  // Create test anthropometry
  const lifterA = createSimpleProfile(1.75, 75, Sex.MALE);
  const lifterB = createSimpleProfile(1.65, 60, Sex.FEMALE);

  // Movement options
  const options: MovementOptions = {
    squatVariant: "highBar",
    squatStance: "normal",
    deadliftVariant: "conventional",
    sumoStance: "normal",
    benchGrip: "medium",
    benchArch: "moderate",
    pullupGrip: "neutral",
    pushupWidth: "normal",
  };

  // Animation clock
  useEffect(() => {
    if (!isRunning) return;

    const startTime = performance.now();
    let frame = 0;

    const animate = (timestamp: number) => {
      const elapsed = (timestamp - startTime) / 1000; // seconds
      const T = 3.0; // 3 second cycle period

      // Smooth looping progress: p = 0.5 - 0.5*cos(2πt/T)
      const pValue = 0.5 - 0.5 * Math.cos((2 * Math.PI * elapsed) / T);

      setFrameCount(frame++);
      setTime(elapsed);
      setP(pValue);

      // Draw frame
      drawFrame(pValue, elapsed, frame);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning, movement, showSegmentLengths]);

  function drawFrame(pValue: number, timeSeconds: number, frame: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw HUD first (always visible)
    drawHUD(ctx, frame, timeSeconds, pValue);

    try {
      // Get solver for current movement
      const solver = createPoseSolver(movement);
      if (!solver) {
        setLastError(`No solver found for movement: ${movement}`);
        return;
      }

      // Calculate ROM
      const romA = solver.getROM({ anthropometry: lifterA, movement, options });
      const romB = solver.getROM({ anthropometry: lifterB, movement, options });

      // Get animation phase
      const velocity = 0.4; // m/s
      const cycleConfig = calculateRepCycle(romA, velocity);
      const phase = getAnimationPhase(movement, pValue, cycleConfig);

      // Solve poses
      const resultA = solver.solve({
        anthropometry: lifterA,
        movement,
        options,
        phase,
      });

      const resultB = solver.solve({
        anthropometry: lifterB,
        movement,
        options,
        phase,
      });

      // Check validity
      if (!resultA.valid) {
        setLastError(`Lifter A invalid: ${resultA.errors.join(", ")}`);
        return;
      }

      if (!resultB.valid) {
        setLastError(`Lifter B invalid: ${resultB.errors.join(", ")}`);
        return;
      }

      setLastError(""); // Clear errors if we got here

      // Draw ground line
      const groundY = canvas.height - 100;
      ctx.strokeStyle = "#9CA3AF";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(canvas.width, groundY);
      ctx.stroke();

      // Draw both figures
      const offsetXA = canvas.width / 3;
      const offsetXB = (canvas.width * 2) / 3;

      drawStickFigure(
        ctx,
        resultA.pose,
        offsetXA,
        groundY,
        lifterA,
        "#2563EB",
        "Male 1.75m"
      );
      drawStickFigure(
        ctx,
        resultB.pose,
        offsetXB,
        groundY,
        lifterB,
        "#EA580C",
        "Female 1.65m"
      );

      // Draw segment validation if enabled
      if (showSegmentLengths) {
        drawSegmentValidation(
          ctx,
          resultA.pose,
          offsetXA,
          groundY,
          lifterA.segments,
          "#2563EB"
        );
        drawSegmentValidation(
          ctx,
          resultB.pose,
          offsetXB,
          groundY,
          lifterB.segments,
          "#EA580C"
        );
      }
    } catch (error) {
      setLastError(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  function drawHUD(
    ctx: CanvasRenderingContext2D,
    frame: number,
    time: number,
    pValue: number
  ) {
    // Background for HUD
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(10, 10, 250, 120);

    // Text
    ctx.fillStyle = "#00FF00";
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "left";

    ctx.fillText(`Frame: ${frame}`, 20, 35);
    ctx.fillText(`Time: ${time.toFixed(2)}s`, 20, 60);
    ctx.fillText(`p: ${pValue.toFixed(4)}`, 20, 85);

    // Heartbeat indicator (blinks with p)
    const heartbeatAlpha = 0.3 + 0.7 * pValue;
    ctx.fillStyle = `rgba(255, 0, 0, ${heartbeatAlpha})`;
    ctx.beginPath();
    ctx.arc(240, 40, 15, 0, Math.PI * 2);
    ctx.fill();

    // Movement name
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(`Movement: ${movement}`, 20, 110);
  }

  function drawStickFigure(
    ctx: CanvasRenderingContext2D,
    pose: Pose2D,
    offsetX: number,
    groundY: number,
    anthropometry: any,
    color: string,
    label: string
  ) {
    const toCanvas = (pos: { x: number; y: number }) => ({
      x: offsetX + pos.x * SCALE_PX_PER_METER,
      y: groundY - pos.y * SCALE_PX_PER_METER,
    });

    const ankle = toCanvas(pose.ankle);
    const knee = toCanvas(pose.knee);
    const hip = toCanvas(pose.hip);
    const shoulder = toCanvas(pose.shoulder);
    const elbow = pose.elbow ? toCanvas(pose.elbow) : null;
    const wrist = pose.wrist ? toCanvas(pose.wrist) : null;

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
    const jointRadius = 5;
    ctx.fillStyle = color;
    ctx.strokeStyle = "#FFFFFF";
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
      ctx.fillStyle = "#374151";
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bar.x, bar.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Barbell
      const barLength = 30;
      ctx.strokeStyle = "#374151";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(bar.x - barLength, bar.y);
      ctx.lineTo(bar.x + barLength, bar.y);
      ctx.stroke();
    }

    // Label
    ctx.fillStyle = color;
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, offsetX, groundY - anthropometry.segments.height * SCALE_PX_PER_METER - 20);
  }

  function drawSegmentValidation(
    ctx: CanvasRenderingContext2D,
    pose: Pose2D,
    offsetX: number,
    groundY: number,
    segments: any,
    color: string
  ) {
    const toCanvas = (pos: { x: number; y: number }) => ({
      x: offsetX + pos.x * SCALE_PX_PER_METER,
      y: groundY - pos.y * SCALE_PX_PER_METER,
    });

    const ankle = toCanvas(pose.ankle);
    const knee = toCanvas(pose.knee);
    const hip = toCanvas(pose.hip);
    const shoulder = toCanvas(pose.shoulder);
    const elbow = pose.elbow ? toCanvas(pose.elbow) : null;
    const wrist = pose.wrist ? toCanvas(pose.wrist) : null;

    const TOLERANCE = 0.001; // 1mm

    const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2) / SCALE_PX_PER_METER;

    // Check tibia
    const tibiaLength = distance(ankle, knee);
    const tibiaError = Math.abs(tibiaLength - segments.tibia);
    const tibiaOK = tibiaError < TOLERANCE;

    // Check femur
    const femurLength = distance(knee, hip);
    const femurError = Math.abs(femurLength - segments.femur);
    const femurOK = femurError < TOLERANCE;

    // Check torso
    const torsoLength = distance(hip, shoulder);
    const torsoError = Math.abs(torsoLength - segments.torso);
    const torsoOK = torsoError < TOLERANCE;

    // Draw validation overlay
    ctx.font = "10px monospace";
    ctx.textAlign = "left";

    const textX = offsetX - 80;
    let textY = groundY + 20;

    ctx.fillStyle = tibiaOK ? "#00FF00" : "#FF0000";
    ctx.fillText(
      `Tibia: ${tibiaLength.toFixed(4)}m (${tibiaOK ? "✓" : "✗"})`,
      textX,
      textY
    );
    textY += 15;

    ctx.fillStyle = femurOK ? "#00FF00" : "#FF0000";
    ctx.fillText(
      `Femur: ${femurLength.toFixed(4)}m (${femurOK ? "✓" : "✗"})`,
      textX,
      textY
    );
    textY += 15;

    ctx.fillStyle = torsoOK ? "#00FF00" : "#FF0000";
    ctx.fillText(
      `Torso: ${torsoLength.toFixed(4)}m (${torsoOK ? "✓" : "✗"})`,
      textX,
      textY
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Animation Debug Playground
          </h1>
          <p className="text-gray-600">
            This playground tests the animation pipeline with visible debugging. The <span className="font-mono text-red-500">p</span> value must change from 0→1→0 continuously. If it's not changing, the animation is broken.
          </p>
        </div>

        {/* Error Display */}
        {lastError && (
          <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
            <p className="text-red-900 font-mono text-sm">{lastError}</p>
          </div>
        )}

        {/* Canvas */}
        <div className="bg-white rounded-lg shadow p-6">
          <canvas
            ref={canvasRef}
            width={1200}
            height={600}
            className="w-full border-2 border-gray-300 rounded-lg bg-gray-50"
          />
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`px-6 py-3 rounded-lg font-bold text-white ${
                isRunning ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isRunning ? "PAUSE" : "PLAY"}
            </button>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showSegmentLengths}
                onChange={(e) => setShowSegmentLengths(e.target.checked)}
                className="w-5 h-5"
              />
              <span className="font-medium">Show Segment Validation</span>
            </label>
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-2">
              Movement Type:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                LiftFamily.SQUAT,
                LiftFamily.DEADLIFT,
                LiftFamily.BENCH,
                LiftFamily.OHP,
                LiftFamily.PULLUP,
                LiftFamily.PUSHUP,
                LiftFamily.THRUSTER,
              ].map((m) => (
                <button
                  key={m}
                  onClick={() => setMovement(m)}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    movement === m
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Status</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Frame Count:</span>
              <span className="ml-2 font-mono font-bold text-blue-600">
                {frameCount}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Time:</span>
              <span className="ml-2 font-mono font-bold text-blue-600">
                {time.toFixed(2)}s
              </span>
            </div>
            <div>
              <span className="text-gray-600">Progress (p):</span>
              <span className="ml-2 font-mono font-bold text-blue-600">
                {p.toFixed(4)}
              </span>
            </div>
          </div>

          {/* Visual p indicator */}
          <div className="mt-4">
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-100"
                style={{ width: `${p * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-6">
          <h2 className="text-xl font-bold text-blue-900 mb-3">
            ✅ Acceptance Criteria
          </h2>
          <ul className="space-y-2 text-blue-900">
            <li>• <strong>p value changes</strong>: 0 → 1 → 0 continuously (check HUD and progress bar)</li>
            <li>• <strong>Frame count increments</strong>: Proves requestAnimationFrame is working</li>
            <li>• <strong>Stick figures animate</strong>: Both figures move smoothly</li>
            <li>• <strong>No errors</strong>: Red error box should be empty</li>
            <li>• <strong>All movements work</strong>: Switch between all 7 movements</li>
            <li>• <strong>Segments rigid</strong>: Enable validation - all should show green ✓</li>
            <li>• <strong>Heights proportional</strong>: Male (1.75m) taller than Female (1.65m)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
