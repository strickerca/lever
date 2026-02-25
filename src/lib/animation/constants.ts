// Shared animation-facing constants (meters).
// Keep these here so pose solvers and renderers agree on equipment dimensions.

export const BENCH_PAD_SURFACE_HEIGHT_M = 0.45;
export const BENCH_PAD_THICKNESS_M = 0.06;
export const BENCH_PAD_LENGTH_M = 1.2;

// Bench press side-view bar path tuning.
// Positive X is toward the lifter's feet.
export const BENCH_JCURVE_FORWARD_MIN_M = 0.06;
export const BENCH_JCURVE_FORWARD_MAX_M = 0.12;

// Pull-up equipment + top-position tuning.
export const PULLUP_BAR_HEIGHT_M = 2.5;
export const PULLUP_BAR_WIDTH_M = 1.2;

// Apply stricter "finish" constraints only near the top of the rep.
export const PULLUP_TOP_POSE_BLEND_START = 0.8;

// Normalized (by body height) finish requirements.
export const PULLUP_TOP_CHIN_CLEARANCE_FRAC = 0.012;
export const PULLUP_TOP_HIP_FORWARD_FRAC = 0.03;
export const PULLUP_TOP_HEAD_BACK_CLEARANCE_FRAC = 0.01;

// Torso travel: the body should move up and slightly "back" (negative x) during the ascent.
export const PULLUP_TOP_BACK_OFFSET_FRAC = 0.04;
export const PULLUP_BACK_BLEND_START = 0.45;

// Elbow target at top: percentage of forearm length below the bar.
export const PULLUP_TOP_ELBOW_DROP_FRAC = 0.95;
export const PULLUP_TOP_ELBOW_BACK_FRAC = 0.025;

// Keep elbows on the "front" (positive X) side of the torso for most of the rep.
// In this profile view, +X is screen-right and -X is "behind".
export const PULLUP_ELBOW_FRONT_MARGIN_FRAC = 0.01;
export const PULLUP_ELBOW_FRONT_RELEASE_START = 0.95;

// =============================================================================
// UP-AND-BACK ARC MOTION CONSTANTS (StrongLifts 5-phase style)
// =============================================================================
// These constants control the "up and back" arc trajectory that keeps the head
// behind the bar and creates realistic pull-up motion.

/**
 * Maximum backward displacement as fraction of body height.
 * At mid-rep, the body moves back by this much (in -X direction).
 * Higher values = more pronounced backward arc.
 * Range: 0.06-0.12 recommended. Start at 0.08.
 */
export const PULLUP_ARC_MAX_BACK_FRAC = 0.08;

/**
 * Additional backward offset at TOP of rep (fraction of body height).
 * Ensures head stays behind bar at lockout. Added on top of the arc.
 * Range: 0.03-0.06 recommended.
 */
export const PULLUP_TOP_CLEARANCE_BACK_FRAC = 0.045;

/**
 * Progress value (0-1) where arc peaks. 0.5 = mid-rep peak, 0.6 = later peak.
 * Later peaks create more "pull behind bar" at the top.
 */
export const PULLUP_ARC_PEAK_PROGRESS = 0.55;

/**
 * Scapular initiation phase duration (0-1).
 * First X% of the rep has minimal elbow bend while scaps depress/retract.
 */
export const PULLUP_SCAP_INIT_DURATION = 0.15;

/**
 * Head clearance margin (meters). Absolute minimum distance head must stay
 * behind bar plane (x=0). Used as safety check.
 */
export const PULLUP_HEAD_CLEARANCE_MARGIN_M = 0.04;

/**
 * Torso lean-back angle at top (degrees).
 * Higher = more backward lean. 15-25 degrees is realistic.
 */
export const PULLUP_TOP_LEAN_BACK_DEG = 20;

// =============================================================================
// PUSH-UP MOTION CONSTANTS (Proper Form - Jeff Nippard/Built With Science style)
// =============================================================================
// These constants control push-up form with proper elbow tuck and body path.
// Reference: https://builtwithscience.com/fitness-tips/perfect-push-up-form/

/**
 * Forward shift at bottom position as fraction of arm length.
 * As the lifter descends, body shifts forward; returns on ascent.
 * Range: 0.05-0.15. Higher = more forward shift at bottom.
 */
export const PUSHUP_BOTTOM_FORWARD_SHIFT_FRAC = 0.10;

/**
 * Elbow tuck angle in degrees (from overhead view).
 * 90° = elbows flared out, 0° = elbows tucked at sides, 45° = optimal.
 * This affects the elbow position in the side view.
 */
export const PUSHUP_ELBOW_TUCK_ANGLE_DEG = 45;

/**
 * Minimum elbow angle at bottom position (degrees).
 * ~90° means upper arm parallel to ground at bottom.
 */
export const PUSHUP_BOTTOM_ELBOW_ANGLE_DEG = 90;

/**
 * Body angle from horizontal at bottom (slight forward lean, degrees).
 * Positive = head higher than feet. 5-15° is typical.
 */
export const PUSHUP_BODY_ANGLE_DEG = 8;

/**
 * Scapular protraction at top (fraction of movement).
 * 1.0 = full protraction (shoulders rounded forward at lockout).
 */
export const PUSHUP_TOP_SCAP_PROTRACTION = 0.8;

/**
 * Hand width as fraction of shoulder width.
 * 1.0 = shoulder width, 1.2 = slightly wider than shoulders.
 */
export const PUSHUP_HAND_WIDTH_FRAC = 1.1;
