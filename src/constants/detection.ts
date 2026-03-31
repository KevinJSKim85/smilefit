// Smile detection (from SmileCam CameraService.swift)
export const SMILE_THRESHOLD = 0.15;
export const SMILE_FRAMES_REQUIRED = 8; // ~267ms at 30fps
export const SMILE_COOLDOWN_SEC = 2.0;
export const SMILE_COOLDOWN_MS = SMILE_COOLDOWN_SEC * 1000;
export const EMA_ALPHA = 0.3;
export const SMILE_WIDTH_WEIGHT = 0.7;
export const SMILE_HEIGHT_WEIGHT = 0.3;

// Wink detection — blendshape-based with hold timing
export const BLINK_CLOSED_THRESHOLD = 0.4; // blendshape score above this = eye closed
export const BLINK_OPEN_THRESHOLD = 0.3; // blendshape score below this = eye definitely open (differential wink check)
export const WINK_HOLD_MS = 500; // single wink must be held 0.5s before firing
export const DOUBLE_BLINK_CLOSED_THRESHOLD = 0.6; // higher threshold for double wink to prevent sympathetic closure false positives
export const DOUBLE_WINK_HOLD_MS = 500; // both eyes held closed 0.5s = hard drop
export const WINK_GRACE_MS = 100; // allow up to 100ms (~3 frames) of detection noise without resetting hold
export const SMILE_AFTER_WINK_GRACE_MS = 300; // ignore smile rising edge shortly after a wink
export const SMILE_REPEAT_MS = 1000; // auto-rotate every 1s while holding smile

// Calibration
export const CALIBRATION_DURATION_MS = 5000; // 5-second wall-clock countdown
export const MIN_CALIBRATION_FRAMES = 60; // minimum frames needed for valid medians
export const TARGET_FPS = 30;
