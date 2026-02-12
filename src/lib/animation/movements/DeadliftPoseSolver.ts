/**
 * Deadlift Pose Solver
 *
 * Generates poses for deadlift movements (conventional and sumo).
 * Key constraints:
 * - Arms remain straight throughout movement (rigid total arm length)
 * - Bar path approximately vertical
 * - Hip hinge pattern
 * - Hands grip bar at standard plate radius height (plus offset for blocks/deficit)
 */

import { solveDeadliftKinematics } from "@/lib/biomechanics/kinematics";
import { calculateDeadliftDisplacement } from "@/lib/biomechanics/physics";
import { STANDARD_PLATE_RADIUS } from "@/lib/biomechanics/constants";
import { Pose2D, PoseSolverInput, PoseSolverResult } from "../types";
import { PoseSolver, KinematicsUtils } from "../PoseSolver";

export class DeadliftPoseSolver extends PoseSolver {
  solve(input: PoseSolverInput): PoseSolverResult {
    const { anthropometry, options, phase } = input;

    const variant = (options.deadliftVariant || "conventional") as "conventional" | "sumo";
    const stance = (options.sumoStance || "normal") as "hybrid" | "normal" | "wide" | "ultraWide";
    const barOffset = options.deadliftBarOffset || 0;

    // Get lockout position from existing kinematics
    const lockoutKinematics = solveDeadliftKinematics(
      anthropometry,
      variant,
      stance,
      barOffset
    );

    const pose = this.generatePose(
      anthropometry,
      lockoutKinematics,
      variant,
      barOffset,
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
    const variant = (options.deadliftVariant || "conventional") as "conventional" | "sumo";
    const stance = (options.sumoStance || "normal") as "hybrid" | "normal" | "wide" | "ultraWide";
    const barOffset = options.deadliftBarOffset || 0;

    return calculateDeadliftDisplacement(
      anthropometry,
      variant,
      stance,
      barOffset
    );
  }

  private generatePose(
    anthropometry: any,
    lockoutKinematics: any,
    variant: "conventional" | "sumo",
    barOffset: number,
    progress: number // 0 = floor (start), 1 = lockout (top)
  ): Pose2D {
    const segments = anthropometry.segments;
    const lockout = lockoutKinematics.positions;

    // Bar height at start (floor)
    const barStartHeight = STANDARD_PLATE_RADIUS + barOffset;

    // Bar travels vertically from floor to lockout
    const barY = barStartHeight + (lockout.bar.y - barStartHeight) * progress;
    const bar = { x: 0, y: barY };

    // Ankle remains fixed on ground
    const ankle = { x: 0, y: segments.footHeight };

    // Define joint angles at bottom and top positions
    // Bottom position (bar at floor): bent over, knees bent
    const bottomAngles = variant === "sumo" ? {
      knee: 100, // More knee bend in sumo
      hip: 110,  // More open hip angle in sumo
      trunk: 50, // More upright trunk in sumo (degrees from vertical)
    } : {
      knee: 130,  // Less knee bend in conventional
      hip: 100,   // More closed hip angle
      trunk: 30,  // More bent over trunk
    };

    // Top position (from lockout kinematics)
    const topAngles = {
      knee: lockoutKinematics.angles.knee,
      hip: lockoutKinematics.angles.hip,
      trunk: lockoutKinematics.angles.trunk,
    };

    // Interpolate angles with cubic easing
    const t = this.easeInOutCubic(progress);
    const kneeAngle = bottomAngles.knee + (topAngles.knee - bottomAngles.knee) * t;
    const hipAngle = bottomAngles.hip + (topAngles.hip - bottomAngles.hip) * t;
    const trunkAngle = bottomAngles.trunk + (topAngles.trunk - bottomAngles.trunk) * t;

    // Convert angles to radians for kinematic chain building
    // knee angle is the interior angle, we need the direction angles for segments
    const tibiaAngleRad = KinematicsUtils.toRadians(85); // Tibia mostly vertical
    const femurAngleRad = tibiaAngleRad + KinematicsUtils.toRadians(180 - kneeAngle);
    const torsoAngleRad = KinematicsUtils.toRadians(90 - trunkAngle);

    // Build kinematic chain
    const { knee, hip, shoulder } = KinematicsUtils.buildLowerBodyChain(
      ankle,
      segments.tibia,
      segments.femur,
      segments.torso,
      tibiaAngleRad,
      femurAngleRad,
      torsoAngleRad
    );

    // Arms must extend straight down to bar (straight arms constraint)
    // For deadlift, arms hang straight down from shoulders to bar
    // Calculate arm angle pointing from shoulder toward bar
    const armAngleRad = Math.atan2(bar.y - shoulder.y, bar.x - shoulder.x);

    // Build arm chain with straight arms (elbow angle = shoulder angle)
    const armChain = KinematicsUtils.buildArmChain(
      shoulder,
      segments.upperArm,
      segments.forearm,
      armAngleRad,
      armAngleRad  // Same angle = straight arms
    );

    const elbow = armChain.elbow;
    const wrist = armChain.wrist;

    // Update bar position to match where wrists actually are (ensures rigid segments)
    const actualBar = { x: wrist.x, y: wrist.y };

    // Contact points
    const stanceWidth = variant === "sumo" ? 0.15 : 0.1;

    return {
      ankle,
      knee,
      hip,
      shoulder,
      elbow,
      wrist,
      bar: actualBar,
      contacts: {
        leftFoot: { x: -stanceWidth, y: segments.footHeight },
        rightFoot: { x: stanceWidth, y: segments.footHeight },
        leftHand: { x: -0.2, y: actualBar.y },
        rightHand: { x: 0.2, y: actualBar.y },
      },
      angles: {
        ankle: 90,
        knee: kneeAngle,
        hip: hipAngle,
        trunk: trunkAngle,
        shoulder: KinematicsUtils.toDegrees(armAngleRad) + 90,
        elbow: 180, // Straight arms
      },
      barAngle: 0, // Horizontal
    };
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}
