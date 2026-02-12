"use client";

import { useEffect, useRef, useState } from "react";
import { Anthropometry, KinematicSolution, LiftFamily } from "@/types";
import { Play, Pause, RotateCcw } from "lucide-react";

interface AnimatedMovementComparisonProps {
  lifterA: {
    name: string;
    anthropometry: Anthropometry;
    kinematics?: KinematicSolution;
  };
  lifterB: {
    name: string;
    anthropometry: Anthropometry;
    kinematics?: KinematicSolution;
  };
  liftFamily: LiftFamily;
  variant: string;
}

interface AnimationFrame {
  progress: number; // 0-1 representing movement progress
  positions: {
    ankle: { x: number; y: number };
    knee: { x: number; y: number };
    hip: { x: number; y: number };
    shoulder: { x: number; y: number };
    elbow?: { x: number; y: number };
    wrist?: { x: number; y: number };
    head: { x: number; y: number };
    bar: { x: number; y: number };
  };
}

export function AnimatedMovementComparison({
  lifterA,
  lifterB,
  liftFamily,
  variant,
}: AnimatedMovementComparisonProps) {
  const canvasRefA = useRef<HTMLCanvasElement>(null);
  const canvasRefB = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [speed, setSpeed] = useState(1);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Total frames for one complete cycle (down and up)
  const TOTAL_FRAMES = 60;
  const FRAME_DURATION = 1000 / 30; // 30 FPS

  // Generate animation frames (squat only)
  const generateFrames = (
    anthropometry: Anthropometry,
    kinematics?: KinematicSolution
  ): AnimationFrame[] => {
    if (!kinematics || !kinematics.valid) {
      return [];
    }

    const frames: AnimationFrame[] = [];
    const segments = anthropometry.segments;

    // Generate frames for descent (0 to 0.5) and ascent (0.5 to 1)
    for (let i = 0; i <= TOTAL_FRAMES; i++) {
      const progress = i / TOTAL_FRAMES;

      // Create ease-in-out motion
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      // Interpolate between standing and bottom position
      const t = Math.sin(easeProgress * Math.PI); // 0 -> 1 -> 0 smooth transition

      // Standing position (all joints stacked)
      const standingHipHeight = segments.femur + segments.tibia + segments.footHeight;
      const standingShoulderHeight = standingHipHeight + segments.torso;
      const standingHeadHeight = standingShoulderHeight + segments.headNeck;

      // Bottom position (from kinematics)
      const bottomAnkle = kinematics.positions.ankle;
      const bottomKnee = kinematics.positions.knee;
      const bottomHip = kinematics.positions.hip;
      const bottomShoulder = kinematics.positions.shoulder;
      const bottomBar = kinematics.positions.bar;

      // Calculate head position at bottom (above shoulder by headNeck length)
      const shoulderToHipDx = bottomShoulder.x - bottomHip.x;
      const shoulderToHipDy = bottomShoulder.y - bottomHip.y;
      const trunkAngle = Math.atan2(shoulderToHipDx, shoulderToHipDy);
      const bottomHeadX = bottomShoulder.x + segments.headNeck * Math.sin(trunkAngle);
      const bottomHeadY = bottomShoulder.y + segments.headNeck * Math.cos(trunkAngle);

      // Interpolate positions
      const ankle = {
        x: bottomAnkle.x * t,
        y: segments.footHeight + (bottomAnkle.y - segments.footHeight) * t,
      };

      const knee = {
        x: bottomKnee.x * t,
        y: segments.footHeight + segments.tibia +
           (bottomKnee.y - (segments.footHeight + segments.tibia)) * t,
      };

      const hip = {
        x: bottomHip.x * t,
        y: standingHipHeight + (bottomHip.y - standingHipHeight) * t,
      };

      const shoulder = {
        x: bottomShoulder.x * t,
        y: standingShoulderHeight + (bottomShoulder.y - standingShoulderHeight) * t,
      };

      const head = {
        x: bottomHeadX * t,
        y: standingHeadHeight + (bottomHeadY - standingHeadHeight) * t,
      };

      const bar = {
        x: bottomBar.x * t,
        y: standingShoulderHeight + (bottomBar.y - standingShoulderHeight) * t,
      };

      frames.push({
        progress,
        positions: {
          ankle,
          knee,
          hip,
          shoulder,
          head,
          bar,
        },
      });
    }

    return frames;
  };

  const framesA = generateFrames(lifterA.anthropometry, lifterA.kinematics);
  const framesB = generateFrames(lifterB.anthropometry, lifterB.kinematics);

  // Draw bar path trajectory
  const drawBarPath = (
    ctx: CanvasRenderingContext2D,
    frames: AnimationFrame[],
    color: string,
    scale: number,
    offsetX: number,
    offsetY: number,
    currentFrame: number
  ) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    for (let i = 0; i <= currentFrame; i++) {
      const bar = frames[i].positions.bar;
      const x = offsetX + bar.x * scale;
      const y = offsetY - bar.y * scale;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  };

  // Draw stick figure
  const drawStickFigure = (
    ctx: CanvasRenderingContext2D,
    frame: AnimationFrame,
    color: string,
    scale: number,
    offsetX: number,
    offsetY: number
  ) => {
    const { positions } = frame;

    // Convert meters to pixels
    const toPixels = (point: { x: number; y: number }) => ({
      x: offsetX + point.x * scale,
      y: offsetY - point.y * scale, // Flip Y axis (canvas Y increases downward)
    });

    const ankle = toPixels(positions.ankle);
    const knee = toPixels(positions.knee);
    const hip = toPixels(positions.hip);
    const shoulder = toPixels(positions.shoulder);
    const head = toPixels(positions.head);
    const bar = toPixels(positions.bar);

    // Draw segments
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Legs
    ctx.beginPath();
    ctx.moveTo(ankle.x, ankle.y);
    ctx.lineTo(knee.x, knee.y);
    ctx.lineTo(hip.x, hip.y);
    ctx.stroke();

    // Torso
    ctx.beginPath();
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(shoulder.x, shoulder.y);
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.lineTo(head.x, head.y);
    ctx.stroke();

    // Draw joints
    const drawJoint = (point: { x: number; y: number }, radius: number = 5) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
    };

    drawJoint(ankle);
    drawJoint(knee);
    drawJoint(hip);
    drawJoint(shoulder);

    // Draw head as circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(head.x, head.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw bar
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bar.x - 40, bar.y);
    ctx.lineTo(bar.x + 40, bar.y);
    ctx.stroke();

    // Draw bar ends (plates)
    ctx.fillStyle = "#374151";
    ctx.fillRect(bar.x - 45, bar.y - 8, 10, 16);
    ctx.fillRect(bar.x + 35, bar.y - 8, 10, 16);
  };

  // Animation loop
  useEffect(() => {
    if (!isPlaying || framesA.length === 0 || framesB.length === 0) return;

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }

      const elapsed = timestamp - lastTimeRef.current;

      if (elapsed >= FRAME_DURATION / speed) {
        setCurrentFrame((prev) => (prev + 1) % TOTAL_FRAMES);
        lastTimeRef.current = timestamp;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, speed, TOTAL_FRAMES, FRAME_DURATION, framesA.length, framesB.length]);

  // Render frames
  useEffect(() => {
    if (framesA.length === 0 || framesB.length === 0) return;

    const renderCanvas = (
      canvas: HTMLCanvasElement,
      frames: AnimationFrame[],
      frame: AnimationFrame,
      color: string,
      kinematics?: KinematicSolution
    ) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw ground line
      ctx.strokeStyle = "#d1d5db";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height - 30);
      ctx.lineTo(canvas.width, canvas.height - 30);
      ctx.stroke();

      // Calculate scale to fit lifter in canvas
      const scale = 200; // pixels per meter
      const offsetX = canvas.width / 2;
      const offsetY = canvas.height - 30;

      // Draw bar path trajectory
      drawBarPath(ctx, frames, color, scale, offsetX, offsetY, currentFrame);

      // Draw stick figure
      drawStickFigure(ctx, frame, color, scale, offsetX, offsetY);

      // Draw key metrics overlay
      if (kinematics) {
        ctx.fillStyle = "#374151";
        ctx.font = "12px sans-serif";
        ctx.fillText(`ROM: ${(kinematics.displacement * 100).toFixed(1)} cm`, 10, 20);
        ctx.fillText(`Hip Moment Arm: ${(kinematics.momentArms.hip * 100).toFixed(1)} cm`, 10, 35);
        ctx.fillText(`Knee Moment Arm: ${(kinematics.momentArms.knee * 100).toFixed(1)} cm`, 10, 50);
        ctx.fillText(`Trunk Angle: ${kinematics.angles.trunk.toFixed(1)}°`, 10, 65);
      }
    };

    if (canvasRefA.current && framesA[currentFrame]) {
      renderCanvas(canvasRefA.current, framesA, framesA[currentFrame], "#2563eb", lifterA.kinematics);
    }

    if (canvasRefB.current && framesB[currentFrame]) {
      renderCanvas(canvasRefB.current, framesB, framesB[currentFrame], "#ea580c", lifterB.kinematics);
    }
  }, [currentFrame, framesA, framesB, lifterA.kinematics, lifterB.kinematics]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      lastTimeRef.current = 0;
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentFrame(0);
    lastTimeRef.current = 0;
  };

  if (framesA.length === 0 || framesB.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Animated Movement Comparison
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
        {/* Lifter A Animation */}
        <div>
          <h4 className="text-sm font-medium text-blue-600 mb-2">
            {lifterA.name}
          </h4>
          <canvas
            ref={canvasRefA}
            width={300}
            height={400}
            className="border border-gray-200 rounded-lg bg-gray-50"
          />
        </div>

        {/* Lifter B Animation */}
        <div>
          <h4 className="text-sm font-medium text-orange-600 mb-2">
            {lifterB.name}
          </h4>
          <canvas
            ref={canvasRefB}
            width={300}
            height={400}
            className="border border-gray-200 rounded-lg bg-gray-50"
          />
        </div>
      </div>

      {/* Animation Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handlePlayPause}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Speed:</label>
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
        </div>
      </div>
    </div>
  );
}
