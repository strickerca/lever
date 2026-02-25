/**
 * Pullup/Chinup Pose Solver - StrongLifts 5-Phase Style
 *
 * Generates poses for pullup movements with realistic "up and back" arc motion.
 *
 * Key features:
 * - Hands fixed on bar (bar fixed in world at PULLUP_BAR_HEIGHT_M)
 * - Body travels on an arc: up AND back (not straight vertical)
 * - Head/chin stays behind bar plane at all times
 * - Scapular initiation phase before elbow flexion
 * - Proper 2-link arm IK with correct elbow direction
 *
 * 5-Phase Motion (side view, like StrongLifts reference):
 *   p=0.00: Dead hang - arms straight, shoulders elevated
 *   p=0.15: Scap set - shoulders depressed/retracted, arms still ~straight
 *   p=0.50: Mid-pull - elbows bending, body clearly moving back
 *   p=0.75: High pull - elbows ~90°, body behind bar
 *   p=1.00: Top - chin over bar, body behind bar, elbows fully bent
 *
 * TUNING CONSTANTS (in constants.ts):
 *   PULLUP_ARC_MAX_BACK_FRAC - Max backward arc displacement (frac of height)
 *   PULLUP_TOP_CLEARANCE_BACK_FRAC - Extra back offset at top for clearance
 *   PULLUP_ARC_PEAK_PROGRESS - Progress value where arc peaks
 *   PULLUP_SCAP_INIT_DURATION - Scapular phase duration (0-1)
 *   PULLUP_HEAD_CLEARANCE_MARGIN_M - Min distance head stays behind bar
 *   PULLUP_TOP_LEAN_BACK_DEG - Torso lean angle at top
 */

import { calculatePullupDisplacement } from "@/lib/biomechanics/physics";
import {
  PULLUP_BAR_HEIGHT_M,
  PULLUP_ARC_MAX_BACK_FRAC,
  PULLUP_TOP_CLEARANCE_BACK_FRAC,
  PULLUP_ARC_PEAK_PROGRESS,
  PULLUP_SCAP_INIT_DURATION,
  PULLUP_HEAD_CLEARANCE_MARGIN_M,
  PULLUP_TOP_LEAN_BACK_DEG,
} from "@/lib/animation/constants";
import { Anthropometry, PullupGrip } from "@/types";
import { Pose2D, PoseSolverInput, PoseSolverResult } from "../types";
import { PoseSolver, KinematicsUtils } from "../PoseSolver";

