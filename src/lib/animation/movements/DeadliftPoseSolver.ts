/**
 * Deadlift Pose Solver
 *
 * Generates poses for deadlift movements (conventional and sumo).
 * Key constraints:
 * - Arms remain straight throughout movement (rigid segments)
 * - Bar path vertical over midfoot (x = 0)
 * - Hip hinge pattern
 * - Hands grip bar at standard plate radius height (plus offset for blocks/deficit)
 */

import { calculateDeadliftDisplacement } from "@/lib/biomechanics/physics";
import { STANDARD_PLATE_RADIUS } from "@/lib/biomechanics/constants";
import { Anthropometry } from "@/types";
import { Pose2D, PoseSolverInput, PoseSolverResult } from "../types";
import { PoseSolver, KinematicsUtils } from "../PoseSolver";

type DeadliftVariant = "conventional" | "sumo";
type SumoStance = "hybrid" | "normal" | "wide" | "ultraWide";

export class DeadliftPoseSolver extends PoseSolver {
  solve(input: PoseSolverInput): PoseSolverResult {
    const { anthropometry, options, phase } = input;

    const variant = (options.deadliftVariant || "conventional") as DeadliftVariant;
    const stance = (options.sumoStance || "normal") as SumoStance;
    const barOffset = options.deadliftBarOffset || 0;

    const pose = this.generatePose(
      anthropometry,
      variant,
      stance,
      barOffset,
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
    const { anthropometry, options } = input;
    const variant = (options.deadliftVariant || "conventional") as DeadliftVariant;
    const stance = (options.sumoStance || "normal") as SumoStance;
    const barOffset = options.deadliftBarOffset || 0;

    return calculateDeadliftDisplacement(
      anthropometry,
      variant,
      stance,
      barOffset
    );
  }

  private generatePose(
    anthropometry: Anthropometry,
    variant: DeadliftVariant,
    stance: SumoStance,
    barOffset: number,
    progress: number // 0 = floor (start), 1 = lockout (top)
  ): Pose2D {
    const segments = anthropometry.segments;
    const armLength = segments.upperArm + segments.forearm;

    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    // Geometric safety margins (meters)
    const barLineX = 0; // Midfoot/bar path reference
    const kneeClearance = 0.02; // knee must stay behind bar line
    const hipClearance = 0.01; // keep hip/femur behind bar line in profile
    const hipAheadOfKneeAllowance = 0.01; // keep hip from drifting in front of knee in profile

    // Profile view: ankle joint is slightly posterior to midfoot.
    // This lets the shins angle forward (to "touch the bar") while keeping the knee behind the bar line.
    const ankleToMidfootBase = Math.max(0.025, Math.min(0.06, segments.height * 0.02));

    // Desired starting shin angle (degrees from horizontal; 90 = vertical).
    const stanceScale = stance === "hybrid" ? 0 : stance === "normal" ? 1 : stance === "wide" ? 2 : 3; // 0..3
    const stanceT = stanceScale / 3;
    const barT = Math.max(-0.5, Math.min(0.75, barOffset / STANDARD_PLATE_RADIUS));

    const desiredShinStartDegBase =
      variant === "sumo" ? lerp(88.5, 89.5, stanceT) : 88.0;
    const desiredShinStartDeg = Math.max(
      80,
      Math.min(89.5, desiredShinStartDegBase + 3.0 * barT)
    );

    const kneeForwardAtStart = segments.tibia * Math.cos(toRad(desiredShinStartDeg));
    const ankleToMidfootMin = kneeClearance + kneeForwardAtStart + 0.003;
    const ankleToMidfoot = Math.max(ankleToMidfootBase, ankleToMidfootMin);

    // Deficit (negative barOffset) keeps the plates on the floor and raises the lifter instead.
    const platformHeight = Math.max(0, -barOffset);
    const ankle = { x: -ankleToMidfoot, y: segments.footHeight + platformHeight };

    // Plates always start on the floor; blocks raise the bar start, deficits raise the lifter.
    const barStartHeight = STANDARD_PLATE_RADIUS + Math.max(0, barOffset);
    const legLockoutY = ankle.y + (segments.tibia + segments.femur);
    const lockoutShoulderY = legLockoutY + segments.torso;
    // Lockout height accounts for the slight horizontal separation between the shoulder and bar line.
    // This prevents a "soft-knee lockout" caused by solving a lockout height that assumes arms are perfectly vertical.
    const lockoutArmDrop = Math.sqrt(
      Math.max(0, armLength * armLength - ankleToMidfoot * ankleToMidfoot)
    );
    const barLockoutHeight = lockoutShoulderY - lockoutArmDrop - 0.005; // 5mm slack for robust solver

    const t = clamp01(progress);
    const bar = {
      x: barLineX,
      y: barStartHeight + (barLockoutHeight - barStartHeight) * t,
    };

    // Phase timing (by bar height): bar passing the knee triggers the handoff to hip extension.
    const barROM = barLockoutHeight - barStartHeight;
    const kneeHeightRef = ankle.y + segments.tibia; // shin vertical knee height
    const tKnee =
      Math.abs(barROM) < 1e-9 ? 0 : clamp01((kneeHeightRef - barStartHeight) / barROM);

    // Shins become vertical *before* the bar reaches knee height (first pull).
    const tShinVertical =
      tKnee <= 0.08
        ? 0
        : Math.max(0.08, Math.min(tKnee * 0.95, tKnee - 0.015));

    // Torso stays relatively constant until the bar is at/above the knee, then opens to lockout.
    const lockoutStartT = tKnee <= 0.05 ? 0 : Math.min(0.95, tKnee);

    // Starting trunk angle (degrees from vertical, forward lean = positive).
    // Conventional deadlifts are typically ~30-45° above horizontal (≈45-60° from vertical).


    // Shin angle (degrees from horizontal). In first pull it straightens to vertical.
    const shinStartDeg = Math.max(
      desiredShinStartDeg,
      // Ensure knee stays behind bar line at the start (bar x is fixed).
      (() => {
        const maxCos = Math.max(
          -1,
          Math.min(1, (ankleToMidfoot - kneeClearance) / segments.tibia)
        );
        return (Math.acos(maxCos) * 180) / Math.PI;
      })()
    );

    const shinAngleDeg =
      tShinVertical <= 0
        ? 90
        : t <= tShinVertical
          ? lerp(shinStartDeg, 90, easeOutCubic(clamp01(t / tShinVertical)))
          : 90;

    const shinAngleRad = toRad(shinAngleDeg);

    // Knee is driven directly (hinge only flexes one way, no inversion/back-bend):
    // - knee moves backward as bar rises (shin goes to vertical)
    // - knee never moves behind the ankle (tibia never points backward)
    const kneeBase = {
      x: ankle.x + segments.tibia * Math.cos(shinAngleRad),
      y: ankle.y + segments.tibia * Math.sin(shinAngleRad),
    };

    // Option 1: shoulder-driven lockout IK.
    // - Bar is the only driver: x fixed, y(t) linear.
    // - Shoulders are targeted during lockout; arms stay rigid.
    // - Hip is solved by circle-circle intersection with rigid femur + torso.
    const intersectCircles = (
      c1: { x: number; y: number },
      r1: number,
      c2: { x: number; y: number },
      r2: number
    ): Array<{ x: number; y: number }> => {
      const dx = c2.x - c1.x;
      const dy = c2.y - c1.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const EPS = 1e-9;

      if (d < EPS) return [];
      if (d > r1 + r2 + 1e-6) return [];
      if (d < Math.abs(r1 - r2) - 1e-6) return [];

      const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
      const h2 = r1 * r1 - a * a;
      const h = Math.sqrt(Math.max(0, h2));

      const px = c1.x + (a * dx) / d;
      const py = c1.y + (a * dy) / d;

      const rx = -dy / d;
      const ry = dx / d;

      if (h < 1e-7) return [{ x: px, y: py }];
      return [
        { x: px + h * rx, y: py + h * ry },
        { x: px - h * rx, y: py - h * ry },
      ];
    };

    const clampUnit = (v: number) => Math.max(-1, Math.min(1, v));
    const angleAt = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) => {
      const v1x = a.x - b.x;
      const v1y = a.y - b.y;
      const v2x = c.x - b.x;
      const v2y = c.y - b.y;
      const m1 = Math.sqrt(v1x * v1x + v1y * v1y);
      const m2 = Math.sqrt(v2x * v2x + v2y * v2y);
      if (m1 === 0 || m2 === 0) return 0;
      const cos = clampUnit((v1x * v2x + v1y * v2y) / (m1 * m2));
      return KinematicsUtils.toDegrees(Math.acos(cos));
    };

    const clampShoulderX = (x: number) => {
      const noLayback = Math.max(ankle.x, x);
      const minX = bar.x - armLength + 1e-6;
      const maxX = bar.x + armLength - 1e-6;
      return Math.max(minX, Math.min(maxX, noLayback));
    };

    const shoulderFromX = (x: number) => {
      const shoulderX = clampShoulderX(x);
      const dx = shoulderX - bar.x;
      const dy = Math.sqrt(Math.max(0, armLength * armLength - dx * dx));
      return { x: shoulderX, y: bar.y + dy };
    };

    const hipIsValid = (hip: { x: number; y: number }, knee: { x: number; y: number }) => {
      // Keep the whole leg behind the bar line (no bar-through-leg).
      if (hip.x > bar.x - hipClearance) return false;
      if (knee.x > bar.x - kneeClearance) return false;

      // Prevent "knee inversion": hip should not drift in front of the knee in profile.
      if (hip.x > knee.x + hipAheadOfKneeAllowance) return false;

      // Hip must be above knee for a normal deadlift rig.
      if (hip.y < knee.y + 0.02) return false;

      // Knee hinge limit: internal knee angle in [40, 180] => flexion in [0, 140].
      const kneeInternal = angleAt(hip, knee, ankle);
      if (kneeInternal < 40 || kneeInternal > 180) return false;

      return true;
    };

    const lockoutBias =
      t <= lockoutStartT
        ? 0
        : easeInOutCubic(clamp01((t - lockoutStartT) / (1 - lockoutStartT)));
    const hipKneeAlignmentWeight = 3.0;

    const hipSortCost = (hip: { x: number; y: number }, knee: { x: number; y: number }) =>
      (bar.x - hip.x) + lockoutBias * hipKneeAlignmentWeight * Math.abs(hip.x - knee.x);

    const pickHip = (
      hipCandidates: Array<{ x: number; y: number }>,
      knee: { x: number; y: number },
      cost: (p: { x: number; y: number }) => number = (p) => hipSortCost(p, knee)
    ) => {
      const strict = hipCandidates.filter((p) => hipIsValid(p, knee)).sort((a, b) => cost(a) - cost(b))[0];
      if (strict) return strict;

      // Relax only the hip-above-knee constraint slightly (keep collision + hinge rules hard).
      return hipCandidates
        .filter((p) => {
          if (p.x > bar.x - hipClearance) return false;
          if (knee.x > bar.x - kneeClearance) return false;
          if (p.x > knee.x + hipAheadOfKneeAllowance) return false;
          if (p.y < knee.y + 0.01) return false;

          const kneeInternal = angleAt(p, knee, ankle);
          if (kneeInternal < 40 || kneeInternal > 180) return false;

          return true;
        })
        .sort((a, b) => cost(a) - cost(b))[0];
    };

    // Shoulder path target (lockout behavior): smoothly approach the ankle line and never go behind it (prevents layback).
    const shoulderStartForwardBase =
      variant === "sumo" ? lerp(0.04, 0.02, stanceT) : 0.055;
    const shoulderStartForward = Math.max(0.01, shoulderStartForwardBase - 0.06 * barT);
    const shoulderXStart = barLineX + shoulderStartForward;

    const shoulderShiftStartT = lockoutStartT;
    const shoulderShiftBias =
      t <= shoulderShiftStartT
        ? 0
        : easeInOutCubic(clamp01((t - shoulderShiftStartT) / (1 - shoulderShiftStartT)));

    const shoulderXTarget = Math.max(
      ankle.x,
      lerp(shoulderXStart, ankle.x, shoulderShiftBias)
    );

    // Solve hip from rigid femur + torso. If there is no intersection, nudge the shoulder target
    // and/or allow a tiny amount of knee travel (still behind the bar) to keep the pose solvable.
    let knee = kneeBase;
    let shoulder = shoulderFromX(shoulderXTarget);
    let hip = pickHip(intersectCircles(knee, segments.femur, shoulder, segments.torso), knee);

    if (!hip || (hip && hip.y > shoulder.y + 0.05)) { // If failed OR hips significantly above shoulders
      const shoulderStep = 0.005;
      const shoulderMaxOffset = 0.15; // Allow more shoulder drift if needed
      const shinStepDeg = 1.0;
      const shinMaxOffsetDeg = 35.0; // Allow significant knee forward travel (deep squat start)

      const candidateShoulderOffsets: number[] = [0];
      for (let d = shoulderStep; d <= shoulderMaxOffset + 1e-9; d += shoulderStep) {
        candidateShoulderOffsets.push(d, -d);
      }

      const candidateShinOffsets: number[] = [0];
      for (let d = shinStepDeg; d <= shinMaxOffsetDeg + 1e-9; d += shinStepDeg) {
        candidateShinOffsets.push(-d); // Prioritize shin angling forward (negative offset from 90/88)
      }

      let best: null | { hip: { x: number; y: number }; knee: { x: number; y: number }; shoulder: { x: number; y: number }; score: number } =
        null;

      for (const shoulderOffset of candidateShoulderOffsets) {
        const shoulderCandidate = shoulderFromX(shoulderXTarget + shoulderOffset);
        const shoulderDev = Math.abs(shoulderCandidate.x - shoulderXTarget);

        for (const shinOffset of candidateShinOffsets) {
          const shinCandidateDeg = Math.max(
            50, // Don't go below 50 degrees
            Math.min(95, shinAngleDeg + shinOffset)
          );

          const kneeCandidate = {
            x: ankle.x + segments.tibia * Math.cos(toRad(shinCandidateDeg)),
            y: ankle.y + segments.tibia * Math.sin(toRad(shinCandidateDeg)),
          };

          if (kneeCandidate.x > bar.x - kneeClearance) continue;
          if (kneeCandidate.x < ankle.x - 1e-3) continue;

          const hipCandidate = pickHip(
            intersectCircles(kneeCandidate, segments.femur, shoulderCandidate, segments.torso),
            kneeCandidate
          );
          if (!hipCandidate) continue;

          // SCORING
          let score = hipSortCost(hipCandidate, kneeCandidate) + shoulderDev * 5;

          // Penalize hips above shoulders heavily
          if (hipCandidate.y > shoulderCandidate.y) {
            score += (hipCandidate.y - shoulderCandidate.y) * 1000;
          }

          // Penalize extreme shin angles slightly (prefer vertical if possible)
          score += Math.abs(shinCandidateDeg - shinAngleDeg) * 0.05;

          if (!best || score < best.score) {
            best = {
              hip: hipCandidate,
              knee: kneeCandidate,
              shoulder: shoulderCandidate,
              score,
            };
          }
        }
      }

      if (best) {
        hip = best.hip;
        knee = best.knee;
        shoulder = best.shoulder;
      }
    }

    // Final fallback: keep something drawable (should be rare). This keeps collision rules sane, but may fail strict validation.
    // Final fallback: keep something drawable by enforcing connectedness (rubber-banding).
    // If strict geometry failed, the segments likely don't satisfy triangle inequalities.
    // We project the hip onto the line satisfying the closest possible geometry.
    if (!hip) {
      // Find where the hip 'wants' to be to minimize gap
      // If Femur + Torso < Dist (Too short): Place hip on line K-S
      // If |Femur - Torso| > Dist (One too long): Place hip on line extension

      const dx = shoulder.x - knee.x;
      const dy = shoulder.y - knee.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 1e-6) {
        // "Rubber band" normalized lengths to fit the distance
        // This effectively stretches/shrinks the lifter to fit the bar, which is better than exploding.
        // If we really can't fit (e.g. segments too long), we just fold them appropriately?
        // Actually simplest robust visual is to place hip weighted by femur length along the line.
        const t_hip = segments.femur / (segments.femur + segments.torso);

        hip = {
          x: knee.x + dx * t_hip,
          y: knee.y + dy * t_hip
        };
      } else {
        // Knee and shoulder overlap (weird), just put hip up
        hip = { x: knee.x, y: knee.y + segments.femur };
      }
    }

