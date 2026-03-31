import { DOUBLE_WINK_HOLD_MS, WINK_GRACE_MS } from '../constants/detection';

/**
 * Hold-based double wink tracker with grace period.
 * Fires once after both eyes held closed for DOUBLE_WINK_HOLD_MS (0.5s).
 * One-shot: must release eyes and re-close to fire again (user can't see while holding).
 * Brief detection gaps (<100ms) don't reset the timer.
 */
export class DoubleWinkTracker {
  private bothClosedStartMs: number | null = null;
  private lastBothMs = 0;
  private firedForCurrentHold = false;
  private pendingEvent = false;
  private _holdMs = 0;

  get holdMs(): number { return this._holdMs; }

  /**
   * Call every frame with whether both eyes are currently closed.
   */
  update(bothClosed: boolean, timestampMs: number): void {
    if (bothClosed) {
      if (this.bothClosedStartMs === null) {
        this.bothClosedStartMs = timestampMs;
        this.firedForCurrentHold = false;
      }
      this.lastBothMs = timestampMs;
      this._holdMs = timestampMs - this.bothClosedStartMs;

      // Fire once when hold reaches threshold — no repeat while holding
      if (!this.firedForCurrentHold && this._holdMs >= DOUBLE_WINK_HOLD_MS) {
        this.pendingEvent = true;
        this.firedForCurrentHold = true;
      }
    } else {
      // Check grace period
      if (this.bothClosedStartMs !== null) {
        if (timestampMs - this.lastBothMs > WINK_GRACE_MS) {
          // Grace exceeded — reset (eyes opened, can fire again next hold)
          this.bothClosedStartMs = null;
          this.firedForCurrentHold = false;
          this._holdMs = 0;
        }
        // Within grace: keep timer running
      }
    }
  }

  /**
   * Returns true on the frame a double wink is confirmed, then resets.
   */
  consume(): boolean {
    if (this.pendingEvent) {
      this.pendingEvent = false;
      return true;
    }
    return false;
  }

  reset(): void {
    this.bothClosedStartMs = null;
    this.lastBothMs = 0;
    this.firedForCurrentHold = false;
    this.pendingEvent = false;
    this._holdMs = 0;
  }
}
