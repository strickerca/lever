/**
 * Abstract PoseSolver - defines interface for all movement-specific pose solvers
 *
 * Each movement implements this interface to generate anatomically valid poses
 * that maintain rigid segment lengths and movement constraints.
 */

import { Point2D } from "@/types";
import { Pose2D, PoseSolverInput, PoseSolverResult, AnimationPhase } from "./types";

/**
 * Utility functions for forward kinematics and validation
 */
export class KinematicsUtils {
  /**
   * Calculate distance between two points
   */
  static distance(p1: Point2D, p2: Point2D): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate angle from point A to point B
   * Returns angle in radians from horizontal (positive = counterclockwise)
   */
  static angleBetweenPoints(from: Point2D, to: Point2D): number {
    return Math.atan2(to.y - from.y, to.x - from.x);
  }

  /**
   * Calculate angle in degrees from radians
   */
  static toDegrees(radians: number): number {
    return (radians * 180) / Math.PI;
  }

  /**
   * Calculate angle in radians from degrees
   */
  static toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Calculate endpoint of a segment given start point, length, and angle
   *
   * @param start - Starting point
   * @param length - Segment length in meters
   * @param angleRad - Angle in radians from horizontal
   * @returns End point
   */
  static calculateEndpoint(start: Point2D, length: number, angleRad: number): Point2D {
    return {
      x: start.x + length * Math.cos(angleRad),
      y: start.y + length * Math.sin(angleRad),
    };
  }

  /**
   * Build a kinematic chain from ankle using segment lengths and angles
   *
   * @param ankle - Ankle position (usually on ground)
   * @param tibiaLength - Tibia length in meters
   * @param femurLength - Femur length in meters
   * @param torsoLength - Torso length in meters
   * @param tibiaAngleRad - Tibia angle in radians from horizontal
   * @param femurAngleRad - Femur angle in radians from horizontal
   * @param torsoAngleRad - Torso angle in radians from horizontal
   * @returns Object with knee, hip, shoulder positions
   */
  static buildLowerBodyChain(
    ankle: Point2D,
    tibiaLength: number,
    femurLength: number,
    torsoLength: number,
    tibiaAngleRad: number,
    femurAngleRad: number,
    torsoAngleRad: number
  ): { knee: Point2D; hip: Point2D; shoulder: Point2D } {
    const knee = this.calculateEndpoint(ankle, tibiaLength, tibiaAngleRad);
    const hip = this.calculateEndpoint(knee, femurLength, femurAngleRad);
    const shoulder = this.calculateEndpoint(hip, torsoLength, torsoAngleRad);

    return { knee, hip, shoulder };
  }

  /**
   * Build arm chain from shoulder
   *
   * @param shoulder - Shoulder position
   * @param upperArmLength - Upper arm length in meters
   * @param forearmLength - Forearm length in meters
   * @param shoulderAngleRad - Shoulder angle in radians from horizontal
   * @param elbowAngleRad - Elbow angle in radians from horizontal
   * @returns Object with elbow and wrist positions
   */
  static buildArmChain(
    shoulder: Point2D,
    upperArmLength: number,
    forearmLength: number,
    shoulderAngleRad: number,
    elbowAngleRad: number
  ): { elbow: Point2D; wrist: Point2D } {
    const elbow = this.calculateEndpoint(shoulder, upperArmLength, shoulderAngleRad);
    const wrist = this.calculateEndpoint(elbow, forearmLength, elbowAngleRad);

    return { elbow, wrist };
  }

  /**
   * Clamp angle to a range
   *
   * @param angle - Angle in degrees
   * @param min - Minimum angle in degrees
   * @param max - Maximum angle in degrees
   * @returns Clamped angle in degrees
   */
  static clampAngle(angle: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, angle));
  }

  /**
   * Linear interpolation
   */
  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Interpolate between two points
   */
  static lerpPoint(p1: Point2D, p2: Point2D, t: number): Point2D {
    return {
      x: this.lerp(p1.x, p2.x, t),
      y: this.lerp(p1.y, p2.y, t),
    };
  }
}

/**
 * Validator for pose constraints
 */
export class PoseValidator {
  private static readonly TOLERANCE = 0.001; // 1mm tolerance for floating point

