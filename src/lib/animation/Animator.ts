/**
 * Animator module - handles time → phase progression for all movements
 *
 * Maps elapsed time to normalized rep progress and animation phases.
 * Supports different movement patterns (concentric-first vs eccentric-first)
 * and pause durations.
 */

import { LiftFamily } from "@/types";
import { AnimationPhase } from "./types";

/**
 * Easing function for smooth motion
 * Uses quadratic ease-in-out for natural acceleration/deceleration
 */
export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * Easing function for smooth motion with cubic curve
 * Provides slightly smoother acceleration than quadratic
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Configuration for a single rep cycle
 */
export interface RepCycleConfig {
  eccentricDuration: number;  // seconds
  transitionDuration: number; // seconds (pause at bottom/top)
  concentricDuration: number; // seconds
  pauseAtTop?: number;        // seconds (pause before next rep)
}

/**
 * Calculate rep cycle configuration from ROM and velocity
 *
 * @param rom - Range of motion in meters
 * @param velocity - Bar velocity in m/s
 * @param pauseBottom - Pause at bottom in seconds (default: 0)
 * @param pauseTop - Pause at top in seconds (default: 0)
 * @returns Cycle configuration
 */
export function calculateRepCycle(
  rom: number,
  velocity: number,
  pauseBottom: number = 0,
  pauseTop: number = 0
): RepCycleConfig {
  // Time to move one direction = ROM / velocity
  const movementTime = rom / velocity;

  return {
    eccentricDuration: movementTime,
    transitionDuration: pauseBottom,
    concentricDuration: movementTime,
    pauseAtTop: pauseTop,
  };
}

/**
 * Get animation phase for standard eccentric-first movements
 * (Squat, Deadlift, Bench, OHP, Pushup)
 *
 * @param t - Normalized time in current rep (0 to 1)
 * @param config - Rep cycle configuration
 * @returns Animation phase
 */
export function getEccentricFirstPhase(
  t: number,
  config: RepCycleConfig
): AnimationPhase {
  const totalDuration =
    config.eccentricDuration +
    config.transitionDuration +
    config.concentricDuration +
    (config.pauseAtTop || 0);

  const elapsed = t * totalDuration;

  // Phase 1: Eccentric (top → bottom)
  if (elapsed < config.eccentricDuration) {
    const phaseProgress = elapsed / config.eccentricDuration;
    const easedProgress = easeInOutQuad(phaseProgress);
    return {
      t,
      phase: "eccentric",
      phaseProgress: easedProgress,
      barHeightNormalized: 1 - easedProgress, // 1 → 0 (descending)
    };
  }

  // Phase 2: Transition (pause at bottom)
  const afterEccentric = elapsed - config.eccentricDuration;
  if (afterEccentric < config.transitionDuration) {
    return {
      t,
      phase: "transition",
      phaseProgress: afterEccentric / config.transitionDuration,
      barHeightNormalized: 0, // At bottom
    };
  }

  // Phase 3: Concentric (bottom → top)
  const afterTransition = afterEccentric - config.transitionDuration;
  if (afterTransition < config.concentricDuration) {
    const phaseProgress = afterTransition / config.concentricDuration;
    const easedProgress = easeInOutQuad(phaseProgress);
    return {
      t,
      phase: "concentric",
      phaseProgress: easedProgress,
      barHeightNormalized: easedProgress, // 0 → 1 (ascending)
    };
  }

  // Phase 4: Pause at top (before next rep)
  return {
    t,
    phase: "transition",
    phaseProgress: 1,
    barHeightNormalized: 1, // At top
  };
}

/**
 * Get animation phase for concentric-first movements
 * (Pullup - starts from hang, pulls up, then lowers)
 *
 * @param t - Normalized time in current rep (0 to 1)
 * @param config - Rep cycle configuration
 * @returns Animation phase
 */
export function getConcentricFirstPhase(
  t: number,
  config: RepCycleConfig
): AnimationPhase {
  const totalDuration =
    config.concentricDuration +
    config.transitionDuration +
    config.eccentricDuration +
    (config.pauseAtTop || 0);

  const elapsed = t * totalDuration;

  // Phase 1: Concentric (bottom → top)
  if (elapsed < config.concentricDuration) {
    const phaseProgress = elapsed / config.concentricDuration;
    const easedProgress = easeInOutQuad(phaseProgress);
    return {
      t,
      phase: "concentric",
      phaseProgress: easedProgress,
      barHeightNormalized: easedProgress, // 0 → 1 (ascending)
    };
  }

  // Phase 2: Transition (pause at top)
  const afterConcentric = elapsed - config.concentricDuration;
  if (afterConcentric < config.transitionDuration) {
    return {
      t,
      phase: "transition",
      phaseProgress: afterConcentric / config.transitionDuration,
      barHeightNormalized: 1, // At top
    };
  }

  // Phase 3: Eccentric (top → bottom)
  const afterTransition = afterConcentric - config.transitionDuration;
  if (afterTransition < config.eccentricDuration) {
    const phaseProgress = afterTransition / config.eccentricDuration;
    const easedProgress = easeInOutQuad(phaseProgress);
    return {
      t,
      phase: "eccentric",
      phaseProgress: easedProgress,
      barHeightNormalized: 1 - easedProgress, // 1 → 0 (descending)
    };
  }

  // Phase 4: Pause at bottom (before next rep)
  return {
    t,
    phase: "transition",
    phaseProgress: 1,
    barHeightNormalized: 0, // At bottom
  };
}

