import {
  Anthropometry,
  AnthropometryMode,
  DerivedAnthropometry,
  MobilityProfile,
  SDModifiers,
  SegmentLengths,
  Sex,
} from "../../types";
import {
  DEFAULT_MOBILITY,
  HEIGHT_NORMALIZATION_TOLERANCE,
  SD_MULTIPLIER_COEFFICIENT,
  SEGMENT_RATIOS,
} from "./constants";

/**
 * Creates a simple anthropometry profile using standard segment ratios
 * @param height - Standing height in meters
 * @param mass - Body mass in kilograms
 * @param sex - Biological sex (affects segment ratios)
 * @returns Complete anthropometry profile
 */
export function createSimpleProfile(
  height: number,
  mass: number,
  sex: Sex
): Anthropometry {
  const ratios = SEGMENT_RATIOS[sex];

  // Apply standard ratios to height
  const segments: SegmentLengths = {
    height,
    headNeck: height * ratios.headNeck,
    torso: height * ratios.torso,
    upperArm: height * ratios.upperArm,
    forearm: height * ratios.forearm,
    hand: height * ratios.hand,
    femur: height * ratios.femur,
    tibia: height * ratios.tibia,
    footHeight: height * ratios.footHeight,
  };

  // Note: Simple mode does NOT normalize (ratios sum to 0.948)
  // Advanced mode normalizes after applying SD modifiers

  // Compute derived anthropometry
  const derived = computeDerivedAnthropometry(segments, height);

  return {
    mode: AnthropometryMode.SIMPLE,
    sex,
    mass,
    segments,
    derived,
    mobility: { ...DEFAULT_MOBILITY },
  };
}

/**
 * Creates an advanced anthropometry profile with SD modifiers
 * @param height - Standing height in meters
 * @param mass - Body mass in kilograms
 * @param sex - Biological sex
 * @param sdModifiers - Standard deviation modifiers for each segment group (-3 to +3)
 * @returns Complete anthropometry profile with modified proportions
 */
export function createAdvancedProfile(
  height: number,
  mass: number,
  sex: Sex,
  sdModifiers: SDModifiers
): Anthropometry {
  const ratios = SEGMENT_RATIOS[sex];

  // Calculate multipliers using formula: 1 + (SD × 0.045)
  const armMultiplier = 1 + sdModifiers.arms * SD_MULTIPLIER_COEFFICIENT;
  const legMultiplier = 1 + sdModifiers.legs * SD_MULTIPLIER_COEFFICIENT;
  const torsoMultiplier = 1 + sdModifiers.torso * SD_MULTIPLIER_COEFFICIENT;

  // Apply ratios with modifiers
  let segments: SegmentLengths = {
    height,
    headNeck: height * ratios.headNeck, // Head/neck not modified
    torso: height * ratios.torso * torsoMultiplier,
    upperArm: height * ratios.upperArm * armMultiplier,
    forearm: height * ratios.forearm * armMultiplier,
    hand: height * ratios.hand * armMultiplier,
    femur: height * ratios.femur * legMultiplier,
    tibia: height * ratios.tibia * legMultiplier,
    footHeight: height * ratios.footHeight * legMultiplier,
  };

  // Normalize to ensure segments sum to target height
  segments = normalizeToHeight(segments, height);

  // Compute derived anthropometry
  const derived = computeDerivedAnthropometry(segments, height);

  return {
    mode: AnthropometryMode.ADVANCED,
    sex,
    mass,
    segments,
    derived,
    mobility: { ...DEFAULT_MOBILITY },
  };
}

/**
 * Creates an anthropometry profile from simplified segment proportion options
 * @param height - Standing height in meters
 * @param mass - Body mass in kilograms
 * @param sex - Biological sex
 * @param torsoSD - Torso length modifier (-2 to +2)
 * @param armSD - Arm length modifier (-2 to +2)
 * @param legSD - Leg length modifier (-2 to +2)
 * @returns Complete anthropometry profile with custom proportions
 */
