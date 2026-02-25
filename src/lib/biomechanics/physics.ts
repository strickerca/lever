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
  MIN_BENCH_DISPLACEMENT,
  STANDARD_PLATE_RADIUS,
  SUMO_STANCE_MODIFIERS,
  BASE_DEMAND_FACTORS,
} from "./constants";
import {
  solveSquatKinematics,
  solveDeadliftKinematics,
  solveBenchKinematics,
  solvePullupKinematics,
  solvePushupKinematics,
  solveOHPKinematics,
  toRadians
} from "./kinematics";

// Metabolic Constants
const KCAL_PER_JOULE = 1 / 4184;

/**
 * Calculates External Work (Joules)
 * W = Force * Displacement
 * F = m * g
 */
export function calculateExternalWork(
  effectiveMass: number,
  displacement: number
): number {
  return effectiveMass * GRAVITY * displacement;
}

/**
 * Calculates Internal Work (Joules) based on Segmental Kinetic Energy
 * W_internal = Sum(0.5 * m_segment * v_segment^2)
 *
 * This accounts for the energy required to accelerate/decelerate body mass,
 * which dominates metabolic cost at higher velocities.
 *
 * @param anthropometry - Lifter's profile
 * @param liftFamily - Type of lift
 * @param reps - Number of reps
 * @param timePerRep - Time per rep in seconds
 * @param displacement - Range of motion distance in meters
 */
export function calculateInternalWork(
  anthropometry: Anthropometry,
  liftFamily: LiftFamily,
  reps: number,
  timePerRep: number,
  displacement: number
): number {
  if (timePerRep <= 0) return 0;

  // Average velocity of the lift
  // Distance = 2 * displacement (concentric + eccentric)
  const distancePerRep = displacement * 2;
  const avgVelocity = distancePerRep / timePerRep;

  // Peak velocity is typically ~1.3-1.5x average velocity in harmonic motion
  // We use ROOT MEAN SQUARE velocity for KE calculations, which for sinusoidal motion is ~1.11 * V_avg
  // However, simpler approximation V_effective = V_avg is conservative baseline.
  // Let's use V_eff = V_avg * 1.2 to capture peak demands.
  const v_eff = avgVelocity * 1.2;
  const v_squared = v_eff * v_eff;

  // Calculate Kinetic Energy of moving segments
  // KE = 0.5 * Mass * v^2
  // We sum KE for all moving segments.
  // Effective Mass Factor tells us "how much mass moves".
  // W_internal_per_stroke = Delta KE (Accelerate from 0 to V_peak) + Delta KE (Decelerate)
  // In one rep (up/down), we accel/decel multiple times.
  // Simplified: 4 acceleration phases per rep (Concentric Start, Conc End, Ecc Start, Ecc End).
  // Energy = 4 * (0.5 * M_eff * v_peak^2) ?
  // Actually, muscles must absorb the energy too (eccentric).
  // Standard approximation: Internal Work ~ M_eff * v_squared * NumAccelerations.

  const effectiveMass = calculateEffectiveMass(0, anthropometry.mass, liftFamily, anthropometry.sex);

  // Energy per acceleration phase
  const ke_phase = 0.5 * effectiveMass * v_squared;

  // 4 phases per rep (Start-Con, End-Con, Start-Ecc, End-Ecc)
  const internalWorkPerRep = ke_phase * 4;

  // Scaling Factor:
  // Pure physics KE is small (Joules). Metabolic cost of generating that KE is higher.
  // We return the Mechanical Internal Work here. Efficiency is applied later.
  return internalWorkPerRep * reps;
}

/**
 * Calculates estimated metabolic cost (calories) using Newtonian Physics
 * Cost = (External Work + Internal Work) / Efficiency
 *
 * External Work: Lifting the weight (load + body mass) against gravity
 * Internal Work: Moving body segments (Kinetic Energy), determines "Cost of Speed"
 */
