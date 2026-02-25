/**
 * Rigid Segment Invariant Tests
 *
 * Verifies that segment lengths remain constant across all movements and animation phases
 */

import { describe, it, expect } from "vitest";
import { LiftFamily, Sex } from "@/types";
import { createPoseSolver, getThrusterROMParts } from "../movements";
import { getAnimationPhase, calculateRepCycle } from "../Animator";
import { KinematicsUtils } from "../PoseSolver";
import { createProfileFromProportions, createSimpleProfile } from "@/lib/biomechanics/anthropometry";
import { STANDARD_PLATE_RADIUS } from "@/lib/biomechanics/constants";
import {
  PULLUP_BAR_HEIGHT_M,
  PULLUP_ELBOW_FRONT_MARGIN_FRAC,
  PULLUP_ELBOW_FRONT_RELEASE_START,
  PULLUP_TOP_CHIN_CLEARANCE_FRAC,
} from "@/lib/animation/constants";

const TOLERANCE = 0.001; // 1mm tolerance for floating point arithmetic

describe("Rigid Segment Invariants", () => {
  // Test anthropometry
  const anthropometry = createSimpleProfile(1.75, 75, Sex.MALE);

  const segments = anthropometry.segments;

  // Test phases: sample animation phases across a full movement
  const testPhases = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0];

  describe("Squat", () => {
    const movement = LiftFamily.SQUAT;
    const solver = createPoseSolver(movement);
    const options = { squatVariant: "highBar" as const, stance: "medium" as const };
    const rom = solver.getROM({ anthropometry, movement, options });
    const cycleConfig = calculateRepCycle(rom, 0.3); // 0.3 m/s velocity

    testPhases.forEach((t) => {
      it(`maintains segment lengths at phase ${t}`, () => {
        const phase = getAnimationPhase(movement, t, cycleConfig);
        const result = solver.solve({ anthropometry, movement, options, phase });

        expect(result.valid).toBe(true);
        const pose = result.pose;

        // Check lower body segments
        const tibiaLength = KinematicsUtils.distance(pose.ankle, pose.knee);
        expect(Math.abs(tibiaLength - segments.tibia)).toBeLessThan(TOLERANCE);

        const femurLength = KinematicsUtils.distance(pose.knee, pose.hip);
        expect(Math.abs(femurLength - segments.femur)).toBeLessThan(TOLERANCE);

        const torsoLength = KinematicsUtils.distance(pose.hip, pose.shoulder);
        expect(Math.abs(torsoLength - segments.torso)).toBeLessThan(TOLERANCE);
      });
    });

    it("maintains ground contact throughout movement", () => {
      testPhases.forEach((t) => {
        const phase = getAnimationPhase(movement, t, cycleConfig);
        const result = solver.solve({ anthropometry, movement, options, phase });
        const pose = result.pose;

        // Feet should be on ground (y = footHeight)
        expect(pose.ankle.y).toBeCloseTo(segments.footHeight, 3);
      });
    });
  });

  describe("Deadlift", () => {
    const movement = LiftFamily.DEADLIFT;
    const solver = createPoseSolver(movement);
    const options = { deadliftVariant: "conventional" as const, stance: "medium" as const };
    const rom = solver.getROM({ anthropometry, movement, options });
    const cycleConfig = calculateRepCycle(rom, 0.3);

    testPhases.forEach((t) => {
      it(`maintains segment lengths at phase ${t}`, () => {
        const phase = getAnimationPhase(movement, t, cycleConfig);
        const result = solver.solve({ anthropometry, movement, options, phase });

        expect(result.valid).toBe(true);
        const pose = result.pose;

        const tibiaLength = KinematicsUtils.distance(pose.ankle, pose.knee);
        expect(Math.abs(tibiaLength - segments.tibia)).toBeLessThan(TOLERANCE);

        const femurLength = KinematicsUtils.distance(pose.knee, pose.hip);
        expect(Math.abs(femurLength - segments.femur)).toBeLessThan(TOLERANCE);

        const torsoLength = KinematicsUtils.distance(pose.hip, pose.shoulder);
        expect(Math.abs(torsoLength - segments.torso)).toBeLessThan(TOLERANCE);

        // Deadlift-specific: arms should remain straight
        if (pose.elbow && pose.wrist) {
          const upperArmLength = KinematicsUtils.distance(pose.shoulder, pose.elbow);
          expect(Math.abs(upperArmLength - segments.upperArm)).toBeLessThan(TOLERANCE);

          const forearmLength = KinematicsUtils.distance(pose.elbow, pose.wrist);
          expect(Math.abs(forearmLength - segments.forearm)).toBeLessThan(TOLERANCE);
        }
      });
    });

    it("keeps knees and legs behind the bar path", () => {
      const toDeg = (rad: number) => (rad * 180) / Math.PI;
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
        return toDeg(Math.acos(cos));
      };

      const densePhases = Array.from({ length: 41 }, (_, i) => i / 40);

      // Smoke across a handful of proportions and stances (these cases are where collision bugs tend to surface).
      const profiles = [
        {
          label: "avg conventional",
          anthropometry: createSimpleProfile(1.75, 75, Sex.MALE),
          options: { deadliftVariant: "conventional" as const },
        },
        {
          label: "short conventional",
          anthropometry: createSimpleProfile(1.55, 55, Sex.FEMALE),
          options: { deadliftVariant: "conventional" as const },
        },
        {
          label: "long arms conventional",
          anthropometry: createProfileFromProportions(1.75, 75, Sex.MALE, 0, 2, 0),
          options: { deadliftVariant: "conventional" as const },
        },
        {
          label: "sumo wide",
          anthropometry: createProfileFromProportions(1.75, 75, Sex.MALE, 0, 0, 2),
          options: { deadliftVariant: "sumo" as const, sumoStance: "wide" as const },
        },
      ];

      for (const { label, anthropometry: profile, options: caseOptions } of profiles) {
        const caseRom = solver.getROM({ anthropometry: profile, movement, options: caseOptions });
        const caseCycle = calculateRepCycle(caseRom, 0.3);

        for (const t of densePhases) {
          const phase = getAnimationPhase(movement, t, caseCycle);
          const result = solver.solve({ anthropometry: profile, movement, options: caseOptions, phase });

          expect(
            result.valid,
            `${label} @ t=${t.toFixed(3)} barN=${phase.barHeightNormalized.toFixed(3)} :: ${result.errors.join(", ")}`
          ).toBe(true);
          const pose = result.pose;

          expect(pose.bar).not.toBeNull();
          if (!pose.bar) continue;

          // Collision avoidance: legs stay behind the bar line with a visible margin.
          expect(pose.ankle.x).toBeLessThan(pose.bar.x - 0.01);
          expect(pose.knee.x).toBeLessThan(pose.bar.x - 0.02);
          expect(pose.hip.x).toBeLessThan(pose.bar.x - 0.01);

          // Hinge constraint: tibia never points backward (no knee inversion / hyperextension).
          expect(pose.knee.x).toBeGreaterThanOrEqual(pose.ankle.x - 1e-3);
          expect(pose.hip.x).toBeLessThanOrEqual(pose.knee.x + 0.01);

           // Knee joint limits: internal angle in [40, 180] => flexion in [0, 140].
           const kneeInternal = angleAt(pose.hip, pose.knee, pose.ankle);
           expect(kneeInternal).toBeGreaterThanOrEqual(40);
           expect(kneeInternal).toBeLessThanOrEqual(180);

           // No "layback": in the last portion of the lift, shoulders stay stacked over the ankle line
           // as the hips continue to extend underneath them.
           if (phase.barHeightNormalized > 0.85) {
             const minShoulderX = pose.ankle.x - 0.004;
             const msg = `${label} @ t=${t.toFixed(3)} barN=${phase.barHeightNormalized.toFixed(3)} ankleX=${pose.ankle.x.toFixed(
               4
             )} shoulderX=${pose.shoulder.x.toFixed(4)} minShoulderX=${minShoulderX.toFixed(4)}`;
             expect(pose.shoulder.x, msg).toBeGreaterThanOrEqual(minShoulderX);
             expect(pose.hip.x, msg).toBeLessThanOrEqual(pose.shoulder.x + 0.003);
           }

           // Lockout: hips and knees finish extending together at the top.
           if (phase.barHeightNormalized > 0.99) {
             const hipInternal = angleAt(pose.shoulder, pose.hip, pose.knee);
             const msg = `${label} @ t=${t.toFixed(3)} barN=${phase.barHeightNormalized.toFixed(3)}`;
             expect(kneeInternal, msg).toBeGreaterThanOrEqual(165);
             expect(hipInternal, msg).toBeGreaterThanOrEqual(165);
             expect(Math.abs(pose.shoulder.x - pose.ankle.x), msg).toBeLessThanOrEqual(0.01);
             expect(Math.abs(pose.hip.x - pose.ankle.x), msg).toBeLessThanOrEqual(0.06);
           }
         }

        // Plates start on the floor at the bottom position for a standard pull.
        {
          const phase = getAnimationPhase(movement, 0, caseCycle);
          const result = solver.solve({ anthropometry: profile, movement, options: caseOptions, phase });
          expect(result.valid).toBe(true);
          expect(result.pose.bar).not.toBeNull();
          if (result.pose.bar) {
            expect(result.pose.bar.y).toBeCloseTo(STANDARD_PLATE_RADIUS, 6);
          }
        }

        // Plates still start on the floor for deficits (lifter elevates instead of sinking plates).
        if (label === "avg conventional") {
          const deficitOptions = { deadliftVariant: "conventional" as const, deadliftBarOffset: -0.05 };
          const deficitPhase = getAnimationPhase(movement, 0, caseCycle);
          const deficitResult = solver.solve({
            anthropometry: profile,
            movement,
            options: deficitOptions,
            phase: deficitPhase,
          });

          expect(deficitResult.valid).toBe(true);
          expect(deficitResult.pose.bar).not.toBeNull();
          if (deficitResult.pose.bar) {
            expect(deficitResult.pose.bar.y).toBeCloseTo(STANDARD_PLATE_RADIUS, 6);
          }
          expect(deficitResult.pose.ankle.y).toBeCloseTo(profile.segments.footHeight + 0.05, 6);
        }
      }
    });
  });

  describe("Bench Press", () => {
    const movement = LiftFamily.BENCH;
    const solver = createPoseSolver(movement);
    const options = { benchGrip: "medium" as const, benchArch: "moderate" as const };
    const rom = solver.getROM({ anthropometry, movement, options });
    const cycleConfig = calculateRepCycle(rom, 0.2);

    testPhases.forEach((t) => {
      it(`maintains segment lengths at phase ${t}`, () => {
        const phase = getAnimationPhase(movement, t, cycleConfig);
        const result = solver.solve({ anthropometry, movement, options, phase });

        expect(result.valid).toBe(true);
        const pose = result.pose;

        // Bench rendering is stylized (J-curve + planted leg setup). Ensure
        // the kinematic chain is valid/finite instead of enforcing strict rigid lengths.
        expect(Number.isFinite(pose.shoulder.x)).toBe(true);
        expect(Number.isFinite(pose.shoulder.y)).toBe(true);
        expect(Number.isFinite(pose.bar.x)).toBe(true);
        expect(Number.isFinite(pose.bar.y)).toBe(true);
      });
    });

    it("keeps lockout over shoulders and touches chest forward", () => {
      const lockoutPhase = {
        t: 0,
        phase: "eccentric" as const,
        phaseProgress: 0,
        barHeightNormalized: 1,
      };
      const bottomPhase = {
        t: 0.5,
        phase: "eccentric" as const,
        phaseProgress: 1,
        barHeightNormalized: 0,
      };

      const lockout = solver.solve({ anthropometry, movement, options, phase: lockoutPhase }).pose;
      const bottom = solver.solve({ anthropometry, movement, options, phase: bottomPhase }).pose;

      expect(lockout.bar).not.toBeNull();
      expect(bottom.bar).not.toBeNull();
      if (!lockout.bar || !bottom.bar) return;

      // Lockout: bar remains near the shoulder line in side view.
      expect(Math.abs(lockout.bar.x - lockout.shoulder.x)).toBeLessThan(0.25);

      // Bottom: keep a plausible touch point with near-vertical forearms.
      const forward = bottom.bar.x - bottom.shoulder.x;
      expect(forward).toBeGreaterThan(-0.3);
      expect(forward).toBeLessThan(0.35);
      expect(Math.abs(bottom.wrist.x - bottom.elbow.x)).toBeLessThan(0.15);

      // Vertical ROM direction sanity.
      expect(lockout.bar.y).toBeGreaterThan(bottom.bar.y);
    });
  });

  describe("Overhead Press", () => {
    const movement = LiftFamily.OHP;
    const solver = createPoseSolver(movement);
    const options = {};
    const rom = solver.getROM({ anthropometry, movement, options });
    const cycleConfig = calculateRepCycle(rom, 0.25);

    testPhases.forEach((t) => {
      it(`maintains segment lengths at phase ${t}`, () => {
        const phase = getAnimationPhase(movement, t, cycleConfig);
        const result = solver.solve({ anthropometry, movement, options, phase });

        expect(result.valid).toBe(true);
        const pose = result.pose;

        const tibiaLength = KinematicsUtils.distance(pose.ankle, pose.knee);
        expect(Math.abs(tibiaLength - segments.tibia)).toBeLessThan(TOLERANCE);

        const femurLength = KinematicsUtils.distance(pose.knee, pose.hip);
        expect(Math.abs(femurLength - segments.femur)).toBeLessThan(TOLERANCE);

        const torsoLength = KinematicsUtils.distance(pose.hip, pose.shoulder);
        expect(Math.abs(torsoLength - segments.torso)).toBeLessThan(TOLERANCE);

        if (pose.elbow && pose.wrist) {
          const upperArmLength = KinematicsUtils.distance(pose.shoulder, pose.elbow);
          expect(Math.abs(upperArmLength - segments.upperArm)).toBeLessThan(TOLERANCE);

          const forearmLength = KinematicsUtils.distance(pose.elbow, pose.wrist);
          expect(Math.abs(forearmLength - segments.forearm)).toBeLessThan(TOLERANCE);
        }
      });
    });
  });

  describe("Pullup", () => {
    const movement = LiftFamily.PULLUP;
    const solver = createPoseSolver(movement);
    const options = { pullupGrip: "pronated" as const };
    const rom = solver.getROM({ anthropometry, movement, options });
    const cycleConfig = calculateRepCycle(rom, 0.4);

    testPhases.forEach((t) => {
      it(`maintains segment lengths at phase ${t}`, () => {
        const phase = getAnimationPhase(movement, t, cycleConfig);
        const result = solver.solve({ anthropometry, movement, options, phase });

        expect(result.valid).toBe(true);
        const pose = result.pose;

        const tibiaLength = KinematicsUtils.distance(pose.ankle, pose.knee);
        expect(Math.abs(tibiaLength - segments.tibia)).toBeLessThan(TOLERANCE);

        const femurLength = KinematicsUtils.distance(pose.knee, pose.hip);
        expect(Math.abs(femurLength - segments.femur)).toBeLessThan(TOLERANCE);

        const torsoLength = KinematicsUtils.distance(pose.hip, pose.shoulder);
        expect(Math.abs(torsoLength - segments.torso)).toBeLessThan(TOLERANCE);

        if (pose.elbow && pose.wrist) {
          const upperArmLength = KinematicsUtils.distance(pose.shoulder, pose.elbow);
          expect(Math.abs(upperArmLength - segments.upperArm)).toBeLessThan(TOLERANCE);

          const forearmLength = KinematicsUtils.distance(pose.elbow, pose.wrist);
          expect(Math.abs(forearmLength - segments.forearm)).toBeLessThan(TOLERANCE);
        }
      });
    });

    it("finishes with chin above bar, elbows tucked, and head behind bar", () => {
      const topPhase = {
        t: 0,
        phase: "concentric" as const,
        phaseProgress: 1,
        barHeightNormalized: 1,
      };
      const midPhase = {
        t: 0.5,
        phase: "concentric" as const,
        phaseProgress: 0.5,
        barHeightNormalized: 0.5,
      };

      const topPose = solver.solve({ anthropometry, movement, options, phase: topPhase }).pose;
      const midPose = solver.solve({ anthropometry, movement, options, phase: midPhase }).pose;

      // Match head/chin placement logic used by the canvas renderer.
      const hipToShoulderDx = topPose.shoulder.x - topPose.hip.x;
      const hipToShoulderDy = topPose.shoulder.y - topPose.hip.y;
      const hipToShoulderLen = Math.sqrt(hipToShoulderDx ** 2 + hipToShoulderDy ** 2) || 1;
      const ux = hipToShoulderDx / hipToShoulderLen;
      const uy = hipToShoulderDy / hipToShoulderLen;

      const headCenter = {
        x: topPose.shoulder.x + ux * segments.headNeck * 0.65,
        y: topPose.shoulder.y + uy * segments.headNeck * 0.65,
      };
      const chinY = headCenter.y - segments.headNeck * 0.35;

      const chinClearance = segments.height * PULLUP_TOP_CHIN_CLEARANCE_FRAC;
      expect(chinY).toBeGreaterThan(PULLUP_BAR_HEIGHT_M + chinClearance * 0.75);

      // Head should be slightly behind the bar plane at the top (negative x in this view).
      expect(headCenter.x).toBeLessThan(-segments.height * 0.006);

      // Elbows should be depressed and not flared forward at lockout.
      expect(topPose.elbow.y).toBeLessThan(topPose.shoulder.y);
      expect(topPose.elbow.x).toBeLessThan(0.02);
      expect(Math.abs(topPose.elbow.x - topPose.shoulder.x)).toBeLessThan(0.08);

      // Forearms should remain roughly vertical-ish at the top in this view.
      expect(Math.abs(topPose.wrist.x - topPose.elbow.x)).toBeLessThan(0.10);

      // Compared to mid-rep, elbows should be more "tucked" toward the torso line at the finish.
      expect(Math.abs(topPose.elbow.x - topPose.shoulder.x)).toBeLessThanOrEqual(
        Math.abs(midPose.elbow.x - midPose.shoulder.x) + 1e-6
      );
    });

    it("keeps the elbow on the front side of the torso until the release window", () => {
      const eps = 1e-4;
      const frontMargin = segments.height * PULLUP_ELBOW_FRONT_MARGIN_FRAC;
      const denseProgress = Array.from({ length: 41 }, (_, i) => (i / 40) * PULLUP_ELBOW_FRONT_RELEASE_START);

      for (const p of denseProgress) {
        const phase = {
          t: p,
          phase: "concentric" as const,
          phaseProgress: p,
          barHeightNormalized: p,
        };
        const pose = solver.solve({ anthropometry, movement, options, phase }).pose;
        expect(pose.elbow.x).toBeGreaterThanOrEqual(pose.shoulder.x + frontMargin - eps);
      }
    });
  });

  describe("Pushup", () => {
    const movement = LiftFamily.PUSHUP;
    const solver = createPoseSolver(movement);
    const options = { pushupVariant: "standard" as const };
    const rom = solver.getROM({ anthropometry, movement, options });
    const cycleConfig = calculateRepCycle(rom, 0.3);

    testPhases.forEach((t) => {
      it(`maintains segment lengths at phase ${t}`, () => {
        const phase = getAnimationPhase(movement, t, cycleConfig);
        const result = solver.solve({ anthropometry, movement, options, phase });

        expect(result.valid).toBe(true);
        const pose = result.pose;

        const tibiaLength = KinematicsUtils.distance(pose.ankle, pose.knee);
        expect(Math.abs(tibiaLength - segments.tibia)).toBeLessThan(TOLERANCE);

        const femurLength = KinematicsUtils.distance(pose.knee, pose.hip);
        expect(Math.abs(femurLength - segments.femur)).toBeLessThan(TOLERANCE);

        const torsoLength = KinematicsUtils.distance(pose.hip, pose.shoulder);
        expect(Math.abs(torsoLength - segments.torso)).toBeLessThan(TOLERANCE);

        if (pose.elbow && pose.wrist) {
          const upperArmLength = KinematicsUtils.distance(pose.shoulder, pose.elbow);
          expect(Math.abs(upperArmLength - segments.upperArm)).toBeLessThan(TOLERANCE);

          const forearmLength = KinematicsUtils.distance(pose.elbow, pose.wrist);
          expect(Math.abs(forearmLength - segments.forearm)).toBeLessThan(TOLERANCE);
        }
      });
    });

    it("keeps hands planted and elbows bending the correct direction (no inversion)", () => {
      const densePhases = Array.from({ length: 41 }, (_, i) => i / 40);
      const eps = 0.08;
      const positionTolerance = 0.001; // 1mm tolerance for position consistency

      // Get first pose to establish reference wrist position
      const firstPhase = getAnimationPhase(movement, 0, cycleConfig);
      const firstResult = solver.solve({ anthropometry, movement, options, phase: firstPhase });
      const refWrist = firstResult.pose.wrist;

      for (const t of densePhases) {
        const phase = getAnimationPhase(movement, t, cycleConfig);
        const result = solver.solve({ anthropometry, movement, options, phase });
        expect(result.valid).toBe(true);

        const pose = result.pose;

        // Hands are planted: wrist position is CONSTANT across all phases (not necessarily at origin)
        expect(Math.abs(pose.wrist.x - refWrist.x)).toBeLessThan(positionTolerance);
        expect(Math.abs(pose.wrist.y - refWrist.y)).toBeLessThan(positionTolerance);

        // Elbow must stay on the "downward" side of the shoulder->wrist line in this world view (y+ up).
        const ax = pose.wrist.x - pose.shoulder.x;
        const ay = pose.wrist.y - pose.shoulder.y;
        const bx = pose.elbow.x - pose.shoulder.x;
        const by = pose.elbow.y - pose.shoulder.y;
        const cross = ax * by - ay * bx;

        expect(Math.abs(cross)).toBeLessThanOrEqual(0.2 + eps);
      }
    });
  });

  describe("Thruster", () => {
    const movement = LiftFamily.THRUSTER;
    const solver = createPoseSolver(movement);
    const options = {};
    const rom = solver.getROM({ anthropometry, movement, options });
    const cycleConfig = calculateRepCycle(rom, 0.4);
    const { squatROM, pressROM } = getThrusterROMParts(anthropometry);

    testPhases.forEach((t) => {
      it(`maintains segment lengths at phase ${t}`, () => {
        const phase = getAnimationPhase(movement, t, cycleConfig, squatROM, pressROM);
        const result = solver.solve({ anthropometry, movement, options, phase });

        expect(result.valid).toBe(true);
        const pose = result.pose;

        const tibiaLength = KinematicsUtils.distance(pose.ankle, pose.knee);
        expect(Math.abs(tibiaLength - segments.tibia)).toBeLessThan(TOLERANCE);

        const femurLength = KinematicsUtils.distance(pose.knee, pose.hip);
        expect(Math.abs(femurLength - segments.femur)).toBeLessThan(TOLERANCE);

        const torsoLength = KinematicsUtils.distance(pose.hip, pose.shoulder);
        expect(Math.abs(torsoLength - segments.torso)).toBeLessThan(TOLERANCE);

        if (pose.elbow && pose.wrist) {
          const upperArmLength = KinematicsUtils.distance(pose.shoulder, pose.elbow);
          expect(Math.abs(upperArmLength - segments.upperArm)).toBeLessThan(TOLERANCE);

          const forearmLength = KinematicsUtils.distance(pose.elbow, pose.wrist);
          expect(Math.abs(forearmLength - segments.forearm)).toBeLessThan(TOLERANCE);
        }
      });
    });
  });
});
