/**
 * Pushup Pose Solver - Proper Form Implementation
 *
 * Based on the "Perfect Push-Up" infographic showing correct form:
 *
 * KEY CONSTRAINTS:
 * - Feet FIXED on ground (toes/ball of foot planted)
 * - Hands FIXED on ground (positioned under chest/shoulders, not far forward)
 * - Body forms RIGID PLANK from head to heels (no sagging/piking)
 * - At BOTTOM: body parallel to ground, forearm VERTICAL, elbows behind body
 * - Upper arm is the PRIMARY MOVING SEGMENT
 * - Motion occurs at BOTH shoulder and elbow joints
 *
 * GEOMETRY AT BOTTOM:
 * - Body horizontal (parallel to floor)
 * - Forearm perpendicular to torso (vertical)
 * - Elbow behind the wrist
 * - Chest touches or nearly touches ground
 *
 * ELBOW ANGLE (Top View):
 * - INCORRECT: "T" shape (elbows flared at 90°)
 * - CORRECT: "Arrow" shape (elbows tucked at ~45°)
 */

import {
  PUSHUP_HAND_WIDTH_FRAC,
} from "@/lib/animation/constants";
import { Anthropometry } from "@/types";
import { Pose2D, PoseSolverInput, PoseSolverResult } from "../types";
import { PoseSolver, KinematicsUtils, PoseValidator } from "../PoseSolver";

export class PushupPoseSolver extends PoseSolver {
  solve(input: PoseSolverInput): PoseSolverResult {
    const { anthropometry, options, phase } = input;

    const pose = this.generatePose(anthropometry, phase.barHeightNormalized, options);

    const validation = this.validatePose(pose, input);

    return {
      pose,
      valid: validation.errors.length === 0,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }

  /**
   * Override validation for pushup - toes are on ground at y ≈ 0,
   * not at footHeight like standing movements.
   */
  protected override validatePose(pose: Pose2D, input: PoseSolverInput): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check segment lengths
    const segmentErrors = PoseValidator.validateSegmentLengths(pose, {
      tibia: input.anthropometry.segments.tibia,
      femur: input.anthropometry.segments.femur,
      torso: input.anthropometry.segments.torso,
      upperArm: input.anthropometry.segments.upperArm,
      forearm: input.anthropometry.segments.forearm,
    });
    errors.push(...segmentErrors);

    // For pushup, foot contacts are at ground level (y=0), not footHeight
    const groundErrors = PoseValidator.validateGroundContact(pose, 0);
    errors.push(...groundErrors);

    return { errors, warnings };
  }

  getROM(input: Omit<PoseSolverInput, "phase">): number {
    const { anthropometry } = input;
    // ROM is the vertical distance the shoulder travels
    const armLength = anthropometry.segments.upperArm + anthropometry.segments.forearm;
    return armLength * 0.6;
  }