export function calculateMetabolicCost(
  totalWorkJ: number, // External Work (Gravity)
  demandFactor: number, // Leverage Score (unused for physics, kept for API compat)
  displacement: number,
  reps: number,
  timePerRep: number,
  anthropometry?: Anthropometry, // Optional for backward compat
  liftFamily?: LiftFamily
): number {
  // 1. External Work (Against Gravity)
  // totalWorkJ is passed in.

  // 2. Internal Work (Kinetic Energy)
  let internalWorkJ = 0;
  if (anthropometry && liftFamily && timePerRep > 0) {
    internalWorkJ = calculateInternalWork(anthropometry, liftFamily, reps, timePerRep, displacement);
  } else {
    // Fallback if anthro not provided (shouldn't happen in new flow)
    // Estimate based on heuristic velocity factor from old code
    if (timePerRep > 0) {
      const avgV = (displacement * 2 * reps) / (reps * timePerRep);
      if (avgV > 0.5) internalWorkJ = totalWorkJ * (avgV * 0.5); // Rough fallback
    }
  }

  // 3. Efficiency
  // Humans are ~20-25% efficient for external work.
  // Efficiency drops as intensity/velocity increases (Hill's Force-Velocity relation).
  // We keep it simple: 20% baseline.
  const grossEfficiency = 0.20;

  const totalMetabolicJoules = (totalWorkJ + internalWorkJ) / grossEfficiency;

  return totalMetabolicJoules * KCAL_PER_JOULE;
}

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
/**
 * Calculates Peak Mechanical Power (Watts)
 * Measures the maximum power output during the concentric phase.
 * 
 * P_peak ~ Force * Velocity_peak
 * Force ~ (Load + EffectiveMass) * g (assuming approx 1g acceleration required to move)
 * Velocity_peak ~ 1.3 * Velocity_avg_concentric (harmonic approximation)
 */
export function calculatePeakPower(
  load: number,
  effectiveMass: number,
  displacement: number,
  timePerRep: number
): number {
  if (timePerRep <= 0) return 0;

  // Force required to accelerate the effective mass
  // effectiveMass already includes load + body mass components
  const force = effectiveMass * GRAVITY;

  // Average velocity during concentric phase (assumed half of rep time)
  const avgConcentricVelocity = displacement / (timePerRep * 0.5);

  // Peak velocity estimation (1.3x average for sinusoidal motion)
  const peakVelocity = avgConcentricVelocity * 1.3;

  return force * peakVelocity;
}

/**
 * Calculates Volume Performance Index (VPI) for Pullups
 * metric designed to compare pullup performance across bodyweights
 */
export function calculateVPI(
  anthropometry: Anthropometry,
  reps: number,
  addedLoad: number
): number {
  // Classic VPI Formula adapted for this engine
  // VPI = Reps * (BodyMass + AddedLoad) / BodyMass^0.67
  const totalLoad = anthropometry.mass + addedLoad;
  return (reps * totalLoad) / Math.pow(anthropometry.mass, ALLOMETRIC_EXPONENT);
}

