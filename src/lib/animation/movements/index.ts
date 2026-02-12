/**
 * Movement Pose Solver Factory
 *
 * Creates the appropriate pose solver for each movement type
 */

import { LiftFamily } from "@/types";
import { PoseSolver } from "../PoseSolver";
import { SquatPoseSolver } from "./SquatPoseSolver";
import { DeadliftPoseSolver } from "./DeadliftPoseSolver";
import { BenchPoseSolver } from "./BenchPoseSolver";
import { OHPPoseSolver } from "./OHPPoseSolver";
import { PullupPoseSolver } from "./PullupPoseSolver";
import { PushupPoseSolver } from "./PushupPoseSolver";
import { ThrusterPoseSolver } from "./ThrusterPoseSolver";

/**
 * Factory function to create the appropriate pose solver for a movement
 *
 * @param movement - Lift family type
 * @returns Pose solver instance
 */
export function createPoseSolver(movement: LiftFamily): PoseSolver {
  switch (movement) {
    case LiftFamily.SQUAT:
      return new SquatPoseSolver();

    case LiftFamily.DEADLIFT:
      return new DeadliftPoseSolver();

    case LiftFamily.BENCH:
      return new BenchPoseSolver();

    case LiftFamily.OHP:
      return new OHPPoseSolver();

    case LiftFamily.PULLUP:
      return new PullupPoseSolver();

    case LiftFamily.PUSHUP:
      return new PushupPoseSolver();

    case LiftFamily.THRUSTER:
      return new ThrusterPoseSolver();

    default:
      throw new Error(`Unknown movement type: ${movement}`);
  }
}

// Export all pose solvers for direct access if needed
export {
  SquatPoseSolver,
  DeadliftPoseSolver,
  BenchPoseSolver,
  OHPPoseSolver,
  PullupPoseSolver,
  PushupPoseSolver,
  ThrusterPoseSolver,
};
