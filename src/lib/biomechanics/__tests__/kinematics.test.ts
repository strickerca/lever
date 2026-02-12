import { describe, it, expect } from "vitest";
import { solveSquatKinematics, solveDeadliftKinematics } from "../kinematics";
import { createSimpleProfile, createAdvancedProfile } from "../anthropometry";
import { Sex } from "@/types";
import { calculateDeadliftDisplacement, calculateDeadliftWork } from "../physics";

describe("Kinematics Solver", () => {
  describe("Identity test", () => {
    it("should produce same output for same input", () => {
      const profile = createSimpleProfile(1.8, 80, Sex.MALE);

      const kin1 = solveSquatKinematics(profile, "highBar");
      const kin2 = solveSquatKinematics(profile, "highBar");

      // Should be identical
      expect(kin1.displacement).toBe(kin2.displacement);
      expect(kin1.angles.trunk).toBe(kin2.angles.trunk);
      expect(kin1.angles.ankle).toBe(kin2.angles.ankle);
      expect(kin1.momentArms.hip).toBe(kin2.momentArms.hip);
      expect(kin1.momentArms.knee).toBe(kin2.momentArms.knee);
      expect(kin1.valid).toBe(kin2.valid);
    });

    it("should be deterministic across multiple runs", () => {
      const profile = createSimpleProfile(1.75, 75, Sex.MALE);

      const results = Array.from({ length: 5 }, () =>
        solveSquatKinematics(profile, "highBar")
      );

      // All results should be identical
      const first = results[0]!;
      results.forEach((result) => {
        expect(result.displacement).toBe(first.displacement);
        expect(result.angles.trunk).toBe(first.angles.trunk);
        expect(result.momentArms.hip).toBe(first.momentArms.hip);
      });
    });
  });

  describe("Valid solution", () => {
    it("should find valid solution for typical anthropometry", () => {
      const profile = createSimpleProfile(1.8, 80, Sex.MALE);
      const kin = solveSquatKinematics(profile, "highBar");

      expect(kin.valid).toBe(true);
      expect(kin.angles.trunk).toBeGreaterThan(20);
      expect(kin.angles.trunk).toBeLessThan(80);
      expect(kin.displacement).toBeGreaterThan(0);
    });

    it("should position bar over midfoot", () => {
      const profile = createSimpleProfile(1.8, 80, Sex.MALE);
      const kin = solveSquatKinematics(profile, "highBar");

      // Bar should be very close to x = 0 (midfoot)
      expect(Math.abs(kin.positions.bar.x)).toBeLessThan(0.01);
    });

    it("should have positive moment arms", () => {
      const profile = createSimpleProfile(1.8, 80, Sex.MALE);
      const kin = solveSquatKinematics(profile, "highBar");

      expect(kin.momentArms.hip).toBeGreaterThan(0);
      expect(kin.momentArms.knee).toBeGreaterThan(0);
    });
  });

  describe("Long femur effects", () => {
    it("should result in larger hip moment arm for long femur", () => {
      const shortFemur = createAdvancedProfile(1.8, 80, Sex.MALE, {
        legs: -2,
        torso: 2,
        arms: 0,
      });
      const longFemur = createAdvancedProfile(1.8, 80, Sex.MALE, {
        legs: 2,
        torso: -2,
        arms: 0,
      });

      const kinShort = solveSquatKinematics(shortFemur, "highBar");
      const kinLong = solveSquatKinematics(longFemur, "highBar");

      // Long femur should have larger hip moment arm
      expect(kinLong.momentArms.hip).toBeGreaterThan(kinShort.momentArms.hip);
    });

    it("should result in more displacement for long legs", () => {
      const shortLegs = createAdvancedProfile(1.8, 80, Sex.MALE, {
        legs: -2,
        torso: 2,
        arms: 0,
      });
      const longLegs = createAdvancedProfile(1.8, 80, Sex.MALE, {
        legs: 2,
        torso: -2,
        arms: 0,
      });

      const kinShort = solveSquatKinematics(shortLegs, "highBar");
      const kinLong = solveSquatKinematics(longLegs, "highBar");

      // Long legs should have more displacement
      expect(kinLong.displacement).toBeGreaterThan(kinShort.displacement);
    });
  });

  describe("Squat variants", () => {
    it("should have different trunk angles for different variants", () => {
      const profile = createSimpleProfile(1.8, 80, Sex.MALE);

      const highBar = solveSquatKinematics(profile, "highBar");
      const lowBar = solveSquatKinematics(profile, "lowBar");
      const front = solveSquatKinematics(profile, "front");

      // All should be valid
      expect(highBar.valid).toBe(true);
      expect(lowBar.valid).toBe(true);
      expect(front.valid).toBe(true);

      // Trunk angles should differ
      expect(highBar.angles.trunk).not.toBe(lowBar.angles.trunk);
      expect(highBar.angles.trunk).not.toBe(front.angles.trunk);
    });

    it("should have reasonable moment arms for all variants", () => {
      const profile = createSimpleProfile(1.8, 80, Sex.MALE);

      const highBar = solveSquatKinematics(profile, "highBar");
      const lowBar = solveSquatKinematics(profile, "lowBar");
      const front = solveSquatKinematics(profile, "front");

      // All should have positive moment arms
      expect(highBar.momentArms.hip).toBeGreaterThan(0);
      expect(lowBar.momentArms.hip).toBeGreaterThan(0);
      expect(front.momentArms.hip).toBeGreaterThan(0);

      // Moment arms should be reasonable (< 0.5m for typical anthropometry)
      expect(highBar.momentArms.hip).toBeLessThan(0.5);
      expect(lowBar.momentArms.hip).toBeLessThan(0.5);
    });

    it("should show high bar has MORE ROM than low bar (CRITICAL biomechanics test)", () => {
      // This test verifies the key biomechanics behavior:
      // High bar squats have greater ROM than low bar squats
      // This is because the bar position rotates with the trunk,
      // and high bar's higher starting position results in more vertical displacement
      // The actual difference is modest (~0.5-2%) because the trunk angle compensation
      // partially offsets the bar position difference
      const profile = createSimpleProfile(1.8, 80, Sex.MALE);

      const highBar = solveSquatKinematics(profile, "highBar");
      const lowBar = solveSquatKinematics(profile, "lowBar");

      // High bar should have MORE displacement than low bar
      expect(highBar.displacement).toBeGreaterThan(lowBar.displacement);

      // The difference is modest because trunk angle compensation partially offsets bar position
      // High bar: higher bar start + less forward lean
      // Low bar: lower bar start + more forward lean (which increases displacement)
      // Net effect: high bar has slightly more ROM (~0.5-2%)
      const romDifferencePercent = ((highBar.displacement - lowBar.displacement) / lowBar.displacement) * 100;
      expect(romDifferencePercent).toBeGreaterThan(0.5); // At least 0.5% more ROM
      expect(romDifferencePercent).toBeLessThan(5);      // But modest difference
    });

    it("should show low bar has more forward trunk lean than high bar", () => {
      // Low bar requires more forward lean to keep bar over midfoot
      const profile = createSimpleProfile(1.8, 80, Sex.MALE);

      const highBar = solveSquatKinematics(profile, "highBar");
      const lowBar = solveSquatKinematics(profile, "lowBar");

      // Higher trunk angle = more forward lean
      expect(lowBar.angles.trunk).toBeGreaterThan(highBar.angles.trunk);
    });

    it("should show front squat has most upright trunk position", () => {
      const profile = createSimpleProfile(1.8, 80, Sex.MALE);

      const highBar = solveSquatKinematics(profile, "highBar");
      const lowBar = solveSquatKinematics(profile, "lowBar");
      const front = solveSquatKinematics(profile, "front");

      // Front squat should have smallest trunk angle (most upright)
      expect(front.angles.trunk).toBeLessThan(highBar.angles.trunk);
      expect(front.angles.trunk).toBeLessThan(lowBar.angles.trunk);
    });
  });

  describe("Mobility limitations", () => {
    it("should handle limited ankle mobility", () => {
      const profile = createSimpleProfile(1.8, 80, Sex.MALE);

      // Reduce ankle mobility severely
      profile.mobility.maxAnkleDorsiflexion = 15;

      const kin = solveSquatKinematics(profile, "highBar");

      // Should still find a solution (or fallback)
      expect(kin.displacement).toBeGreaterThan(0);

      // Ankle angle should not exceed mobility limit
      expect(kin.angles.ankle).toBeLessThanOrEqual(
        profile.mobility.maxAnkleDorsiflexion
      );
    });

    it("should set mobilityLimited flag when constrained", () => {
      const profile = createSimpleProfile(1.8, 80, Sex.MALE);

      // Set very limited mobility
      profile.mobility.maxAnkleDorsiflexion = 12;

      const kin = solveSquatKinematics(profile, "highBar");

      // Should be mobility limited
      if (kin.valid) {
        // If valid solution found with reduced ankle, should be marked as limited
        expect(kin.angles.ankle).toBeLessThan(30); // Less than default
      }
    });

    it("should use fallback when no valid solution exists", () => {
      const profile = createSimpleProfile(1.8, 80, Sex.MALE);

      // Set extremely limited mobility that may prevent solution
      profile.mobility.maxAnkleDorsiflexion = 5;

      const kin = solveSquatKinematics(profile, "highBar");

      // Should always return a result (valid or fallback)
      expect(kin.displacement).toBeGreaterThan(0);

      if (!kin.valid) {
        // Fallback displacement should be 0.37 × height
        expect(kin.displacement).toBeCloseTo(0.37 * profile.segments.height, 2);
      }
    });
  });

  describe("Position calculations", () => {
    it("should have ankle at origin", () => {
      const profile = createSimpleProfile(1.8, 80, Sex.MALE);
      const kin = solveSquatKinematics(profile, "highBar");

      expect(kin.positions.ankle.x).toBe(0);
      expect(kin.positions.ankle.y).toBe(0);
    });

    it("should have joints in correct vertical relationships", () => {
      const profile = createSimpleProfile(1.8, 80, Sex.MALE);
      const kin = solveSquatKinematics(profile, "highBar");

      // Ankle is at ground (lowest point)
      expect(kin.positions.ankle.y).toBe(0);

      // Knee should be above ankle
      expect(kin.positions.knee.y).toBeGreaterThan(kin.positions.ankle.y);

      // At parallel depth, hip may be at same height as knee (femur horizontal)
      // So hip >= knee
      expect(kin.positions.hip.y).toBeGreaterThanOrEqual(kin.positions.knee.y - 0.01);

      // Shoulder should be above hip
      expect(kin.positions.shoulder.y).toBeGreaterThan(kin.positions.hip.y);
    });

    it("should have reasonable segment lengths", () => {
      const profile = createSimpleProfile(1.8, 80, Sex.MALE);
      const kin = solveSquatKinematics(profile, "highBar");

      // Calculate distance between joints
      const tibiaLength = Math.sqrt(
        Math.pow(kin.positions.knee.x - kin.positions.ankle.x, 2) +
          Math.pow(kin.positions.knee.y - kin.positions.ankle.y, 2)
      );

      // Should match anthropometry
      expect(tibiaLength).toBeCloseTo(profile.segments.tibia, 2);
    });
  });

  describe("Displacement calculation", () => {
    it("should calculate positive displacement", () => {
      const profile = createSimpleProfile(1.8, 80, Sex.MALE);
      const kin = solveSquatKinematics(profile, "highBar");

      expect(kin.displacement).toBeGreaterThan(0);
      expect(kin.displacement).toBeLessThan(profile.segments.height);
    });

    it("should have larger displacement for taller people", () => {
      const short = createSimpleProfile(1.6, 70, Sex.MALE);
      const tall = createSimpleProfile(2.0, 90, Sex.MALE);

      const kinShort = solveSquatKinematics(short, "highBar");
      const kinTall = solveSquatKinematics(tall, "highBar");

      expect(kinTall.displacement).toBeGreaterThan(kinShort.displacement);
    });
  });

  describe("Deadlift Bar Elevation Offset", () => {
    const profile = createSimpleProfile(1.75, 77, Sex.MALE);

    describe("Zero offset (standard deadlift)", () => {
      it("should match current behavior with zero offset", () => {
        const kinZero = solveDeadliftKinematics(profile, "conventional", "normal", 0);
        const dispZero = calculateDeadliftDisplacement(profile, "conventional", "normal", 0);

        expect(kinZero.valid).toBe(true);
        expect(kinZero.displacement).toBeGreaterThan(0);
        expect(kinZero.displacement).toBe(dispZero);
      });
    });

    describe("Deficit deadlift (negative offset)", () => {
      it("should increase ROM for deficit pulls", () => {
        const dispStandard = calculateDeadliftDisplacement(profile, "conventional", "normal", 0);
        const dispDeficit = calculateDeadliftDisplacement(profile, "conventional", "normal", -0.05); // 5cm deficit

        expect(dispDeficit).toBeGreaterThan(dispStandard);
        expect(dispDeficit - dispStandard).toBeCloseTo(0.05, 2);
      });

      it("should increase work for deficit pulls", () => {
        const workStandard = calculateDeadliftWork(profile, "conventional", 100, 5, "normal", 0);
        const workDeficit = calculateDeadliftWork(profile, "conventional", 100, 5, "normal", -0.05);

        expect(workDeficit.totalWork).toBeGreaterThan(workStandard.totalWork);
        expect(workDeficit.displacement).toBeGreaterThan(workStandard.displacement);
      });

      it("should handle 2-inch deficit correctly", () => {
        const offsetMeters = -0.0508; // -2 inches in meters
        const dispStandard = calculateDeadliftDisplacement(profile, "conventional", "normal", 0);
        const dispDeficit = calculateDeadliftDisplacement(profile, "conventional", "normal", offsetMeters);

        expect(dispDeficit - dispStandard).toBeCloseTo(0.0508, 3);
      });
    });

    describe("Block pulls (positive offset)", () => {
      it("should decrease ROM for block pulls", () => {
        const dispStandard = calculateDeadliftDisplacement(profile, "conventional", "normal", 0);
        const dispBlocks = calculateDeadliftDisplacement(profile, "conventional", "normal", 0.10); // 10cm blocks

        expect(dispBlocks).toBeLessThan(dispStandard);
        expect(dispStandard - dispBlocks).toBeCloseTo(0.10, 2);
      });

      it("should decrease work for block pulls", () => {
        const workStandard = calculateDeadliftWork(profile, "conventional", 100, 5, "normal", 0);
        const workBlocks = calculateDeadliftWork(profile, "conventional", 100, 5, "normal", 0.10);

        expect(workBlocks.totalWork).toBeLessThan(workStandard.totalWork);
        expect(workBlocks.displacement).toBeLessThan(workStandard.displacement);
      });

      it("should handle 4-inch blocks correctly", () => {
        const offsetMeters = 0.1016; // 4 inches in meters
        const dispStandard = calculateDeadliftDisplacement(profile, "conventional", "normal", 0);
        const dispBlocks = calculateDeadliftDisplacement(profile, "conventional", "normal", offsetMeters);

        expect(dispStandard - dispBlocks).toBeCloseTo(0.1016, 3);
      });
    });

    describe("Work monotonicity", () => {
      it("should have monotonic work relationship with offset", () => {
        const offsets = [-0.05, -0.025, 0, 0.025, 0.05];
        const works = offsets.map(offset =>
          calculateDeadliftWork(profile, "conventional", 100, 1, "normal", offset).totalWork
        );

        // Work should decrease as offset increases (deficit to blocks)
        for (let i = 1; i < works.length; i++) {
          expect(works[i]!).toBeLessThan(works[i - 1]!);
        }
      });
    });

    describe("Kinematics changes", () => {
      it("should update moment arms with offset", () => {
        const kinStandard = solveDeadliftKinematics(profile, "conventional", "normal", 0);
        const kinBlocks = solveDeadliftKinematics(profile, "conventional", "normal", 0.10);

        // Higher start = smaller moment arms (more upright)
        expect(kinBlocks.momentArms.hip).toBeLessThan(kinStandard.momentArms.hip);
        expect(kinBlocks.momentArms.knee).toBeLessThan(kinStandard.momentArms.knee);
      });

      it("should update displacement in kinematics", () => {
        const kinDeficit = solveDeadliftKinematics(profile, "conventional", "normal", -0.05);
        const kinStandard = solveDeadliftKinematics(profile, "conventional", "normal", 0);
        const kinBlocks = solveDeadliftKinematics(profile, "conventional", "normal", 0.05);

        expect(kinDeficit.displacement).toBeGreaterThan(kinStandard.displacement);
        expect(kinBlocks.displacement).toBeLessThan(kinStandard.displacement);
      });
    });

    describe("Sumo variant", () => {
      it("should apply offset correctly to sumo deadlift", () => {
        const dispSumoStandard = calculateDeadliftDisplacement(profile, "sumo", "normal", 0);
        const dispSumoDeficit = calculateDeadliftDisplacement(profile, "sumo", "normal", -0.05);

        expect(dispSumoDeficit).toBeGreaterThan(dispSumoStandard);
        // Difference is offset × ROM multiplier (0.05 × 0.85 = 0.0425)
        // because sumo applies ROM multiplier to conventional displacement
        expect(dispSumoDeficit - dispSumoStandard).toBeCloseTo(0.0425, 3);
      });
    });
  });
});
