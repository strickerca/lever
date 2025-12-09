"use client";

import { KinematicSolution } from "@/types";
import { useEffect, useRef } from "react";

interface StickFigureProps {
  kinematicsA: KinematicSolution;
  kinematicsB?: KinematicSolution;
  heightA: number;
  heightB?: number;
  showMomentArms?: boolean;
}

const COLORS = {
  lifterA: "#2563EB", // blue-600
  lifterB: "#EA580C", // orange-600
  momentArm: "#DC2626", // red-600
  midfoot: "#22C55E", // green-500
  floor: "#9CA3AF", // gray-400
  joint: "#FFFFFF", // white
};

export function StickFigure({
  kinematicsA,
  kinematicsB,
  heightA,
  heightB,
  showMomentArms = false,
}: StickFigureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scale based on maximum height
    const maxHeight = Math.max(heightA, heightB || 0);
    const padding = 40;
    const availableHeight = canvas.height - padding * 2;
    const scale = availableHeight / maxHeight;

    // Draw figures
    if (kinematicsB) {
      // Two figures side by side
      const spacing = canvas.width / 3;
      drawFigure(
        ctx,
        kinematicsA,
        spacing,
        canvas.height - padding,
        scale,
        COLORS.lifterA,
        "Lifter A",
        showMomentArms
      );
      drawFigure(
        ctx,
        kinematicsB,
        spacing * 2,
        canvas.height - padding,
        scale,
        COLORS.lifterB,
        "Lifter B",
        showMomentArms
      );
    } else {
      // Single figure centered
      drawFigure(
        ctx,
        kinematicsA,
        canvas.width / 2,
        canvas.height - padding,
        scale,
        COLORS.lifterA,
        "Lifter A",
        showMomentArms
      );
    }
  }, [kinematicsA, kinematicsB, heightA, heightB, showMomentArms]);

  function drawFigure(
    ctx: CanvasRenderingContext2D,
    kinematics: KinematicSolution,
    offsetX: number,
    offsetY: number,
    scale: number,
    color: string,
    label: string,
    showMomentArms: boolean
  ) {
    // Helper to convert position to canvas coords
    const toCanvas = (pos: { x: number; y: number }) => ({
      x: offsetX + pos.x * scale,
      y: offsetY - pos.y * scale,
    });

    const ankle = toCanvas(kinematics.positions.ankle);
    const knee = toCanvas(kinematics.positions.knee);
    const hip = toCanvas(kinematics.positions.hip);
    const shoulder = toCanvas(kinematics.positions.shoulder);
    const bar = toCanvas(kinematics.positions.bar);

    // 1. Draw floor line
    ctx.strokeStyle = COLORS.floor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(offsetX - 100, offsetY);
    ctx.lineTo(offsetX + 100, offsetY);
    ctx.stroke();

    // 2. Draw midfoot reference (dashed green vertical)
    ctx.strokeStyle = COLORS.midfoot;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    ctx.lineTo(offsetX, offsetY - 200);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // 3. Draw segments as thick lines
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";

    // Tibia (ankle to knee)
    ctx.beginPath();
    ctx.moveTo(ankle.x, ankle.y);
    ctx.lineTo(knee.x, knee.y);
    ctx.stroke();

    // Femur (knee to hip)
    ctx.beginPath();
    ctx.moveTo(knee.x, knee.y);
    ctx.lineTo(hip.x, hip.y);
    ctx.stroke();

    // Torso (hip to shoulder)
    ctx.beginPath();
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(shoulder.x, shoulder.y);
    ctx.stroke();

    // 4. Draw joints as circles
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

    // 5. Draw bar as filled circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(bar.x, bar.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // 6. Draw moment arm if requested
    if (showMomentArms) {
      ctx.strokeStyle = COLORS.momentArm;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(hip.x, hip.y);
      ctx.lineTo(bar.x, hip.y);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // Draw moment arm label
      const midX = (hip.x + bar.x) / 2;
      ctx.fillStyle = COLORS.momentArm;
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        `${kinematics.momentArms.hip.toFixed(3)}m`,
        midX,
        hip.y - 10
      );
    }

    // Add label above figure
    ctx.fillStyle = color;
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, offsetX, offsetY - 220);

    // Add trunk angle annotation
    ctx.fillStyle = color;
    ctx.font = "12px sans-serif";
    ctx.fillText(
      `Trunk: ${kinematics.angles.trunk.toFixed(1)}°`,
      offsetX,
      offsetY - 205
    );

    // Add displacement annotation
    ctx.fillStyle = "#6B7280"; // gray-500
    ctx.font = "11px sans-serif";
    ctx.fillText(
      `ROM: ${kinematics.displacement.toFixed(3)}m`,
      offsetX,
      offsetY - 190
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Squat Position Visualization
      </h3>
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full border border-gray-200 rounded-lg"
      />
      <div className="mt-4 flex items-center justify-center gap-6 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: COLORS.lifterA }}
          />
          <span>Lifter A</span>
        </div>
        {kinematicsB && (
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: COLORS.lifterB }}
            />
            <span>Lifter B</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-1 rounded"
            style={{ backgroundColor: COLORS.midfoot }}
          />
          <span>Midfoot</span>
        </div>
        {showMomentArms && (
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-1 rounded"
              style={{ backgroundColor: COLORS.momentArm }}
            />
            <span>Moment Arm</span>
          </div>
        )}
      </div>
    </div>
  );
}
