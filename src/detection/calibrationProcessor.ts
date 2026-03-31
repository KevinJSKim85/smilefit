import type { CalibrationData } from '../types/detection';
import { median } from '../utils/math';

/**
 * Collects facial landmark samples during neutral face hold,
 * then computes median baselines for smile and wink detection.
 *
 * Timer-driven: the caller (useCalibration) decides when collection stops.
 * This class just accumulates frames and computes validated results.
 */
export class CalibrationProcessor {
  private mouthWidths: number[] = [];
  private mouthHeights: number[] = [];
  private leftBlinks: number[] = [];
  private rightBlinks: number[] = [];

  /**
   * Add one frame of measurements.
   */
  addFrame(mouthW: number, mouthH: number, leftBlinkScore: number, rightBlinkScore: number): void {
    this.mouthWidths.push(mouthW);
    this.mouthHeights.push(mouthH);
    this.leftBlinks.push(leftBlinkScore);
    this.rightBlinks.push(rightBlinkScore);
  }

  get frameCount(): number {
    return this.mouthWidths.length;
  }

  /**
   * Compute calibration data from collected samples.
   * Returns null if baselines are outside expected physiological ranges.
   */
  getCalibrationData(): CalibrationData | null {
    if (this.frameCount === 0) return null;

    const baseWidth = median(this.mouthWidths);
    const baseHeight = median(this.mouthHeights);
    const leftBlinkBaseline = median(this.leftBlinks);
    const rightBlinkBaseline = median(this.rightBlinks);

    // Sanity check: reject only if values are nonsensical (NaN, negative).
    // Blendshape baselines are typically 0.0–0.1 for a neutral face.
    // Mouth values must be positive and finite.
    if (
      baseWidth <= 0 || !isFinite(baseWidth) ||
      baseHeight <= 0 || !isFinite(baseHeight) ||
      !isFinite(leftBlinkBaseline) || leftBlinkBaseline < 0 ||
      !isFinite(rightBlinkBaseline) || rightBlinkBaseline < 0
    ) {
      return null;
    }

    return {
      smile: { baseWidth, baseHeight },
      wink: { leftBlinkBaseline, rightBlinkBaseline },
      timestamp: new Date().toISOString(),
    };
  }

  reset(): void {
    this.mouthWidths = [];
    this.mouthHeights = [];
    this.leftBlinks = [];
    this.rightBlinks = [];
  }
}
