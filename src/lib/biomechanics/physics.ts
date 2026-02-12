import {
  Anthropometry,
  BenchArchStyle,
  BenchGripWidth,
  DeadliftVariant,
  LiftFamily,
  LiftMetrics,
  PullupGrip,
  Sex,
  SquatStance,
  SquatVariant,
  SumoStance,
} from "../../types";
import {
  ALLOMETRIC_EXPONENT,
  AVERAGE_CHEST_DEPTH,
  BENCH_ARCH_HEIGHTS,
  BENCH_GRIP_ANGLES,
  EFFECTIVE_MASS_FACTORS,
  GRAVITY,
  GRIP_FACTORS,
  MIN_BENCH_DISPLACEMENT,
  STANDARD_PLATE_RADIUS,
  SUMO_ROM_FACTOR,
  SUMO_STANCE_MODIFIERS,
} from "./constants";
import { solveSquatKinematics, toRadians } from "./kinematics";

/**
 * Calculates effective mass for a given lift
 * Different lifts move different proportions of body mass
 *
 * @param load - External load in kg
 * @param bodyMass - Lifter's body mass in kg
 * @param family - Type of lift
 * @param sex - Biological sex (affects mass factors)
 * @returns Effective mass being moved in kg
 */
export function calculateEffectiveMass(
  load: number,
  bodyMass: number,
  family: LiftFamily,
  sex: Sex
): number {
  const factor = EFFECTIVE_MASS_FACTORS[family][sex];

  switch (family) {
    case LiftFamily.SQUAT:
    case LiftFamily.DEADLIFT:
      // Load plus proportion of body mass
      return load + factor * bodyMass;

    case LiftFamily.BENCH:
    case LiftFamily.OHP:
      // Load only (body is supported)
      return load;

    case LiftFamily.PULLUP:
      // Full bodyweight plus added load
      return bodyMass + load;

    case LiftFamily.PUSHUP:
      // Proportion of body mass only
      return factor * bodyMass;

    case LiftFamily.THRUSTER:
      // Load plus proportion of body mass (simplified)
      return load + factor * bodyMass;

    default:
      return load;
  }
}

/**
 * Calculates work metrics for squat
 *
 * @param anthropometry - Lifter's anthropometric profile
 * @param variant - Squat variant (highBar, lowBar, front)
 * @param load - External load in kg
 * @param reps - Number of repetitions
 * @param stance - Stance width (optional, defaults to normal)
 * @returns Complete lift metrics including work, demand, and P4P score
 */
export function calculateSquatWork(
  anthropometry: Anthropometry,
  variant: SquatVariant | "highBar" | "lowBar" | "front",
  load: number,
  reps: number,
  stance: SquatStance | "narrow" | "normal" | "wide" | "ultraWide" = "normal"
): LiftMetrics {
  // Solve kinematics to get displacement and moment arms
  const kinematics = solveSquatKinematics(anthropometry, variant, stance);

  // Calculate effective mass
  const M_eff = calculateEffectiveMass(
    load,
    anthropometry.mass,
    LiftFamily.SQUAT,
    anthropometry.sex
  );

  // Calculate work
  const displacement = kinematics.displacement;
  const workPerRep = GRAVITY * displacement * M_eff;
  const totalWork = workPerRep * reps;

  // Calculate demand factor (moment arm × sqrt(displacement))
  const demandFactor = kinematics.momentArms.hip * Math.sqrt(displacement);

  // Calculate pound-for-pound score
  const scoreP4P = totalWork / Math.pow(anthropometry.mass, ALLOMETRIC_EXPONENT);

  return {
    displacement,
    effectiveMass: M_eff,
    workPerRep,
    totalWork,
    demandFactor,
    scoreP4P,
  };
}