export class PullupPoseSolver extends PoseSolver {
  solve(input: PoseSolverInput): PoseSolverResult {
    const { anthropometry, options, phase } = input;

    const grip = (options.pullupGrip || "pronated") as PullupGrip;

    const pose = this.generatePose(anthropometry, grip, phase.barHeightNormalized, options);

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

  /**
   * Calculate the backward arc displacement at a given progress.
   * Uses a smooth curve that:
   * - Starts at 0 (dead hang, p=0)
   * - Peaks near mid-rep (controlled by arcPeakProgress)
   * - Stays back at top for clearance (p=1)
   *
   * The curve is: -maxBack * sin(π * adjustedProgress)^power
   * with an additive top clearance offset that ramps in near the top.
   */
  private calculateArcBackOffset(
    progress: number,
    maxBackMeters: number,
    topClearanceMeters: number,
    arcPeakProgress: number
  ): number {
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const t = clamp01(progress);

    // Smooth sinusoidal arc: peaks at arcPeakProgress, returns partway at top
    // Use sin^2 for smooth acceleration/deceleration
    const arcPhase = Math.PI * (t / arcPeakProgress);
    const arcValue = t <= arcPeakProgress
      ? Math.pow(Math.sin(arcPhase / 2), 2) // Rising phase to peak
      : Math.pow(Math.sin(Math.PI / 2 + (t - arcPeakProgress) / (1 - arcPeakProgress) * Math.PI / 2), 2); // Descending but not to zero

    // The arc gives us back-and-forth motion
    const arcOffset = -maxBackMeters * arcValue;

    // Add a clearance offset that ramps in during the final portion
    // This ensures head stays behind bar at top
    const clearanceRampStart = 0.6;
    const clearanceBlend = t <= clearanceRampStart
      ? 0
      : Math.pow((t - clearanceRampStart) / (1 - clearanceRampStart), 2);
    const clearanceOffset = -topClearanceMeters * clearanceBlend;

    return arcOffset + clearanceOffset;
  }

  /**
   * Calculate elbow bend limit based on scapular initiation phase.
   * During the first SCAP_INIT_DURATION of the rep, elbows stay nearly straight
   * while shoulders depress and retract.
   */
  private getElbowBendLimit(progress: number, scapInitDuration: number): number {
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const t = clamp01(progress);

    if (t <= scapInitDuration) {
      // During scap init: allow only minimal elbow bend (175-180 degrees)
      // Smooth ramp from 180 to 175
      const scapProgress = t / scapInitDuration;
      return 180 - 5 * scapProgress;
    }

    // After scap init: full range allowed (can bend down to ~45 degrees at top)
    // Smooth progression from 175 to 45 degrees
    const bendProgress = (t - scapInitDuration) / (1 - scapInitDuration);
    const eased = Math.pow(bendProgress, 0.8); // Slightly faster early bend
    return 175 - 130 * eased; // 175 -> 45 degrees
  }

  /**
   * Calculate torso lean-back angle based on progress.
   * Gradually increases lean through the rep.
   */
  private getTorsoLeanAngle(progress: number, maxLeanDeg: number): number {
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const t = clamp01(progress);

    // Lean starts around 20% and builds to max at top
    const leanStart = 0.2;
    if (t <= leanStart) return 0;

    const leanProgress = (t - leanStart) / (1 - leanStart);
    // Use smoothstep for natural-looking acceleration
    const eased = leanProgress * leanProgress * (3 - 2 * leanProgress);
    return maxLeanDeg * eased;
  }

  /**
   * Compute head position and check/enforce bar clearance.
   * Returns the required additional backward offset to maintain clearance.
   */
  private enforceHeadClearance(
    shoulderX: number,
    torsoLeanRad: number,
    headNeckLength: number,
    clearanceMargin: number
  ): number {
    // Head center is ~0.65 * headNeck above shoulder in the torso's up direction
    const headCenterDist = headNeckLength * 0.65;
    const headRadius = headNeckLength * 0.35;

    // Head center position (torso leans back = negative angle from vertical)
    const headX = shoulderX - Math.sin(torsoLeanRad) * headCenterDist;

    // The bar plane is at x=0. Head front edge = headX + headRadius
    // Must satisfy: headX + headRadius < -clearanceMargin (head behind bar)
    const headFrontX = headX + headRadius;
    const requiredX = -clearanceMargin;

    if (headFrontX > requiredX) {
      // Head would cross bar! Return extra back offset needed
      return headFrontX - requiredX;
    }

    return 0; // No correction needed
  }

  private generatePose(
    anthropometry: Anthropometry,
    grip: PullupGrip,
    progress: number, // 0 = hanging (bottom), 1 = chin at bar (top)
    options: PoseSolverInput["options"]
  ): Pose2D {
    const segments = anthropometry.segments;

    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

    const t = clamp01(progress);

    // =========================================================================
    // TUNABLE PARAMETERS (from constants or options)
    // =========================================================================

    // Arc motion parameters (controls "up and back" path)
    const maxBackFrac = options.pullupArcMaxBackFrac ?? PULLUP_ARC_MAX_BACK_FRAC;
    const topClearanceFrac = options.pullupTopClearanceBackFrac ?? PULLUP_TOP_CLEARANCE_BACK_FRAC;
    const arcPeakProgress = options.pullupArcPeakProgress ?? PULLUP_ARC_PEAK_PROGRESS;
    const maxBackMeters = segments.height * maxBackFrac;
    const topClearanceMeters = segments.height * topClearanceFrac;

    // Scapular and lean parameters
    const topLeanBackDeg = options.pullupTopLeanBackDeg ?? PULLUP_TOP_LEAN_BACK_DEG;

    // Clearance margin
    const headClearanceMargin = options.pullupHeadClearanceMarginM ?? PULLUP_HEAD_CLEARANCE_MARGIN_M;

    // =========================================================================
    // HAND POSITIONS (fixed on bar)
    // =========================================================================

    const barY = PULLUP_BAR_HEIGHT_M;
    const gripWidth = grip === "neutral" ? 0.25 : 0.3;
    const leftHand = { x: -gripWidth, y: barY };
    const rightHand = { x: gripWidth, y: barY };

    // Wrist anchor point (side view uses center)
    const wristAnchor = { x: 0, y: barY };

    // =========================================================================
    // VERTICAL DISPLACEMENT (shoulder height based on progress)
    // =========================================================================

    // Animation arm chain models shoulder->elbow->wrist only.
    const armLength = segments.upperArm + segments.forearm;
    const headRadius = segments.headNeck * 0.35;
    const chinClearanceAboveBar = segments.height * 0.012; // Small clearance for chin

    // At bottom: arms nearly fully extended (small safety margin from singularity)
    const maxReach = armLength - 0.005;
    const shoulderYAtBottom = barY - maxReach;

    // At top: chin must clear bar by chinClearanceAboveBar
    // Chin position = shoulder.y + torsoUpDirection * headNeck*0.65 - headRadius
    const topLeanRad = KinematicsUtils.toRadians(topLeanBackDeg);
    const headUpY = Math.cos(topLeanRad);
    const chinOffsetFromShoulder = segments.headNeck * 0.65 * headUpY - headRadius;
    const shoulderYAtTop = barY + chinClearanceAboveBar - chinOffsetFromShoulder;

    // Interpolate shoulder Y with eased progress for smooth motion
    const easedT = t * t * (3 - 2 * t); // smoothstep
    const shoulderY = shoulderYAtBottom + (shoulderYAtTop - shoulderYAtBottom) * easedT;

    // =========================================================================
    // HORIZONTAL DISPLACEMENT (up-and-back arc)
    // =========================================================================

    // Calculate base arc offset (smooth sin^2 curve)
    let shoulderBackOffset = this.calculateArcBackOffset(
      t,
      maxBackMeters,
      topClearanceMeters,
      arcPeakProgress
    );

    // =========================================================================
    // TORSO LEAN
    // =========================================================================

    const torsoLeanDeg = this.getTorsoLeanAngle(t, topLeanBackDeg);
    const torsoLeanRad = KinematicsUtils.toRadians(torsoLeanDeg);

    // =========================================================================
    // HEAD CLEARANCE ENFORCEMENT
    // =========================================================================

    // Only enforce head clearance strictly during the upper portion of the rep
    // At the bottom (dead hang), the body naturally hangs behind the bar
    // At the top, we need to ensure head doesn't cross through the bar
    const clearanceEnforcementStart = 0.5;
    const clearanceEnforcementStrength = t <= clearanceEnforcementStart
      ? 0
      : (t - clearanceEnforcementStart) / (1 - clearanceEnforcementStart);

    // Check if head would cross bar and compute extra offset if needed
    const extraBackForClearance = this.enforceHeadClearance(
      shoulderBackOffset,
      torsoLeanRad,
      segments.headNeck,
      headClearanceMargin
    );

    // Apply clearance correction (scaled by how close to top we are)
    shoulderBackOffset -= extraBackForClearance * clearanceEnforcementStrength;

    // Final shoulder position
    const shoulder = { x: shoulderBackOffset, y: shoulderY };

    // =========================================================================
    // ARM IK (2-link chain with fixed hand on bar)
    // =========================================================================

    // For pull-ups, we solve arm IK with these constraints:
    // - At bottom (t=0): arms nearly straight, elbow slightly in front
    // - At top (t=1): elbow BELOW shoulder and TUCKED (close to torso, not flared out)
    //
    // The key insight: when shoulder is close to wrist (at top), the raw IK places
    // the elbow far out perpendicular to the shoulder-wrist line. To get realistic
    // tucked elbows, we use z-depth (out-of-plane) to "absorb" the extra arm length
    // while keeping the 2D projection tucked.

    // Get both IK solutions (these are the "fully planar" solutions)
    const ikCw = KinematicsUtils.solveTwoLinkIK(
      shoulder,
      wristAnchor,
      segments.upperArm,
      segments.forearm,
      "cw"
    );
    const ikCcw = KinematicsUtils.solveTwoLinkIK(
      shoulder,
      wristAnchor,
      segments.upperArm,
      segments.forearm,
      "ccw"
    );

    // For the "tucked elbow" at the top position, we want:
    // - Elbow below shoulder (y < shoulder.y)
    // - Elbow close to shoulder in X (not flared forward)
    // - Use Z-depth to maintain segment lengths

    // Compute target elbow position that looks "tucked"
    // Target: elbow dropped below bar, close to the shoulder's X position
    const elbowDropFrac = 0.95; // Elbow drops to 95% of forearm length below bar
    const elbowTargetY = wristAnchor.y - segments.forearm * elbowDropFrac;

    // Compute feasible X range for the target Y
    // Upper arm reaches from shoulder, forearm reaches to wrist
    const dyFromShoulder = elbowTargetY - shoulder.y;
    const dyFromWrist = wristAnchor.y - elbowTargetY;

    const maxXFromShoulder = Math.sqrt(
      Math.max(0, segments.upperArm * segments.upperArm - dyFromShoulder * dyFromShoulder)
    );
    const maxXFromWrist = Math.sqrt(
      Math.max(0, segments.forearm * segments.forearm - dyFromWrist * dyFromWrist)
    );

    // Elbow X must be in the intersection of both circles
    const minElbowX = Math.max(shoulder.x - maxXFromShoulder, wristAnchor.x - maxXFromWrist);
    const maxElbowX = Math.min(shoulder.x + maxXFromShoulder, wristAnchor.x + maxXFromWrist);

    // Target: elbow close to shoulder's X line (tucked), clamped to feasible range
    const elbowTowardShoulderFrac = 0.5;
    const elbowTargetXRaw = shoulder.x + (wristAnchor.x - shoulder.x) * elbowTowardShoulderFrac;
    const elbowTargetX = minElbowX <= maxElbowX
      ? clamp(elbowTargetXRaw, minElbowX, maxElbowX)
      : (ikCw.joint.x + ikCcw.joint.x) / 2; // Fallback if ranges don't overlap

    const elbowTarget = { x: elbowTargetX, y: elbowTargetY };

    // Pick the IK solution that has elbow more in front (positive X is front)
    const cwMoreInFront = ikCw.joint.x >= ikCcw.joint.x;
    const elbowFromIK = cwMoreInFront ? ikCw.joint : ikCcw.joint;

    // Blend from IK solution toward tucked target as we approach the top
    // At t=0: use raw IK (arms nearly straight)
    // At t=1: use tucked target
    const tuckBlendStart = 0.3;
    const tuckBlend = t <= tuckBlendStart
      ? 0
      : Math.pow((t - tuckBlendStart) / (1 - tuckBlendStart), 0.8);

    const elbow2D = KinematicsUtils.lerpPoint(elbowFromIK, elbowTarget, tuckBlend);

    // Calculate elbow angle for output
    const angleAt = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) => {
      const v1x = a.x - b.x;
      const v1y = a.y - b.y;
      const v2x = c.x - b.x;
      const v2y = c.y - b.y;
      const m1 = Math.sqrt(v1x * v1x + v1y * v1y);
      const m2 = Math.sqrt(v2x * v2x + v2y * v2y);
      if (m1 === 0 || m2 === 0) return 180;
      const dot = v1x * v2x + v1y * v2y;
      const cosAngle = clamp(dot / (m1 * m2), -1, 1);
      return KinematicsUtils.toDegrees(Math.acos(cosAngle));
    };

    const elbowAngleDeg = angleAt(shoulder, elbow2D, wristAnchor);
    const minElbowAngleDeg = this.getElbowBendLimit(
      t,
      options.pullupScapInitDuration ?? PULLUP_SCAP_INIT_DURATION
    );
    const constrainedElbowAngleDeg = Math.max(elbowAngleDeg, minElbowAngleDeg);

    // For 3D rendering, compute Z offset to maintain segment lengths
    // (when 2D projection is shorter than actual segment)
    const dist2D = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);