export function createProfileFromProportions(
  height: number,
  mass: number,
  sex: Sex,
  torsoSD: number,
  armSD: number,
  legSD: number
): Anthropometry {
  const ratios = SEGMENT_RATIOS[sex];

  // Calculate multipliers using formula: 1 + (SD × 0.045)
  const armMultiplier = 1 + armSD * SD_MULTIPLIER_COEFFICIENT;
  const legMultiplier = 1 + legSD * SD_MULTIPLIER_COEFFICIENT;
  const torsoMultiplier = 1 + torsoSD * SD_MULTIPLIER_COEFFICIENT;

  // Apply ratios with modifiers
  // For arms and legs, apply the same multiplier to all sub-segments to maintain proportionality
  let segments: SegmentLengths = {
    height,
    headNeck: height * ratios.headNeck, // Head/neck not modified
    torso: height * ratios.torso * torsoMultiplier,
    upperArm: height * ratios.upperArm * armMultiplier,
    forearm: height * ratios.forearm * armMultiplier,
    hand: height * ratios.hand * armMultiplier,
    femur: height * ratios.femur * legMultiplier,
    tibia: height * ratios.tibia * legMultiplier,
    footHeight: height * ratios.footHeight * legMultiplier,
  };

  // Normalize to ensure segments sum to target height
  segments = normalizeToHeight(segments, height);

  // Compute derived anthropometry
  const derived = computeDerivedAnthropometry(segments, height);

  return {
    mode: AnthropometryMode.SIMPLE, // Use simple mode since this is for quick comparison
    sex,
    mass,
    segments,
    derived,
    mobility: { ...DEFAULT_MOBILITY },
  };
}

/**
 * Normalizes segment lengths to sum to target height
 * Keeps headNeck fixed and scales other segments proportionally
 * @param segments - Current segment lengths
 * @param targetHeight - Desired total height in meters
 * @returns Normalized segment lengths
 */
export function normalizeToHeight(
  segments: SegmentLengths,
  targetHeight: number
): SegmentLengths {
  // Calculate current sum (excluding height field itself)
  const currentSum =
    segments.headNeck +
    segments.torso +
    segments.femur +
    segments.tibia +
    segments.footHeight;

  // Check if normalization is needed (within 2% tolerance)
  const difference = Math.abs(currentSum - targetHeight);
  const tolerance = targetHeight * HEIGHT_NORMALIZATION_TOLERANCE;

  if (difference <= tolerance) {
    // No normalization needed
    return { ...segments, height: targetHeight };
  }

  // Keep headNeck fixed, scale the rest
  const scalableSegments = segments.torso + segments.femur + segments.tibia + segments.footHeight;
  const targetScalableSum = targetHeight - segments.headNeck;
  const scaleFactor = targetScalableSum / scalableSegments;

  return {
    ...segments,
    height: targetHeight,
    torso: segments.torso * scaleFactor,
    femur: segments.femur * scaleFactor,
    tibia: segments.tibia * scaleFactor,
    footHeight: segments.footHeight * scaleFactor,
  };
}

/**
 * Computes derived anthropometric values from segment lengths
 * @param segments - Individual segment lengths
 * @param height - Total standing height
 * @returns Derived anthropometric measurements and indices
 */
export function computeDerivedAnthropometry(
  segments: SegmentLengths,
  height: number
): DerivedAnthropometry {
  const totalArm = segments.upperArm + segments.forearm + segments.hand;
  const totalLeg = segments.femur + segments.tibia + segments.footHeight;

  return {
    totalArm,
    totalLeg,
    cruralIndex: segments.tibia / segments.femur,
    femurTorsoRatio: segments.femur / segments.torso,
    apeIndex: (2 * totalArm + 0.36 * segments.torso) / height,
    acromionHeight: segments.femur + segments.tibia + segments.footHeight + segments.torso,
    hipHeight: segments.femur + segments.tibia + segments.footHeight,
  };
}

/**
 * Validates an anthropometry profile for reasonable values
 * @param profile - The anthropometry profile to validate
 * @returns Validation result with any error messages
 */
export function validateAnthropometry(profile: Anthropometry): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check height bounds (0.5m to 10m - extended for fun comparisons)
  if (profile.segments.height < 0.5) {
    errors.push("Height is below minimum (0.5m)");
  }
  if (profile.segments.height > 10) {
    errors.push("Height exceeds maximum (10m)");
  }

  // Check mass bounds (10kg to 1000kg - extended for fun comparisons)
  if (profile.mass < 10) {
    errors.push("Mass is below minimum (10kg)");
  }
  if (profile.mass > 1000) {
    errors.push("Mass exceeds maximum (1000kg)");
  }

  // Check segments sum to height (within 6% tolerance)
  // Note: Winter's ratios sum to 94.8%, so we allow 6% tolerance
  const segmentSum =
    profile.segments.headNeck +
    profile.segments.torso +
    profile.segments.femur +
    profile.segments.tibia +
    profile.segments.footHeight;

  const heightDifference = Math.abs(segmentSum - profile.segments.height);
  const heightTolerance = profile.segments.height * 0.06; // 6%

  if (heightDifference > heightTolerance) {
    errors.push(
      `Segments sum (${segmentSum.toFixed(3)}m) differs from height (${profile.segments.height.toFixed(3)}m) by more than 6%`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
