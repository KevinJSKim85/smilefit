import { useRef, useCallback } from 'react';
import { DoubleWinkTracker } from '../detection/doubleWinkTracker';
import type { WinkClassification } from '../detection/winkCalculator';

export interface DoubleWinkResult {
  fired: boolean;
  holdMs: number;
}

export function useDoubleWinkDetection() {
  const trackerRef = useRef(new DoubleWinkTracker());

  const process = useCallback(
    (classification: WinkClassification, timestampMs: number): DoubleWinkResult => {
      trackerRef.current.update(classification === 'both', timestampMs);
      return {
        fired: trackerRef.current.consume(),
        holdMs: trackerRef.current.holdMs,
      };
    },
    []
  );

  const reset = useCallback(() => {
    trackerRef.current.reset();
  }, []);

  return { process, reset };
}