    const upperArmPlanar = dist2D(shoulder, elbow2D);
    const elbowZ = Math.sqrt(
      Math.max(0, segments.upperArm * segments.upperArm - upperArmPlanar * upperArmPlanar)
    );

    const forearmPlanar = dist2D(elbow2D, wristAnchor);
    const wristZ = elbowZ + Math.sqrt(
      Math.max(0, segments.forearm * segments.forearm - forearmPlanar * forearmPlanar)
    );

    const elbow3D = { ...elbow2D, z: elbowZ };
    const wrist3D = { ...wristAnchor, z: wristZ };

    // =========================================================================
    // LOWER BODY (hangs down with torso lean)
    // =========================================================================

    // Hip hangs below shoulder along the torso direction (leaned back)
    const hip = {
      x: shoulder.x + segments.torso * Math.sin(torsoLeanRad),
      y: shoulder.y - segments.torso * Math.cos(torsoLeanRad),
    };

    // Legs hang straight down from hip (with slight forward tilt for natural look)
    const legAngleRad = KinematicsUtils.toRadians(5); // Slight forward leg angle
    const knee = {
      x: hip.x + segments.femur * Math.sin(legAngleRad),
      y: hip.y - segments.femur * Math.cos(legAngleRad),
    };
    const ankle = {
      x: knee.x,
      y: knee.y - segments.tibia,
    };

