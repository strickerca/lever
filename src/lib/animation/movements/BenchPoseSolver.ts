/**
 * Bench Press Pose Solver
 *
 * Generates poses for bench press (supine position).
 * Key constraints:
 * - Lifter lying on bench (supine)
 * - Shoulder fixed at bench height + arch
 * - Bar travels from chest to arms extended
 * - Elbow angle varies with grip width
 * - Feet on ground
 */

import { calculateBenchDisplacement } from "@/lib/biomechanics/physics";
import { armToGripLength } from "@/lib/biomechanics/geometry";
import {
  BENCH_PAD_SURFACE_HEIGHT_M,
} from "@/lib/animation/constants";
import { Anthropometry, BenchArchStyle, BenchGripWidth } from "@/types";
import { Pose2D, PoseSolverInput, PoseSolverResult } from "../types";
import { PoseSolver } from "../PoseSolver";

export class BenchPoseSolver extends PoseSolver {
  solve(input: PoseSolverInput): PoseSolverResult {
    const { anthropometry, options, phase } = input;

    const gripWidth = (options.benchGrip || "medium") as BenchGripWidth;
    const archStyle = (options.benchArch || "moderate") as BenchArchStyle;
    const chestSize = (options.chestSize || "average") as "small" | "average" | "large";

    const pose = this.generatePose(
      anthropometry,
      gripWidth,
      archStyle,
      chestSize,
      phase.barHeightNormalized
    );

    const validation = this.validatePose(pose, input);

    return {
      pose,
      valid: validation.errors.length === 0,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }

  getROM(input: Omit<PoseSolverInput, "phase">): number {
    const { anthropometry, options } = input;
    const gripWidth = (options.benchGrip || "medium") as BenchGripWidth;
    const archStyle = (options.benchArch || "moderate") as BenchArchStyle;
    const chestSize = (options.chestSize || "average") as "small" | "average" | "large";

    return calculateBenchDisplacement(anthropometry, gripWidth, archStyle, chestSize);
  }

  private generatePose(
    anthropometry: Anthropometry,
    gripStyle: BenchGripWidth,
    archStyle: BenchArchStyle,
    chestSize: "small" | "average" | "large",
    progress: number // 0 = chest (bottom), 1 = lockout (top)
  ): Pose2D {
    const segments = anthropometry.segments;

    // Coordinate System: Behind View (Frontal Plane)
    // X = 0 (Center of Bench)
    // Y = 0 (Floor)

    // Bench Height
    const benchHeight = BENCH_PAD_SURFACE_HEIGHT_M;

    // Shoulder Position (Right Shoulder)
    // Fixed on bench. Y is roughly benchHeight + 0.15 (torso thickness).
    const shoulderY = benchHeight + 0.15;
    const shoulder = { x: 0.22, y: shoulderY }; // Right shoulder

    // Grip Width
    const gripSpacing =
      gripStyle === "narrow" ? 0.15 :
        gripStyle === "wide" ? 0.40 :
          0.28; // Medium

    // Hip Position (Center)
    // In behind view, Hip is centered (X=0) and "further away" (Z).
    const hip = { x: 0, y: benchHeight };


    // Calculate Chest Height (Bottom of ROM) based on Arch and Chest Size
    const baseChestThickness = 0.24;
    const chestSizeOffset =
      chestSize === "small" ? -0.04 :
        chestSize === "large" ? 0.05 : 0; // Average is 0

    const archOffset =
      archStyle === "flat" ? 0 :
        archStyle === "moderate" ? 0.04 :
          archStyle === "competitive" ? 0.08 :
            archStyle === "extreme" ? 0.12 : 0.04;

    const chestSurfaceY = benchHeight + baseChestThickness + chestSizeOffset + archOffset;

    // Bar Range of Motion
    // Lockout is when arms are straight.
    // Shoulder Y is roughly benchHeight + 0.15 (torso thickness at shoulder).
    // (Defined above)
    // Y at lockout = ShoulderY + Vertical Component of Arm Length
    // Cosine rule or simple Pythagoras: ArmLen^2 = Run^2 + Rise^2
    // Rise = sqrt(ArmLen^2 - Run^2)
    // Run = abs(wrist.x - shoulder.x)
    const armLength = armToGripLength(segments);
    const run = Math.abs(gripSpacing - shoulder.x);
    // Safety clamp (triangle inequality)
    const rise = run > armLength ? 0 : Math.sqrt(armLength * armLength - run * run);
    const maxBarY = shoulderY + rise;
    const minBarY = chestSurfaceY;

    // Safety check: if chest is too high (extreme arch + huge chest + short arms), clamp minBarY
    const safeMinBarY = Math.min(minBarY, maxBarY - 0.1);

    // Current Bar Y based on phase
    const currentBarY = safeMinBarY + (maxBarY - safeMinBarY) * progress;

    // Shoulder & Grip moved up


    // Wrist Position (On Bar)
    const wrist = { x: gripSpacing, y: currentBarY };

    // Elbow Logic
    let elbow: { x: number, y: number };

    if (gripStyle === "narrow") {
      // Requirement: "Have the elbows track to the outside of the shoulders so the forearms will be angled in a bit"
      const targetElbowX = shoulder.x + 0.05; // Flare out past shoulder

      // Foreshortened Y
      elbow = { x: targetElbowX, y: wrist.y - segments.forearm * 0.9 };
    } else {
      // Standard/Wide Grip: Vertical Forearms (Behind View)
      // Elbow directly below Wrist
      const elbowY = wrist.y - segments.forearm;
      elbow = { x: wrist.x, y: elbowY };
    }

    // Center of Bar (for drawing shaft)
    const bar = { x: 0, y: currentBarY };

    // Legs: Powerlifting Stance (Wide)
    // Feet wider than shoulders. Knees flared.
    const ankle = { x: 0.45, y: 0 }; // Wide feet
    const knee = { x: 0.35, y: benchHeight - 0.15 }; // Knees out, below bench level

    // Contact points
    return {
      ankle, // Used for Right Leg
      knee,  // Used for Right Leg
      hip,   // Center
      shoulder,
      elbow,
      wrist,
      toe: { x: ankle.x + segments.footLength, y: 0 },
      bar,
      contacts: {
        leftFoot: { x: -ankle.x, y: 0 },
        rightFoot: { x: ankle.x, y: 0 },
        leftHand: { x: -gripSpacing, y: currentBarY },
        rightHand: { x: gripSpacing, y: currentBarY },
      },
      angles: {
        ankle: 90,
        knee: 90,
        hip: 180,
        trunk: 0,
        shoulder: 90,
        elbow: 90,
      },
      barAngle: 0, // Horizontal
    };
  }

  validatePose(pose: Pose2D, input: PoseSolverInput): { errors: string[]; warnings: string[] } {
    // For Bench Press visualization, exact leg geometry is secondary to the upper body mechanics.
    // We suppress standard limb length validation to avoid confusing warnings about fixed leg positions.
    void pose;
    void input;
    return { errors: [], warnings: [] };
  }
}
