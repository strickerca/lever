import {
  Anthropometry,
  BenchArchStyle,
  BenchGripWidth,
  ComparisonResult,
  DeadliftVariant,
  LiftFamily,
  LiftMetrics,
  PullupGrip,
  SquatVariant,
} from "../../types";
import { solveSquatKinematics } from "./kinematics";
import {
  calculateBenchWork,
  calculateDeadliftWork,
  calculateOHPWork,
  calculatePullupWork,
  calculatePushupWork,
  calculateSquatWork,
  calculateThrusterWork,
} from "./physics";

/**
 * Calculates lift metrics based on lift family and variant
 */
function calculateLiftMetrics(
  anthropometry: Anthropometry,
  liftFamily: LiftFamily,
  variant: string,
  load: number,
  reps: number
): LiftMetrics {
  switch (liftFamily) {
    case LiftFamily.SQUAT:
      return calculateSquatWork(
        anthropometry,
        variant as SquatVariant | "highBar" | "lowBar" | "front",
        load,
        reps
      );

    case LiftFamily.DEADLIFT:
      return calculateDeadliftWork(
        anthropometry,
        variant as DeadliftVariant | "conventional" | "sumo",
        load,
        reps
      );

    case LiftFamily.BENCH:
      // Parse bench variant (e.g., "medium-moderate")
      const [gripWidth, archStyle] = variant.split("-");
      return calculateBenchWork(
        anthropometry,
        gripWidth as BenchGripWidth,
        archStyle as BenchArchStyle,
        load,
        reps
      );

    case LiftFamily.PULLUP:
      return calculatePullupWork(
        anthropometry,
        variant as PullupGrip,
        load,
        reps
      );

    case LiftFamily.PUSHUP:
      return calculatePushupWork(anthropometry, reps);

    case LiftFamily.OHP:
      return calculateOHPWork(anthropometry, load, reps);

    case LiftFamily.THRUSTER:
      return calculateThrusterWork(anthropometry, load, reps);

    default:
      throw new Error(`Unsupported lift family: ${liftFamily}`);
  }
}

/**
 * Compares two lifters performing the same lift family
 *
 * @param lifterA - First lifter with their performance
 * @param lifterB - Second lifter to compare against
 * @param liftFamily - Type of lift being performed
 * @param variantA - Variant for lifter A
 * @param variantB - Variant for lifter B
 * @param performanceA - Lifter A's load and reps
 * @returns Complete comparison result with equivalent loads and explanations
 */
export function compareLifts(
  lifterA: { anthropometry: Anthropometry; name?: string },
  lifterB: { anthropometry: Anthropometry; name?: string },
  liftFamily: LiftFamily,
  variantA: string,
  variantB: string,
  performanceA: { load: number; reps: number }
): ComparisonResult {
  // Step 1: Compute metrics for Lifter A
  const metricsA = calculateLiftMetrics(
    lifterA.anthropometry,
    liftFamily,
    variantA,
    performanceA.load,
    performanceA.reps
  );

  // Step 2: Compute metrics for Lifter B (with load=0 initially to get base metrics)
  const metricsB_base = calculateLiftMetrics(
    lifterB.anthropometry,
    liftFamily,
    variantB,
    0,
    1
  );

  // Step 3: Calculate demand factors
  const demandA = metricsA.demandFactor;
  const demandB = metricsB_base.demandFactor;

  // Step 4: Solve for equivalent load
  // Load_B = Load_A × (demandA / demandB)
  const equivalentLoad = performanceA.load * (demandA / demandB);

  // Calculate full metrics for Lifter B with equivalent load
  const metricsB = calculateLiftMetrics(
    lifterB.anthropometry,
    liftFamily,
    variantB,
    equivalentLoad,
    1
  );

  // Step 5: Solve for equivalent reps
  // Reps needed for Lifter B to match Lifter A's total work
  const equivalentReps = Math.ceil(metricsA.totalWork / metricsB.workPerRep);

  // Step 6: Generate comparison ratios
  const workRatio = metricsB.workPerRep / metricsA.workPerRep;
  const demandRatio = demandB / demandA;
  const displacementRatio = metricsB.displacement / metricsA.displacement;
  const advantagePercentage = (demandRatio - 1) * 100;

  let advantageDirection: "advantage_A" | "advantage_B" | "neutral";
  if (Math.abs(advantagePercentage) < 1) {
    advantageDirection = "neutral";
  } else if (demandRatio < 1) {
    advantageDirection = "advantage_B"; // B has lower demand = advantage
  } else {
    advantageDirection = "advantage_A"; // A has lower demand = advantage
  }

  // Generate explanations
  const explanations = generateExplanations(
    lifterA.anthropometry,
    lifterB.anthropometry,
    liftFamily,
    variantA,
    variantB,
    {
      displacementRatio,
      demandRatio,
      advantagePercentage,
      metricsA,
      metricsB_base,
    }
  );

  return {
    lifterA: {
      name: lifterA.name ?? "Lifter A",
      anthropometry: lifterA.anthropometry,
      metrics: metricsA,
      kinematics:
        liftFamily === LiftFamily.SQUAT
          ? solveSquatKinematics(
              lifterA.anthropometry,
              variantA as SquatVariant | "highBar" | "lowBar" | "front"
            )
          : undefined,
    },
    lifterB: {
      name: lifterB.name ?? "Lifter B",
      anthropometry: lifterB.anthropometry,
      metrics: metricsB,
      kinematics:
        liftFamily === LiftFamily.SQUAT
          ? solveSquatKinematics(
              lifterB.anthropometry,
              variantB as SquatVariant | "highBar" | "lowBar" | "front"
            )
          : undefined,
      equivalentLoad,
      equivalentReps,
    },
    comparison: {
      workRatio,
      demandRatio,
      displacementRatio,
      advantagePercentage,
      advantageDirection,
    },
    explanations,
  };
}

