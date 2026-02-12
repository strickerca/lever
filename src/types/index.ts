// Core geometric types
export interface Point2D {
  x: number; // meters
  y: number; // meters
}

// Enums
export enum Sex {
  MALE = "male",
  FEMALE = "female",
}

export enum AnthropometryMode {
  SIMPLE = "simple",
  ADVANCED = "advanced",
}

export enum LiftFamily {
  SQUAT = "squat",
  DEADLIFT = "deadlift",
  BENCH = "bench",
  PULLUP = "pullup",
  PUSHUP = "pushup",
  OHP = "ohp",
  THRUSTER = "thruster",
}

export enum SquatVariant {
  HIGH_BAR = "highBar",
  LOW_BAR = "lowBar",
  FRONT = "front",
}

export enum DeadliftVariant {
  CONVENTIONAL = "conventional",
  SUMO = "sumo",
}

export enum SquatStance {
  NARROW = "narrow",
  NORMAL = "normal",
  WIDE = "wide",
  ULTRA_WIDE = "ultraWide",
}

export enum SumoStance {
  HYBRID = "hybrid", // Narrow sumo, just outside hands/arms
  NORMAL = "normal",
  WIDE = "wide",
  ULTRA_WIDE = "ultraWide",
}

export enum BenchGripWidth {
  NARROW = "narrow",
  MEDIUM = "medium",
  WIDE = "wide",
}

export enum BenchArchStyle {
  FLAT = "flat",
  MODERATE = "moderate",
  COMPETITIVE = "competitive",
  EXTREME = "extreme",
}

export enum PullupGrip {
  SUPINATED = "supinated", // chin-up
  NEUTRAL = "neutral",
  PRONATED = "pronated", // pull-up
}

// Anthropometry types
export interface SegmentLengths {
  height: number; // meters - total standing height
  headNeck: number; // meters
  torso: number; // meters
  upperArm: number; // meters
  forearm: number; // meters
  hand: number; // meters
  femur: number; // meters
  tibia: number; // meters
  footHeight: number; // meters (vertical component)
}

export interface DerivedAnthropometry {
  totalArm: number; // upperArm + forearm + hand
  totalLeg: number; // femur + tibia + footHeight
  cruralIndex: number; // tibia / femur
  femurTorsoRatio: number; // femur / torso
  apeIndex: number; // (2 * totalArm + 0.36 * torso) / height
  acromionHeight: number; // femur + tibia + footHeight + torso
  hipHeight: number; // femur + tibia + footHeight
}

export interface MobilityProfile {
  maxAnkleDorsiflexion: number; // degrees (typical 15-35°)
  maxHipFlexion: number; // degrees (typical 110-130°)
  maxShoulderFlexion: number; // degrees (typical 150-180°)
}

export interface Anthropometry {
  mode: AnthropometryMode;
  sex: Sex;
  mass: number; // kg
  segments: SegmentLengths;
  derived: DerivedAnthropometry;
  mobility: MobilityProfile;
}

// Kinematic solution types
export interface KinematicSolution {
  valid: boolean; // Whether a valid solution was found
  mobilityLimited: boolean; // Whether solution was limited by mobility
  positions: {
    ankle: Point2D;
    knee: Point2D;
    hip: Point2D;
    shoulder: Point2D;
    bar: Point2D;
  };
  angles: {
    ankle: number; // degrees
    knee: number; // degrees
    hip: number; // degrees
    trunk: number; // degrees from vertical
  };
  momentArms: {
    hip: number; // meters - horizontal distance from hip to bar
    knee: number; // meters - horizontal distance from knee to bar
  };
  displacement: number; // meters - vertical bar travel distance
}

// Lift metrics types
export interface LiftMetrics {
  displacement: number; // meters
  effectiveMass: number; // kg
  workPerRep: number; // joules
  totalWork: number; // joules
  demandFactor: number; // unitless difficulty multiplier
  scoreP4P: number; // pound-for-pound score
  vpi?: number; // Volume Performance Index (pullups only)
}

// Comparison result types
export interface ComparisonResult {
  lifterA: {
    name: string;
    anthropometry: Anthropometry;
    metrics: LiftMetrics;
    kinematics?: KinematicSolution;
  };
  lifterB: {
    name: string;
    anthropometry: Anthropometry;
    metrics?: LiftMetrics; // May not be calculated if only finding equivalent
    kinematics?: KinematicSolution;
    equivalentLoad: number; // kg - what load would match lifter A's demand
    equivalentReps: number; // How many reps to match lifter A's work
  };
  comparison: {
    workRatio: number; // lifterB.work / lifterA.work
    demandRatio: number; // lifterB.demand / lifterA.demand
    displacementRatio: number; // lifterB.displacement / lifterA.displacement
    advantagePercentage: number; // (demandRatio - 1) * 100
    advantageDirection: "advantage_A" | "advantage_B" | "neutral";
  };
  /**
   * Capacity-adjusted comparison accounting for research-based load capacity differences
   * between squat variants (e.g., low bar allows ~7.5% more load than high bar)
   * Only present for squat comparisons with different variants
   */
  capacityAdjusted?: {
    lifterACapacityFactor: number; // e.g., 1.00 for high bar
    lifterBCapacityFactor: number; // e.g., 1.075 for low bar
    adjustedLoadA: number; // Lifter A's load normalized by capacity factor
    adjustedLoadB: number; // Lifter B's load normalized by capacity factor
    adjustedDemandRatio: number; // Demand ratio after capacity adjustment
    adjustedAdvantagePercentage: number; // Advantage % after capacity adjustment
    adjustedAdvantageDirection: "advantage_A" | "advantage_B" | "neutral";
    explanation: string; // Description of what the adjustment represents
  };
  explanations: Array<{
    type: string;
    impact: "advantage_A" | "advantage_B" | "neutral";
    message: string;
  }>;
}

// Standard Deviation modifiers for advanced mode
export interface SDModifiers {
  arms: number; // -3 to +3 SD
  legs: number; // -3 to +3 SD
  torso: number; // -3 to +3 SD
}

// Performance input
export interface PerformanceInput {
  load: number; // kg
  reps: number;
}
