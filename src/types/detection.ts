export interface CalibrationData {
  smile: {
    baseWidth: number;
    baseHeight: number;
  };
  wink: {
    leftBlinkBaseline: number;
    rightBlinkBaseline: number;
  };
  timestamp: string;
}

export interface SmileState {
  rawScore: number;
  emaScore: number;
  isSmiling: boolean;
  smileEvent: boolean;
  /** True when a smile event was detected but suppressed by a concurrent wink */
  smileSuppressed: boolean;
}

export interface WinkState {
  leftBlinkScore: number;
  rightBlinkScore: number;
  leftWink: boolean;
  rightWink: boolean;
  doubleWink: boolean;
  /** Which side is currently being held for single wink (subject/user perspective) */
  holdSide: 'left' | 'right' | null;
  /** How long the current single wink has been held (ms) */
  holdMs: number;
  /** How long both eyes have been held closed (ms) */
  doubleHoldMs: number;
}

export type FacialInput = 'smile' | 'leftWink' | 'rightWink' | 'doubleWink' | 'none';