/**
 * Generates human-readable explanations for the comparison
 */
function generateExplanations(
  anthroA: Anthropometry,
  anthroB: Anthropometry,
  liftFamily: LiftFamily,
  variantA: string,
  variantB: string,
  comparison: {
    displacementRatio: number;
    demandRatio: number;
    advantagePercentage: number;
    metricsA: LiftMetrics;
    metricsB_base: LiftMetrics;
  }
): Array<{ type: string; impact: "advantage_A" | "advantage_B" | "neutral"; message: string }> {
  const explanations: Array<{
    type: string;
    impact: "advantage_A" | "advantage_B" | "neutral";
    message: string;
  }> = [];

  // Displacement comparison
  const displacementDiff = Math.abs(comparison.displacementRatio - 1) * 100;
  if (displacementDiff > 2) {
    const longerName =
      comparison.displacementRatio > 1 ? anthroB.sex : anthroA.sex;
    const longerLifter = comparison.displacementRatio > 1 ? "B" : "A";
    const shorterLifter = comparison.displacementRatio > 1 ? "A" : "B";
    const impact =
      comparison.displacementRatio > 1 ? "advantage_A" : "advantage_B";

    const distanceCm = Math.abs((comparison.metricsB_base.displacement - comparison.metricsA.displacement) * 100);

    explanations.push({
      type: "displacement",
      impact,
      message: `Lifter ${longerLifter} moves the bar ${displacementDiff.toFixed(1)}% further (${distanceCm.toFixed(1)}cm more ROM). This means Lifter ${longerLifter} does more work per rep and may need greater mobility, while Lifter ${shorterLifter} can lift more weight with less fatigue per rep.`,
    });
  }

  // Squat-specific: moment arm comparison
  if (liftFamily === LiftFamily.SQUAT) {
    const kinA = solveSquatKinematics(
      anthroA,
      variantA as SquatVariant | "highBar" | "lowBar" | "front"
    );
    const kinB = solveSquatKinematics(
      anthroB,
      variantB as SquatVariant | "highBar" | "lowBar" | "front"
    );

    const momentArmRatio = kinB.momentArms.hip / kinA.momentArms.hip;
    const momentArmDiff = Math.abs(momentArmRatio - 1) * 100;

    if (momentArmDiff > 2) {
      const largerLifter = momentArmRatio > 1 ? "B" : "A";
      const smallerLifter = momentArmRatio > 1 ? "A" : "B";
      const impact = momentArmRatio > 1 ? "advantage_A" : "advantage_B";

      explanations.push({
        type: "moment_arm",
        impact,
        message: `Lifter ${largerLifter} has ${momentArmDiff.toFixed(1)}% larger hip moment arm, making the lift biomechanically harder. This means Lifter ${largerLifter} needs stronger hip extensors and posterior chain muscles to handle the same weight, while Lifter ${smallerLifter} has better leverage and can potentially lift more.`,
      });
    }

    // Trunk angle comparison
    const trunkAngleDiff = Math.abs(kinB.angles.trunk - kinA.angles.trunk);
    if (trunkAngleDiff > 3) {
      const moreUpright = kinB.angles.trunk > kinA.angles.trunk ? "B" : "A";
      const lessUpright = kinB.angles.trunk > kinA.angles.trunk ? "A" : "B";
      explanations.push({
        type: "trunk_angle",
        impact: "neutral",
        message: `Lifter ${moreUpright} squats ${trunkAngleDiff.toFixed(0)}° more upright, which typically means more quad emphasis and less posterior chain demand. Lifter ${lessUpright}'s more horizontal trunk shifts load toward the glutes, hamstrings, and lower back. Neither position is inherently better - it depends on individual strengths.`,
      });
    }
  }

  // Deadlift-specific: arm length comparison
  if (liftFamily === LiftFamily.DEADLIFT) {
    const armLengthA = anthroA.derived.totalArm;
    const armLengthB = anthroB.derived.totalArm;
    const armLengthDiff = Math.abs(armLengthB - armLengthA) * 100; // in cm

    if (armLengthDiff > 2) {
      const longerArms = armLengthB > armLengthA ? "B" : "A";
      const shorterArms = armLengthB > armLengthA ? "A" : "B";
      const impact = armLengthB > armLengthA ? "advantage_B" : "advantage_A";

      explanations.push({
        type: "arm_length",
        impact,
        message: `Lifter ${longerArms} has ${armLengthDiff.toFixed(1)}cm longer arms, which reduces how far the bar must travel. This is a significant advantage in deadlifts - longer arms mean a higher starting position and less total distance to pull. Lifter ${shorterArms} must pull through greater ROM and may benefit from sumo stance or building more strength.`,
      });
    }
  }

  // Overall summary
  if (Math.abs(comparison.advantagePercentage) > 1) {
    const advantagedLifter =
      comparison.demandRatio < 1 ? "B" : "A";
    const disadvantagedLifter =
      comparison.demandRatio < 1 ? "A" : "B";
    const impact =
      comparison.demandRatio < 1 ? "advantage_B" : "advantage_A";

    const advantageLevel = Math.abs(comparison.advantagePercentage);
    let interpretation = "";
    if (advantageLevel > 15) {
      interpretation = "This is a substantial difference that will significantly affect relative performance.";
    } else if (advantageLevel > 8) {
      interpretation = "This is a notable difference that explains much of the performance gap.";
    } else {
      interpretation = "This is a modest difference that may be less important than training and technique.";
    }

    explanations.push({
      type: "summary",
      impact,
      message: `Bottom line: Lifter ${advantagedLifter} has ${Math.abs(comparison.advantagePercentage).toFixed(1)}% mechanical advantage due to better biomechanical positioning. ${interpretation} When comparing performances, Lifter ${disadvantagedLifter} should consider using the equivalent load calculations above for a fair comparison.`,
    });
  } else {
    explanations.push({
      type: "summary",
      impact: "neutral",
      message: "Both lifters have nearly identical mechanical demands. Any performance differences are likely due to strength levels, training, and technique rather than biomechanics. This makes for a very fair direct comparison.",
    });
  }

  return explanations;
}

/**
 * Compares different variants of the same lift for a single lifter
 * E.g., comparing high bar vs low bar squat
 *
 * @param anthropometry - The lifter's anthropometric profile
 * @param liftFamily - Type of lift
 * @param variantA - First variant
 * @param variantB - Second variant
 * @param load - Load to compare at (same for both variants)
 * @returns Conversion factor and equivalent load
 */
export function compareCrossLift(
  anthropometry: Anthropometry,
  liftFamily: LiftFamily,
  variantA: string,
  variantB: string,
  load: number
): { conversionFactor: number; equivalentLoad: number } {
  // Calculate metrics for both variants
  const metricsA = calculateLiftMetrics(anthropometry, liftFamily, variantA, load, 1);
  const metricsB = calculateLiftMetrics(anthropometry, liftFamily, variantB, 0, 1);

  // Calculate conversion factor based on demand
  const conversionFactor = metricsA.demandFactor / metricsB.demandFactor;
  const equivalentLoad = load * conversionFactor;

  return {
    conversionFactor,
    equivalentLoad,
  };
}
