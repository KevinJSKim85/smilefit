import { BLINK_CLOSED_THRESHOLD, BLINK_OPEN_THRESHOLD, DOUBLE_BLINK_CLOSED_THRESHOLD } from '../constants/detection';

export type WinkClassification = 'left' | 'right' | 'both' | 'none';

export interface BlinkThresholds {
  closed: number;
  open: number;
}

/** Adjust each eye's thresholds around its neutral-face calibration score. */
export function getBlinkThresholds(baseline?: number): BlinkThresholds {
  if (baseline === undefined || !Number.isFinite(baseline)) {
    return { closed: BLINK_CLOSED_THRESHOLD, open: BLINK_OPEN_THRESHOLD };
  }

  const boundedBaseline = Math.max(0, Math.min(0.45, baseline));
  const open = Math.max(0.25, Math.min(0.5, boundedBaseline + 0.08));
  const closed = Math.max(open + 0.08, Math.max(0.33, Math.min(0.59, boundedBaseline + 0.15)));
  return { closed, open };
}

/**
 * Classify wink state from blendshape blink scores.
 * Uses differential check: one eye must be clearly CLOSED while the other is clearly OPEN.
 * This handles sympathetic partial closure (the key improvement over EAR-based detection).
 *
 * Double wink uses a higher threshold (0.6) than single winks (0.4) to prevent
 * sympathetic closure from accidentally triggering hard drops.
 *
 * Blendshape scores are 0→1 where 0 = fully open, 1 = fully closed.
 * Names use subject/ARKit perspective: 'left' = subject's left eye.
 */
export function classifyBlink(
  leftScore: number,
  rightScore: number,
  closedThreshold: number = BLINK_CLOSED_THRESHOLD,
  openThreshold: number = BLINK_OPEN_THRESHOLD,
  rightClosedThreshold: number = closedThreshold,
  rightOpenThreshold: number = openThreshold,
): WinkClassification {
  const leftClosed = leftScore > closedThreshold;
  const rightClosed = rightScore > rightClosedThreshold;
  const leftOpen = leftScore < openThreshold;
  const rightOpen = rightScore < rightOpenThreshold;

  // Double wink uses a higher threshold to avoid false positives from sympathetic closure
  const bothClosed = leftScore > DOUBLE_BLINK_CLOSED_THRESHOLD && rightScore > DOUBLE_BLINK_CLOSED_THRESHOLD;

  if (bothClosed) return 'both';
  if (leftClosed && rightOpen) return 'left';
  if (rightClosed && leftOpen) return 'right';
  return 'none';
}
