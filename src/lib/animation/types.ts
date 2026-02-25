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
  toe: Point2D;

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

  // Optional debug payload for visualization tooling
  debug?: {
    pullup?: {
      elbowBase?: Point2D;
      elbowTarget?: Point2D;
      pole?: Point2D;
      tuck?: number;
      axis?: { x: number; y: number };
    };
  };
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
  | "press_down"     // Thruster: press descend
  | "pause_top";     // Thruster: hold at top

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
  squatDepth?: "parallel" | "belowParallel";

  // Deadlift options
  deadliftVariant?: "conventional" | "sumo";
  sumoStance?: "hybrid" | "normal" | "wide" | "ultraWide";
  deadliftBarOffset?: number;  // Deficit/block height in meters

  // Bench options
  benchGrip?: "narrow" | "medium" | "wide";
  benchArch?: "flat" | "moderate" | "competitive" | "extreme";
  chestSize?: "small" | "average" | "large";

  // Pullup options
  pullupGrip?: "supinated" | "neutral" | "pronated";
  pullupLoad?: number;  // Added weight in kg

  // =============================================================================
  // PULLUP ANIMATION TUNING (StrongLifts 5-Phase Style)
  // =============================================================================
  // These options control the "up and back" arc motion for realistic pull-up animation.
  // See constants.ts for default values and detailed documentation.

  /**
   * Maximum backward arc displacement as fraction of body height.
   * Controls how far back the body travels at mid-rep.
   * Range: 0.06-0.12. Default: PULLUP_ARC_MAX_BACK_FRAC (0.08)
   */
  pullupArcMaxBackFrac?: number;

  /**
   * Additional backward offset at TOP of rep (fraction of body height).
   * Ensures head/chin stays behind bar at lockout.
   * Range: 0.03-0.06. Default: PULLUP_TOP_CLEARANCE_BACK_FRAC (0.045)
   */
  pullupTopClearanceBackFrac?: number;

  /**
   * Progress value (0-1) where the backward arc peaks.
   * 0.5 = mid-rep, 0.6+ = later peak (more "pull behind bar" at top).
   * Default: PULLUP_ARC_PEAK_PROGRESS (0.55)
   */
  pullupArcPeakProgress?: number;

  /**
   * Scapular initiation phase duration (0-1).
   * First X% of rep has minimal elbow bend while scaps depress/retract.
   * Default: PULLUP_SCAP_INIT_DURATION (0.15)
   */
  pullupScapInitDuration?: number;

  /**
   * Torso lean-back angle at top position (degrees).
   * Higher values = more backward lean. 15-25 is realistic.
   * Default: PULLUP_TOP_LEAN_BACK_DEG (20)
   */
  pullupTopLeanBackDeg?: number;

  /**
   * Head clearance margin (meters).
   * Minimum distance head must stay behind bar plane (x=0).
   * Default: PULLUP_HEAD_CLEARANCE_MARGIN_M (0.04)
   */
  pullupHeadClearanceMarginM?: number;

  // Legacy options (kept for backwards compatibility)
  pullupElbowTuck?: number;
  pullupElbowBehind?: number;
  pullupTopLeanBack?: number;
  pullupTopBackOffsetFrac?: number;
  pullupBackBlendStart?: number;
  pullupTopHeadBackClearanceFrac?: number;
  pullupTopChinClearanceFrac?: number;
  pullupPoleVectorAngleDeg?: number;
  pullupElbowDropTopFrac?: number;
  pullupElbowFrontMarginFrac?: number;
  pullupElbowFrontReleaseStart?: number;

  // Pushup options
  pushupWidth?: "narrow" | "normal" | "wide";
  pushupWeight?: number;  // Added weight in kg

  // =============================================================================
  // PUSHUP ANIMATION TUNING (Proper Form - Jeff Nippard style)
  // =============================================================================
  // These options control push-up form with proper elbow tuck and body path.
  // Reference: https://builtwithscience.com/fitness-tips/perfect-push-up-form/

  /**
   * Forward shift at bottom as fraction of arm length.
   * Body shifts forward as you descend. Default: 0.10
   */
  pushupBottomForwardShiftFrac?: number;

  /**
   * Elbow tuck angle in degrees (overhead view).
   * 90° = flared, 0° = tucked, 45° = optimal. Default: 45
   */
  pushupElbowTuckAngleDeg?: number;

  /**
   * Minimum elbow angle at bottom (degrees).
   * ~90° means upper arm parallel to ground. Default: 90
   */
  pushupBottomElbowAngleDeg?: number;

  /**
   * Body angle from horizontal (degrees).
   * Positive = head higher than feet. Default: 8
   */
  pushupBodyAngleDeg?: number;

  /**
   * Scapular protraction at top (0-1).
   * Higher = more shoulder rounding at lockout. Default: 0.8
   */
  pushupTopScapProtraction?: number;

  /**
   * Hand width as fraction of shoulder width.
   * 1.0 = shoulder width, 1.2 = wider. Default: 1.1
   */
  pushupHandWidthFrac?: number;

  // OHP options
  ohpStyle?: "strict" | "push_press";

  // General options
  pauseDuration?: number;  // Seconds to pause at bottom/top
  load?: number;           // General external load in kg (for all lifts)
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