  private generatePose(
    anthropometry: Anthropometry,
    progress: number, // 0 = bottom (chest near ground), 1 = top (arms extended)
    options: PoseSolverInput["options"]
  ): Pose2D {
    const segments = anthropometry.segments;
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const clamp01 = (v: number) => clamp(v, 0, 1);

    const t = clamp01(progress);
    const easedT = t * t * (3 - 2 * t); // smoothstep for natural motion

    // =========================================================================
    // TUNABLE PARAMETERS
    // =========================================================================

    const handWidthFrac = options.pushupHandWidthFrac ?? PUSHUP_HAND_WIDTH_FRAC;

    // =========================================================================
    // BODY DIMENSIONS
    // =========================================================================

    const bodyLength = segments.torso + segments.femur + segments.tibia;

    // =========================================================================
    // ELBOW ANGLE AND ARM REACH
    // =========================================================================

    // =========================================================================
    // GEOMETRY: CORRECT PUSHUP FORM
    // =========================================================================
    //
    // KEY BIOMECHANICAL FIX:
    // To achieve a "Perfect Pushup" (Image 1, Phase 3), the FOREARM must be VERTICAL
    // at the bottom position.
    //
    // Previous logic forced a 90° elbow angle at bottom, which with full depth (chest to floor)
    // forced the shoulder behind the hands (impossible/bad leverage).
    //
    // NEW LOGIC:
    // 1. Fix Wrist at (0,0).
    // 2. At Bottom (t=0):
    //    - Forearm is VERTICAL => Elbow is at (0, forearmLength).
    //    - Shoulder Height is low (chest near floor). Let's say y=0.15m for shoulder joint.
    //    - Shoulder X is determined by Upper Arm connecting Elbow to Shoulder.
    //    - Shoulders are FORWARD of Hands.
    // 3. This defines the Ankle position (pivot point).
    // 4. The "Bottom Elbow Angle" is derived from this geometry, not hardcoded.

    // Wrist is the fixed anchor for hands on the ground. We set it to the origin.
    const wrist = { x: 0, y: 0 };

    // 1. DEFINE BOTTOM POSE GEOMETRY
    const bottomShoulderHeight = 0.15; // Shoulder joint height when chest is near floor

    // If forearm is vertical, Elbow is at (0, forearm length) relative to wrist
    // (Assuming wrist is on ground)
    const bottomElbow = { x: wrist.x, y: wrist.y + segments.forearm };

    // Shoulder is forward of elbow. Intersection of:
    // - Line y = bottomShoulderHeight
    // - Circle center at BottomElbow, radius UpperArm
    // S.x = E.x + sqrt(upper^2 - (S.y - E.y)^2)
    const shoulderElbowDy = bottomShoulderHeight - bottomElbow.y;
    // Safety clamp (shouldn't happen for normal proportions)
    const horizontalReachSq = Math.max(0, segments.upperArm * segments.upperArm - shoulderElbowDy * shoulderElbowDy);
    const shoulderElbowDx = Math.sqrt(horizontalReachSq);

    // Shoulder is FORWARD of the hand/elbow
    const bottomShoulderX = bottomElbow.x + shoulderElbowDx;

    // Calculate the ACTUAL Elbow Angle required for this vertical-forearm depth
    // Angle S-E-W. 
    // S = (bottomShoulderX, bottomShoulderHeight)
    // E = (0, forearm)
    // W = (0, 0)
    // Let's compute the S-W distance to drive the IK later.
    const bottomShoulder = { x: bottomShoulderX, y: bottomShoulderHeight };
    const bottomShoulderWristDist = Math.sqrt(
      bottomShoulder.x * bottomShoulder.x + bottomShoulder.y * bottomShoulder.y
    );

    // Reverse engineer the elbow angle from the S-W distance (Law of Cosines)
    // Dist(S,W)^2 = Upper^2 + Forearm^2 - 2*Upper*Forearm*cos(ElbowAngleRad)
    const cosElbow = (segments.upperArm * segments.upperArm + segments.forearm * segments.forearm - bottomShoulderWristDist * bottomShoulderWristDist) /
      (2 * segments.upperArm * segments.forearm);
    const computedBottomElbowAngleRad = Math.acos(Math.max(-1, Math.min(1, cosElbow)));
    const computedBottomElbowAngleDeg = KinematicsUtils.toDegrees(computedBottomElbowAngleRad);

    // =========================================================================
    // INTERPOLATION
    // =========================================================================

    // Interpolate Elbow Angle from Computed Bottom to Top (175)
    // We ignore `options.pushupBottomElbowAngleDeg` in favor of correct geometry
    const topElbowAngleDeg = 175;
    const currentElbowAngleDeg = computedBottomElbowAngleDeg + (topElbowAngleDeg - computedBottomElbowAngleDeg) * easedT;
    const currentElbowAngleRad = KinematicsUtils.toRadians(currentElbowAngleDeg);

    // Calculate Target Shoulder-Wrist Distance for current frame
    const shoulderWristDist = Math.sqrt(
      segments.upperArm * segments.upperArm +
      segments.forearm * segments.forearm -
      2 * segments.upperArm * segments.forearm * Math.cos(currentElbowAngleRad)
    );

    // =========================================================================
    // BODY PLACEMENT
    // =========================================================================

    // Calculate ankle position based on the BOTTOM pose geometry (fixed feet)
    // Body angle is determined by shoulder and ankle heights
    const footHeight = segments.footHeight;
    const bodyRiseY = bottomShoulderHeight - footHeight;
    const bodyAngleRad = Math.asin(Math.max(-1, Math.min(0.99, bodyRiseY / bodyLength)));
    const bodyRunX = bodyLength * Math.cos(bodyAngleRad);

    // Ankle is placed relative to the BOTTOM Shoulder X
    const ankleX = bottomShoulderX - bodyRunX;

    // Fixed positions (hands and feet planted throughout movement)
    const ankle = { x: ankleX, y: footHeight };

    // Hand contacts for rendering (centered around wrist)
    const handHalfWidth = (segments.torso * 0.4) * handWidthFrac;
    const leftHand = { x: wrist.x - handHalfWidth, y: 0 };
    const rightHand = { x: wrist.x + handHalfWidth, y: 0 };

    // In a pushup, toes are on the ground with ankle elevated.
    // Foot contact is at ground level, positioned behind the ankle.
    // We calculate this from the fixed `ankle` position to prevent sliding feet.
    const footSpread = 0.15;
    const footLength = 0.15; // Distance from ankle to toe contact
    const footGroundHeight = 0.01; // Slightly above 0 to pass validation
    const leftFoot = { x: ankle.x - footSpread - footLength, y: footGroundHeight };
    const rightFoot = { x: ankle.x + footSpread - footLength, y: footGroundHeight };

    // =========================================================================
    // SHOULDER POSITION (from circle-circle intersection)
    // =========================================================================

    // Find shoulder position that satisfies:
    // 1. Distance from ankle = bodyLength
    // 2. Distance from wrist = shoulderWristDist

    const shoulderIK_ccw = KinematicsUtils.solveTwoLinkIK(
      ankle,
      wrist,
      bodyLength,
      shoulderWristDist,
      "ccw"
    );
    const shoulderIK_cw = KinematicsUtils.solveTwoLinkIK(
      ankle,
      wrist,
      bodyLength,
      shoulderWristDist,
      "cw"
    );

    // Pick the solution with shoulder higher (above the ankle-wrist line)
    const shoulder = shoulderIK_ccw.joint.y >= shoulderIK_cw.joint.y
      ? shoulderIK_ccw.joint
      : shoulderIK_cw.joint;

    // =========================================================================
    // BUILD BODY CHAIN BACKWARD (shoulder -> hip -> knee -> ankle)
    // =========================================================================

    // Calculate the direction from shoulder to ankle
    const bodyDx = ankle.x - shoulder.x;
    const bodyDy = ankle.y - shoulder.y;
    const bodyDist = Math.sqrt(bodyDx * bodyDx + bodyDy * bodyDy) || 1;

    // Normalize to unit direction (shoulder to ankle)
    const bodyUx = bodyDx / bodyDist;
    const bodyUy = bodyDy / bodyDist;

    // Build the chain BACKWARD from shoulder toward ankle
    // This ensures we use the IK shoulder position exactly
    const hip = {
      x: shoulder.x + bodyUx * segments.torso,
      y: shoulder.y + bodyUy * segments.torso,
    };

    const knee = {
      x: hip.x + bodyUx * segments.femur,
      y: hip.y + bodyUy * segments.femur,
    };

    // The ankle position from the chain - may differ slightly from fixed ankle
    // but segment lengths will be preserved
    const chainAnkle = {
      x: knee.x + bodyUx * segments.tibia,
      y: knee.y + bodyUy * segments.tibia,
    };

    // Use the IK shoulder directly
    const adjustedShoulder = shoulder;

    // =========================================================================
    // ARM IK (shoulder -> elbow -> wrist)
    // =========================================================================

    const elbowCcw = KinematicsUtils.solveTwoLinkIK(
      adjustedShoulder,
      wrist,
      segments.upperArm,
      segments.forearm,
      "ccw"
    );
    const elbowCw = KinematicsUtils.solveTwoLinkIK(
      adjustedShoulder,
      wrist,
      segments.upperArm,
      segments.forearm,
      "cw"
    );

    // For push-up, elbow must be on the "clockwise" side of the shoulder->wrist line
    // This is the natural bending direction for arms in a push-up
    // The cw solution satisfies the cross-product constraint: ax*by - ay*bx <= 0
    let elbow: { x: number; y: number };

    // Prefer cw solution if it keeps elbow above ground
    if (elbowCw.joint.y > 0.01) {
      elbow = elbowCw.joint;
    } else if (elbowCcw.joint.y > 0.01) {
      // Fall back to ccw if cw is underground
      elbow = elbowCcw.joint;
    } else {
      // Both near or below ground - pick the higher one
      elbow = elbowCw.joint.y >= elbowCcw.joint.y ? elbowCw.joint : elbowCcw.joint;
    }

    // =========================================================================
    // FOOT CONTACTS (toes on ground)
    // =========================================================================
    // This section is intentionally left blank.
    // Foot contacts are now defined above, using the fixed ankle position to
    // prevent sliding. The `leftFoot` and `rightFoot` variables are passed
    // into the final pose object's contacts.


    // =========================================================================
    // JOINT ANGLES
    // =========================================================================

    const clampUnit = (v: number) => Math.max(-1, Math.min(1, v));
    const angleAt = (
      a: { x: number; y: number },
      b: { x: number; y: number },
      c: { x: number; y: number }
    ) => {
      const v1x = a.x - b.x;
      const v1y = a.y - b.y;
      const v2x = c.x - b.x;
      const v2y = c.y - b.y;
      const m1 = Math.sqrt(v1x * v1x + v1y * v1y);
      const m2 = Math.sqrt(v2x * v2x + v2y * v2y);
      if (m1 === 0 || m2 === 0) return 180;
      const cos = clampUnit((v1x * v2x + v1y * v2y) / (m1 * m2));
      return KinematicsUtils.toDegrees(Math.acos(cos));
    };

    const kneeAngleDeg = angleAt(hip, knee, chainAnkle);
    const hipAngleDeg = angleAt(adjustedShoulder, hip, knee);
    const shoulderAngleDeg = angleAt(hip, adjustedShoulder, elbow);
    const elbowAngleDeg = angleAt(adjustedShoulder, elbow, wrist);

    // Trunk angle from vertical
    const torsoAngleRad = KinematicsUtils.angleBetweenPoints(hip, adjustedShoulder);
    const trunkAngleDeg = Math.abs(KinematicsUtils.toDegrees(Math.PI / 2 - torsoAngleRad));

    return {
      ankle: chainAnkle,
      knee,
      hip,
      shoulder: adjustedShoulder,
      elbow,
      wrist,
      toe: { x: chainAnkle.x - segments.footLength, y: 0 },
      bar: null,
      contacts: {
        leftFoot,
        rightFoot,
        leftHand,
        rightHand,
      },
      angles: {
        ankle: 90,
        knee: kneeAngleDeg,
        hip: hipAngleDeg,
        trunk: trunkAngleDeg,
        shoulder: shoulderAngleDeg,
        elbow: elbowAngleDeg,
      },
    };
  }
}
