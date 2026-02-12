import { describe, it, expect } from "vitest";
import { compareLifts, compareCrossLift } from "../comparison";
import { createSimpleProfile } from "../anthropometry";
import { calculateSquatWork } from "../physics";
import { LiftFamily, Sex } from "@/types";

describe("Comparison Engine", () => {
  describe("Identity test", () => {
    it("should have ratio 1.0 when comparing same lifter to themselves", () => {
      const lifterA = {
        anthropometry: createSimpleProfile(1.8, 80, Sex.MALE),
        name: "Lifter A",
      };

      const result = compareLifts(
        lifterA,
        lifterA,
        LiftFamily.SQUAT,
        "highBar",
        "highBar",
        { load: 100, reps: 5 }
      );

      // Demand ratio should be 1.0 (or very close)
      expect(result.comparison.demandRatio).toBeCloseTo(1.0, 3);

      // Work ratio should be 1.0
      expect(result.comparison.workRatio).toBeCloseTo(1.0, 3);

      // Displacement ratio should be 1.0
      expect(result.comparison.displacementRatio).toBeCloseTo(1.0, 3);

      // Equivalent load should be same as input
      expect(result.lifterB.equivalentLoad).toBeCloseTo(100, 1);

      // Advantage should be neutral
      expect(result.comparison.advantageDirection).toBe("neutral");
    });

    it("should have identical metrics for both lifters", () => {
      const lifterA = {
        anthropometry: createSimpleProfile(1.75, 75, Sex.MALE),
        name: "Same Person",
      };

      const result = compareLifts(
        lifterA,
        lifterA,
        LiftFamily.SQUAT,
        "highBar",
        "highBar",
        { load: 100, reps: 5 }
      );

      // Metrics should be identical
      expect(result.lifterA.metrics.workPerRep).toBeCloseTo(
        result.lifterB.metrics?.workPerRep || 0,
        2
      );
      expect(result.lifterA.metrics.displacement).toBeCloseTo(
        result.lifterB.metrics?.displacement || 0,
        4
      );
      expect(result.lifterA.metrics.demandFactor).toBeCloseTo(
        result.lifterB.metrics?.demandFactor || 0,
        4
      );
    });
  });

  describe("Taller lifter does more work", () => {
    it("should show taller lifter does more work per rep for squat", () => {
      const shortLifter = {
        anthropometry: createSimpleProfile(1.7, 70, Sex.MALE),
        name: "Short",
      };
      const tallLifter = {
        anthropometry: createSimpleProfile(1.9, 90, Sex.MALE),
        name: "Tall",
      };

      const result = compareLifts(
        shortLifter,
        tallLifter,
        LiftFamily.SQUAT,
        "highBar",
        "highBar",
        { load: 100, reps: 5 }
      );

      // Tall lifter should do more work
      expect(result.lifterB.metrics?.workPerRep).toBeGreaterThan(
        result.lifterA.metrics.workPerRep
      );

      // Work ratio should be > 1
      expect(result.comparison.workRatio).toBeGreaterThan(1.0);

      // Displacement should be greater
      expect(result.lifterB.metrics?.displacement).toBeGreaterThan(
        result.lifterA.metrics.displacement
      );
    });

    it("should show taller lifter does more work for deadlift", () => {
      const shortLifter = {
        anthropometry: createSimpleProfile(1.6, 65, Sex.MALE),
        name: "Short",
      };
      const tallLifter = {
        anthropometry: createSimpleProfile(2.0, 95, Sex.MALE),
        name: "Tall",
      };

      const result = compareLifts(
        shortLifter,
        tallLifter,
        LiftFamily.DEADLIFT,
        "conventional",
        "conventional",
        { load: 100, reps: 1 }
      );

      // Tall lifter should do more work
      expect(result.lifterB.metrics?.workPerRep).toBeGreaterThan(
        result.lifterA.metrics.workPerRep
      );
    });
  });

  describe("Equivalent load scaling", () => {
    it("should scale equivalent load correctly", () => {
      const lifterA = {
        anthropometry: createSimpleProfile(1.7, 70, Sex.MALE),
        name: "Short",
      };
      const lifterB = {
        anthropometry: createSimpleProfile(1.9, 90, Sex.MALE),
        name: "Tall",
      };

      const result = compareLifts(
        lifterA,
        lifterB,
        LiftFamily.SQUAT,
        "highBar",
        "highBar",
        { load: 100, reps: 5 }
      );

      // If demand ratio is > 1, equivalent load should be < 100
      if (result.comparison.demandRatio > 1.0) {
        expect(result.lifterB.equivalentLoad).toBeLessThan(100);
      } else if (result.comparison.demandRatio < 1.0) {
        expect(result.lifterB.equivalentLoad).toBeGreaterThan(100);
      }

      // Equivalent load should scale by demand ratio AND body mass ratio
      // Calculate bodyweight work for each lifter to get body mass scaling
      const metricsA_bw = calculateSquatWork(
        lifterA.anthropometry,
        "highBar",
        0,
        1
      );
      const metricsB_bw = calculateSquatWork(
        lifterB.anthropometry,
        "highBar",
        0,
        1
      );
      const bodyMassRatio = metricsA_bw.workPerRep / metricsB_bw.workPerRep;

      const expectedEquivalent =
        100 *
        (result.lifterA.metrics.demandFactor /
          (result.lifterB.metrics?.demandFactor || 1)) *
        bodyMassRatio;
      expect(result.lifterB.equivalentLoad).toBeCloseTo(expectedEquivalent, 1);
    });

    it("should calculate equivalent reps correctly", () => {
      const lifterA = {
        anthropometry: createSimpleProfile(1.7, 70, Sex.MALE),
        name: "Short",
      };
      const lifterB = {
        anthropometry: createSimpleProfile(1.9, 90, Sex.MALE),
        name: "Tall",
      };

      const result = compareLifts(
        lifterA,
        lifterB,
        LiftFamily.SQUAT,
        "highBar",
        "highBar",
        { load: 100, reps: 5 }
      );

      // Equivalent reps should be based on total work
      const expectedReps = Math.ceil(
        result.lifterA.metrics.totalWork /
          (result.lifterB.metrics?.workPerRep || 1)
      );
      expect(result.lifterB.equivalentReps).toBe(expectedReps);
    });
  });

  describe("Explanations", () => {
    it("should generate explanations for significant differences", () => {
      const shortLifter = {
        anthropometry: createSimpleProfile(1.6, 65, Sex.MALE),
        name: "Short",
      };
      const tallLifter = {
        anthropometry: createSimpleProfile(2.0, 95, Sex.MALE),
        name: "Tall",
      };

      const result = compareLifts(
        shortLifter,
        tallLifter,
        LiftFamily.SQUAT,
        "highBar",
        "highBar",
        { load: 100, reps: 5 }
      );

      // Should have explanations
      expect(result.explanations.length).toBeGreaterThan(0);

      // Should have a summary
      const hasSummary = result.explanations.some((e) => e.type === "summary");
      expect(hasSummary).toBe(true);
    });

    it("should indicate advantage direction in explanations", () => {
      const lifterA = {
        anthropometry: createSimpleProfile(1.7, 70, Sex.MALE),
        name: "Lifter A",
      };
      const lifterB = {
        anthropometry: createSimpleProfile(1.9, 90, Sex.MALE),
        name: "Lifter B",
      };

      const result = compareLifts(
        lifterA,
        lifterB,
        LiftFamily.SQUAT,
        "highBar",
        "highBar",
        { load: 100, reps: 5 }
      );

      // Each explanation should have an impact
      result.explanations.forEach((exp) => {
        expect(["advantage_A", "advantage_B", "neutral"]).toContain(exp.impact);
      });
    });
  });

  describe("compareCrossLift", () => {
    it("should calculate conversion factor for different variants", () => {
      const anthropometry = createSimpleProfile(1.8, 80, Sex.MALE);

      const crossLift = compareCrossLift(
        anthropometry,
        LiftFamily.SQUAT,
        "highBar",
        "lowBar",
        100
      );

      // Conversion factor should be reasonable (0.8 - 1.2)
      expect(crossLift.conversionFactor).toBeGreaterThan(0.8);
      expect(crossLift.conversionFactor).toBeLessThan(1.2);

      // Equivalent load should be close to original
      expect(Math.abs(crossLift.equivalentLoad - 100)).toBeLessThan(20);
    });

    it("should show sumo deadlift is easier than conventional", () => {
      const anthropometry = createSimpleProfile(1.8, 80, Sex.MALE);

      const crossLift = compareCrossLift(
        anthropometry,
        LiftFamily.DEADLIFT,
        "conventional",
        "sumo",
        100
      );

      // Sumo should require more weight to match conventional demand
      // (because sumo has less ROM, it's easier)
      expect(crossLift.equivalentLoad).toBeGreaterThan(100);
    });
  });

  describe("Different lift families", () => {
    it("should handle bench press comparisons", () => {
      const lifterA = {
        anthropometry: createSimpleProfile(1.7, 70, Sex.MALE),
        name: "Short",
      };
      const lifterB = {
        anthropometry: createSimpleProfile(1.9, 90, Sex.MALE),
        name: "Tall",
      };

      const result = compareLifts(
        lifterA,
        lifterB,
        LiftFamily.BENCH,
        "medium-moderate",
        "medium-moderate",
        { load: 100, reps: 5 }
      );

      expect(result.lifterA.metrics.workPerRep).toBeGreaterThan(0);
      expect(result.lifterB.metrics?.workPerRep).toBeGreaterThan(0);
      expect(result.comparison.demandRatio).toBeGreaterThan(0);
    });

    it("should handle pullup comparisons", () => {
      const lifterA = {
        anthropometry: createSimpleProfile(1.7, 70, Sex.MALE),
        name: "Short",
      };
      const lifterB = {
        anthropometry: createSimpleProfile(1.9, 90, Sex.MALE),
        name: "Tall",
      };

      const result = compareLifts(
        lifterA,
        lifterB,
        LiftFamily.PULLUP,
        "pronated",
        "pronated",
        { load: 0, reps: 10 }
      );

      expect(result.lifterA.metrics.workPerRep).toBeGreaterThan(0);
      expect(result.lifterB.metrics?.workPerRep).toBeGreaterThan(0);

      // Should include VPI
      expect(result.lifterA.metrics.vpi).toBeDefined();
    });
  });

  describe("Advantage calculations", () => {
    it("should calculate advantage percentage correctly", () => {
      const lifterA = {
        anthropometry: createSimpleProfile(1.7, 70, Sex.MALE),
        name: "Short",
      };
      const lifterB = {
        anthropometry: createSimpleProfile(1.9, 90, Sex.MALE),
        name: "Tall",
      };

      const result = compareLifts(
        lifterA,
        lifterB,
        LiftFamily.SQUAT,
        "highBar",
        "highBar",
        { load: 100, reps: 5 }
      );

      // Advantage percentage should match demand ratio
      const expectedAdvantage = (result.comparison.demandRatio - 1) * 100;
      expect(result.comparison.advantagePercentage).toBeCloseTo(
        expectedAdvantage,
        2
      );
    });

    it("should set correct advantage direction", () => {
      const lifterA = {
        anthropometry: createSimpleProfile(1.6, 65, Sex.MALE),
        name: "Short",
      };
      const lifterB = {
        anthropometry: createSimpleProfile(2.0, 95, Sex.MALE),
        name: "Tall",
      };

      const result = compareLifts(
        lifterA,
        lifterB,
        LiftFamily.SQUAT,
        "highBar",
        "highBar",
        { load: 100, reps: 5 }
      );

      // Shorter person should have advantage (less demand)
      if (result.comparison.demandRatio > 1.05) {
        expect(result.comparison.advantageDirection).toBe("advantage_A");
      } else if (result.comparison.demandRatio < 0.95) {
        expect(result.comparison.advantageDirection).toBe("advantage_B");
      } else {
        expect(result.comparison.advantageDirection).toBe("neutral");
      }
    });
  });

  describe("Capacity-Adjusted Comparison", () => {
    it("should include capacity adjustment for different squat variants", () => {
      const lifter = {
        anthropometry: createSimpleProfile(1.75, 77, Sex.MALE),
        name: "Test Lifter",
      };

      // Test compares same lifter performing different squat variants
      // Lifter A does highBar (baseline capacity 1.0)
      // Lifter B does lowBar (higher capacity 1.075)
      const result = compareLifts(
        lifter,
        lifter,
        LiftFamily.SQUAT,
        "highBar",
        "lowBar",
        { load: 100, reps: 5 }
      );

      // Should have capacity adjusted data
      expect(result.capacityAdjusted).toBeDefined();
      expect(result.capacityAdjusted?.lifterACapacityFactor).toBe(1.0); // high bar
      expect(result.capacityAdjusted?.lifterBCapacityFactor).toBe(1.075); // low bar
    });

    it("should calculate adjusted loads correctly", () => {
      const lifter = {
        anthropometry: createSimpleProfile(1.75, 77, Sex.MALE),
        name: "Test Lifter",
      };

      const result = compareLifts(
        lifter,
        lifter,
        LiftFamily.SQUAT,
        "highBar",
        "lowBar",
        { load: 100, reps: 5 }
      );

      // Adjusted load = actual load / capacity factor
      expect(result.capacityAdjusted?.adjustedLoadA).toBeCloseTo(100 / 1.0, 2);
      expect(result.capacityAdjusted?.adjustedLoadB).toBeCloseTo(100 / 1.075, 2);
    });

    it("should adjust advantage direction when variants differ", () => {
      const lifter = {
        anthropometry: createSimpleProfile(1.75, 77, Sex.MALE),
        name: "Test Lifter",
      };

      const result = compareLifts(
        lifter,
        lifter,
        LiftFamily.SQUAT,
        "highBar",
        "lowBar",
        { load: 100, reps: 5 }
      );

      // Pure physics comparison should be nearly neutral (same lifter, parallel depth)
      expect(Math.abs(result.comparison.advantagePercentage)).toBeLessThan(2);

      // Capacity-adjusted should favor high bar (lower capacity = harder)
      expect(result.capacityAdjusted).toBeDefined();
      expect(result.capacityAdjusted!.adjustedAdvantagePercentage).toBeGreaterThan(2);
      expect(result.capacityAdjusted!.adjustedAdvantageDirection).toBe("advantage_A");
    });

    it("should NOT include capacity adjustment for same variant", () => {
      const lifter = {
        anthropometry: createSimpleProfile(1.75, 77, Sex.MALE),
        name: "Test Lifter",
      };

      const result = compareLifts(
        lifter,
        lifter,
        LiftFamily.SQUAT,
        "highBar",
        "highBar",
        { load: 100, reps: 5 }
      );

      // Should NOT have capacity adjusted data (same variant)
      expect(result.capacityAdjusted).toBeUndefined();
    });

    it("should NOT include capacity adjustment for non-squat lifts", () => {
      const lifter = {
        anthropometry: createSimpleProfile(1.75, 77, Sex.MALE),
        name: "Test Lifter",
      };

      const result = compareLifts(
        lifter,
        lifter,
        LiftFamily.DEADLIFT,
        "conventional",
        "sumo",
        { load: 100, reps: 5 }
      );

      // Should NOT have capacity adjusted data (not a squat)
      expect(result.capacityAdjusted).toBeUndefined();
    });

    it("should generate capacity adjustment explanation", () => {
      const lifter = {
        anthropometry: createSimpleProfile(1.75, 77, Sex.MALE),
        name: "Test Lifter",
      };

      const result = compareLifts(
        lifter,
        lifter,
        LiftFamily.SQUAT,
        "highBar",
        "lowBar",
        { load: 100, reps: 5 }
      );

      expect(result.capacityAdjusted?.explanation).toBeDefined();
      expect(result.capacityAdjusted!.explanation.length).toBeGreaterThan(0);
      // Verify explanation contains key information about capacity differences
      expect(result.capacityAdjusted!.explanation).toMatch(/squat|capacity|load|difficulty/i);
    });
  });
});
