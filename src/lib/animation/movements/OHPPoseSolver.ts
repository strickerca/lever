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
import { Anthropometry } from "@/types";
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
    anthropometry: Anthropometry,
    lockoutKinematics: ReturnType<typeof solveOHPKinematics>,
    progress: number // 0 = rack position, 1 = lockout
  ): Pose2D {
    void lockoutKinematics;
    const segments = anthropometry.segments;

    // =========================================================================
    // 1. SETUP BODY POSITIONS
    // =========================================================================

    // Base linkage (Standing rigidly)
    const ankle = { x: 0, y: segments.footHeight };
    const knee = { x: 0, y: ankle.y + segments.tibia };
    const hip = { x: 0, y: knee.y + segments.femur };
    const shoulder = { x: 0, y: hip.y + segments.torso };

    // =========================================================================
    // 2. CALCULATE BAR PATH (Diagonal Line)
    // =========================================================================

    // Start Position (Rack):
    // Bar is resting on front delts.
    // X: Forward of shoulder center (approx 15-20cm)
    // Y: At upper chest height (approx shoulder height + small constant)
    const startBarX = 0.20; // 20cm forward (Standard Front Rack)
    const startBarY = shoulder.y + 0.05; // Slightly above joint center

    // End Position (Lockout):
    // Bar is directly overhead (centered).
    // X: 0 (Stacked)
    // Y: Shoulder + Arm Length
    const armLength = segments.upperArm + segments.forearm;
    const endBarX = 0;
    const endBarY = shoulder.y + armLength;

    // Linear Interpolation for "Diagonal Motion"
    // Use smoothed t for natural acceleration/deceleration
    const t = Math.max(0, Math.min(1, progress));
    const easedT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // Ease in/out

    const currentBarX = startBarX + (endBarX - startBarX) * easedT;
    const currentBarY = startBarY + (endBarY - startBarY) * easedT;
    const wrist = { x: currentBarX, y: currentBarY };

    // =========================================================================
    // 3. SOLVE ARM IK (Shoulder -> Elbow -> Wrist)
    // =========================================================================

    // We need to find the Elbow position.
    // Triangle: Shoulder, Elbow, Wrist.
    // Knowns: Shoulder Pos, Wrist Pos, UpperArm Len, Forearm Len.

    const ikResultCw = KinematicsUtils.solveTwoLinkIK(
      shoulder,
      wrist,
      segments.upperArm,
      segments.forearm,
      "cw"
    );

    const ikResultCcw = KinematicsUtils.solveTwoLinkIK(
      shoulder,
      wrist,
      segments.upperArm,
      segments.forearm,
      "ccw"
    );

    // Determine which solution is "Front".
    // Since we are facing "Right" (+X), "Front" usually means larger X.
    let elbow = ikResultCw.joint;

    // Pick the solution with higher X (most forward elbow)
    // This naturally creates the "elbows forward/under bar" look of a press
    if (ikResultCcw.joint.x > ikResultCw.joint.x) {
      elbow = ikResultCcw.joint;
    }

    // =========================================================================
    // 4. GENERATE OUTPUT
    // =========================================================================

    // Calculate angles for rendering/debug
    const shoulderAngleRad = Math.atan2(elbow.y - shoulder.y, elbow.x - shoulder.x);
    const elbowAngleRad = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x);

    // Relative elbow angle (interior)
    // Vector U (Shoulder->Elbow), Vector F (Elbow->Wrist)
    // Angle = acos( dot(U,F) / (|U|*|F|) )? No, usually simpler.
    // Just use what we have.
    const elbowAngleDeg = KinematicsUtils.toDegrees(elbowAngleRad - shoulderAngleRad) + 180;

    return {
      ankle,
      knee,
      hip,
      shoulder,
      elbow,
      wrist,
      toe: { x: ankle.x + segments.footLength, y: 0 },
      bar: wrist,
      contacts: {
        leftFoot: { x: -0.15, y: segments.footHeight },
        rightFoot: { x: 0.15, y: segments.footHeight },
        // Hands centered on the bar X
        leftHand: { x: wrist.x - 0.25, y: wrist.y },
        rightHand: { x: wrist.x + 0.25, y: wrist.y },
      },
      angles: {
        ankle: 90,
        knee: 180,
        hip: 180,
        trunk: 0,
        shoulder: KinematicsUtils.toDegrees(shoulderAngleRad),
        elbow: elbowAngleDeg,
      },
      barAngle: 0,
    };
  }
}
