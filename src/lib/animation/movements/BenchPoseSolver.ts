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

import { solveBenchKinematics } from "@/lib/biomechanics/kinematics";
import { calculateBenchDisplacement } from "@/lib/biomechanics/physics";
import { BENCH_GRIP_ANGLES, BENCH_ARCH_HEIGHTS, AVERAGE_CHEST_DEPTH } from "@/lib/biomechanics/constants";
import { Pose2D, PoseSolverInput, PoseSolverResult } from "../types";
import { PoseSolver, KinematicsUtils } from "../PoseSolver";

export class BenchPoseSolver extends PoseSolver {
  private readonly BENCH_HEIGHT = 0.45; // meters

  solve(input: PoseSolverInput): PoseSolverResult {
    const { anthropometry, options, phase } = input;

    const gripWidth = (options.benchGrip || "medium") as "narrow" | "medium" | "wide";
    const archStyle = (options.benchArch || "moderate") as "flat" | "moderate" | "competitive" | "extreme";

    // Get lockout position from existing kinematics
    const lockoutKinematics = solveBenchKinematics(anthropometry, gripWidth, archStyle);

    const pose = this.generatePose(
      anthropometry,
      lockoutKinematics,
      gripWidth,
      archStyle,
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
    const gripWidth = (options.benchGrip || "medium") as string;
    const archStyle = (options.benchArch || "moderate") as string;

    return calculateBenchDisplacement(
      anthropometry,
      gripWidth as any,
      archStyle as any
    );
  }

  private generatePose(
    anthropometry: any,
    lockoutKinematics: any,
    gripWidth: string,
    archStyle: string,
    progress: number // 0 = chest (bottom), 1 = lockout (top)
  ): Pose2D {
    const segments = anthropometry.segments;
    const lockout = lockoutKinematics.positions;

    // Get arch height
    const archHeights = { flat: 0, moderate: 0.05, competitive: 0.08, extreme: 0.12 };
    const archHeight = archHeights[archStyle as keyof typeof archHeights] || 0.05;

    // Shoulder position (lying on bench with arch)
    const shoulderY = this.BENCH_HEIGHT + archHeight;
    const shoulder = { x: 0, y: shoulderY };

    // Calculate bar position (vertical path from chest to lockout)
    const chestDepth = AVERAGE_CHEST_DEPTH;
    const barAtChest = shoulderY + chestDepth + archHeight;
    const barAtLockout = lockout.bar.y;
    const barY = barAtChest + (barAtLockout - barAtChest) * progress;
    const bar = { x: 0, y: barY };

    // Calculate arm angles for bench press
    // Shoulder angle (upper arm direction from shoulder)
    const gripAngles = { narrow: 60, medium: 75, wide: 85 };
    const gripAngleDeg = gripAngles[gripWidth as keyof typeof gripAngles] || 75;

    // At chest: arms angled, elbows flared
    // At lockout: arms point straight up (90 degrees)
    const shoulderAngleStart = KinematicsUtils.toRadians(gripAngleDeg); // Angled at bottom
    const shoulderAngleLockout = Math.PI / 2; // Straight up at top
    const shoulderAngleRad = shoulderAngleStart + (shoulderAngleLockout - shoulderAngleStart) * progress;

    // Elbow angle (forearm direction)
    // At chest: forearm points more vertical than upper arm (bent elbow)
    // At lockout: forearm continues upper arm direction (straight)
    const elbowAngleStart = Math.PI / 2; // Forearm points up
    const elbowAngleLockout = shoulderAngleLockout; // Aligned with upper arm = straight
    const elbowAngleRad = elbowAngleStart + (elbowAngleLockout - elbowAngleStart) * progress;

    // Build arm chain with proper forward kinematics
    const armChain = KinematicsUtils.buildArmChain(
      shoulder,
      segments.upperArm,
      segments.forearm,
      shoulderAngleRad,
      elbowAngleRad
    );

    const elbow = armChain.elbow;
    const wrist = armChain.wrist;

    // Update bar position to match where wrists are (ensures rigid segments)
    const actualBar = { x: wrist.x, y: wrist.y };

    // Calculate actual elbow angle for display
    const elbowAngleDeg = KinematicsUtils.toDegrees(elbowAngleRad - shoulderAngleRad) + 180;

    // Lower body (legs on ground, knees bent)
    // In bench press, body is supine (lying down)
    // Hip is below shoulder by torso length (lying horizontally)
    const hip = { x: 0, y: shoulderY - segments.torso };

    // Knees bent with feet planted on ground
    // This is approximate - exact IK would be complex for supine position
    const ankleY = segments.footHeight;
    const ankleX = segments.femur * 0.6; // Feet forward
    const ankle = { x: ankleX, y: ankleY };

    // Knee position - use forward kinematics from ankle
    // Assume tibia is roughly vertical from ankle
    const tibiaAngleRad = Math.PI / 2 - 0.3; // Slightly back from vertical
    const knee = {
      x: ankle.x + segments.tibia * Math.cos(tibiaAngleRad),
      y: ankle.y + segments.tibia * Math.sin(tibiaAngleRad),
    };

    // Contact points
    const gripSpacing = gripWidth === "wide" ? 0.35 : gripWidth === "narrow" ? 0.2 : 0.3;

    return {
      ankle,
      knee,
      hip,
      shoulder,
      elbow,
      wrist,
      bar: actualBar,
      contacts: {
        leftFoot: { x: ankleX - 0.1, y: ankleY },
        rightFoot: { x: ankleX + 0.1, y: ankleY },
        leftHand: { x: -gripSpacing, y: actualBar.y },
        rightHand: { x: gripSpacing, y: actualBar.y },
      },
      angles: {
        ankle: 90,
        knee: 120,
        hip: 100,
        trunk: 5, // Slight arch
        shoulder: KinematicsUtils.toDegrees(shoulderAngleRad),
        elbow: elbowAngleDeg,
      },
      barAngle: 0, // Horizontal
    };
  }
}
