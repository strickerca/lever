"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Anthropometry, KinematicSolution, LiftFamily } from "@/types";
import { Play, Pause, RotateCcw } from "lucide-react";
import { STANDARD_PLATE_RADIUS } from "@/lib/biomechanics/constants";

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

type ReadonlyAnimationFrame = Readonly<AnimationFrame>;

export function AnimatedMovementComparison({
  lifterA,
  lifterB,
  liftFamily,
  variant,
}: AnimatedMovementComparisonProps) {
  const movementLabel = `${liftFamily} (${variant})`;
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

  const hasFrames = Boolean(
    lifterA.kinematics?.valid && lifterB.kinematics?.valid
  );

  // Draw bar path trajectory
  const drawBarPath = (
    ctx: CanvasRenderingContext2D,
    frames: ReadonlyArray<ReadonlyAnimationFrame>,
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

  const drawRibCageSideView = useCallback((
    ctx: CanvasRenderingContext2D,
    spineFrom: { x: number; y: number },
    spineTo: { x: number; y: number },
    facingHint: { ankle: { x: number; y: number }; knee: { x: number; y: number } },
    color: string,
    baseLineWidth: number
  ) => {
    const boneStroke = "rgba(255, 255, 255, 0.9)";
    const dx = spineTo.x - spineFrom.x;
    const dy = spineTo.y - spineFrom.y;
    const len = Math.hypot(dx, dy);
    if (len < 6) return;

    const angle = Math.atan2(dy, dx);

    const facingDx = facingHint.knee.x - facingHint.ankle.x;
    const frontSign = Math.abs(facingDx) < 1e-6 ? 1 : Math.sign(facingDx);

    const ribStroke = Math.max(1, baseLineWidth * 0.55);
    const ribCount = 10;

    const thoracicStart = len * 0.26;
    const thoracicEnd = len * 0.86;
    const thoracicLen = thoracicEnd - thoracicStart;
    const chestDepthMax = len * 0.3;

    ctx.save();
    ctx.translate(spineFrom.x, spineFrom.y);
    ctx.rotate(angle);

    // Subtle outer contour so the cage reads as round, not boxy.
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.strokeStyle = boneStroke;
    ctx.lineWidth = Math.max(1, ribStroke * 0.9);
    ctx.lineCap = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
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

    // Near-side ribs
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = boneStroke;
    ctx.lineWidth = ribStroke;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    for (let i = 0; i < ribCount; i++) {
      const t = i / (ribCount - 1);
      const x = thoracicStart + (thoracicEnd - thoracicStart) * t;
      const bulge = Math.sin(Math.PI * t);

      // Rounded depth profile (narrow at ends, fullest mid-thorax).
      const depth = chestDepthMax * (0.55 + 0.45 * bulge);
      const sternumY = frontSign * depth;

      // Lower ribs slope down more toward the sternum (matches lateral-view reference).
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
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = boneStroke;
      ctx.lineWidth = ribStroke * 1.15;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;

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

    ctx.restore();
  }, []);

  // Draw stick figure
  const drawStickFigure = useCallback((
    ctx: CanvasRenderingContext2D,
    frame: ReadonlyAnimationFrame,
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

    const boneStroke = "rgba(255, 255, 255, 0.9)";
    const segmentWidth = 3;

    const strokeWithGlow = (path: () => void, width: number) => {
      // Glow pass
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = color;
      ctx.lineWidth = width + 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      path();
      ctx.stroke();
      ctx.restore();

      // Bone pass
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = boneStroke;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      path();
      ctx.stroke();
      ctx.restore();
    };

    // Legs
    strokeWithGlow(() => {
      ctx.moveTo(ankle.x, ankle.y);
      ctx.lineTo(knee.x, knee.y);
      ctx.lineTo(hip.x, hip.y);
    }, segmentWidth);

    // Rib cage (2D conversion of the 3D reference, lateral view)
    drawRibCageSideView(ctx, hip, shoulder, { ankle, knee }, color, segmentWidth);

    // Torso
    strokeWithGlow(() => {
      ctx.moveTo(hip.x, hip.y);
      ctx.lineTo(shoulder.x, shoulder.y);
    }, segmentWidth);

    // Draw joints
    const drawJoint = (point: { x: number; y: number }, radius: number = 5) => {
      ctx.save();
      ctx.fillStyle = boneStroke;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, radius * 0.35);
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    drawJoint(ankle);
    drawJoint(knee);
    drawJoint(hip);
    drawJoint(shoulder);

    // Head (simple circle)
    const headRadius = Math.max(10, scale * 0.06);
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();
    ctx.arc(head.x, head.y, headRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.4, headRadius * 0.08);
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(head.x, head.y, headRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.restore();

    // Barbell (side view plate)
    const plateRadiusPx = STANDARD_PLATE_RADIUS * scale;
    ctx.save();
    ctx.shadowColor = "#00F0FF";
    ctx.shadowBlur = 10;
    ctx.strokeStyle = "#00F0FF";
    ctx.fillStyle = "rgba(0, 240, 255, 0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bar.x, bar.y, plateRadiusPx, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bar.x, bar.y, plateRadiusPx * 0.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }, [drawRibCageSideView]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !hasFrames) return;

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
  }, [isPlaying, speed, TOTAL_FRAMES, FRAME_DURATION, hasFrames]);

  // Render frames
  useEffect(() => {
    if (!hasFrames) return;

    const framesA = generateFrames(lifterA.anthropometry, lifterA.kinematics);
    const framesB = generateFrames(lifterB.anthropometry, lifterB.kinematics);
    if (framesA.length === 0 || framesB.length === 0) return;

    const renderCanvas = (
      canvas: HTMLCanvasElement,
      frames: ReadonlyArray<ReadonlyAnimationFrame>,
      frame: ReadonlyAnimationFrame,
      color: string,
      kinematics?: KinematicSolution
    ) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear canvas
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid background (match main animation)
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      const step = 50;
      ctx.beginPath();
      for (let x = 0; x <= canvas.width; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
      }
      for (let y = 0; y <= canvas.height; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
      }
      ctx.stroke();
      ctx.restore();

      // Draw ground line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
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
        ctx.fillStyle = "#94a3b8"; // slate-400
        ctx.font = "12px sans-serif";
        ctx.fillText(`ROM: ${(kinematics.displacement * 100).toFixed(1)} cm`, 10, 20);
        ctx.fillText(`Hip Moment Arm: ${(kinematics.momentArms.hip * 100).toFixed(1)} cm`, 10, 35);
        ctx.fillText(`Knee Moment Arm: ${(kinematics.momentArms.knee * 100).toFixed(1)} cm`, 10, 50);
        ctx.fillText(`Trunk Angle: ${kinematics.angles.trunk.toFixed(1)}°`, 10, 65);
      }
    };

    if (canvasRefA.current && framesA[currentFrame]) {
      renderCanvas(canvasRefA.current, framesA, framesA[currentFrame], "#00E5FF", lifterA.kinematics);
    }

    if (canvasRefB.current && framesB[currentFrame]) {
      renderCanvas(canvasRefB.current, framesB, framesB[currentFrame], "#FF4081", lifterB.kinematics);
    }
  }, [currentFrame, hasFrames, lifterA.anthropometry, lifterA.kinematics, lifterB.anthropometry, lifterB.kinematics, drawStickFigure]);

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

  if (!hasFrames) {
    return null;
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-lg shadow-sm border border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        Animated Movement Comparison: {movementLabel}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
        {/* Lifter A Animation */}
        <div>
          <h4 className="text-sm font-medium mb-2" style={{ color: "#00E5FF" }}>
            {lifterA.name}
          </h4>
          <canvas
            ref={canvasRefA}
            width={300}
            height={400}
            className="border border-slate-700 rounded-lg bg-slate-950"
          />
        </div>

        {/* Lifter B Animation */}
        <div>
          <h4 className="text-sm font-medium mb-2" style={{ color: "#FF4081" }}>
            {lifterB.name}
          </h4>
          <canvas
            ref={canvasRefB}
            width={300}
            height={400}
            className="border border-slate-700 rounded-lg bg-slate-950"
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
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-300">Speed:</label>
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="px-2 py-1 bg-slate-950 border border-slate-700 text-white rounded text-sm"
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
