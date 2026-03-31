import { useRef, useCallback } from 'react';
import type { CalibrationData } from '../types/detection';
import { classifyBlink, type WinkClassification } from '../detection/winkCalculator';
import { WINK_HOLD_MS, WINK_GRACE_MS } from '../constants/detection';

export interface BlinkScores {
  leftBlinkScore: number;
  rightBlinkScore: number;
}

export interface WinkResult {
  leftWink: boolean;
  rightWink: boolean;
  classification: WinkClassification;
  leftBlinkScore: number;
  rightBlinkScore: number;
  /** Which side is currently being held (subject/user perspective) */
  holdSide: 'left' | 'right' | null;
  /** How long the current hold has lasted (ms) */
  holdMs: number;
}

/**
 * Hold-based wink detection using MediaPipe blendshape scores.
 * User must hold a single-eye wink for WINK_HOLD_MS before it fires.
 * Brief detection gaps (<100ms) don't reset the timer.
 *
 * Blendshape names use subject/ARKit perspective — no camera-space swap needed.
 * In a mirrored webcam display, subject's left eye appears on the user's visual left.
 */
export function useWinkDetection(_calibration: CalibrationData | null) {
  const pendingWinkRef = useRef<'left' | 'right' | null>(null);
  const pendingStartTimeRef = useRef(0);
  const lastMatchTimeRef = useRef(0);

  const process = useCallback(
    (scores: BlinkScores, timestampMs: number): WinkResult => {
      const { leftBlinkScore, rightBlinkScore } = scores;
      const classification = classifyBlink(leftBlinkScore, rightBlinkScore);

      let leftWink = false;
      let rightWink = false;

      if (classification === 'left' || classification === 'right') {
        if (pendingWinkRef.current === classification) {
          // Same direction — update last match time
          lastMatchTimeRef.current = timestampMs;

          // Check if hold duration reached
          const holdMs = timestampMs - pendingStartTimeRef.current;
          if (holdMs >= WINK_HOLD_MS) {
            // Direct mapping — no camera-space swap needed with blendshapes
            leftWink = classification === 'left';
            rightWink = classification === 'right';
            // Reset so next hold cycle starts immediately (repeat while holding)
            pendingWinkRef.current = null;
            pendingStartTimeRef.current = 0;
            lastMatchTimeRef.current = 0;
          }
        } else if (pendingWinkRef.current === null) {
          // Start new hold
          pendingWinkRef.current = classification;
          pendingStartTimeRef.current = timestampMs;
          lastMatchTimeRef.current = timestampMs;
        } else {
          // Different direction — restart
          pendingWinkRef.current = classification;
          pendingStartTimeRef.current = timestampMs;
          lastMatchTimeRef.current = timestampMs;
        }
      } else {
        // 'both' or 'none' — check grace period
        if (pendingWinkRef.current !== null) {
          if (timestampMs - lastMatchTimeRef.current > WINK_GRACE_MS) {
            // Grace exceeded — reset
            pendingWinkRef.current = null;
            pendingStartTimeRef.current = 0;
            lastMatchTimeRef.current = 0;
          }
          // Within grace: keep timer running (don't reset)
        }
      }

      const holdSide = pendingWinkRef.current;
      const holdMs = holdSide ? timestampMs - pendingStartTimeRef.current : 0;

      return {
        leftWink,
        rightWink,
        classification,
        leftBlinkScore,
        rightBlinkScore,
        holdSide,
        holdMs,
      };
    },
    [],
  );

  const reset = useCallback(() => {
    pendingWinkRef.current = null;
    pendingStartTimeRef.current = 0;
    lastMatchTimeRef.current = 0;
  }, []);

  return { process, reset };
}
