/**
 * Overhead Press (OHP) Pose Solver
 *
 * Generates poses for standing overhead press.
 * Key constraints:
 * - Standing position (legs straight, trunk vertical)
 * - Bar path from upper chest/clavicle to overhead
 * - Arms extend from bent to straight overhead
 */

import { solveOHPKinematics } from "@/lib/biomechanics/kinematics";
import { calculateOHPDisplacement } from "@/lib/biomechanics/physics";
import { Pose2D, PoseSolverInput, PoseSolverResult } from "../types";
import { PoseSolver, KinematicsUtils } from "../PoseSolver";

export class OHPPoseSolver extends PoseSolver {
  solve(input: PoseSolverInput): PoseSolverResult {
    const { anthropometry, phase } = input;

    // Get lockout position from existing kinematics
    const lockoutKinematics = solveOHPKinematics(anthropometry);

    const pose = this.generatePose(
      anthropometry,
      lockoutKinematics,
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
    const { anthropometry } = input;
    return calculateOHPDisplacement(anthropometry);
  }

  private generatePose(
    anthropometry: any,
    lockoutKinematics: any,
    progress: number // 0 = rack position (shoulders), 1 = lockout (overhead)
  ): Pose2D {
    const segments = anthropometry.segments;
    const lockout = lockoutKinematics.positions;

    // Standing position - legs straight, trunk vertical
    const ankle = { x: 0, y: segments.footHeight };
    const knee = { x: 0, y: ankle.y + segments.tibia };
    const hip = { x: 0, y: knee.y + segments.femur };
    const shoulder = { x: 0, y: hip.y + segments.torso };

    // Bar position: from upper chest height to overhead
    const armLength = segments.upperArm + segments.forearm;
    const barAtStart = shoulder.y + 0.1; // Just above shoulders (rack position)
    const barAtLockout = lockout.bar.y;
    const barY = barAtStart + (barAtLockout - barAtStart) * progress;
    const bar = { x: 0, y: barY };

    // Calculate arm angles for press movement
    // At start: arms bent with elbows forward
    // At lockout: arms straight overhead

    // Shoulder angle (upper arm direction)
    const shoulderAngleStart = Math.PI / 2 + 0.3; // Slightly forward from vertical
    const shoulderAngleLockout = Math.PI / 2; // Straight up
    const shoulderAngleRad = shoulderAngleStart + (shoulderAngleLockout - shoulderAngleStart) * progress;

    // Elbow angle (forearm direction)
    // At start: forearm points up and back (bent elbow)
    // At lockout: forearm continues upper arm direction (straight)
    const elbowAngleStart = Math.PI / 2 + 0.6; // More vertical than upper arm
    const elbowAngleLockout = shoulderAngleLockout; // Same as shoulder = straight
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

    // Contact points
    return {
      ankle,
      knee,
      hip,
      shoulder,
      elbow,
      wrist,
      bar: actualBar,
      contacts: {
        leftFoot: { x: -0.15, y: segments.footHeight },
        rightFoot: { x: 0.15, y: segments.footHeight },
        leftHand: { x: -0.25, y: actualBar.y },
        rightHand: { x: 0.25, y: actualBar.y },
      },
      angles: {
        ankle: 90,
        knee: 180,
        hip: 180,
        trunk: 0, // Vertical
        shoulder: KinematicsUtils.toDegrees(shoulderAngleRad),
        elbow: elbowAngleDeg,
      },
      barAngle: 0, // Horizontal
    };
  }
}
