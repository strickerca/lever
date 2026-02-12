/**
 * Thruster Pose Solver
 *
 * Generates poses for thruster (front squat + overhead press combined).
 * Movement cycle:
 * 1. Squat down (front squat descent)
 * 2. Squat up (front squat ascent)
 * 3. Press up (overhead press)
 * 4. Press down (lower to shoulders)
 */

import { solveSquatKinematics } from "@/lib/biomechanics/kinematics";
import { calculateOHPDisplacement } from "@/lib/biomechanics/physics";
import { Pose2D, PoseSolverInput, PoseSolverResult } from "../types";
import { PoseSolver, KinematicsUtils } from "../PoseSolver";

export class ThrusterPoseSolver extends PoseSolver {
  solve(input: PoseSolverInput): PoseSolverResult {
    const { anthropometry, phase } = input;

    // Determine which phase of thruster we're in
    const pose = this.generatePoseForPhase(anthropometry, phase);
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

    // Total ROM is squat ROM + press ROM
    const squatKinematics = solveSquatKinematics(anthropometry, "front");
    const squatROM = squatKinematics.displacement;
    const pressROM = calculateOHPDisplacement(anthropometry);

    return squatROM + pressROM;
  }

  private generatePoseForPhase(anthropometry: any, phase: any): Pose2D {
    const segments = anthropometry.segments;

    switch (phase.phase) {
      case "squat_down":
      case "squat_up":
        return this.generateSquatPose(anthropometry, phase);

      case "press_up":
      case "press_down":
        return this.generatePressPose(anthropometry, phase);

      default:
        return this.generateSquatPose(anthropometry, phase);
    }
  }

  private generateSquatPose(anthropometry: any, phase: any): Pose2D {
    // Use front squat kinematics
    const bottomKinematics = solveSquatKinematics(anthropometry, "front");
    const squatProgress = phase.phase === "squat_down" ? 1 - phase.phaseProgress : phase.phaseProgress;

    // Similar to SquatPoseSolver interpolation
    const segments = anthropometry.segments;
    const bottom = bottomKinematics.positions;

    const calcAngle = (from: { x: number; y: number }, to: { x: number; y: number }) => {
      return Math.atan2(to.y - from.y, to.x - from.x);
    };

    const tibiaAngleBottom = calcAngle(bottom.ankle, bottom.knee);
    const femurAngleBottom = calcAngle(bottom.knee, bottom.hip);
    const torsoAngleBottom = calcAngle(bottom.hip, bottom.shoulder);

    const tibiaAngleTop = Math.PI / 2;
    const femurAngleTop = Math.PI / 2;
    const torsoAngleTop = Math.PI / 2;

    const tibiaAngle = tibiaAngleBottom + (tibiaAngleTop - tibiaAngleBottom) * squatProgress;
    const femurAngle = femurAngleBottom + (femurAngleTop - femurAngleBottom) * squatProgress;
    const torsoAngle = torsoAngleBottom + (torsoAngleTop - torsoAngleBottom) * squatProgress;

    const ankle = { x: 0, y: segments.footHeight };
    const chain = KinematicsUtils.buildLowerBodyChain(
      ankle,
      segments.tibia,
      segments.femur,
      segments.torso,
      tibiaAngle,
      femurAngle,
      torsoAngle
    );

    // Bar at shoulder height (front rack position)
    const bar = { x: 0, y: chain.shoulder.y + 0.1 };

    // Arms in front rack position (elbows high)
    const elbowAngleRad = Math.PI / 2 + 0.3; // Elbows up
    const armChain = KinematicsUtils.buildArmChain(
      chain.shoulder,
      segments.upperArm,
      segments.forearm,
      elbowAngleRad,
      elbowAngleRad
    );

    return {
      ankle,
      knee: chain.knee,
      hip: chain.hip,
      shoulder: chain.shoulder,
      elbow: armChain.elbow,
      wrist: armChain.wrist,
      bar,
      contacts: {
        leftFoot: { x: -0.15, y: segments.footHeight },
        rightFoot: { x: 0.15, y: segments.footHeight },
        leftHand: { x: -0.25, y: bar.y },
        rightHand: { x: 0.25, y: bar.y },
      },
      angles: {
        ankle: KinematicsUtils.toDegrees(tibiaAngle - Math.PI / 2),
        knee: KinematicsUtils.toDegrees(femurAngle - tibiaAngle),
        hip: KinematicsUtils.toDegrees(torsoAngle - femurAngle),
        trunk: KinematicsUtils.toDegrees(Math.PI / 2 - torsoAngle),
        shoulder: KinematicsUtils.toDegrees(elbowAngleRad),
        elbow: 90,
      },
    };
  }

  private generatePressPose(anthropometry: any, phase: any): Pose2D {
    // Standing with overhead press
    const segments = anthropometry.segments;
    const pressProgress = phase.phase === "press_up" ? phase.phaseProgress : 1 - phase.phaseProgress;

    const ankle = { x: 0, y: segments.footHeight };
    const knee = { x: 0, y: ankle.y + segments.tibia };
    const hip = { x: 0, y: knee.y + segments.femur };
    const shoulder = { x: 0, y: hip.y + segments.torso };

    // Calculate arm angles for press movement
    // At start: arms bent with elbows forward (front rack)
    // At top: arms straight overhead
    const shoulderAngleStart = Math.PI / 2 + 0.3; // Slightly forward
    const shoulderAngleLockout = Math.PI / 2; // Straight up
    const shoulderAngleRad = shoulderAngleStart + (shoulderAngleLockout - shoulderAngleStart) * pressProgress;

    const elbowAngleStart = Math.PI / 2 + 0.6; // More vertical
    const elbowAngleLockout = shoulderAngleLockout; // Straight
    const elbowAngleRad = elbowAngleStart + (elbowAngleLockout - elbowAngleStart) * pressProgress;

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

    // Bar position matches wrist (ensures rigid segments)
    const actualBar = { x: wrist.x, y: wrist.y };

    // Calculate actual elbow angle for display
    const elbowAngleDeg = KinematicsUtils.toDegrees(elbowAngleRad - shoulderAngleRad) + 180;

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
        ankle: 0,
        knee: 180,
        hip: 180,
        trunk: 0,
        shoulder: KinematicsUtils.toDegrees(shoulderAngleRad),
        elbow: elbowAngleDeg,
      },
    };
  }
}
