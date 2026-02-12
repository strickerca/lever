/**
 * Pullup/Chinup Pose Solver
 *
 * Generates poses for pullup movements (concentric-first).
 * Key constraints:
 * - Hands fixed on bar (bar fixed in world at 2.5m)
 * - Body hangs from bar
 * - Concentric phase: pull up (bottom → top)
 * - Eccentric phase: lower down (top → bottom)
 */

import { solvePullupKinematics } from "@/lib/biomechanics/kinematics";
import { calculatePullupDisplacement } from "@/lib/biomechanics/physics";
import { PullupGrip } from "@/types";
import { Pose2D, PoseSolverInput, PoseSolverResult } from "../types";
import { PoseSolver, KinematicsUtils } from "../PoseSolver";

export class PullupPoseSolver extends PoseSolver {
  private readonly BAR_HEIGHT = 2.5; // meters (standard pullup bar height)

  solve(input: PoseSolverInput): PoseSolverResult {
    const { anthropometry, options, phase } = input;

    const grip = (options.pullupGrip || "pronated") as PullupGrip;

    // Get top position (chin at bar) from existing kinematics
    const topKinematics = solvePullupKinematics(anthropometry, grip);

    const pose = this.generatePose(
      anthropometry,
      topKinematics,
      grip,
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
    return calculatePullupDisplacement(anthropometry);
  }

  private generatePose(
    anthropometry: any,
    topKinematics: any,
    grip: PullupGrip,
    progress: number // 0 = hanging (bottom), 1 = chin at bar (top)
  ): Pose2D {
    const segments = anthropometry.segments;
    const totalArmLength = anthropometry.derived.totalArm;

    // Bar is fixed in world
    const bar = { x: 0, y: this.BAR_HEIGHT };

    // Hands on bar (grip width varies slightly with grip type)
    // Pronated (standard pullup) and supinated (chinup) use shoulder width (~0.3m)
    // Neutral grip uses slightly narrower width (~0.25m)
    const gripWidth = grip === "neutral" ? 0.25 : 0.3;
    const leftHand = { x: -gripWidth, y: this.BAR_HEIGHT };
    const rightHand = { x: gripWidth, y: this.BAR_HEIGHT };

    // Shoulder position (body hangs below bar)
    // At bottom: arms fully extended
    // At top: chin at bar level, arms bent
    const shoulderYAtBottom = this.BAR_HEIGHT - totalArmLength * 0.95; // Nearly full extension
    const shoulderYAtTop = topKinematics.positions.shoulder.y;
    const shoulderY = shoulderYAtBottom + (shoulderYAtTop - shoulderYAtBottom) * progress;
    const shoulder = { x: 0, y: shoulderY };

    // Calculate arm angles
    // Shoulder angle (upper arm direction) - points up toward bar
    const shoulderAngleStart = Math.PI / 2; // Straight up at bottom
    const shoulderAngleTop = Math.PI / 2 + 0.2; // Slightly forward at top
    const shoulderAngleRad = shoulderAngleStart + (shoulderAngleTop - shoulderAngleStart) * progress;

    // Elbow angle (forearm direction)
    // At bottom: aligned with upper arm (straight)
    // At top: bent ~90 degrees
    const elbowAngleStart = shoulderAngleStart; // Straight at bottom
    const elbowAngleTop = shoulderAngleTop + Math.PI / 2; // Bent at top
    const elbowAngleRad = elbowAngleStart + (elbowAngleTop - elbowAngleStart) * progress;

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

    // Lower body hangs down (legs together or slightly bent)
    // Use forward kinematics to maintain rigid segments
    const hipAngleRad = -Math.PI / 2; // Pointing down
    const kneeAngleRad = -Math.PI / 2; // Straight legs
    const ankleAngleRad = -Math.PI / 2;

    const lowerBodyChain = KinematicsUtils.buildLowerBodyChain(
      shoulder,
      segments.torso,
      segments.femur,
      segments.tibia,
      hipAngleRad,
      kneeAngleRad,
      ankleAngleRad
    );

    // Note: buildLowerBodyChain expects ankle→knee→hip→shoulder ordering
    // But we're going shoulder→hip→knee→ankle, so we calculate manually
    const hip = {
      x: shoulder.x,
      y: shoulder.y - segments.torso,
    };
    const knee = {
      x: hip.x,
      y: hip.y - segments.femur,
    };
    const ankle = {
      x: knee.x,
      y: knee.y - segments.tibia,
    };

    return {
      ankle,
      knee,
      hip,
      shoulder,
      elbow,
      wrist,
      bar: actualBar,
      contacts: {
        leftFoot: null, // Not on ground
        rightFoot: null,
        leftHand: { x: -gripWidth, y: actualBar.y },
        rightHand: { x: gripWidth, y: actualBar.y },
      },
      angles: {
        ankle: 180, // Legs straight
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