  /**
   * Validate that all segments have correct lengths
   *
   * @param pose - Pose to validate
   * @param anthropometry - Expected segment lengths
   * @returns Array of error messages (empty if valid)
   */
  static validateSegmentLengths(pose: Pose2D, expectedLengths: {
    tibia: number;
    femur: number;
    torso: number;
    upperArm: number;
    forearm: number;
  }): string[] {
    const errors: string[] = [];

    // Check tibia
    const tibiaLength = KinematicsUtils.distance(pose.ankle, pose.knee);
    if (Math.abs(tibiaLength - expectedLengths.tibia) > this.TOLERANCE) {
      errors.push(
        `Tibia length violation: expected ${expectedLengths.tibia.toFixed(3)}m, got ${tibiaLength.toFixed(3)}m`
      );
    }

    // Check femur
    const femurLength = KinematicsUtils.distance(pose.knee, pose.hip);
    if (Math.abs(femurLength - expectedLengths.femur) > this.TOLERANCE) {
      errors.push(
        `Femur length violation: expected ${expectedLengths.femur.toFixed(3)}m, got ${femurLength.toFixed(3)}m`
      );
    }

    // Check torso
    const torsoLength = KinematicsUtils.distance(pose.hip, pose.shoulder);
    if (Math.abs(torsoLength - expectedLengths.torso) > this.TOLERANCE) {
      errors.push(
        `Torso length violation: expected ${expectedLengths.torso.toFixed(3)}m, got ${torsoLength.toFixed(3)}m`
      );
    }

    // Check upper arm
    const upperArmLength = KinematicsUtils.distance(pose.shoulder, pose.elbow);
    if (Math.abs(upperArmLength - expectedLengths.upperArm) > this.TOLERANCE) {
      errors.push(
        `Upper arm length violation: expected ${expectedLengths.upperArm.toFixed(3)}m, got ${upperArmLength.toFixed(3)}m`
      );
    }

    // Check forearm
    const forearmLength = KinematicsUtils.distance(pose.elbow, pose.wrist);
    if (Math.abs(forearmLength - expectedLengths.forearm) > this.TOLERANCE) {
      errors.push(
        `Forearm length violation: expected ${expectedLengths.forearm.toFixed(3)}m, got ${forearmLength.toFixed(3)}m`
      );
    }

    return errors;
  }

  /**
   * Validate ground contact (feet should be on or above ground)
   *
   * @param pose - Pose to validate
   * @param groundLevel - Ground Y coordinate (default: 0 or footHeight)
   * @returns Array of error messages (empty if valid)
   */
  static validateGroundContact(pose: Pose2D, groundLevel: number = 0): string[] {
    const errors: string[] = [];

    if (pose.contacts.leftFoot && pose.contacts.leftFoot.y < groundLevel - this.TOLERANCE) {
      errors.push(`Left foot below ground: y=${pose.contacts.leftFoot.y.toFixed(3)}m`);
    }

    if (pose.contacts.rightFoot && pose.contacts.rightFoot.y < groundLevel - this.TOLERANCE) {
      errors.push(`Right foot below ground: y=${pose.contacts.rightFoot.y.toFixed(3)}m`);
    }

    return errors;
  }

  /**
   * Validate bar attachment (hands should be on bar)
   *
   * @param pose - Pose to validate
   * @returns Array of error messages (empty if valid)
   */
  static validateBarAttachment(pose: Pose2D): string[] {
    const errors: string[] = [];

    if (!pose.bar) {
      return errors; // No bar to attach to
    }

    // For barbell lifts, wrists should be at bar height
    if (pose.contacts.leftHand && pose.contacts.rightHand) {
      const leftHandDist = Math.abs(pose.contacts.leftHand.y - pose.bar.y);
      const rightHandDist = Math.abs(pose.contacts.rightHand.y - pose.bar.y);

      if (leftHandDist > this.TOLERANCE) {
        errors.push(`Left hand not on bar: distance=${leftHandDist.toFixed(3)}m`);
      }

      if (rightHandDist > this.TOLERANCE) {
        errors.push(`Right hand not on bar: distance=${rightHandDist.toFixed(3)}m`);
      }
    }

    return errors;
  }
}

/**
 * Abstract base class for pose solvers
 * All movement-specific solvers extend this
 */
export abstract class PoseSolver {
  /**
   * Solve for pose at given animation phase
   * Must be implemented by each movement-specific solver
   *
   * @param input - Solver input parameters
   * @returns Pose solver result with validation
   */
  abstract solve(input: PoseSolverInput): PoseSolverResult;

  /**
   * Get ROM for this movement
   * Used to calculate timing and phase progression
   *
   * @param input - Solver input parameters
   * @returns Range of motion in meters
   */
  abstract getROM(input: Omit<PoseSolverInput, "phase">): number;

  /**
   * Validate a pose against constraints
   * Can be overridden by movement-specific validators
   *
   * @param pose - Pose to validate
   * @param input - Original input parameters
   * @returns Validation result
   */
  protected validatePose(pose: Pose2D, input: PoseSolverInput): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check segment lengths
    const segmentErrors = PoseValidator.validateSegmentLengths(pose, {
      tibia: input.anthropometry.segments.tibia,
      femur: input.anthropometry.segments.femur,
      torso: input.anthropometry.segments.torso,
      upperArm: input.anthropometry.segments.upperArm,
      forearm: input.anthropometry.segments.forearm,
    });
    errors.push(...segmentErrors);

    // Check ground contact for standing movements
    const groundErrors = PoseValidator.validateGroundContact(
      pose,
      input.anthropometry.segments.footHeight
    );
    errors.push(...groundErrors);

    return { errors, warnings };
  }
}
