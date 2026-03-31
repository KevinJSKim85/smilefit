import { SMILE_WIDTH_WEIGHT, SMILE_HEIGHT_WEIGHT, EMA_ALPHA } from '../constants/detection';
import { clamp } from '../utils/math';

/**
 * Compute raw smile score from mouth metrics vs calibrated baseline.
 * Ported from SmileCam: raw = 0.7 * (mouthW - W₀) + 0.3 * (mouthH - H₀)
 */
export function computeRawSmileScore(
  mouthW: number,
  mouthH: number,
  baseW: number,
  baseH: number
): number {
  return SMILE_WIDTH_WEIGHT * (mouthW - baseW) + SMILE_HEIGHT_WEIGHT * (mouthH - baseH);
}

/**
 * Apply Exponential Moving Average smoothing.
 * scoreEMA = α * raw + (1 - α) * prevEMA
 */
export function applyEMA(raw: number, prevEMA: number, alpha: number = EMA_ALPHA): number {
  return alpha * raw + (1 - alpha) * prevEMA;
}

/**
 * Normalize smile score to 0-1 range for continuous control (Balloon game).
 * Maps the EMA score from the typical range [0, ~0.3] to [0, 1].
 */
export function normalizeSmileScore(emaScore: number): number {
  // Typical max smile score is around 0.25-0.35
  return clamp(emaScore / 0.3, 0, 1);
}
