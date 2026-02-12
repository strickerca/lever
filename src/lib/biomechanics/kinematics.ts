import { Anthropometry, KinematicSolution, Point2D, SquatVariant, SquatStance } from "../../types";
import { BAR_POSITIONS, KINEMATIC_SOLVER, SQUAT_STANCE_MODIFIERS, STANDARD_PLATE_RADIUS, AVERAGE_CHEST_DEPTH } from "./constants";

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
 * @param stance - Stance width (optional, defaults to normal)
 * @returns Complete kinematic solution with positions, angles, and moment arms
 */
export function solveSquatKinematics(
  anthropometry: Anthropometry,
  variant: SquatVariant | "highBar" | "lowBar" | "front",
  stance: SquatStance | "narrow" | "normal" | "wide" | "ultraWide" = "normal"
): KinematicSolution {
  // Get bar position offsets (convert cm to meters)
  const barOffset = BAR_POSITIONS[variant as keyof typeof BAR_POSITIONS];
  const barOffsetHorizontal = barOffset.horizontal / 100; // cm to m
  const barOffsetVertical = barOffset.vertical / 100; // cm to m

  // Get stance modifiers
  const stanceModifiers = SQUAT_STANCE_MODIFIERS[stance as keyof typeof SQUAT_STANCE_MODIFIERS];

  // Get segment lengths with stance adjustments
  const L_tibia = anthropometry.segments.tibia;
  const L_femur = anthropometry.segments.femur * stanceModifiers.femurMultiplier;
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

    // Step c: Solve for trunk angle with rotating bar offset
    // The bar offset rotates with the trunk (bar sits on back, which rotates as a rigid body)
    // With rotation, bar.x = shoulder.x + h*cos(θ) + v*sin(θ) where h=horizontal, v=vertical offset
    // Expanding: hip.x + L_torso*sin(θ) + h*cos(θ) + v*sin(θ) = 0
    // Rearranging: (L_torso + v)*sin(θ) + h*cos(θ) = -hip.x
    // This is A*sin(θ) + B*cos(θ) = C, solved via: θ = arcsin(C/√(A²+B²)) - arctan(B/A)
    const A = L_torso + barOffsetVertical;
    const B = barOffsetHorizontal;
    const C = -hip.x;

    const magnitude = Math.sqrt(A * A + B * B);
    const phi = Math.atan2(B, A);

    // sin(θ + φ) = C / magnitude
    const sin_theta_plus_phi = C / magnitude;

    // Step d: Check if this gives a valid trunk angle
    if (Math.abs(sin_theta_plus_phi) <= 1) {
      // Valid sine value, calculate trunk angle
      const theta_trunk_rad = Math.asin(sin_theta_plus_phi) - phi;
      const theta_trunk = toDegrees(theta_trunk_rad);

      // Check if trunk angle is within valid range (adjusted for stance)
      const maxTrunkAngle = KINEMATIC_SOLVER.maxTrunkAngle + stanceModifiers.maxTrunkAngleAdjustment;
      if (
        theta_trunk >= KINEMATIC_SOLVER.minTrunkAngle &&
        theta_trunk <= maxTrunkAngle
      ) {
        // Valid solution found!
        foundSolution = true;

        // Calculate shoulder position
        const shoulder: Point2D = {
          x: hip.x + L_torso * Math.sin(theta_trunk_rad),
          y: hip.y + L_torso * Math.cos(theta_trunk_rad),
        };

        // Calculate bar position with offset rotated by trunk angle
        // The bar sits on the back and rotates with the trunk as a rigid body
        // Rotation formula: (h,v) -> (h*cos(θ)+v*sin(θ), -h*sin(θ)+v*cos(θ))
        const bar_x_offset =
          barOffsetHorizontal * Math.cos(theta_trunk_rad) +
          barOffsetVertical * Math.sin(theta_trunk_rad);
        const bar_y_offset =
          -barOffsetHorizontal * Math.sin(theta_trunk_rad) +
          barOffsetVertical * Math.cos(theta_trunk_rad);

        const bar: Point2D = {
          x: shoulder.x + bar_x_offset,
          y: shoulder.y + bar_y_offset,
        };

        // Calculate moment arms (horizontal distances)
        const momentArms = {
          hip: Math.abs(bar.x - hip.x),
          knee: Math.abs(bar.x - knee.x),
        };

        // Calculate displacement (bar travel distance from standing to depth)
        // Standing position: trunk is vertical (θ=0), so bar.y = hipHeight + L_torso + barOffsetVertical
        // At depth: bar.y uses the rotated offset, properly accounting for bar position
        // This means high bar (barOffsetVertical=+5cm) has MORE ROM than low bar (barOffsetVertical=-5cm)
        // because the vertical offset no longer cancels out when the offset rotates with trunk
        const Y_stand =
          anthropometry.derived.hipHeight + L_torso + barOffsetVertical;
        const displacement = (Y_stand - bar.y) * stanceModifiers.romMultiplier;

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

/**
 * Solves deadlift kinematics
 *
 * @param anthropometry - The lifter's anthropometric profile
 * @param variant - Deadlift variant (conventional or sumo)
 * @param stance - Stance width for sumo
 * @param barStartHeightOffset - Bar elevation offset in meters (default: 0)
 *   - NEGATIVE values = DEFICIT (bar lower than floor)
 *   - POSITIVE values = BLOCKS (bar higher than floor)
 *   - Affects displacement and moment arms (higher bar = more upright = smaller moment arms)
 * @returns Complete kinematic solution including displacement and moment arms at starting position
 */
export function solveDeadliftKinematics(
  anthropometry: Anthropometry,
  variant: "conventional" | "sumo",
  stance: "hybrid" | "normal" | "wide" | "ultraWide" = "normal",
  barStartHeightOffset: number = 0
): KinematicSolution {
  const segments = anthropometry.segments;

  // Starting position (bar height includes offset)
  //
  // Sign convention:
  //   offset < 0 → DEFICIT (bar LOWER than standard floor)
  //   offset = 0 → STANDARD floor pull
  //   offset > 0 → BLOCKS (bar HIGHER than standard floor)
  const barStartHeight = STANDARD_PLATE_RADIUS + barStartHeightOffset;

  // Simplified deadlift position at lockout
  // Hip is at standing height
  const hipHeight = segments.femur + segments.tibia + segments.footHeight;
  const shoulderHeight = hipHeight + segments.torso;

  // Bar position at lockout (hands at hip level, arms extended)
  // Use same formula as physics.ts: acromionHeight - totalArm
  const barX = 0;
  const barY = anthropometry.derived.acromionHeight - anthropometry.derived.totalArm;

  // Knee slightly bent at lockout
  const kneeX = 0;
  const kneeY = segments.tibia + segments.footHeight;

  // Hip directly above knee for conventional, wider for sumo
  const hipX = variant === "sumo" ? segments.femur * 0.1 : 0;
  const hipY = hipHeight;

  // Shoulder slightly behind bar
  const shoulderX = -segments.torso * 0.05;
  const shoulderY = shoulderHeight;

  // Calculate displacement (bar travel from start to lockout)
  // Blocks reduce ROM, deficits increase ROM
  const displacement = barY - barStartHeight;

  // Calculate angles (simplified - at lockout position)
  const ankleAngle = 90; // Standing position
  const kneeAngle = 175; // Nearly straight
  const hipAngle = 175; // Nearly straight
  const trunkAngle = 5; // Nearly vertical

  // Moment arms at starting position (more relevant for torque calculations)
  // These scale inversely with bar start height - higher start = more upright = smaller moment arms
  // Use standard plate radius as reference, scale inversely
  const referenceMomentArm = STANDARD_PLATE_RADIUS * 0.4;
  const hipMomentArm = referenceMomentArm * (STANDARD_PLATE_RADIUS / barStartHeight);
  const kneeMomentArm = hipMomentArm * 0.5; // Knee moment arm is roughly half of hip

  return {
    valid: true,
    mobilityLimited: false,
    positions: {
      ankle: { x: 0, y: segments.footHeight },
      knee: { x: kneeX, y: kneeY },
      hip: { x: hipX, y: hipY },
      shoulder: { x: shoulderX, y: shoulderY },
      bar: { x: barX, y: barY },
    },
    angles: {
      ankle: ankleAngle,
      knee: kneeAngle,
      hip: hipAngle,
      trunk: trunkAngle,
    },
    momentArms: {
      hip: hipMomentArm,
      knee: kneeMomentArm,
    },
    displacement,
  };
}

/**
 * Solves bench press kinematics
 *
 * @param anthropometry - The lifter's anthropometric profile
 * @param gripWidth - Grip width
 * @param archStyle - Arch style
 * @returns Complete kinematic solution
 */
export function solveBenchKinematics(
  anthropometry: Anthropometry,
  gripWidth: "narrow" | "medium" | "wide",
  archStyle: "flat" | "moderate" | "competitive" | "extreme"
): KinematicSolution {
  const segments = anthropometry.segments;

  // Lifter is lying on bench
  // Origin at shoulder level
  const shoulderHeight = 0.45; // Bench height in meters

  // Lockout position
  const shoulderX = 0;
  const shoulderY = shoulderHeight;

  // Get grip angle
  const gripAngles = { narrow: 45, medium: 75, wide: 85 };
  const gripAngle = gripAngles[gripWidth];
  const gripAngleRad = toRadians(gripAngle);

  // Calculate bar position at lockout
  const armLength = segments.upperArm + segments.forearm;
  const barExtension = armLength * Math.cos(gripAngleRad);
  const barX = 0;
  const barY = shoulderY + barExtension;

  // Elbow position
  const elbowX = segments.upperArm * Math.sin(gripAngleRad) * 0.5;
  const elbowY = shoulderY + segments.upperArm * Math.cos(gripAngleRad);

  // Wrist/hand position (on bar)
  const wristX = barX;
  const wristY = barY;

  // Hip and leg positions (lying down)
  const hipX = 0;
  const hipY = shoulderHeight - segments.torso * 0.3;

  const kneeX = segments.femur * 0.3;
  const kneeY = hipY - segments.femur * 0.5;

  const ankleX = kneeX + segments.tibia * 0.5;
  const ankleY = 0; // Feet on ground

  // Get arch height
  const archHeights = { flat: 0, moderate: 0.05, competitive: 0.08, extreme: 0.12 };
  const archHeight = archHeights[archStyle];

  // Calculate displacement
  const chestDepth = AVERAGE_CHEST_DEPTH;
  const displacement = barExtension - chestDepth - archHeight;

  // Calculate angles
  const shoulderAngle = gripAngle;
  const elbowAngle = 180 - gripAngle;

  // Moment arms (horizontal distance from shoulder to bar)
  const shoulderMomentArm = Math.abs(barX - shoulderX);

  return {
    valid: true,
    mobilityLimited: false,
    positions: {
      ankle: { x: ankleX, y: ankleY },
      knee: { x: kneeX, y: kneeY },
      hip: { x: hipX, y: hipY },
      shoulder: { x: shoulderX, y: shoulderY },
      bar: { x: barX, y: barY },
    },
    angles: {
      ankle: 90,
      knee: 120,
      hip: 100,
      trunk: 5, // Slight arch
    },
    momentArms: {
      hip: 0, // Not relevant for bench
      knee: 0, // Not relevant for bench
    },
    displacement,
  };
}

/**
 * Solves pullup kinematics
 *
 * @param anthropometry - The lifter's anthropometric profile
 * @param grip - Grip type
 * @returns Complete kinematic solution
 */
export function solvePullupKinematics(
  anthropometry: Anthropometry,
  grip: "supinated" | "neutral" | "pronated"
): KinematicSolution {
  const segments = anthropometry.segments;

  // Top position (chin at bar)
  const barHeight = 2.5; // Standard bar height in meters

  // At top position
  const shoulderY = barHeight - segments.headNeck * 0.5;
  const shoulderX = 0;

  // Elbow bent at ~90 degrees
  const elbowAngle = 90;
  const elbowAngleRad = toRadians(elbowAngle);

  const elbowX = segments.upperArm * 0.3;
  const elbowY = shoulderY + segments.upperArm * Math.cos(elbowAngleRad);

  // Hands on bar
  const handX = 0;
  const handY = barHeight;

  // Hip below shoulder (body hanging)
  const hipX = 0;
  const hipY = shoulderY - segments.torso;

  // Legs hanging
  const kneeX = 0;
  const kneeY = hipY - segments.femur;

  const ankleX = 0;
  const ankleY = kneeY - segments.tibia;

  // Calculate displacement (total arm length * 0.95)
  const displacement = anthropometry.derived.totalArm * 0.95;

  return {
    valid: true,
    mobilityLimited: false,
    positions: {
      ankle: { x: ankleX, y: ankleY },
      knee: { x: kneeX, y: kneeY },
      hip: { x: hipX, y: hipY },
      shoulder: { x: shoulderX, y: shoulderY },
      bar: { x: handX, y: handY },
    },
    angles: {
      ankle: 180, // Legs straight
      knee: 180,
      hip: 180,
      trunk: 0, // Vertical
    },
    momentArms: {
      hip: 0,
      knee: 0,
    },
    displacement,
  };
}

/**
 * Solves OHP kinematics
 *
 * @param anthropometry - The lifter's anthropometric profile
 * @returns Complete kinematic solution
 */
export function solveOHPKinematics(
  anthropometry: Anthropometry
): KinematicSolution {
  const segments = anthropometry.segments;

  // Standing position
  const ankleY = segments.footHeight;
  const kneeY = ankleY + segments.tibia;
  const hipY = kneeY + segments.femur;
  const shoulderY = hipY + segments.torso;

  // Arms extended overhead at lockout
  const armLength = segments.upperArm + segments.forearm;
  const barY = shoulderY + armLength;
  const barX = 0;

  // Calculate displacement (full arm extension from shoulder)
  const displacement = armLength * 0.95; // Not quite full extension

  return {
    valid: true,
    mobilityLimited: false,
    positions: {
      ankle: { x: 0, y: ankleY },
      knee: { x: 0, y: kneeY },
      hip: { x: 0, y: hipY },
      shoulder: { x: 0, y: shoulderY },
      bar: { x: barX, y: barY },
    },
    angles: {
      ankle: 90,
      knee: 180,
      hip: 180,
      trunk: 0, // Vertical
    },
    momentArms: {
      hip: 0,
      knee: 0,
    },
    displacement,
  };
}

/**
 * Solves thruster kinematics (combination of front squat + OHP)
 *
 * @param anthropometry - The lifter's anthropometric profile
 * @returns Complete kinematic solution
 */
export function solveThrusterKinematics(
  anthropometry: Anthropometry
): KinematicSolution {
  const segments = anthropometry.segments;

  // At top position (like OHP lockout)
  const ankleY = segments.footHeight;
  const kneeY = ankleY + segments.tibia;
  const hipY = kneeY + segments.femur;
  const shoulderY = hipY + segments.torso;

  // Arms extended overhead
  const armLength = segments.upperArm + segments.forearm;
  const barY = shoulderY + armLength;

  // Displacement combines squat depth + overhead press
  const squatDisplacement = segments.femur * 0.8; // Approximate squat depth
  const pressDisplacement = armLength * 0.95;
  const displacement = squatDisplacement + pressDisplacement;

  return {
    valid: true,
    mobilityLimited: false,
    positions: {
      ankle: { x: 0, y: ankleY },
      knee: { x: 0, y: kneeY },
      hip: { x: 0, y: hipY },
      shoulder: { x: 0, y: shoulderY },
      bar: { x: 0, y: barY },
    },
    angles: {
      ankle: 90,
      knee: 180,
      hip: 180,
      trunk: 0,
    },
    momentArms: {
      hip: 0,
      knee: 0,
    },
    displacement,
  };
}

/**
 * Solves pushup kinematics
 *
 * @param anthropometry - The lifter's anthropometric profile
 * @returns Complete kinematic solution
 */
export function solvePushupKinematics(
  anthropometry: Anthropometry
): KinematicSolution {
  const segments = anthropometry.segments;

  // Pushup position (plank-like)
  // Origin at hands/ground level
  const handY = 0;

  // At top position, arms extended
  const armLength = segments.upperArm + segments.forearm;
  const shoulderY = armLength * Math.cos(toRadians(80)); // Slight angle
  const shoulderX = armLength * Math.sin(toRadians(80)) * 0.3;

  // Hip aligned with body
  const hipX = shoulderX + segments.torso * Math.sin(toRadians(10));
  const hipY = shoulderY - segments.torso * Math.cos(toRadians(10));

  // Legs extended behind
  const kneeX = hipX;
  const kneeY = hipY - segments.femur * 0.5;

  const ankleX = kneeX;
  const ankleY = kneeY - segments.tibia * 0.5;

  // Displacement (vertical distance torso travels)
  const displacement = armLength * 0.6; // Approximate chest-to-ground distance

  return {
    valid: true,
    mobilityLimited: false,
    positions: {
      ankle: { x: ankleX, y: ankleY },
      knee: { x: kneeX, y: kneeY },
      hip: { x: hipX, y: hipY },
      shoulder: { x: shoulderX, y: shoulderY },
      bar: { x: 0, y: handY }, // "Bar" represents hand position
    },
    angles: {
      ankle: 180,
      knee: 180,
      hip: 180,
      trunk: 10, // Slight plank angle
    },
    momentArms: {
      hip: 0,
      knee: 0,
    },
    displacement,
  };
}
