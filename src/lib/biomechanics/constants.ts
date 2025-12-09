import { Sex, BenchGripWidth, BenchArchStyle, PullupGrip } from "../../types";

// Physical constants
export const GRAVITY = 9.81; // m/s²

/**
 * Winter's anthropometric segment ratios as fractions of standing height
 * Note: These sum to 0.948, not 1.0
 * The normalizeToHeight() function handles this discrepancy
 * Source: Winter, D.A. (2009). Biomechanics and Motor Control of Human Movement
 */
export const SEGMENT_RATIOS = {
  male: {
    headNeck: 0.13,
    torso: 0.288,
    upperArm: 0.186,
    forearm: 0.146,
    hand: 0.108,
    femur: 0.245, // thigh segment
    tibia: 0.246, // shank segment
    footHeight: 0.039, // vertical component
  },
  female: {
    headNeck: 0.13,
    torso: 0.285,
    upperArm: 0.183,
    forearm: 0.143,
    hand: 0.106,
    femur: 0.245, // same as male per spec
    tibia: 0.246, // same as male per spec
    footHeight: 0.039,
  },
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
 * Grip difficulty factors for pullup variants
 * Higher factor = more difficult
 */
export const GRIP_FACTORS: Record<PullupGrip, number> = {
  [PullupGrip.SUPINATED]: 1.0, // chin-up (easiest)
  [PullupGrip.NEUTRAL]: 1.08,
  [PullupGrip.PRONATED]: 1.15, // pull-up (hardest)
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
 * Sumo deadlift ROM reduction factor
 * Source: Escamilla et al. (2000)
 */
export const SUMO_ROM_FACTOR = 0.85; // 15-20% less displacement than conventional

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
 */
export const SD_MULTIPLIER_COEFFICIENT = 0.045;

/**
 * Tolerance for segment length normalization
 * If segments sum differs from height by more than this percentage, normalize
 */
export const HEIGHT_NORMALIZATION_TOLERANCE = 0.02; // 2%

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