/**
 * Get animation phase for Thruster (compound movement)
 * Squat down → Squat up → Press up → Press down
 *
 * @param t - Normalized time in current rep (0 to 1)
 * @param config - Rep cycle configuration (adapted for thruster)
 * @param squatROM - Squat range of motion in meters
 * @param pressROM - Press range of motion in meters
 * @returns Animation phase
 */
export function getThrusterPhase(
  t: number,
  config: RepCycleConfig,
  squatROM: number,
  pressROM: number
): AnimationPhase {
  // Thruster has 4 equal phases (simplified)
  const phaseIndex = Math.floor(t * 4);
  const phaseT = (t * 4) % 1;
  const easedPhaseT = easeInOutQuad(phaseT);

  const totalROM = squatROM + pressROM;

  switch (phaseIndex) {
    case 0: // Squat down
      return {
        t,
        phase: "squat_down",
        phaseProgress: easedPhaseT,
        barHeightNormalized: 1 - (easedPhaseT * squatROM) / totalROM,
      };

    case 1: // Squat up
      return {
        t,
        phase: "squat_up",
        phaseProgress: easedPhaseT,
        barHeightNormalized: (squatROM * (1 - easedPhaseT)) / totalROM + (easedPhaseT * squatROM) / totalROM,
      };

    case 2: // Press up
      return {
        t,
        phase: "press_up",
        phaseProgress: easedPhaseT,
        barHeightNormalized: squatROM / totalROM + (easedPhaseT * pressROM) / totalROM,
      };

    case 3: // Press down
    default:
      return {
        t,
        phase: "press_down",
        phaseProgress: easedPhaseT,
        barHeightNormalized: (squatROM + pressROM * (1 - easedPhaseT)) / totalROM,
      };
  }
}

/**
 * Get animation phase for a specific movement and time
 *
 * @param movement - Lift family
 * @param t - Normalized time in current rep (0 to 1)
 * @param config - Rep cycle configuration
 * @param squatROM - Squat ROM (for thruster only)
 * @param pressROM - Press ROM (for thruster only)
 * @returns Animation phase
 */
export function getAnimationPhase(
  movement: LiftFamily,
  t: number,
  config: RepCycleConfig,
  squatROM?: number,
  pressROM?: number
): AnimationPhase {
  switch (movement) {
    case LiftFamily.PULLUP:
      return getConcentricFirstPhase(t, config);

    case LiftFamily.THRUSTER:
      if (squatROM === undefined || pressROM === undefined) {
        throw new Error("Thruster requires squatROM and pressROM parameters");
      }
      return getThrusterPhase(t, config, squatROM, pressROM);

    case LiftFamily.SQUAT:
    case LiftFamily.DEADLIFT:
    case LiftFamily.BENCH:
    case LiftFamily.OHP:
    case LiftFamily.PUSHUP:
    default:
      return getEccentricFirstPhase(t, config);
  }
}

/**
 * Calculate current time position within a multi-rep sequence
 *
 * @param elapsedTime - Total elapsed time in seconds
 * @param repCycleDuration - Duration of one complete rep in seconds
 * @param totalReps - Total number of reps
 * @returns Object with currentRep (0-indexed) and repProgress (0-1)
 */
export function getRepProgress(
  elapsedTime: number,
  repCycleDuration: number,
  totalReps: number
): { currentRep: number; repProgress: number; allRepsComplete: boolean } {
  const totalDuration = repCycleDuration * totalReps;

  if (elapsedTime >= totalDuration) {
    return {
      currentRep: totalReps - 1,
      repProgress: 1,
      allRepsComplete: true,
    };
  }

  const currentRep = Math.floor(elapsedTime / repCycleDuration);
  const timeInCurrentRep = elapsedTime % repCycleDuration;
  const repProgress = timeInCurrentRep / repCycleDuration;

  return {
    currentRep,
    repProgress,
    allRepsComplete: false,
  };
}
