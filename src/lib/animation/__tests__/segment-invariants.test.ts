/**
 * Rigid Segment Invariant Tests
 *
 * Verifies that segment lengths remain constant across all movements and animation phases
 */

import { describe, it, expect } from "vitest";
import { LiftFamily, Sex } from "@/types";
import { createPoseSolver } from "../movements";
import { getAnimationPhase, calculateRepCycle } from "../Animator";
import { KinematicsUtils } from "../PoseSolver";
import { createSimpleProfile } from "@/lib/biomechanics/anthropometry";

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
  });

  describe("Thruster", () => {
    const movement = LiftFamily.THRUSTER;
    const solver = createPoseSolver(movement);
    const options = {};
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
  });
});
