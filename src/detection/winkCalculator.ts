import { BLINK_CLOSED_THRESHOLD, BLINK_OPEN_THRESHOLD, DOUBLE_BLINK_CLOSED_THRESHOLD } from '../constants/detection';

export type WinkClassification = 'left' | 'right' | 'both' | 'none';

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
): WinkClassification {
  const leftClosed = leftScore > closedThreshold;
  const rightClosed = rightScore > closedThreshold;
  const leftOpen = leftScore < openThreshold;
  const rightOpen = rightScore < openThreshold;

  // Double wink uses a higher threshold to avoid false positives from sympathetic closure
  const bothClosed = leftScore > DOUBLE_BLINK_CLOSED_THRESHOLD && rightScore > DOUBLE_BLINK_CLOSED_THRESHOLD;

  if (bothClosed) return 'both';
  if (leftClosed && rightOpen) return 'left';
  if (rightClosed && leftOpen) return 'right';
  return 'none';
}