    // Straight arms to bar (elbow aligned)
    const armAngleRad = KinematicsUtils.angleBetweenPoints(shoulder, bar);
    const armChain = KinematicsUtils.buildArmChain(
      shoulder,
      segments.upperArm,
      segments.forearm,
      armAngleRad,
      armAngleRad
    );

    const elbow = armChain.elbow;
    const wrist = armChain.wrist;

    const kneeAngleDeg = angleAt(hip, knee, ankle);
    const hipAngleDeg = angleAt(shoulder, hip, knee);
    const torsoAngleRad = KinematicsUtils.angleBetweenPoints(hip, shoulder);
    const trunkAngleDeg = Math.abs(KinematicsUtils.toDegrees(Math.PI / 2 - torsoAngleRad));

    // Stance visuals (contacts only; 2D profile uses a single ankle joint)
    const stanceWidth =
      variant === "sumo"
        ? stance === "hybrid"
          ? 0.12
          : stance === "normal"
            ? 0.16
            : stance === "wide"
              ? 0.20
              : 0.24
        : 0.10;

    return {
      ankle,
      knee,
      hip,
      shoulder,
      elbow,
      wrist,
      toe: { x: ankle.x + segments.footLength, y: 0 },
      bar,
      contacts: {
        leftFoot: { x: -stanceWidth, y: ankle.y },
        rightFoot: { x: stanceWidth, y: ankle.y },
        leftHand: { x: -0.2, y: bar.y },
        rightHand: { x: 0.2, y: bar.y },
      },
      angles: {
        ankle: 90,
        knee: kneeAngleDeg,
        hip: hipAngleDeg,
        trunk: trunkAngleDeg,
        shoulder: KinematicsUtils.toDegrees(armAngleRad),
        elbow: 180,
      },
      barAngle: 0,
    };
  }
}
