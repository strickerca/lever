/**
 * Core types for the unified animation system
 *
 * This module defines the fundamental types used across all movement animations:
 * - Pose2D: Complete body position snapshot
 * - AnimationPhase: Movement phase progression
 * - Equipment types for rendering
 */

import { Point2D, Anthropometry, LiftFamily } from "@/types";

/**
 * Complete 2D pose representing a lifter's body position at a specific moment
 *
 * All positions are in METERS in world coordinates
 * Origin at midfoot, y+ is up
 */
export interface Pose2D {
  // Joint positions (required for all movements)
  ankle: Point2D;
  knee: Point2D;
  hip: Point2D;
  shoulder: Point2D;
  elbow: Point2D;
  wrist: Point2D;

  // Equipment positions (movement-specific, can be null)
  bar: Point2D | null;

  // Contact constraints
  contacts: {
    leftFoot: Point2D | null;   // null if not on ground
    rightFoot: Point2D | null;  // null if not on ground
    leftHand: Point2D | null;   // null if not gripping
    rightHand: Point2D | null;  // null if not gripping
  };

  // Derived angles (for display/debugging)
  angles: {
    ankle: number;        // degrees
    knee: number;         // degrees
    hip: number;          // degrees
    trunk: number;        // degrees from vertical
    shoulder: number;     // degrees
    elbow: number;        // degrees
  };

  // Bar orientation (for bench/OHP where bar may not be horizontal)
  barAngle?: number;  // degrees from horizontal (0 = horizontal)
}

/**
 * Animation phase for a single repetition
 *
 * Different movements have different phase structures:
 * - Squat/Deadlift/Bench/OHP: eccentric → transition → concentric
 * - Pullup: concentric → transition → eccentric
 * - Pushup: eccentric → transition → concentric
 * - Thruster: squat_down → squat_up → press_up → press_down
 */
export interface AnimationPhase {
  // Normalized time within the rep (0 to 1)
  t: number;

  // Current phase name
  phase:
    | "eccentric"      // Lowering/descending
    | "transition"     // Pause at bottom/top
    | "concentric"     // Raising/ascending
    | "squat_down"     // Thruster: squat descend
    | "squat_up"       // Thruster: squat ascend
    | "press_up"       // Thruster: press ascend
    | "press_down";    // Thruster: press descend

  // Progress within current phase (0 to 1)
  phaseProgress: number;

  // Normalized bar height (0 = lowest, 1 = highest) for displaying bar path
  barHeightNormalized: number;
}

/**
 * Equipment configuration for rendering
 */
export interface Equipment {
  type: "barbell" | "bench" | "pullup_bar" | "floor";
  position?: Point2D;     // For bench, pullup bar
  width?: number;         // For bench, pullup bar (meters)
  height?: number;        // For bench (meters)
  barDiameter?: number;   // For barbell (meters)
  plateRadius?: number;   // For barbell (meters)
  load?: number;          // For barbell (kg) - affects plate visualization
}

/**
 * Movement configuration options
 * Each movement type has its own specific options
 */
export interface MovementOptions {
  // Squat options
  squatVariant?: "highBar" | "lowBar" | "front";
  squatStance?: "narrow" | "normal" | "wide" | "ultraWide";

  // Deadlift options
  deadliftVariant?: "conventional" | "sumo";
  sumoStance?: "hybrid" | "normal" | "wide" | "ultraWide";
  deadliftBarOffset?: number;  // Deficit/block height in meters

  // Bench options
  benchGrip?: "narrow" | "medium" | "wide";
  benchArch?: "flat" | "moderate" | "competitive" | "extreme";

  // Pullup options
  pullupGrip?: "supinated" | "neutral" | "pronated";
  pullupLoad?: number;  // Added weight in kg

  // Pushup options
  pushupWidth?: "narrow" | "normal" | "wide";
  pushupWeight?: number;  // Added weight in kg

  // OHP options
  ohpStyle?: "strict" | "push_press";

  // General options
  pauseDuration?: number;  // Seconds to pause at bottom/top
}

/**
 * Input parameters for pose solver
 */
export interface PoseSolverInput {
  anthropometry: Anthropometry;
  movement: LiftFamily;
  options: MovementOptions;
  phase: AnimationPhase;
  load?: number;  // External load in kg (for plate visualization)
}

/**
 * Result from pose solver
 * Includes validation and error information
 */
export interface PoseSolverResult {
  pose: Pose2D;
  valid: boolean;
  errors: string[];  // Validation errors (segment stretch, impossible position, etc.)
  warnings: string[]; // Non-critical issues
}

/**
 * Velocity/timing configuration for animation
 */
export interface AnimationTiming {
  mode: "independent" | "time_synced" | "position_synced";

  // For independent mode
  velocityA_ms?: number;  // Lifter A bar velocity (m/s)
  velocityB_ms?: number;  // Lifter B bar velocity (m/s)

  // For time_synced mode
  totalTime?: number;     // Total time for all reps (seconds)

  // For position_synced mode (bar height matched)
  referenceROM?: number;  // Reference ROM in meters

  // Common
  pauseAtBottom?: number; // Seconds
  pauseAtTop?: number;    // Seconds
  reps: number;
}

/**
 * Unified renderer configuration
 */
export interface RendererConfig {
  // Canvas dimensions
  width: number;   // pixels
  height: number;  // pixels

  // Rendering options
  showJoints: boolean;
  showMomentArms: boolean;
  showBarPath: boolean;
  showFloor: boolean;
  showMidfoot: boolean;
  showMetrics: boolean;

  // Colors
  colors: {
    lifterA: string;
    lifterB: string;
    joint: string;
    bar: string;
    equipment: string;
    floor: string;
    midfoot: string;
    momentArm: string;
  };

  // Scaling
  metersToPixels: number;  // Calculated from available height and max lifter height
  padding: number;         // pixels
}
