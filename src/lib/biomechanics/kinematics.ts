import { Anthropometry, KinematicSolution, Point2D, SquatVariant } from "../../types";
import { BAR_POSITIONS, KINEMATIC_SOLVER } from "./constants";

/**
 * Converts degrees to radians
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Converts radians to degrees
 */
export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Solves squat kinematics to find body position at parallel depth
 * This is the CRITICAL component of LEVER
 *
 * The solver iterates to find a trunk angle that satisfies the equilibrium
 * constraint: bar must be over midfoot (x ≈ 0)
 *
 * @param anthropometry - The lifter's anthropometric profile
 * @param variant - Squat variant (highBar, lowBar, or front)
 * @returns Complete kinematic solution with positions, angles, and moment arms
 */
export function solveSquatKinematics(
  anthropometry: Anthropometry,
  variant: SquatVariant | "highBar" | "lowBar" | "front"
): KinematicSolution {
  // Get bar position offsets (convert cm to meters)
  const barOffset = BAR_POSITIONS[variant as keyof typeof BAR_POSITIONS];
  const barOffsetHorizontal = barOffset.horizontal / 100; // cm to m
  const barOffsetVertical = barOffset.vertical / 100; // cm to m

  // Get segment lengths
  const L_tibia = anthropometry.segments.tibia;
  const L_femur = anthropometry.segments.femur;
  const L_torso = anthropometry.segments.torso;

  // Set femur angle (0° = parallel to ground at depth)
  const theta_femur = 0; // degrees
  const theta_femur_rad = toRadians(theta_femur);

  // Start with maximum ankle dorsiflexion
  let alpha = anthropometry.mobility.maxAnkleDorsiflexion; // degrees
  let foundSolution = false;
  let solution: KinematicSolution | null = null;

  // Iterate, reducing ankle angle until we find a valid solution
  while (alpha >= KINEMATIC_SOLVER.minAnkleDorsiflexion && !foundSolution) {
    const alpha_rad = toRadians(alpha);

    // Step a: Calculate knee position (ankle at origin)
    const knee: Point2D = {
      x: L_tibia * Math.sin(alpha_rad),
      y: L_tibia * Math.cos(alpha_rad),
    };

    // Step b: Calculate hip position
    const hip: Point2D = {
      x: knee.x - L_femur * Math.cos(theta_femur_rad),
      y: knee.y + L_femur * Math.sin(theta_femur_rad),
    };

    // Step c: Solve for trunk angle
    // We want bar over midfoot (bar.x = 0)
    // bar.x = shoulder.x + barOffsetHorizontal = hip.x + L_torso * sin(θ_trunk) + barOffsetHorizontal
    // Setting bar.x = 0: sin(θ_trunk) = (-hip.x - barOffsetHorizontal) / L_torso
    const sin_trunk = (-hip.x - barOffsetHorizontal) / L_torso;

    // Step d: Check if this gives a valid trunk angle
    if (Math.abs(sin_trunk) <= 1) {
      // Valid sine value, calculate trunk angle
      const theta_trunk_rad = Math.asin(sin_trunk);
      const theta_trunk = toDegrees(theta_trunk_rad);

      // Check if trunk angle is within valid range
      if (
        theta_trunk >= KINEMATIC_SOLVER.minTrunkAngle &&
        theta_trunk <= KINEMATIC_SOLVER.maxTrunkAngle
      ) {
        // Valid solution found!
        foundSolution = true;

        // Calculate shoulder position
        const shoulder: Point2D = {
          x: hip.x + L_torso * Math.sin(theta_trunk_rad),
          y: hip.y + L_torso * Math.cos(theta_trunk_rad),
        };

        // Calculate bar position
        const bar: Point2D = {
          x: shoulder.x + barOffsetHorizontal,
          y: shoulder.y + barOffsetVertical,
        };

        // Calculate moment arms (horizontal distances)
        const momentArms = {
          hip: Math.abs(bar.x - hip.x),
          knee: Math.abs(bar.x - knee.x),
        };

        // Calculate displacement (bar travel distance from standing to depth)
        // Standing position: bar.y = hipHeight + L_torso + barOffsetVertical
        const Y_stand =
          anthropometry.derived.hipHeight + L_torso + barOffsetVertical;
        const displacement = Y_stand - bar.y;

        // Calculate knee and hip angles
        // Knee angle: angle between tibia and femur
        const knee_angle = toDegrees(Math.atan2(knee.x, knee.y) + theta_femur_rad);

        // Hip angle: angle between femur and torso
        const hip_angle = toDegrees(theta_femur_rad + theta_trunk_rad);

        solution = {
          valid: true,
          mobilityLimited: alpha < anthropometry.mobility.maxAnkleDorsiflexion,
          positions: {
            ankle: { x: 0, y: 0 }, // Origin
            knee,
            hip,
            shoulder,
            bar,
          },
          angles: {
            ankle: alpha,
            knee: knee_angle,
            hip: hip_angle,
            trunk: theta_trunk,
          },
          momentArms,
          displacement,
        };
      }
    }

    // Step e: Reduce ankle angle and try again
    alpha -= KINEMATIC_SOLVER.ankleDecrementStep;
  }

  // Step 5: If no solution found, return fallback
  if (!solution) {
    const fallbackDisplacement =
      KINEMATIC_SOLVER.fallbackDisplacementFactor * anthropometry.segments.height;

    return {
      valid: false,
      mobilityLimited: true,
      positions: {
        ankle: { x: 0, y: 0 },
        knee: { x: 0, y: 0 },
        hip: { x: 0, y: 0 },
        shoulder: { x: 0, y: 0 },
        bar: { x: 0, y: 0 },
      },
      angles: {
        ankle: 0,
        knee: 0,
        hip: 0,
        trunk: 0,
      },
      momentArms: {
        hip: 0,
        knee: 0,
      },
      displacement: fallbackDisplacement,
    };
  }

  return solution;
}
