import { BenchGripWidth, BenchArchStyle } from "../../types";

// Physical constants
export const GRAVITY = 9.81; // m/s²

/**
 * Winter's anthropometric segment ratios as fractions of standing height
 * Note: These sum to 0.948, not 1.0
 * The normalizeToHeight() function handles this discrepancy
 * Source: Winter, D.A. (2009). Biomechanics and Motor Control of Human Movement
 * 
 * EXTRAPOLATION NOTE:
 * For heights outside standard population means (e.g. >2m), we assume geometric 
 * similarity (isometric scaling). Segment lengths scale linearly with height 
 * based on these population-average ratios. This provides the most scientifically 
 * valid estimation in the absence of specific allometric data for extreme statures.
 */
export const SEGMENT_RATIOS = {
  male: {
    headNeck: 0.13,
    torso: 0.288,
    upperArm: 0.186,
    forearm: 0.146,
    hand: 0.108,
    femur: 0.276, // thigh segment (Target TFR 0.781)
    tibia: 0.215, // shank segment
    footHeight: 0.039, // vertical component
    footLength: 0.152, // horizontal length (Winter 2009 approx)
  },
  female: {
    headNeck: 0.13,
    torso: 0.285,
    upperArm: 0.183,
    forearm: 0.143,
    hand: 0.106,
    femur: 0.276, // same as male per spec
    tibia: 0.215, // same as male per spec
    footHeight: 0.039,
    footLength: 0.152,
  },
} as const;

/**
 * Hand Grip Ratio
 * Proportion of hand length from wrist to center of fist (grip point)
 * Used to calculate effective reach
 */
export const HAND_GRIP_RATIO = 0.45;

/**
 * Standard Segment Mass as fraction of Total Body Weight
 * Source: Dempster (1955) via Winter (2009)
 * Used for "Bio-Digital" visualization mass-based sizing.
 */
export const SEGMENT_MASS_RATIOS = {
  male: {
    headNeck: 0.079,
    torso: 0.486,
    upperArm: 0.028,
    forearm: 0.016,
    hand: 0.006,
    femur: 0.100,
    tibia: 0.0465,
    foot: 0.0145,
  },
  female: {
    headNeck: 0.067, // slightly lighter relative to total
    torso: 0.520, // slightly heavier relative to total (inc breasts/hips)
    upperArm: 0.026,
    forearm: 0.014,
    hand: 0.005,
    femur: 0.115, // heavier thigh mass distribution
    tibia: 0.045,
    foot: 0.012,
  }
} as const;

/**
 * Effective mass factors for different lift families
 * Represents the proportion of body mass that moves with the load
 * Source: de Leva (1996) for segment mass distributions
 */
export const EFFECTIVE_MASS_FACTORS: Record<string, { male: number; female: number }> = {
  squat: {
    male: 0.80,
    female: 0.812,
  },
  deadlift: {
    male: 0.60,
    female: 0.608,
  },
  bench: {
    male: 0.0, // load only, body is supported
    female: 0.0,
  },
  pullup: {
    male: 1.0, // full bodyweight
    female: 1.0,
  },
  pushup: {
    male: 0.72, // Ebben et al. (2011)
    female: 0.71,
  },
  ohp: {
    male: 0.0, // load only, body supported
    female: 0.0,
  },
  thruster: {
    male: 0.5, // simplified approximation
    female: 0.5,
  },
} as const;

/**
 * Bar position offsets relative to shoulder
 * All values in centimeters
 * horizontal: positive = forward, negative = backward
 * vertical: positive = upward, negative = downward
 */
export const BAR_POSITIONS = {
  highBar: {
    horizontal: -5, // cm behind shoulder
    vertical: 5, // cm above shoulder height
  },
  lowBar: {
    horizontal: -12, // cm behind shoulder
    vertical: -5, // cm below shoulder
  },
  front: {
    horizontal: 8, // cm in front of shoulder
    vertical: 8, // cm above shoulder (on deltoids)
  },
} as const;

/**
 * Grip width angles for bench press
 * Wider grip = arms more horizontal = less ROM
 */
export const BENCH_GRIP_ANGLES: Record<BenchGripWidth, number> = {
  [BenchGripWidth.NARROW]: 5, // degrees from vertical
  [BenchGripWidth.MEDIUM]: 15,
  [BenchGripWidth.WIDE]: 25,
} as const;

/**
 * Arch height for bench press variants
 * Values in meters
 */
export const BENCH_ARCH_HEIGHTS: Record<BenchArchStyle, number> = {
  [BenchArchStyle.FLAT]: 0.02,
  [BenchArchStyle.MODERATE]: 0.05,
  [BenchArchStyle.COMPETITIVE]: 0.08,
  [BenchArchStyle.EXTREME]: 0.12,
} as const;

/**
 * Default mobility values (degrees)
 * Used when user doesn't specify custom mobility
 */
export const DEFAULT_MOBILITY = {
  maxAnkleDorsiflexion: 30, // typical range 15-35°
  maxHipFlexion: 130, // typical range 110-130°
  maxShoulderFlexion: 165, // typical range 150-180°
} as const;

/**
 * Standard chest depth for bench press calculations
 * Average male chest depth at sternum
 */
export const AVERAGE_CHEST_DEPTH = 0.23; // meters

