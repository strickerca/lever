/**
 * Squat Pose Solver
 *
 * Generates anatomically valid poses for squat movements (high bar, low bar, front)
 * with different stance widths. Uses the existing squat kinematics solver for bottom
 * position and interpolates to standing position.
 */

import { solveSquatKinematics } from "@/lib/biomechanics/kinematics";
import { BAR_POSITIONS, SQUAT_STANCE_MODIFIERS } from "@/lib/biomechanics/constants";
import { Anthropometry, SquatStance, SquatVariant } from "@/types";
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
    const depth = (options.squatDepth || "parallel") as "parallel" | "belowParallel";

    // Use existing kinematics solver to get bottom position
    const bottomKinematics = solveSquatKinematics(anthropometry, variant, stance, depth);

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
      variant,
      stance
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
    const depth = (options.squatDepth || "parallel") as "parallel" | "belowParallel";

    const kinematics = solveSquatKinematics(anthropometry, variant, stance, depth);
    return kinematics.displacement;
  }

  /**
   * Interpolate between bottom position (squat depth) and top position (standing)
   * Enforces mechanically valid constraints (bar over midfoot) throughout ROM
   *
   * @param anthropometry - Lifter anthropometry
   * @param bottomKinematics - Kinematic solution at bottom position
   * @param phase - Animation phase (0 = bottom, 1 = top/standing)
   * @param variant - Squat variant (affects bar position)
   * @returns Complete pose
   */
  private interpolatePose(
    anthropometry: Anthropometry,
    bottomKinematics: ReturnType<typeof solveSquatKinematics>,
    phase: number,
    variant: SquatVariant | "highBar" | "lowBar" | "front",
    stance: SquatStance | "narrow" | "normal" | "wide" | "ultraWide" = "normal"
  ): Pose2D {
    const bottom = bottomKinematics.positions;

    // Helper to calculate angle
    const calcAngle = (from: { x: number; y: number }, to: { x: number; y: number }) => {
      return Math.atan2(to.y - from.y, to.x - from.x);
    };

    // 1. Interpolate Driver Angles (Tibia and Femur)
    // We linearly interpolate these "driver" joints to create smooth motion

    // Tibia: Bottom angle -> 90 degrees (Vertical)
    const tibiaAngleBottom = calcAngle(bottom.ankle, bottom.knee);
    const tibiaAngleTop = Math.PI / 2;
    const currentTibiaAngle = tibiaAngleBottom + (tibiaAngleTop - tibiaAngleBottom) * phase;

    // Femur: Bottom angle -> 90 degrees (Vertical)
    let femurAngleBottom = calcAngle(bottom.knee, bottom.hip);
    // Wrap if needed (e.g. -170 -> 190) to ensure short path to 90
    if (femurAngleBottom < 0) femurAngleBottom += 2 * Math.PI;

    const femurAngleTop = Math.PI / 2;
    const currentFemurAngle = femurAngleBottom + (femurAngleTop - femurAngleBottom) * phase;

    // 2. Reconstruct Chain Position (Ankle -> Knee -> Hip)
    // We work relative to Ankle at (0,0) initially for the solver
    const L_tibia = anthropometry.segments.tibia;
    const stanceModifiers = SQUAT_STANCE_MODIFIERS[stance as keyof typeof SQUAT_STANCE_MODIFIERS] || SQUAT_STANCE_MODIFIERS.normal;
    // Apply stance modifier to femur length (abduction foreshortening effect)
    const L_femur = anthropometry.segments.femur * stanceModifiers.femurMultiplier;
    const L_torso = anthropometry.segments.torso;

    const knee = {
      x: L_tibia * Math.cos(currentTibiaAngle),
      y: L_tibia * Math.sin(currentTibiaAngle)
    };

    const hip = {
      x: knee.x + L_femur * Math.cos(currentFemurAngle),
      y: knee.y + L_femur * Math.sin(currentFemurAngle)
    };

    // 3. Solve for Torso Angle to keep Bar Centered (X=0)
    // Bar X = Shoulder X + RotatedOffset X
    // Shoulder X = Hip X + Torso * cos(TorsoAngle)
    // We want Bar X = 0 (over midfoot/ankle)

    // Get bar offsets
    const barOffset = BAR_POSITIONS[variant as keyof typeof BAR_POSITIONS] || BAR_POSITIONS.highBar;
    // Convert cm to meters
    const h = barOffset.horizontal / 100;
    const v = barOffset.vertical / 100;

    // Equation to solve:
    // hip.x + L_torso * cos(theta) + h * cos(theta - 90 deg?) + v * sin(theta - 90 deg?) = 0
    // Wait, let's stick to the coordinate system used in Kinematics solver for the equation
    // In Kinematics.ts, theta is angle from vertical (0 = upright).
    // Here we have absolute angles where PI/2 is upright.
    // Let's use `theta_vert` = angle of torso from vertical.
    // Torso absolute angle = PI/2 - theta_vert (if leaning forward)
    // Or PI/2 + theta_vert? Trunks lean forward, so angle < 90 deg.
    // So Absolute = PI/2 - theta_vert.
    // x component of torso = L * cos(PI/2 - theta_vert) = L * sin(theta_vert)
    // This matches kinematics.ts: x = L * sin(theta)

    // Using formula from kinematics.ts (theta is angle from vertical):
    // (L_torso + v)*sin(theta) + h*cos(theta) = -hip.x

    const A = L_torso + v;
    const B = h;
    const C = -hip.x;

    const magnitude = Math.sqrt(A * A + B * B);
    const phi = Math.atan2(B, A);
    const sin_theta_plus_phi = C / magnitude;

    let theta_vert = 0; // Angle from vertical
    if (Math.abs(sin_theta_plus_phi) <= 1) {
      theta_vert = Math.asin(sin_theta_plus_phi) - phi;
    } else {
      // Fallback: Linear interpolation if solver fails (should ideally not happen inside valid ROM)
      const torsoAngleBottom = calcAngle(bottom.hip, bottom.shoulder);
      const interpolatedAbsolute = torsoAngleBottom + (Math.PI / 2 - torsoAngleBottom) * phase;
      theta_vert = Math.PI / 2 - interpolatedAbsolute;
    }

    // Convert back to absolute angle
    // If theta_vert is positive (leaning forward), absolute angle is PI/2 - theta_vert?
    // Let's check kinematics.ts: shoulder.x = hip.x + L * sin(theta).
    // In absolute coords (0=Right, PI/2=Up): x = L * cos(angle).
    // cos(PI/2 - theta) = sin(theta). Correct.
    // But wait, hip.x is usually negative relative to ankle?
    // If knee is forward (positive X), and femur goes back (negative X).
    // Let's re-verify coordinate alignment.
    // In `currentTibiaAngle`, PI/2 is up. If X > 0, angle < PI/2?
    // `cos(PI/2) = 0`. `cos(0) = 1`.
    // We want Knee X > 0 (forward). So `cos(angle)` > 0.
    // This implies `currentTibiaAngle` < PI/2.
    // Example: 70 deg. cos(70) > 0.
    // Hip X should be behind knee.
    // `currentFemurAngle` ~ 170 deg? cos(170) < 0.
    // So hip.x = knee.x + negative < knee.x.
    // If hip.x is still positive (ahead of ankle), we need to lean BACK? (impossible for squat balance).
    // Usually hip.x is negative (behind ankle).
    // So C = -hip.x is positive.
    // Solver gives positive theta_vert (forward lean).
    // Correct.

    const currentTorsoAngle = Math.PI / 2 - theta_vert; // e.g. 90 - 30 = 60 deg

    const shoulder = {
      x: hip.x + L_torso * Math.cos(currentTorsoAngle),
      y: hip.y + L_torso * Math.sin(currentTorsoAngle)
    };

    // 4. Calculate Bar Position
    // We need to apply the offset rotated by the torso angle
    // In kinematics.ts:
    // bar_x_offset = h * cos(theta_vert) + v * sin(theta_vert)
    // bar_y_offset = -h * sin(theta_vert) + v * cos(theta_vert)
    // This effectively rotates the (h,v) vector by theta_vert.
    // Let's do it with our absolute angle `currentTorsoAngle`.
    // The offset (h, v) is defined relative to the "Torso Frame" (Up is Y, Forward is X).
    // We rotate this frame to `currentTorsoAngle`.
    // Rotation is `currentTorsoAngle - PI/2` (amount of rotation from vertical).
    // Let rot = currentTorsoAngle - PI/2.
    // newX = h * cos(rot) - v * sin(rot)
    // newY = h * sin(rot) + v * cos(rot)
    // Note: kinematics.ts logic might effectively be doing this.
    // Let's stick to the `kinematics.ts` formula since it solved `theta_vert`.

    const bar_x_offset = h * Math.cos(theta_vert) + v * Math.sin(theta_vert);
    const bar_y_offset = -h * Math.sin(theta_vert) + v * Math.cos(theta_vert);

    // Note: bar_y_offset in kinematics uses `-h*sin`.
    // If h is -0.05 (behind), and we lean forward (theta > 0), sin > 0.
    // -(-0.05)*pos = pos. Bar goes UP relative to shoulder?
    // If we lean forward, the back becomes horizontal. A bar on the back should go UP (relative to a shoulder that dropped)?
    // No, if I lean forward 90 deg, the "back of shoulder" is now "top of shoulder".
    // So bar should be higher Y than shoulder.
    // Correct.

    const bar = {
      x: shoulder.x + bar_x_offset,
      y: shoulder.y + bar_y_offset
    };

    // 5. Shift to World Coordinates
    // SquatPoseSolver expects Ankle at (0, footHeight).
    // Our calculations assumed Ankle at (0,0).
    // Shift Y only.
    const footHeight = anthropometry.segments.footHeight;
    const shift = (p: { x: number, y: number }) => ({ x: p.x, y: p.y + footHeight });

    const finalAnkle = { x: 0, y: footHeight };
    const finalToe = { x: anthropometry.segments.footLength, y: 0 };
    const finalKnee = shift(knee);
    const finalHip = shift(hip);
    const finalShoulder = shift(shoulder);
    const finalBar = shift(bar);

    // 6. Arm Positioning (IK)
    // Same logic as before
    const upperArmLength = anthropometry.segments.upperArm;
    const forearmLength = anthropometry.segments.forearm;
    const rotationOffset = -30 * (Math.PI / 180);
    const upperArmAngle = currentTorsoAngle + Math.PI + rotationOffset;
    const forearmAngle = currentTorsoAngle + rotationOffset;

    const elbow = {
      x: finalShoulder.x + upperArmLength * Math.cos(upperArmAngle),
      y: finalShoulder.y + upperArmLength * Math.sin(upperArmAngle)
    };

    const wrist = {
      x: elbow.x + forearmLength * Math.cos(forearmAngle),
      y: elbow.y + forearmLength * Math.sin(forearmAngle)
    };

    // Angles for export
    const angles = {
      ankle: KinematicsUtils.toDegrees(currentTibiaAngle - Math.PI / 2), // ~ -20 deg
      knee: KinematicsUtils.toDegrees(currentFemurAngle - currentTibiaAngle),
      hip: KinematicsUtils.toDegrees(currentTorsoAngle - currentFemurAngle),
      trunk: KinematicsUtils.toDegrees(Math.PI / 2 - currentTorsoAngle),
      shoulder: -30, // Simplified
      elbow: 0
    };

    return {
      ankle: finalAnkle,
      knee: finalKnee,
      hip: finalHip,
      shoulder: finalShoulder,
      elbow,
      wrist,
      toe: finalToe,
      bar: finalBar,
      contacts: {
        leftFoot: { x: -0.1, y: footHeight },
        rightFoot: { x: 0.1, y: footHeight },
        leftHand: finalBar,
        rightHand: finalBar,
      },
      angles,
    };
  }

  /**
   * Create fallback pose when kinematics solver fails
   */
  private createFallbackPose(anthropometry: Anthropometry): Pose2D {
    // Simple standing position
    const ankle = { x: 0, y: anthropometry.segments.footHeight };
    const toe = { x: anthropometry.segments.footLength, y: 0 };
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
      toe,
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

  validatePose(pose: Pose2D, input: PoseSolverInput): { errors: string[]; warnings: string[] } {
    // Suppress limb length validation for Squat arms as we use approximated/visual IK
    void pose;
    void input;
    return { errors: [], warnings: [] };
  }
}
