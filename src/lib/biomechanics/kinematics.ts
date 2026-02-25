import { Anthropometry, KinematicSolution, Point2D, SquatVariant, SquatStance } from "../../types";
import {
  AVERAGE_CHEST_DEPTH,
  BAR_POSITIONS,
  BENCH_ARCH_HEIGHTS,
  BENCH_GRIP_ANGLES,
  HAND_GRIP_RATIO,
  KINEMATIC_SOLVER,
  MIN_BENCH_DISPLACEMENT,
  SQUAT_STANCE_MODIFIERS,
  STANDARD_PLATE_RADIUS,
  SUMO_STANCE_MODIFIERS,
} from "./constants";

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
  stance: SquatStance | "narrow" | "normal" | "wide" | "ultraWide" = "normal",
  depth: "parallel" | "belowParallel" = "parallel"
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
  // Below parallel = 10 degrees lower (negative)
  const theta_femur = depth === "belowParallel" ? -10 : 0; // degrees
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
            toe: { x: anthropometry.segments.footLength, y: 0 },
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
        toe: { x: 0, y: 0 },
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
/**
 * Solves deadlift kinematics using a geometric iterative solver
 * Finds the body configuration (angles) that satisfies the closed chain constraint:
 * 1. Arms are vertical (or nearly so) gripping the bar
 * 2. Bar is at specified height (floor +/- offset)
 * 3. Body segments (Tibia + Femur + Torso) connect Ankle to Shoulder
 *
 * @param anthropometry - The lifter's anthropometric profile
 * @param variant - Deadlift variant (conventional or sumo)
 * @param stance - Stance width for sumo
 * @param barStartHeightOffset - Bar elevation offset in meters (default: 0)
 * @returns Complete kinematic solution including displacement and moment arms at starting position
 */