export function calculateSquatWork(
  anthropometry: Anthropometry,
  variant: SquatVariant | "highBar" | "lowBar" | "front",
  load: number,
  reps: number,
  stance: SquatStance | "narrow" | "normal" | "wide" | "ultraWide" = "normal",
  depth: "parallel" | "belowParallel" = "parallel",
  timePerRep: number = 4.0
): LiftMetrics {
  // Solve kinematics to get displacement and moment arms
  const kinematics = solveSquatKinematics(anthropometry, variant, stance, depth);

  // Calculate effective mass
  const effectiveMass = calculateEffectiveMass(
    load,
    anthropometry.mass,
    LiftFamily.SQUAT,
    anthropometry.sex
  );

  // Calculate work
  const displacement = kinematics.displacement;
  const workPerRep = calculateExternalWork(effectiveMass, displacement);
  const totalWork = workPerRep * reps;

  // Demand Factor Calculation
  // Demand Factor Calculation
  const romMultiplier = displacement / 0.6; // Norm ~60cm ROM
  const momentArmPenalty = kinematics.momentArms.hip / 0.2; // Norm ~20cm hip moment arm
  const mechanicalDemand = BASE_DEMAND_FACTORS.SQUAT * romMultiplier * momentArmPenalty;

  // Invert for Leverage Score (Higher = Better)
  const demandFactor = mechanicalDemand;

  // Calculate pound-for-pound score
  const scoreP4P = totalWork / Math.pow(anthropometry.mass, ALLOMETRIC_EXPONENT);

  // Calculate calories (pass mechanicalDemand as legacy difficulty factor)
  const calories = calculateMetabolicCost(totalWork, mechanicalDemand, displacement, reps, timePerRep, anthropometry, LiftFamily.SQUAT);

  return {
    displacement,
    effectiveMass,
    workPerRep,
    totalWork,
    demandFactor,
    scoreP4P,
    calories,
    burnRate: (calories / ((reps * timePerRep) || 1)) * 3600,
    peakPower: calculatePeakPower(load, effectiveMass, displacement, timePerRep),
    valid: kinematics.valid,
    warnings: kinematics.valid
      ? []
      : ["Biomechanical failure: these proportions cannot perform this lift to depth."],
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
 * Calculates work and mechanics for a Deadlift
 */
export function calculateDeadliftWork(
  anthropometry: Anthropometry,
  variant: DeadliftVariant | "conventional" | "sumo",
  load: number,
  reps: number,
  stance: SumoStance | "hybrid" | "normal" | "wide" | "ultraWide" = "normal",
  barStartHeightOffset: number = 0
): LiftMetrics {
  // Solve for kinematics (displacement and moment arms)
  const kinematics = solveDeadliftKinematics(anthropometry, variant, stance, barStartHeightOffset);

  const displacement = kinematics.displacement;
  const effectiveMass = calculateEffectiveMass(
    load,
    anthropometry.mass,
    LiftFamily.DEADLIFT,
    anthropometry.sex
  );

  const workPerRep = calculateExternalWork(effectiveMass, displacement);
  const totalWork = workPerRep * reps;

  // Demand Factor
  const romMultiplier = displacement / 0.5; // DL ROM approx 50cm
  const momentArmPenalty = kinematics.momentArms.hip / 0.15; // DL hip moment arm usually smaller than squat
  const mechanicalDemand = BASE_DEMAND_FACTORS.DEADLIFT * romMultiplier * momentArmPenalty;

  // Invert for Leverage Score
  const demandFactor = mechanicalDemand;

  const scoreP4P = totalWork / Math.pow(anthropometry.mass, ALLOMETRIC_EXPONENT);
  const timePerRep = 4.0; // Deadlifts are slower

  return {
    displacement,
    effectiveMass,
    workPerRep,
    totalWork,
    demandFactor,
    scoreP4P,
    calories: calculateMetabolicCost(totalWork, mechanicalDemand, displacement, reps, timePerRep, anthropometry, LiftFamily.DEADLIFT),
    burnRate: (calculateMetabolicCost(totalWork, mechanicalDemand, displacement, reps, timePerRep, anthropometry, LiftFamily.DEADLIFT) / ((reps * timePerRep) || 1)) * 3600,
    peakPower: calculatePeakPower(load, effectiveMass, displacement, timePerRep),
    valid: kinematics.valid,
    warnings: kinematics.valid ? [] : ["Kinematic solver failed"],
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
 * Calculates work and mechanics for a Bench Press
 */
export function calculateBenchWork(
  anthropometry: Anthropometry,
  gripWidth: BenchGripWidth | "narrow" | "medium" | "wide",
  archStyle: BenchArchStyle | "flat" | "moderate" | "competitive" | "extreme",
  load: number,
  reps: number
): LiftMetrics {
  const kinematics = solveBenchKinematics(anthropometry, gripWidth, archStyle);

  const displacement = kinematics.displacement;
  const effectiveMass = calculateEffectiveMass(
    load,
    anthropometry.mass,
    LiftFamily.BENCH,
    anthropometry.sex
  );

  const workPerRep = calculateExternalWork(effectiveMass, displacement);
  const totalWork = workPerRep * reps;

  const romMultiplier = displacement / 0.3; // Bench ROM approx 30-40cm
  const mechanicalDemand = BASE_DEMAND_FACTORS.BENCH * romMultiplier;

  // Invert for Leverage Score
  const demandFactor = mechanicalDemand;

  const scoreP4P = totalWork / Math.pow(anthropometry.mass, ALLOMETRIC_EXPONENT);
  const timePerRep = 2.5;

  return {
    displacement,
    effectiveMass,
    workPerRep,
    totalWork,
    demandFactor,
    scoreP4P,
    calories: calculateMetabolicCost(totalWork, mechanicalDemand, displacement, reps, timePerRep, anthropometry, LiftFamily.BENCH),
    burnRate: (calculateMetabolicCost(totalWork, mechanicalDemand, displacement, reps, timePerRep, anthropometry, LiftFamily.BENCH) / ((reps * timePerRep) || 1)) * 3600,
    peakPower: calculatePeakPower(load, effectiveMass, displacement, timePerRep),
    valid: true,
    warnings: [],
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
 * Calculates work and mechanics for a Pull-Up
 */
export function calculatePullupWork(
  anthropometry: Anthropometry,
  grip: PullupGrip | "supinated" | "neutral" | "pronated",
  addedLoad: number,
  reps: number
): LiftMetrics {
  const kinematics = solvePullupKinematics(anthropometry, grip);

  const displacement = kinematics.displacement;
  // For pullups, you move ALMOST your entire body mass (minus forearms mostly)
  // effective mass factor handles this (~0.95 or so)
  const effectiveMass = calculateEffectiveMass(
    addedLoad,
    anthropometry.mass,
    LiftFamily.PULLUP,
    anthropometry.sex
  );

  const workPerRep = calculateExternalWork(effectiveMass, displacement);
  const totalWork = workPerRep * reps;

  const mechanicalDemand = BASE_DEMAND_FACTORS.PULLUP * (displacement / 0.6);

  // Invert for Leverage Score
  const demandFactor = mechanicalDemand;

  const scoreP4P = totalWork / Math.pow(anthropometry.mass, ALLOMETRIC_EXPONENT);
  const timePerRep = 2.5;

  // Calculate VPI (Volume Performance Index) for pullups
  const vpi = calculateVPI(anthropometry, reps, addedLoad);

  return {
    displacement,
    effectiveMass,
    workPerRep,
    totalWork,
    demandFactor,
    scoreP4P,
    calories: calculateMetabolicCost(totalWork, mechanicalDemand, displacement, reps, timePerRep, anthropometry, LiftFamily.PULLUP),
    burnRate: (calculateMetabolicCost(totalWork, mechanicalDemand, displacement, reps, timePerRep, anthropometry, LiftFamily.PULLUP) / (reps * timePerRep || 1)) * 3600,
    peakPower: calculatePeakPower(addedLoad, effectiveMass, displacement, timePerRep),
    vpi,
    valid: true,
    warnings: [],
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
  addedLoad: number = 0
): LiftMetrics {
  const kinematics = solvePushupKinematics(anthropometry);

  const displacement = kinematics.displacement;
  // Pushup effective mass is ~65% of BW
  const effectiveMass = calculateEffectiveMass(
    addedLoad,
    anthropometry.mass,
    LiftFamily.PUSHUP,
    anthropometry.sex
  );

  const workPerRep = calculateExternalWork(effectiveMass, displacement);
  const totalWork = workPerRep * reps;
  const mechanicalDemand = BASE_DEMAND_FACTORS.PUSHUP * (displacement / 0.3);

  // Invert for Leverage Score
  const demandFactor = mechanicalDemand;

  const scoreP4P = totalWork / Math.pow(anthropometry.mass, ALLOMETRIC_EXPONENT);
  const timePerRep = 2.0;

  return {
    displacement,
    effectiveMass,
    workPerRep,
    totalWork,
    demandFactor,
    scoreP4P,
    calories: calculateMetabolicCost(totalWork, mechanicalDemand, displacement, reps, timePerRep, anthropometry, LiftFamily.PUSHUP),
    burnRate: (calculateMetabolicCost(totalWork, mechanicalDemand, displacement, reps, timePerRep, anthropometry, LiftFamily.PUSHUP) / ((reps * timePerRep) || 1)) * 3600,
    peakPower: calculatePeakPower(addedLoad, effectiveMass, displacement, timePerRep),
    valid: true,
    warnings: [],
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
 * Calculates work and mechanics for Overhead Press
 */
export function calculateOHPWork(
  anthropometry: Anthropometry,
  load: number,
  reps: number
): LiftMetrics {
  const kinematics = solveOHPKinematics(anthropometry);

  const displacement = kinematics.displacement;
  const effectiveMass = calculateEffectiveMass(
    load,
    anthropometry.mass,
    LiftFamily.OHP,
    anthropometry.sex
  );

  const workPerRep = calculateExternalWork(effectiveMass, displacement);
  const totalWork = workPerRep * reps;
  const mechanicalDemand = BASE_DEMAND_FACTORS.OHP * (displacement / 0.5);

  // Invert for Leverage Score
  const demandFactor = mechanicalDemand;

  const scoreP4P = totalWork / Math.pow(anthropometry.mass, ALLOMETRIC_EXPONENT);
  const timePerRep = 3.0;

  return {
    displacement,
    effectiveMass,
    workPerRep,
    totalWork,
    demandFactor,
    scoreP4P,
    calories: calculateMetabolicCost(totalWork, mechanicalDemand, displacement, reps, timePerRep, anthropometry, LiftFamily.OHP),
    burnRate: (calculateMetabolicCost(totalWork, mechanicalDemand, displacement, reps, timePerRep, anthropometry, LiftFamily.OHP) / ((reps * timePerRep) || 1)) * 3600,
    peakPower: calculatePeakPower(load, effectiveMass, displacement, timePerRep),
    valid: true,
    warnings: [],
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
  // Thruster is Squat + OHP
  // Component kinematics used for validation
  const squatKinematics = solveSquatKinematics(anthropometry, "highBar"); // Assuming high bar/front squat style
  const ohpKinematics = solveOHPKinematics(anthropometry);

  // Total Displacement = Squat Down + Squat Up + Press Up + Press Down?
  // Work = Force * Displacement against gravity (Upwards phase)
  // Upwards = Squat Up + Press Up.
  const totalDisplacement = squatKinematics.displacement + ohpKinematics.displacement;

  const effectiveMass = calculateEffectiveMass(
    load,
    anthropometry.mass,
    LiftFamily.THRUSTER,
    anthropometry.sex
  );

  const workPerRep = calculateExternalWork(effectiveMass, totalDisplacement);
  const totalWork = workPerRep * reps;

  // Demand factor is summed base demand? Or scaled?
  // It's a compound metabolic killer.
  const mechanicalDemand = BASE_DEMAND_FACTORS.THRUSTER * (totalDisplacement / 1.0);

  // Invert
  const demandFactor = mechanicalDemand;

  const scoreP4P = totalWork / Math.pow(anthropometry.mass, ALLOMETRIC_EXPONENT);
  const timePerRep = 4.0;

  return {
    displacement: totalDisplacement,
    effectiveMass,
    workPerRep,
    totalWork,
    demandFactor,
    scoreP4P,
    calories: calculateMetabolicCost(totalWork, mechanicalDemand, totalDisplacement, reps, timePerRep, anthropometry, LiftFamily.THRUSTER),
    burnRate: (calculateMetabolicCost(totalWork, mechanicalDemand, totalDisplacement, reps, timePerRep, anthropometry, LiftFamily.THRUSTER) / ((reps * timePerRep) || 1)) * 3600,
    peakPower: calculatePeakPower(load, effectiveMass, totalDisplacement, timePerRep),
    valid: squatKinematics.valid,
    warnings: squatKinematics.valid ? [] : ["Squat component failure"],
  };
}
