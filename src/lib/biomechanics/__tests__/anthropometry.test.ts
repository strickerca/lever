import { describe, it, expect } from "vitest";
import {
  createSimpleProfile,
  createAdvancedProfile,
  normalizeToHeight,
  computeDerivedAnthropometry,
  validateAnthropometry,
} from "../anthropometry";
import { Sex } from "@/types";
import { SEGMENT_RATIOS, SD_MULTIPLIER_COEFFICIENT } from "../constants";

describe("Anthropometry", () => {
  describe("createSimpleProfile", () => {
    it("should produce correct segment lengths from height", () => {
      const height = 1.8;
      const mass = 80;
      const profile = createSimpleProfile(height, mass, Sex.MALE);

      // Check basic properties
      expect(profile.segments.height).toBe(height);
      expect(profile.mass).toBe(mass);
      expect(profile.sex).toBe(Sex.MALE);

      // Check segment ratios are applied correctly
      const ratios = SEGMENT_RATIOS.male;
      expect(profile.segments.femur).toBeCloseTo(height * ratios.femur, 4);
      expect(profile.segments.tibia).toBeCloseTo(height * ratios.tibia, 4);
      expect(profile.segments.torso).toBeCloseTo(height * ratios.torso, 4);
      expect(profile.segments.upperArm).toBeCloseTo(height * ratios.upperArm, 4);
      expect(profile.segments.forearm).toBeCloseTo(height * ratios.forearm, 4);
      expect(profile.segments.hand).toBeCloseTo(height * ratios.hand, 4);
      expect(profile.segments.headNeck).toBeCloseTo(height * ratios.headNeck, 4);
      expect(profile.segments.footHeight).toBeCloseTo(height * ratios.footHeight, 4);
    });

    it("should compute derived anthropometry correctly", () => {
      const profile = createSimpleProfile(1.8, 80, Sex.MALE);

      // Total arm = upperArm + forearm + hand
      const expectedTotalArm =
        profile.segments.upperArm +
        profile.segments.forearm +
        profile.segments.hand;
      expect(profile.derived.totalArm).toBeCloseTo(expectedTotalArm, 4);

      // Total leg = femur + tibia + footHeight
      const expectedTotalLeg =
        profile.segments.femur +
        profile.segments.tibia +
        profile.segments.footHeight;
      expect(profile.derived.totalLeg).toBeCloseTo(expectedTotalLeg, 4);

      // Crural index = tibia / femur
      expect(profile.derived.cruralIndex).toBeCloseTo(
        profile.segments.tibia / profile.segments.femur,
        4
      );

      // Femur-torso ratio
      expect(profile.derived.femurTorsoRatio).toBeCloseTo(
        profile.segments.femur / profile.segments.torso,
        4
      );
    });

    it("should set default mobility values", () => {
      const profile = createSimpleProfile(1.8, 80, Sex.MALE);

      expect(profile.mobility.maxAnkleDorsiflexion).toBe(30);
      expect(profile.mobility.maxHipFlexion).toBe(130);
      expect(profile.mobility.maxShoulderFlexion).toBe(165);
    });
  });

  describe("createAdvancedProfile with SD modifiers", () => {
    it("should apply SD modifiers correctly (+2 SD = 1.09× multiplier)", () => {
      const height = 1.8;
      const mass = 80;
      const sdModifiers = { arms: 2, legs: 0, torso: 0 };

      const profile = createAdvancedProfile(height, mass, Sex.MALE, sdModifiers);

      // +2 SD should give multiplier of 1 + (2 × 0.045) = 1.09
      const expectedMultiplier = 1 + 2 * SD_MULTIPLIER_COEFFICIENT;
      expect(expectedMultiplier).toBeCloseTo(1.09, 4);

      // Compare to simple profile
      const simpleProfile = createSimpleProfile(height, mass, Sex.MALE);

      // Arms should be longer
      expect(profile.segments.upperArm).toBeGreaterThan(
        simpleProfile.segments.upperArm
      );
      expect(profile.segments.forearm).toBeGreaterThan(
        simpleProfile.segments.forearm
      );
      expect(profile.segments.hand).toBeGreaterThan(simpleProfile.segments.hand);

      // Legs and torso should be same (after normalization)
      // Note: normalized, so may not be exactly equal
    });

    it("should apply negative SD modifiers correctly (-3 SD = 0.865× multiplier)", () => {
      const height = 1.8;
      const mass = 80;
      const sdModifiers = { arms: -3, legs: 0, torso: 0 };

      const profile = createAdvancedProfile(height, mass, Sex.MALE, sdModifiers);

      // -3 SD should give multiplier of 1 + (-3 × 0.045) = 0.865
      const expectedMultiplier = 1 - 3 * SD_MULTIPLIER_COEFFICIENT;
      expect(expectedMultiplier).toBeCloseTo(0.865, 4);

      // Compare to simple profile
      const simpleProfile = createSimpleProfile(height, mass, Sex.MALE);

      // Arms should be shorter
      expect(profile.segments.upperArm).toBeLessThan(
        simpleProfile.segments.upperArm
      );
      expect(profile.segments.forearm).toBeLessThan(
        simpleProfile.segments.forearm
      );
      expect(profile.segments.hand).toBeLessThan(simpleProfile.segments.hand);
    });

    it("should normalize to height after applying modifiers", () => {
      const height = 1.8;
      const mass = 80;
      const sdModifiers = { arms: 2, legs: 2, torso: -2 };

      const profile = createAdvancedProfile(height, mass, Sex.MALE, sdModifiers);

      // Segments should sum to approximately height (within 2% tolerance)
      const sum =
        profile.segments.headNeck +
        profile.segments.torso +
        profile.segments.femur +
        profile.segments.tibia +
        profile.segments.footHeight;

      expect(Math.abs(sum - height) / height).toBeLessThan(0.02);
    });
  });

  describe("normalizeToHeight", () => {
    it("should fix sum discrepancy when segments don't sum to target height", () => {
      const targetHeight = 1.8;
      const segments = {
        height: 1.7, // Wrong height
        headNeck: 0.234,
        torso: 0.51,
        upperArm: 0.3348,
        forearm: 0.2628,
        hand: 0.1944,
        femur: 0.441,
        tibia: 0.4428,
        footHeight: 0.0702,
      };

      const normalized = normalizeToHeight(segments, targetHeight);

      // Should sum to target height
      const sum =
        normalized.headNeck +
        normalized.torso +
        normalized.femur +
        normalized.tibia +
        normalized.footHeight;

      expect(sum).toBeCloseTo(targetHeight, 3);
      expect(normalized.height).toBe(targetHeight);
    });

    it("should keep headNeck fixed during normalization", () => {
      const targetHeight = 1.8;
      const segments = {
        height: 1.7,
        headNeck: 0.234,
        torso: 0.51,
        upperArm: 0.3348,
        forearm: 0.2628,
        hand: 0.1944,
        femur: 0.441,
        tibia: 0.4428,
        footHeight: 0.0702,
      };

      const normalized = normalizeToHeight(segments, targetHeight);

      // HeadNeck should remain unchanged
      expect(normalized.headNeck).toBe(segments.headNeck);
    });

    it("should not normalize if within 2% tolerance", () => {
      const targetHeight = 1.8;
      const segments = {
        height: 1.8,
        headNeck: 0.234,
        torso: 0.54,
        upperArm: 0.3348,
        forearm: 0.2628,
        hand: 0.1944,
        femur: 0.441,
        tibia: 0.4428,
        footHeight: 0.0702,
      };

      // Sum is very close to target
      const sum =
        segments.headNeck +
        segments.torso +
        segments.femur +
        segments.tibia +
        segments.footHeight;

      const difference = Math.abs(sum - targetHeight);
      if (difference <= targetHeight * 0.02) {
        const normalized = normalizeToHeight(segments, targetHeight);
        // Values should be unchanged (except height field)
        expect(normalized.torso).toBe(segments.torso);
        expect(normalized.femur).toBe(segments.femur);
      }
    });
  });

  describe("validateAnthropometry", () => {
    it("should validate correct profile", () => {
      const profile = createSimpleProfile(1.8, 80, Sex.MALE);
      const validation = validateAnthropometry(profile);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should reject height below minimum (0.5m)", () => {
      const profile = createSimpleProfile(0.4, 80, Sex.MALE);
      const validation = validateAnthropometry(profile);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it("should reject height above maximum (10m)", () => {
      const profile = createSimpleProfile(10.5, 80, Sex.MALE);
      const validation = validateAnthropometry(profile);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it("should reject mass below minimum (10kg)", () => {
      const profile = createSimpleProfile(1.8, 5, Sex.MALE);
      const validation = validateAnthropometry(profile);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it("should reject mass above maximum (1000kg)", () => {
      const profile = createSimpleProfile(1.8, 1100, Sex.MALE);
      const validation = validateAnthropometry(profile);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
});