/**
 * Calculates deadlift displacement (ROM)
 *
 * @param anthropometry - Lifter's anthropometric profile
 * @param variant - Deadlift variant (conventional or sumo)
 * @param stance - Stance width for sumo (optional, defaults to normal)
 * @param barStartHeightOffset - Bar elevation offset in meters (default: 0)
 *   - NEGATIVE values = DEFICIT deadlifts (bar starts LOWER than standard floor)
 *     Example: -0.05 = 5cm deficit (standing on platform)
 *   - POSITIVE values = BLOCK PULLS (bar starts HIGHER than standard floor)
 *     Example: +0.10 = 10cm blocks (bar elevated on blocks/rack)
 *   - Zero = standard floor pull (bar at standard plate radius ~0.225m)
 *
 *   Effect on ROM:
 *   - Deficits INCREASE displacement (more work, harder)
 *   - Blocks DECREASE displacement (less work, easier)
 * @returns Displacement in meters
 */
export function calculateDeadliftDisplacement(
  anthropometry: Anthropometry,
  variant: DeadliftVariant | "conventional" | "sumo",
  stance: SumoStance | "hybrid" | "normal" | "wide" | "ultraWide" = "normal",
  barStartHeightOffset: number = 0
): number {
  // Bar start height: standard plate radius (~0.225m) + offset
  //
  // Sign convention (IMPORTANT):
  //   offset < 0 → DEFICIT deadlift (standing on platform, bar LOWER)
  //   offset = 0 → STANDARD floor pull (45lb plate height)
  //   offset > 0 → BLOCK PULL (bar elevated on blocks/rack, HIGHER)
  //
  // Example values:
  //   -0.05 = 5cm deficit (2 inch deficit)
  //   +0.10 = 10cm blocks (4 inch blocks)
  const barStartHeight = STANDARD_PLATE_RADIUS + barStartHeightOffset;

  // Lockout height: acromionHeight - totalArm
  // (bar is at roughly hip level with arms extended)
  const lockoutHeight =
    anthropometry.derived.acromionHeight -
    anthropometry.derived.totalArm;

  // Conventional displacement: from start to lockout
  const conventional = lockoutHeight - barStartHeight;

  if (variant === "sumo") {
    // Sumo has reduced ROM based on stance width
    const stanceModifiers = SUMO_STANCE_MODIFIERS[stance as keyof typeof SUMO_STANCE_MODIFIERS];
    return conventional * stanceModifiers.romMultiplier;
  }

  return conventional;
}

/**
 * Calculates work metrics for deadlift
 *
 * @param anthropometry - Lifter's anthropometric profile
 * @param variant - Deadlift variant (conventional or sumo)
 * @param load - External load in kg
 * @param reps - Number of repetitions
 * @param stance - Stance width for sumo (optional, defaults to normal)
 * @param barStartHeightOffset - Bar elevation offset in meters (default: 0)
 *   - NEGATIVE = deficit (bar lower), POSITIVE = blocks (bar higher)
 *   - See calculateDeadliftDisplacement() for detailed documentation
 * @returns Complete lift metrics
 */
export function calculateDeadliftWork(
  anthropometry: Anthropometry,
  variant: DeadliftVariant | "conventional" | "sumo",
  load: number,
  reps: number,
  stance: SumoStance | "hybrid" | "normal" | "wide" | "ultraWide" = "normal",
  barStartHeightOffset: number = 0
): LiftMetrics {
  const displacement = calculateDeadliftDisplacement(
    anthropometry,
    variant,
    stance,
    barStartHeightOffset
  );

  const M_eff = calculateEffectiveMass(
    load,
    anthropometry.mass,
    LiftFamily.DEADLIFT,
    anthropometry.sex
  );

  const workPerRep = GRAVITY * displacement * M_eff;
  const totalWork = workPerRep * reps;

  // For deadlift, demand factor is simply displacement
  const demandFactor = displacement;

  const scoreP4P = totalWork / Math.pow(anthropometry.mass, ALLOMETRIC_EXPONENT);

  return {
    displacement,
    effectiveMass: M_eff,
    workPerRep,
    totalWork,
    demandFactor,
    scoreP4P,
  };
}

/**
 * Calculates bench press displacement (ROM)
 *
 * @param anthropometry - Lifter's anthropometric profile
 * @param gripWidth - Grip width (narrow, medium, wide)
 * @param archStyle - Arch style (flat, moderate, competitive, extreme)
 * @returns Displacement in meters
 */