/**
 * Allometric scaling exponent for pound-for-pound (P4P) scores
 * Source: Vanderburgh & Batterham (1999)
 */
export const ALLOMETRIC_EXPONENT = 0.67;

/**
 * Minimum bench press displacement
 * Safety clamp to prevent unrealistic values
 */
export const MIN_BENCH_DISPLACEMENT = 0.05; // meters (5cm)

/**
 * Plate radius for deadlift start position
 * Standard 45lb/20kg plate
 */
export const STANDARD_PLATE_RADIUS = 0.225; // meters

/**
 * Standard deviation multiplier formula constant
 * Formula: multiplier = 1 + (SD × 0.045)
 * 
 * Origin: derived from coefficient of variation (CV) for human limb lengths.
 * Typical CV for long bone lengths is ~4-5%. 
 * 0.045 represents a 4.5% change in length per standard deviation.
 * 
 * Archetype alignment:
 * - "Short/Long" options use +/- 1.5 SD (+/- 6.75%)
 * - "Very Short/Long" options use +/- 3.0 SD (+/- 13.5%)
 */
export const SD_MULTIPLIER_COEFFICIENT = 0.045;

/**
 * Tolerance for segment length normalization
 * If segments sum differs from height by more than this percentage, normalize
 */
export const HEIGHT_NORMALIZATION_TOLERANCE = 0.02; // 2%

/**
 * Stance width modifiers for squats
 * Wider stance = greater hip abduction = shorter effective femur length in sagittal plane
 * femurMultiplier: Applied to femur length (cos of abduction angle approximation)
 * romMultiplier: Applied to final ROM
 * maxTrunkAngleAdjustment: Added to max trunk angle (wider = more upright allowed)
 */
export const SQUAT_STANCE_MODIFIERS = {
  narrow: {
    femurMultiplier: 0.98, // ~11° abduction
    romMultiplier: 1.02,
    maxTrunkAngleAdjustment: -2,
  },
  normal: {
    femurMultiplier: 1.0, // baseline
    romMultiplier: 1.0,
    maxTrunkAngleAdjustment: 0,
  },
  wide: {
    femurMultiplier: 0.95, // ~18° abduction
    romMultiplier: 0.96,
    maxTrunkAngleAdjustment: 3,
  },
  ultraWide: {
    femurMultiplier: 0.90, // ~26° abduction
    romMultiplier: 0.92,
    maxTrunkAngleAdjustment: 5,
  },
} as const;

/**
 * Stance width modifiers for sumo deadlifts
 * Wider stance = greater abduction = significantly reduced ROM
 */
export const SUMO_STANCE_MODIFIERS = {
  hybrid: {
    femurMultiplier: 0.93, // ~21° abduction
    romMultiplier: 0.90,
    maxTrunkAngleAdjustment: 2,
  },
  normal: {
    femurMultiplier: 0.87, // ~30° abduction
    romMultiplier: 0.85,
    maxTrunkAngleAdjustment: 5,
  },
  wide: {
    femurMultiplier: 0.82, // ~35° abduction
    romMultiplier: 0.80,
    maxTrunkAngleAdjustment: 8,
  },
  ultraWide: {
    femurMultiplier: 0.77, // ~40° abduction
    romMultiplier: 0.75,
    maxTrunkAngleAdjustment: 10,
  },
} as const;

/**
 * Kinematic solver parameters
 */
export const KINEMATIC_SOLVER = {
  minAnkleDorsiflexion: 10, // degrees - minimum before giving up
  ankleDecrementStep: 2, // degrees - reduce ankle angle by this much each iteration
  minTrunkAngle: 20, // degrees - minimum valid trunk angle
  maxTrunkAngle: 80, // degrees - maximum valid trunk angle
  parallelDepthFemurAngle: 0, // degrees - femur parallel to ground
  fallbackDisplacementFactor: 0.37, // × height when solver fails
} as const;

/**
 * Load capacity factors for squat variants
 * Based on research showing low bar allows 5-10% greater load capacity
 * Source: Wretenberg et al. (1996), Swinton et al. (2012)
 *
 * These factors represent the RELATIVE LOAD CAPACITY of each variant.
 * A factor of 1.075 means the variant allows ~7.5% more load to be lifted.
 *
 * IMPORTANT: These are EMPIRICAL corrections applied on top of our physics model.
 * Our pure physics calculations are geometrically correct for parallel depth.
 * The load capacity differences come from:
 * - Muscle recruitment patterns (posterior chain vs quads)
 * - Hip extensors being stronger than knee extensors
 * - Practical execution differences (depth, technique variation)
 */
export const SQUAT_VARIANT_LOAD_CAPACITY_FACTORS = {
  highBar: 1.00,   // baseline
  lowBar: 1.075,   // ~7.5% more load capacity (research: 5-10% range)
  front: 0.85,     // ~15% less load capacity (more upright, quad-dominant)
} as const;

/**
 * Base Demand Factors (difficulty multipliers) for metrics normalization
 */
export const BASE_DEMAND_FACTORS = {
  SQUAT: 1.0,
  DEADLIFT: 1.1,
  BENCH: 0.9,
  PULLUP: 1.2,
  PUSHUP: 0.8,
  OHP: 1.0,
  THRUSTER: 1.5,
} as const;
