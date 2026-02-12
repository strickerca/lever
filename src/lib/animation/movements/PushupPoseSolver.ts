/**
 * Pushup Pose Solver
 *
 * Generates poses for pushup movements.
 * Key constraints:
 * - Hands and feet fixed on ground (no movement)
 * - Body in plank position (straight line from head to heels)
 * - Only elbows flex/extend
 * - Maintain rigid segments throughout
 */

import { solvePushupKinematics } from "@/lib/biomechanics/kinematics";
import { calculatePushupWork } from "@/lib/biomechanics/physics";
import { Pose2D, PoseSolverInput, PoseSolverResult } from "../types";
import { PoseSolver, KinematicsUtils } from "../PoseSolver";

export class PushupPoseSolver extends PoseSolver {
  solve(input: PoseSolverInput): PoseSolverResult {
    const { anthropometry, phase } = input;

    // Get top position (arms extended) from existing kinematics
    const topKinematics = solvePushupKinematics(anthropometry);

    const pose = this.generatePose(
      anthropometry,
      topKinematics,
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
    // ROM is approximately 60% of arm length (chest to ground distance)
    const armLength = anthropometry.segments.upperArm + anthropometry.segments.forearm;
    return armLength * 0.6;
  }

  private generatePose(
    anthropometry: any,
    topKinematics: any,
    progress: number // 0 = bottom (chest near ground), 1 = top (arms extended)
  ): Pose2D {
    const segments = anthropometry.segments;
    const top = topKinematics.positions;

    // Hands fixed on ground (origin)
    const handX = 0;
    const handY = 0;
    const bar = { x: handX, y: handY }; // Bar represents hand position
    const wrist = bar;

    // Arm length and angles
    const armLength = segments.upperArm + segments.forearm;

    // Shoulder height changes with progress (higher at top, lower at bottom)
    const shoulderYAtTop = top.shoulder.y;
    const shoulderYAtBottom = shoulderYAtTop * 0.4; // Chest near ground
    const shoulderY = shoulderYAtBottom + (shoulderYAtTop - shoulderYAtBottom) * progress;

    // Shoulder x position (hands are in front of shoulders in pushup position)
    const shoulderX = armLength * 0.6; // Hands ~60% of arm length in front
    const shoulder = { x: shoulderX, y: shoulderY };

    // Calculate arm angles for pushup
    // Arms point backward from hands (on ground) to shoulders
    const armAngleRad = Math.atan2(shoulder.y - bar.y, shoulder.x - bar.x);

    // Shoulder angle (upper arm direction from shoulder backward to hands)
    const shoulderAngleRad = armAngleRad + Math.PI; // Point from shoulder to hands

    // Elbow angle (forearm direction)
    // At bottom: bent elbow
    // At top: straight arms
    const elbowBend = (1 - progress) * 0.5; // More bent at bottom
    const elbowAngleRad = shoulderAngleRad + elbowBend;

    // Build arm chain - but we need to work backward from hands to shoulder
    // So we'll calculate from hands (wrist) backward
    const elbowFromWrist = {
      x: wrist.x + segments.forearm * Math.cos(shoulderAngleRad + Math.PI),
      y: wrist.y + segments.forearm * Math.sin(shoulderAngleRad + Math.PI),
    };
    const shoulderFromElbow = {
      x: elbowFromWrist.x + segments.upperArm * Math.cos(shoulderAngleRad + Math.PI),
      y: elbowFromWrist.y + segments.upperArm * Math.sin(shoulderAngleRad + Math.PI),
    };

    // Use calculated positions
    const elbow = elbowFromWrist;
    // Adjust shoulder Y to match progress, keep calculated X
    const adjustedShoulder = { x: shoulderFromElbow.x, y: shoulderY };

    // Body in plank position (straight line from shoulders backward)
    const plankAngleRad = KinematicsUtils.toRadians(5); // Nearly horizontal

    // Build lower body chain using forward kinematics
    const lowerBodyChain = KinematicsUtils.buildLowerBodyChain(
      adjustedShoulder,
      segments.torso,
      segments.femur,
      segments.tibia,
      Math.PI - plankAngleRad, // Torso angle (backward)
      Math.PI - plankAngleRad, // Femur angle (backward, plank)
      Math.PI - plankAngleRad  // Tibia angle (backward, plank)
    );

    // Use calculated positions but ensure feet are on ground
    const hip = lowerBodyChain.hip;
    const knee = lowerBodyChain.knee;
    const ankle = { x: lowerBodyChain.shoulder.x, y: segments.footHeight }; // Feet on ground

    // Calculate actual elbow angle for display
    const elbowAngleDeg = 180 - (1 - progress) * 90; // 180 at top, 90 at bottom

    return {
      ankle,
      knee,
      hip,
      shoulder: adjustedShoulder,
      elbow,
      wrist,
      bar,
      contacts: {
        leftFoot: { x: ankle.x - 0.1, y: segments.footHeight },
        rightFoot: { x: ankle.x + 0.1, y: segments.footHeight },
        leftHand: { x: -0.2, y: 0 },
        rightHand: { x: 0.2, y: 0 },
      },
      angles: {
        ankle: 90,
        knee: 180,
        hip: 180,
        trunk: KinematicsUtils.toDegrees(plankAngleRad),
        shoulder: KinematicsUtils.toDegrees(shoulderAngleRad),
        elbow: elbowAngleDeg,
      },
    };
  }
}
