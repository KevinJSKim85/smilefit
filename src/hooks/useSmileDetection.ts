import { useRef, useCallback, useEffect } from 'react';
import type { CalibrationData, SmileState } from '../types/detection';
import type { MouthMetrics } from '../detection/landmarkExtractor';
import { computeRawSmileScore, applyEMA, normalizeSmileScore } from '../detection/smileCalculator';
import { SMILE_THRESHOLD, SMILE_FRAMES_REQUIRED, SMILE_COOLDOWN_MS } from '../constants/detection';

const INITIAL_STATE: SmileState = {
  rawScore: 0,
  emaScore: 0,
  isSmiling: false,
  smileEvent: false,
  smileSuppressed: false,
};

export function useSmileDetection(calibration: CalibrationData | null) {
  const emaRef = useRef<number | null>(null);
  const aboveCountRef = useRef(0);
  const lastEventTimeRef = useRef(0);

  // Reset when calibration changes (recalibrate scenario)
  useEffect(() => {
    emaRef.current = null;
    aboveCountRef.current = 0;
    lastEventTimeRef.current = 0;
  }, [calibration]);

  const process = useCallback(
    (mouth: MouthMetrics, timestampMs: number): SmileState => {
      if (!calibration) return INITIAL_STATE;

      const { baseWidth, baseHeight } = calibration.smile;
      const raw = computeRawSmileScore(mouth.mouthW, mouth.mouthH, baseWidth, baseHeight);

      // Initialize EMA to first raw value to avoid drift from 0
      if (emaRef.current === null) {
        emaRef.current = raw;
      }

      const ema = applyEMA(raw, emaRef.current);
      emaRef.current = ema;

      const isSmiling = ema >= SMILE_THRESHOLD;

      if (isSmiling) {
        aboveCountRef.current++;
      } else {
        aboveCountRef.current = 0;
      }

      let smileEvent = false;
      if (
        aboveCountRef.current >= SMILE_FRAMES_REQUIRED &&
        timestampMs - lastEventTimeRef.current > SMILE_COOLDOWN_MS
      ) {
        smileEvent = true;
        aboveCountRef.current = 0;
        lastEventTimeRef.current = timestampMs;
      }

      return {
        rawScore: raw,
        emaScore: normalizeSmileScore(ema),
        isSmiling,
        smileEvent,
        smileSuppressed: false,
      };
    },
    [calibration]
  );

  const reset = useCallback(() => {
    emaRef.current = null;
    aboveCountRef.current = 0;
    lastEventTimeRef.current = 0;
  }, []);

  return { process, reset };
}
