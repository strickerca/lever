/**
 * Thruster Pose Solver
 *
 * Generates poses for thruster (front squat + overhead press combined).
 * Movement cycle:
 * 1. Squat down (front squat descent)
 * 2. Squat up (front squat ascent)
 * 3. Press up (overhead press)
 * 4. Pause (overhead lockout)
 * 5. Press down (lower to shoulders)
 */

import { solveSquatKinematics } from "@/lib/biomechanics/kinematics";
import { calculateOHPDisplacement } from "@/lib/biomechanics/physics";
import { Anthropometry } from "@/types";
import { Pose2D, PoseSolverInput, PoseSolverResult } from "../types";
import { PoseSolver, KinematicsUtils } from "../PoseSolver";

export function getThrusterROMParts(anthropometry: Anthropometry): { squatROM: number; pressROM: number } {
  const squatKinematics = solveSquatKinematics(anthropometry, "front");
  const squatROM = squatKinematics.displacement;
  const pressROM = calculateOHPDisplacement(anthropometry);

  return { squatROM, pressROM };
}

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

    const { squatROM, pressROM } = getThrusterROMParts(anthropometry);
    return squatROM + pressROM;
  }

  private generatePoseForPhase(
    anthropometry: Anthropometry,
    phase: PoseSolverInput["phase"]
  ): Pose2D {
    switch (phase.phase) {
      case "squat_down":
      case "squat_up":
        return this.generateSquatPose(anthropometry, phase);

      case "press_up":
      case "press_down":
      case "pause_top":
        return this.generatePressPose(anthropometry, phase);

      default:
        return this.generateSquatPose(anthropometry, phase);
    }
  }

  private generateSquatPose(
    anthropometry: Anthropometry,
    phase: PoseSolverInput["phase"]
  ): Pose2D {
    // Asymmetric Cycle:
    // Squat Down: Straight Legs (Rack) -> Bottom
    // Squat Up: Bottom -> Bent Legs (High Squat/Kinematic Blend)

    // Scaling factor for giant/small lifters
    // Base height reference ~1.75m
    const heightScale = anthropometry.segments.height / 1.75;

    // Use front squat kinematics
    const bottomKinematics = solveSquatKinematics(anthropometry, "front");
    const squatProgress = phase.phase === "squat_down" ? 1 - phase.phaseProgress : phase.phaseProgress;

    const segments = anthropometry.segments;
    const bottom = bottomKinematics.positions;

    const calcAngle = (from: { x: number; y: number }, to: { x: number; y: number }) => {
      return Math.atan2(to.y - from.y, to.x - from.x);
    };

    const tibiaAngleBottom = calcAngle(bottom.ankle, bottom.knee);
    const femurAngleBottom = calcAngle(bottom.knee, bottom.hip);
    const torsoAngleBottom = calcAngle(bottom.hip, bottom.shoulder);

    // Determines 'Top' Pose based on direction
    const vertical = Math.PI / 2;
    const EXTENSION_OFFSET = 0.2 * heightScale;

    let tibiaAngleTop = vertical;
    let femurAngleTop = vertical;
    const torsoAngleTop = vertical;

    if (phase.phase === "squat_up") {
      // Upward Drive: Target "Bent" pose for Kinematic Blend
      tibiaAngleTop = vertical - EXTENSION_OFFSET / 2;
      femurAngleTop = vertical + EXTENSION_OFFSET / 2;
    }
    // Else (squat_down): Target "Straight" pose for Start position

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

    // Bar at shoulder height (Front Rack Position)
    // Needs to be robust to body position. Anchor to shoulder.
    // Scale offsets for large/small lifters
    const rackOffsetX = 0.20 * heightScale;
    const rackOffsetY = 0.05 * heightScale;
    const bar = { x: chain.shoulder.x + rackOffsetX, y: chain.shoulder.y + rackOffsetY };

    // Arms in front rack position
    const wrist = { x: bar.x, y: bar.y };
    const ikCw = KinematicsUtils.solveTwoLinkIK(chain.shoulder, wrist, segments.upperArm, segments.forearm, "cw");
    const ikCcw = KinematicsUtils.solveTwoLinkIK(chain.shoulder, wrist, segments.upperArm, segments.forearm, "ccw");
    let elbow = ikCw.joint;
    if (ikCcw.joint.x > ikCw.joint.x) elbow = ikCcw.joint;

    const shoulderAngleRad = Math.atan2(elbow.y - chain.shoulder.y, elbow.x - chain.shoulder.x);
    const elbowAngleRad = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x);
    const shoulderDeg = KinematicsUtils.toDegrees(shoulderAngleRad);
    const elbowDeg = KinematicsUtils.toDegrees(elbowAngleRad - shoulderAngleRad) + 180;

    const handSpacing = 0.25 * heightScale;
    const footSpacing = 0.15 * heightScale;

    return {
      ankle,
      knee: chain.knee,
      hip: chain.hip,
      shoulder: chain.shoulder,
      elbow,
      wrist,
      toe: { x: ankle.x + segments.footLength, y: ankle.y },
      bar,
      contacts: {
        leftFoot: { x: -footSpacing, y: segments.footHeight },
        rightFoot: { x: footSpacing, y: segments.footHeight },
        leftHand: { x: bar.x - handSpacing, y: bar.y },
        rightHand: { x: bar.x + handSpacing, y: bar.y },
      },
      angles: {
        ankle: KinematicsUtils.toDegrees(tibiaAngle - Math.PI / 2),
        knee: KinematicsUtils.toDegrees(femurAngle - tibiaAngle),
        hip: KinematicsUtils.toDegrees(torsoAngle - femurAngle),
        trunk: KinematicsUtils.toDegrees(Math.PI / 2 - torsoAngle),
        shoulder: shoulderDeg,
        elbow: elbowDeg,
      },
      barAngle: 0,
    };
  }

  private generatePressPose(
    anthropometry: Anthropometry,
    phase: PoseSolverInput["phase"]
  ): Pose2D {
    // Asymmetric Cycle:
    // Press Up: Bent Legs (High Squat) -> Lockout
    // Press Down: Lockout -> Straight Legs (Rack)

    const heightScale = anthropometry.segments.height / 1.75;

    let progress = 0;
    if (phase.phase === "press_up") progress = phase.phaseProgress;
    else if (phase.phase === "press_down") progress = 1 - phase.phaseProgress;
    else if (phase.phase === "pause_top") progress = 1.0;

    const segments = anthropometry.segments;
    const EXTENSION_OFFSET = 0.2 * heightScale;
    const vertical = Math.PI / 2;

    // Determine Start Pose (0.0 progress)
    let tibiaAngleStart = vertical;
    let femurAngleStart = vertical;
    const torsoAngleStart = vertical;

    if (phase.phase === "press_up") {
      // Start from Bent (Overlap with Squat Up)
      tibiaAngleStart = vertical - EXTENSION_OFFSET / 2;
      femurAngleStart = vertical + EXTENSION_OFFSET / 2;
    }
    // Else (press_down): Target Straight (Overlap with Squat Down)

    // Interpolate body to full lockout (Vertical)
    const tBody = progress;
    const tibiaAngle = tibiaAngleStart + (vertical - tibiaAngleStart) * tBody;
    const femurAngle = femurAngleStart + (vertical - femurAngleStart) * tBody;
    const torsoAngle = torsoAngleStart + (vertical - torsoAngleStart) * tBody;

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

    // =========================================================================
    // BAR PATH
    // =========================================================================

    const startOffset = { x: 0.20 * heightScale, y: 0.05 * heightScale };
    const endOffset = { x: 0, y: segments.upperArm + segments.forearm };

    // Interpolate Offset
    const tBar = Math.max(0, Math.min(1, progress));

    const currentOffsetX = startOffset.x + (endOffset.x - startOffset.x) * tBar;
    const currentOffsetY = startOffset.y + (endOffset.y - startOffset.y) * tBar;

    const wrist = {
      x: chain.shoulder.x + currentOffsetX,
      y: chain.shoulder.y + currentOffsetY
    };

    // =========================================================================
    // ARM IK
    // =========================================================================

    const ikResultCw = KinematicsUtils.solveTwoLinkIK(
      chain.shoulder,
      wrist,
      segments.upperArm,
      segments.forearm,
      "cw"
    );
    const ikResultCcw = KinematicsUtils.solveTwoLinkIK(
      chain.shoulder,
      wrist,
      segments.upperArm,
      segments.forearm,
      "ccw"
    );

    // Elbow Forward preference
    let elbow = ikResultCw.joint;
    if (ikResultCcw.joint.x > ikResultCw.joint.x) {
      elbow = ikResultCcw.joint;
    }

    const shoulderAngleRad = Math.atan2(elbow.y - chain.shoulder.y, elbow.x - chain.shoulder.x);
    const elbowAngleRad = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x);
    const elbowDeg = KinematicsUtils.toDegrees(elbowAngleRad - shoulderAngleRad) + 180;

    const handSpacing = 0.25 * heightScale;
    const footSpacing = 0.15 * heightScale;

    return {
      ankle,
      knee: chain.knee,
      hip: chain.hip,
      shoulder: chain.shoulder,
      elbow,
      wrist,
      toe: { x: ankle.x + segments.footLength, y: 0 },
      bar: wrist,
      contacts: {
        leftFoot: { x: -footSpacing, y: segments.footHeight },
        rightFoot: { x: footSpacing, y: segments.footHeight },
        leftHand: { x: wrist.x - handSpacing, y: wrist.y },
        rightHand: { x: wrist.x + handSpacing, y: wrist.y },
      },
      angles: {
        ankle: 0,
        knee: 180,
        hip: 180,
        trunk: 0,
        shoulder: KinematicsUtils.toDegrees(shoulderAngleRad),
        elbow: elbowDeg,
      },
      barAngle: 0,
    };
  }
}