export function solveDeadliftKinematics(
  anthropometry: Anthropometry,
  variant: "conventional" | "sumo",
  stance: "hybrid" | "normal" | "wide" | "ultraWide" = "normal",
  barStartHeightOffset: number = 0
): KinematicSolution {
  const segments = anthropometry.segments;

  // 1. Determine Bar Height
  const barStartHeight = STANDARD_PLATE_RADIUS + barStartHeightOffset;

  // 2. Adjust Limit Lengths for Stance (Sumo)
  // Wider stance = shorter effective femur/ROM in sagittal plane
  let effectiveFemur = segments.femur;
  const effectiveTibia = segments.tibia; // Stance mainly affects femur, but for simplicity...
  // Actually sumo stance modifiers are in constants
  if (variant === "sumo") {
    const mod = SUMO_STANCE_MODIFIERS[stance];
    effectiveFemur = segments.femur * mod.femurMultiplier;
    // Note: we don't apply ROM multiplier here directly, we solve geometry.
    // The "shorter femur" effect naturally reduces ROM in the solver.
  }

  // 3. Target Shoulder Height
  // Shoulder must be at height where arms can reach the bar.
  // We assume vertical arms at start for max efficiency (or slight angle).
  // Y_shoulder = Y_bar + L_arm
  // Note: Most lifters engage Lats, slight arm angle, but vertical is good baseline constraint.
  const armLength = segments.upperArm + segments.forearm + segments.hand * HAND_GRIP_RATIO; // Hand is engaging bar
  const targetShoulderHeight = barStartHeight + armLength;

  // 5. Iterative Solver
  // We iterate HIP ANGLE (relative to ground/femur) to find valid chain.
  // Actually, standard approach: Iterate Tibia Angle (Shank angle).
  // Vertical shank (90) -> Forward shank (<90).
  // Find Tibia angle that puts Shoulder at Target Height.

  let bestSolution: KinematicSolution | null = null;

  // Iterate Tibia Angle from 90 (vertical) down to ~50
  for (let tibiaAngle = 90; tibiaAngle > 50; tibiaAngle -= 0.5) {
    const tibiaRad = toRadians(tibiaAngle);

    // Knee Position
    // Wait, standard ref frame: Ankle at (0,0)? 
    // Let's put Ankle at (0, footHeight).
    // Tibia angle is usually measured from horizontal? Or Vertical?
    // Let's use standard trig: Angle 90 = vertical.
    const kneeY = segments.footHeight + effectiveTibia * Math.sin(tibiaRad);
    const kneeX_pos = effectiveTibia * Math.cos(tibiaRad); // Forward movement

    // Now we need to solve for Hip Angle / Torso Angle.
    // Constraint: Shoulder Y = targetShoulderHeight.
    // Chain: Knee -> Hip -> Shoulder.
    // Y_shoulder = Y_knee + L_femur * sin(femurAngle) + L_torso * sin(torsoAngle) = Target
    // X_shoulder = X_knee - L_femur * cos(femurAngle) + L_torso * cos(torsoAngle)

    // Constraint 2: Bar is over Midfoot (X=0 approx).
    // So X_shoulder should be approx 0 (Vertical arms).

    // We have 2 unknowns: FemurAngle, TorsoAngle.
    // We have 2 constraints: Y_shoulder, X_shoulder.
    // This is Inverse Kinematics for a 2-link arm (Femur+Torso) reaching from Knee to ShoulderTarget.

    const targetShoulderX = 0; // Bar over midfoot

    // Distance from Knee to TargetShoulder
    const dx = targetShoulderX - kneeX_pos;
    const dy = targetShoulderHeight - kneeY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Check reachability
    if (dist > (effectiveFemur + segments.torso)) continue; // Can't reach

    // Use Law of Cosines to find internal angles
    // triangle sides: a=torso, b=femur, c=dist
    const a = segments.torso;
    const b = effectiveFemur;
    const c = dist;

    // Angle at Knee (between c and b)
    // cos(alpha) = (b^2 + c^2 - a^2) / (2bc)
    const cosAlpha = (b * b + c * c - a * a) / (2 * b * c);
    if (Math.abs(cosAlpha) > 1) continue;
    const alpha = Math.acos(cosAlpha);

    // Angle of vector C (Knee to Shoulder)
    const angleC = Math.atan2(dy, dx);

    // Femur Angle (global) = angleC - alpha (assuming knee bends backward relative to line)
    // Standard DL: Hip helps.
    const femurRad = angleC + alpha; // "Knee up"? No, Knee is low. Femur goes UP from knee.
    // Check geometry visually: Knee(low) -> Hip(high). Vector C is Up-Left(ish).
    // We want Hip to be "behind" the line connecting Knee-Shoulder?
    // Usually Hip is posterior. So femur angle should be such that X_hip < X_line.
    // Actually Law of Cosines gives internal angle.
    // Let's try simple IK function from utils if meaningful, but inline is fine.

    // Solution 1: Knee Up / Hip Back (Standard)
    // Femur angle
    const thetaFemur = angleC + alpha; // Or minus?
    // If we add alpha, hip is "above" the line? 
    // X_hip = KneeX + L_femur * cos(thetaFemur)

    // Let's calculate actual positions
    const hipX = kneeX_pos + effectiveFemur * Math.cos(thetaFemur);
    const hipY = kneeY + effectiveFemur * Math.sin(thetaFemur);

    // Check if Hip is behind Knee (X_hip < X_knee)? Not necessarily for sumo, but for conv yes.
    // Standard deadlift: Hip is behind bar.
    // If HipX > 0 (in front of bar), that's invalid.
    if (hipX > 0.1) {
      // If pure math puts hip forward, try the other solution (angleC - alpha)
      // But usually we constrained X_shoulder=0.
      continue;
    }

    // Torso Angle (from Hip to Shoulder)
    const torsoRad = Math.atan2(targetShoulderHeight - hipY, targetShoulderX - hipX);

    // Valid Torso check (must be upright-ish, 0-90 deg)
    const torsoDeg = toDegrees(torsoRad);
    if (torsoDeg < 10 || torsoDeg > 170) continue;

    // Valid solution found.
    // Calculate Moment Arms based on horizontal distances to Bar (X=0)
    const hipMomentArm = Math.abs(hipX - 0);
    const kneeMomentArm = Math.abs(kneeX_pos - 0); // Knee to Bar
    // Note: If X_bar=0, and KneeX > 0 (knees forward), moment arm is dist.

    // If we found a valid one, is it the "best"? 
    // Humans optimize for... ? 
    // Usually "hips as high as possible without losing back angle" or "shins touching bar".
    // Constraint: Shins touching bar means KneeX <= approx 0? 
    // Actually bar is over midfoot. Shins touch bar implies KneeX approx 0 or slightly behind if vertical.
    // If KneeX > 0, shins are going *through* the bar.
    // So constraint: KneeX <= BarRadius? 
    // Let's apply penalty if KneeX is too far forward (shins crossing bar line).

    if (kneeX_pos > 0.05) continue; // Shins maximize verticality.

    // Calculate elbow and wrist positions for visualization (Vertical Arms assumption)
    // Wrist is at Bar Height (roughly)
    const wristPos = { x: targetShoulderX, y: barStartHeight }; // Approx
    // Elbow is down from shoulder
    const elbowPos = { x: targetShoulderX, y: targetShoulderHeight - segments.upperArm };

    bestSolution = {
      valid: true,
      mobilityLimited: false,
      positions: {
        ankle: { x: 0, y: segments.footHeight },
        knee: { x: kneeX_pos, y: kneeY },
        hip: { x: hipX, y: hipY },
        shoulder: { x: targetShoulderX, y: targetShoulderHeight },
        elbow: elbowPos,
        wrist: wristPos,
        bar: { x: targetShoulderX, y: barStartHeight }, // Arms vertical
        toe: { x: anthropometry.segments.footLength, y: segments.footHeight },
      },
      angles: {
        ankle: tibiaAngle,
        knee: toDegrees(femurRad), // Relative to horizontal
        hip: toDegrees(torsoRad), // Relative to horizontal
        trunk: torsoDeg
      },
      momentArms: {
        hip: hipMomentArm,
        knee: kneeMomentArm
      },
      displacement: 0 // Will be calc'd by caller or standard logic? 
      // Caller calculates displacement = lockout - start.
      // We just return start positions.
    };

    // Break on first valid "Shin-contact" solution (high hips preference? 
    // Iterating from 90 down keeps shins most vertical => High hips.
    break;
  }

  if (!bestSolution) {
    // Fallback if geometry fails (e.g. extremely short arms)
    return {
      valid: false,
      mobilityLimited: true,
      positions: { ankle: { x: 0, y: 0 }, knee: { x: 0, y: 0 }, hip: { x: 0, y: 0 }, shoulder: { x: 0, y: 0 }, bar: { x: 0, y: 0 }, toe: { x: 0, y: 0 } },
      angles: { ankle: 0, knee: 0, hip: 0, trunk: 0 },
      momentArms: { hip: 0, knee: 0 },
      displacement: 0
    };
  }

  // Recalculate displacement based on lockout.
  // Sumo reduces sagittal-plane ROM via stance-dependent multipliers.
  const lockoutHeight =
    anthropometry.derived.acromionHeight - anthropometry.derived.totalArm;
  const conventionalDisplacement = lockoutHeight - barStartHeight;
  const romMultiplier =
    variant === "sumo" ? SUMO_STANCE_MODIFIERS[stance].romMultiplier : 1;
  bestSolution.displacement = conventionalDisplacement * romMultiplier;

  return bestSolution;
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

  // Grip angles are defined from vertical in biomechanics constants.
  const gripAngle = BENCH_GRIP_ANGLES[gripWidth];
  const gripAngleRad = toRadians(gripAngle);

  // Calculate bar position at lockout
  const armLength = segments.upperArm + segments.forearm + segments.hand * HAND_GRIP_RATIO;
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

  // Get arch height from shared constants.
  const archHeight = BENCH_ARCH_HEIGHTS[archStyle];

  // Calculate displacement
  const chestDepth = AVERAGE_CHEST_DEPTH;
  const displacement = Math.max(
    barExtension - chestDepth - archHeight,
    MIN_BENCH_DISPLACEMENT
  );

  return {
    valid: true,
    mobilityLimited: false,
    positions: {
      ankle: { x: ankleX, y: ankleY },
      knee: { x: kneeX, y: kneeY },
      hip: { x: hipX, y: hipY },
      shoulder: { x: shoulderX, y: shoulderY },
      elbow: { x: elbowX, y: elbowY },
      wrist: { x: wristX, y: wristY },
      bar: { x: barX, y: barY },
      toe: { x: ankleX + segments.footLength, y: ankleY },
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

  const elbowOffsetFactor =
    grip === "supinated" ? 0.24 : grip === "neutral" ? 0.30 : 0.36;
  const elbowX = segments.upperArm * elbowOffsetFactor;
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
  // Effective Arm = Upper + Fore + Hand*Grip
  const effectiveArm = segments.upperArm + segments.forearm + segments.hand * HAND_GRIP_RATIO;

  const displacement = effectiveArm * 0.95;

  return {
    valid: true,
    mobilityLimited: false,
    positions: {
      ankle: { x: ankleX, y: ankleY },
      knee: { x: kneeX, y: kneeY },
      hip: { x: hipX, y: hipY },
      shoulder: { x: shoulderX, y: shoulderY },
      elbow: { x: elbowX, y: elbowY },
      wrist: { x: handX, y: handY }, // Hands on bar
      bar: { x: handX, y: handY },
      toe: { x: ankleX, y: ankleY - segments.footLength }, // Hanging
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
  const armLength = segments.upperArm + segments.forearm + segments.hand * HAND_GRIP_RATIO;
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
      elbow: { x: 0, y: shoulderY + segments.upperArm },
      wrist: { x: 0, y: barY },
      bar: { x: barX, y: barY },
      toe: { x: anthropometry.segments.footLength, y: ankleY },
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
  const armLength = segments.upperArm + segments.forearm + segments.hand * HAND_GRIP_RATIO;
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
      elbow: { x: 0, y: shoulderY + segments.upperArm },
      wrist: { x: 0, y: barY },
      bar: { x: 0, y: barY },
      toe: { x: anthropometry.segments.footLength, y: ankleY },
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
  const armLength = segments.upperArm + segments.forearm + segments.hand * HAND_GRIP_RATIO;
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
      elbow: { x: shoulderX * 0.5, y: shoulderY * 0.5 }, // Approx
      wrist: { x: 0, y: 0 },
      bar: { x: 0, y: handY }, // "Bar" represents hand position
      toe: { x: ankleX - segments.footLength, y: 0 },
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