export function calculateBenchDisplacement(
  anthropometry: Anthropometry,
  gripWidth: BenchGripWidth,
  archStyle: BenchArchStyle
): number {
  // Get grip angle
  const gripAngle = BENCH_GRIP_ANGLES[gripWidth];
  const gripAngleRad = toRadians(gripAngle);

  // Get arch height
  const archHeight = BENCH_ARCH_HEIGHTS[archStyle];

  // Calculate displacement
  // (upperArm + forearm) × cos(gripAngle) - chestDepth - archHeight
  // Note: Hand length is NOT included per spec correction #8
  const L_press = anthropometry.segments.upperArm + anthropometry.segments.forearm;
  const pressLength = L_press * Math.cos(gripAngleRad);
  let displacement = pressLength - AVERAGE_CHEST_DEPTH - archHeight;

  // Clamp to minimum displacement
  displacement = Math.max(displacement, MIN_BENCH_DISPLACEMENT);

  return displacement;
}

/**
 * Calculates work metrics for bench press
 *
 * @param anthropometry - Lifter's anthropometric profile
 * @param gripWidth - Grip width
 * @param archStyle - Arch style
 * @param load - External load in kg
 * @param reps - Number of repetitions
 * @returns Complete lift metrics
 */
export function calculateBenchWork(
  anthropometry: Anthropometry,
  gripWidth: BenchGripWidth,
  archStyle: BenchArchStyle,
  load: number,
  reps: number
): LiftMetrics {
  const displacement = calculateBenchDisplacement(anthropometry, gripWidth, archStyle);

  const M_eff = calculateEffectiveMass(
    load,
    anthropometry.mass,
    LiftFamily.BENCH,
    anthropometry.sex
  );

  const workPerRep = GRAVITY * displacement * M_eff;
  const totalWork = workPerRep * reps;

  // For bench, demand factor is displacement
  const demandFactor = displacement;

  const scoreP4P = totalWork / Math.pow(anthropometry.mass, ALLOMETRIC_EXPONENT);

  return {
    displacement,
    effectiveMass: M_eff,
    workPerRep,
    totalWork,
    demandFactor,
    scoreP4P,
  };
}

/**
 * Calculates pullup displacement (ROM)
 *
 * @param anthropometry - Lifter's anthropometric profile
 * @returns Displacement in meters
 */
export function calculatePullupDisplacement(anthropometry: Anthropometry): number {
  // Total arm length × 0.95 (not quite full arm extension)
  return anthropometry.derived.totalArm * 0.95;
}

/**
 * Calculates work metrics for pullups
 * Includes VPI (Volume Performance Index) calculation
 *
 * @param anthropometry - Lifter's anthropometric profile
 * @param grip - Grip type (supinated, neutral, pronated)
 * @param addedLoad - Added load in kg (e.g., weight belt)
 * @param reps - Number of repetitions
 * @returns Complete lift metrics including VPI
 */
export function calculatePullupWork(
  anthropometry: Anthropometry,
  grip: PullupGrip,
  addedLoad: number,
  reps: number
): LiftMetrics {
  const displacement = calculatePullupDisplacement(anthropometry);

  const M_eff = calculateEffectiveMass(
    addedLoad,
    anthropometry.mass,
    LiftFamily.PULLUP,
    anthropometry.sex
  );

  const workPerRep = GRAVITY * displacement * M_eff;
  const totalWork = workPerRep * reps;

  // Apply grip difficulty factor
  const gripFactor = GRIP_FACTORS[grip];
  const demandFactor = displacement * gripFactor;

  const scoreP4P = totalWork / Math.pow(anthropometry.mass, ALLOMETRIC_EXPONENT);

  // Calculate VPI (Volume Performance Index)
  // VPI = (M_body + M_added) × G_f / M_body^0.67
  const vpi =
    ((anthropometry.mass + addedLoad) * gripFactor) /
    Math.pow(anthropometry.mass, ALLOMETRIC_EXPONENT);

  return {
    displacement,
    effectiveMass: M_eff,
    workPerRep,
    totalWork,
    demandFactor,
    scoreP4P,
    vpi,
  };
}

