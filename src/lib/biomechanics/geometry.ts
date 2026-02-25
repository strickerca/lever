import { SegmentLengths } from "../../types";
import { AVERAGE_CHEST_DEPTH, HAND_GRIP_RATIO } from "./constants";

export type ChestSize = "small" | "average" | "large";

export const CHEST_SIZE_DEPTH_OFFSETS: Record<ChestSize, number> = {
  small: -0.04,
  average: 0,
  large: 0.05,
} as const;

/**
 * Effective length from shoulder to bar grip point.
 * Uses wrist-to-grip center instead of full hand length.
 */
export function armToGripLength(
  segments: Pick<SegmentLengths, "upperArm" | "forearm" | "hand">
): number {
  return (
    segments.upperArm +
    segments.forearm +
    segments.hand * HAND_GRIP_RATIO
  );
}

export function chestDepthForSize(chestSize: ChestSize = "average"): number {
  return AVERAGE_CHEST_DEPTH + CHEST_SIZE_DEPTH_OFFSETS[chestSize];
}

