/**
 * Squat Pose Solver
 *
 * Generates anatomically valid poses for squat movements (high bar, low bar, front)
 * with different stance widths. Uses the existing squat kinematics solver for bottom
 * position and interpolates to standing position.
 */

import { solveSquatKinematics } from "@/lib/biomechanics/kinematics";
import { SquatVariant, SquatStance } from "@/types";
import { Pose2D, PoseSolverInput, PoseSolverResult } from "../types";
import { PoseSolver, KinematicsUtils } from "../PoseSolver";

export class SquatPoseSolver extends PoseSolver {
  /**
   * Solve for squat pose at given animation phase
   */
  solve(input: PoseSolverInput): PoseSolverResult {
    const { anthropometry, options, phase } = input;

    // Get variant and stance from options
    const variant = (options.squatVariant || "highBar") as SquatVariant | "highBar" | "lowBar" | "front";
    const stance = (options.squatStance || "normal") as SquatStance | "narrow" | "normal" | "wide" | "ultraWide";

    // Use existing kinematics solver to get bottom position
    const bottomKinematics = solveSquatKinematics(anthropometry, variant, stance);

    if (!bottomKinematics.valid) {
      // Kinematics solver failed - return error
      return {
        pose: this.createFallbackPose(anthropometry),
        valid: false,
        errors: ["Kinematic solver failed to find valid bottom position"],
        warnings: [],
      };
    }

    // Generate pose based on phase
    const pose = this.interpolatePose(
      anthropometry,
      bottomKinematics,
      phase.barHeightNormalized,
      variant
    );

    // Validate
    const validation = this.validatePose(pose, input);

    return {
      pose,
      valid: validation.errors.length === 0,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }

  /**
   * Get ROM for squat
   */
  getROM(input: Omit<PoseSolverInput, "phase">): number {
    const { anthropometry, options } = input;

    const variant = (options.squatVariant || "highBar") as SquatVariant | "highBar" | "lowBar" | "front";
    const stance = (options.squatStance || "normal") as SquatStance | "narrow" | "normal" | "wide" | "ultraWide";

    const kinematics = solveSquatKinematics(anthropometry, variant, stance);
    return kinematics.displacement;
  }

  /**
   * Interpolate between bottom position (squat depth) and top position (standing)
   *
   * @param anthropometry - Lifter anthropometry
   * @param bottomKinematics - Kinematic solution at bottom position
   * @param phase - Animation phase (0 = bottom, 1 = top/standing)
   * @param variant - Squat variant (affects bar position)
   * @returns Complete pose
   */
  private interpolatePose(
    anthropometry: any,
    bottomKinematics: any,
    phase: number,
    variant: string
  ): Pose2D {
    const bottom = bottomKinematics.positions;

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
    const upperArmLength = anthropometry.segments.upperArm;
    const forearmLength = anthropometry.segments.forearm;

    // Build lower body chain
    const ankle = { x: 0, y: anthropometry.segments.footHeight };
    const chain = KinematicsUtils.buildLowerBodyChain(
      ankle,
      tibiaLength,
      femurLength,
      torsoLength,
      tibiaAngle,
      femurAngle,
      torsoAngle
    );

    const { knee, hip, shoulder } = chain;

    // Calculate bar position with proper rotation relative to trunk
    // The bar offset is fixed on the lifter's back and rotates with trunk angle
    const barOffsetX_bottom = bottom.bar.x - bottom.shoulder.x;
    const barOffsetY_bottom = bottom.bar.y - bottom.shoulder.y;

    const offsetMagnitude = Math.sqrt(barOffsetX_bottom ** 2 + barOffsetY_bottom ** 2);
    const offsetAngleRelativeToTorso = Math.atan2(barOffsetY_bottom, barOffsetX_bottom) - torsoAngleBottom;

    const currentOffsetAngle = torsoAngle + offsetAngleRelativeToTorso;
    const bar = {
      x: shoulder.x + offsetMagnitude * Math.cos(currentOffsetAngle),
      y: shoulder.y + offsetMagnitude * Math.sin(currentOffsetAngle),
    };

    // Arms hang down (simplified - not used in squat but needed for complete pose)
    const shoulderAngleRad = torsoAngle - Math.PI / 2; // Arms hang relative to torso
    const elbowAngleRad = shoulderAngleRad; // Straight arms
    const armChain = KinematicsUtils.buildArmChain(
      shoulder,
      upperArmLength,
      forearmLength,
      shoulderAngleRad,
      elbowAngleRad
    );

    // Calculate angles in degrees for the pose
    const ankleAngleDeg = KinematicsUtils.toDegrees(tibiaAngle - Math.PI / 2);
    const kneeAngleDeg = KinematicsUtils.toDegrees(femurAngle - tibiaAngle);
    const hipAngleDeg = KinematicsUtils.toDegrees(torsoAngle - femurAngle);
    const trunkAngleDeg = KinematicsUtils.toDegrees(Math.PI / 2 - torsoAngle);

    return {
      ankle,
      knee,
      hip,
      shoulder,
      elbow: armChain.elbow,
      wrist: armChain.wrist,
      bar,
      contacts: {
        leftFoot: { x: -0.1, y: anthropometry.segments.footHeight }, // Feet on ground
        rightFoot: { x: 0.1, y: anthropometry.segments.footHeight },
        leftHand: null, // Not gripping bar in squat
        rightHand: null,
      },
      angles: {
        ankle: ankleAngleDeg,
        knee: kneeAngleDeg,
        hip: hipAngleDeg,
        trunk: trunkAngleDeg,
        shoulder: KinematicsUtils.toDegrees(shoulderAngleRad),
        elbow: 180, // Straight arms
      },
    };
  }

  /**
   * Create fallback pose when kinematics solver fails
   */
  private createFallbackPose(anthropometry: any): Pose2D {
    // Simple standing position
    const ankle = { x: 0, y: anthropometry.segments.footHeight };
    const knee = { x: 0, y: ankle.y + anthropometry.segments.tibia };
    const hip = { x: 0, y: knee.y + anthropometry.segments.femur };
    const shoulder = { x: 0, y: hip.y + anthropometry.segments.torso };
    const elbow = { x: 0, y: shoulder.y - anthropometry.segments.upperArm };
    const wrist = { x: 0, y: elbow.y - anthropometry.segments.forearm };
    const bar = { x: 0, y: shoulder.y - 0.05 }; // Slightly below shoulder

    return {
      ankle,
      knee,
      hip,
      shoulder,
      elbow,
      wrist,
      bar,
      contacts: {
        leftFoot: { x: -0.1, y: anthropometry.segments.footHeight },
        rightFoot: { x: 0.1, y: anthropometry.segments.footHeight },
        leftHand: null,
        rightHand: null,
      },
      angles: {
        ankle: 0,
        knee: 180,
        hip: 180,
        trunk: 0,
        shoulder: -90,
        elbow: 180,
      },
    };
  }
}