/**
 * Calculates work metrics for pushups
 *
 * @param anthropometry - Lifter's anthropometric profile
 * @param reps - Number of repetitions
 * @param addedWeight - Optional added weight in kg (placed over middle back)
 * @returns Complete lift metrics
 */
export function calculatePushupWork(
  anthropometry: Anthropometry,
  reps: number,
  addedWeight: number = 0
): LiftMetrics {
  // Displacement is upperArm + forearm
  const displacement = anthropometry.segments.upperArm + anthropometry.segments.forearm;

  const M_eff = calculateEffectiveMass(
    addedWeight, // added weight acts as external load
    anthropometry.mass,
    LiftFamily.PUSHUP,
    anthropometry.sex
  );

  const workPerRep = GRAVITY * displacement * M_eff;
  const totalWork = workPerRep * reps;

  const demandFactor = displacement;

  const scoreP4P = totalWork / Math.pow(anthropometry.mass, ALLOMETRIC_EXPONENT);

  return {
    displacement,
    effectiveMass: M_eff,
    workPerRep,
    totalWork,
    demandFactor,
    scoreP4P,
  };
}

/**
 * Calculates OHP (Overhead Press) displacement (ROM)
 *
 * @param anthropometry - Lifter's anthropometric profile
 * @returns Displacement in meters
 */
export function calculateOHPDisplacement(anthropometry: Anthropometry): number {
  // (upperArm + forearm) × 0.95
  return (anthropometry.segments.upperArm + anthropometry.segments.forearm) * 0.95;
}

/**
 * Calculates work metrics for OHP (Overhead Press)
 *
 * @param anthropometry - Lifter's anthropometric profile
 * @param load - External load in kg
 * @param reps - Number of repetitions
 * @returns Complete lift metrics
 */
export function calculateOHPWork(
  anthropometry: Anthropometry,
  load: number,
  reps: number
): LiftMetrics {
  const displacement = calculateOHPDisplacement(anthropometry);

  const M_eff = calculateEffectiveMass(
    load,
    anthropometry.mass,
    LiftFamily.OHP,
    anthropometry.sex
  );

  const workPerRep = GRAVITY * displacement * M_eff;
  const totalWork = workPerRep * reps;

  const demandFactor = displacement;

  const scoreP4P = totalWork / Math.pow(anthropometry.mass, ALLOMETRIC_EXPONENT);

  return {
    displacement,
    effectiveMass: M_eff,
    workPerRep,
    totalWork,
    demandFactor,
    scoreP4P,
  };
}

/**
 * Calculates work metrics for thrusters (front squat + OHP combined)
 *
 * @param anthropometry - Lifter's anthropometric profile
 * @param load - External load in kg
 * @param reps - Number of repetitions
 * @returns Complete lift metrics
 */
export function calculateThrusterWork(
  anthropometry: Anthropometry,
  load: number,
  reps: number
): LiftMetrics {
  // Get squat displacement (using front squat)
  const squatKinematics = solveSquatKinematics(anthropometry, "front");
  const squatDisplacement = squatKinematics.displacement;

  // Get OHP displacement
  const ohpDisplacement = calculateOHPDisplacement(anthropometry);

  // Total displacement
  const displacement = squatDisplacement + ohpDisplacement;

  // Effective mass (simplified approximation)
  const M_eff = calculateEffectiveMass(
    load,
    anthropometry.mass,
    LiftFamily.THRUSTER,
    anthropometry.sex
  );

  const workPerRep = GRAVITY * displacement * M_eff;
  const totalWork = workPerRep * reps;

  // Demand factor combines both movements
  const demandFactor = displacement;

  const scoreP4P = totalWork / Math.pow(anthropometry.mass, ALLOMETRIC_EXPONENT);

  return {
    displacement,
    effectiveMass: M_eff,
    workPerRep,
    totalWork,
    demandFactor,
    scoreP4P,
  };
}