    // =========================================================================
    // COMPUTE SHOULDER ANGLE (for output)
    // =========================================================================

    // Shoulder angle = angle from torso-up to upper-arm
    // Torso-up direction when leaning back
    const torsoUpX = -Math.sin(torsoLeanRad);
    const torsoUpY = Math.cos(torsoLeanRad);

    // Upper arm direction (shoulder to elbow)
    const armDx = elbow2D.x - shoulder.x;
    const armDy = elbow2D.y - shoulder.y;
    const armLen = Math.sqrt(armDx * armDx + armDy * armDy) || 1;

    const armUnitX = armDx / armLen;
    const armUnitY = armDy / armLen;

    // Angle between torso-up and arm
    const dotProduct = torsoUpX * armUnitX + torsoUpY * armUnitY;
    const shoulderAngleDeg = KinematicsUtils.toDegrees(Math.acos(clamp(dotProduct, -1, 1)));

    return {
      ankle,
      knee,
      hip,
      shoulder,
      elbow: elbow3D,
      wrist: wrist3D,
      toe: { x: ankle.x, y: ankle.y - segments.footLength },
      bar: null, // pullup bar is rendered as equipment, not a barbell
      contacts: {
        leftFoot: null, // Not on ground
        rightFoot: null,
        leftHand,
        rightHand,
      },
      angles: {
        ankle: 180, // Legs straight
        knee: 180,
        hip: 180 - torsoLeanDeg, // Hip angle changes with lean
        trunk: torsoLeanDeg, // Trunk lean from vertical
        shoulder: shoulderAngleDeg,
        elbow: constrainedElbowAngleDeg,
      },
      barAngle: 0, // Horizontal bar
      debug: {
        pullup: {
          elbowBase: elbowFromIK,
          elbowTarget: elbowTarget,
          pole: { x: shoulder.x, y: shoulder.y - segments.upperArm },
          tuck: tuckBlend,
          axis: { x: 0, y: 1 },
        },
      },
    };
  }
}
