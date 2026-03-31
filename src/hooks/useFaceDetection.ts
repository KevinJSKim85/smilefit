import { useRef, useState, useEffect } from 'react';
import { FaceLandmarker } from '@mediapipe/tasks-vision';
import type { CalibrationData, SmileState, WinkState, FacialInput } from '../types/detection';
import { extractMouthMetrics } from '../detection/landmarkExtractor';
import { useSmileDetection } from './useSmileDetection';
import { useWinkDetection } from './useWinkDetection';
import { useDoubleWinkDetection } from './useDoubleWinkDetection';

export interface FaceDetectionState {
  faceDetected: boolean;
  smileState: SmileState;
  winkState: WinkState;
  currentInput: FacialInput;
}

const INITIAL_SMILE: SmileState = { rawScore: 0, emaScore: 0, isSmiling: false, smileEvent: false, smileSuppressed: false };
const INITIAL_WINK: WinkState = { leftBlinkScore: 0, rightBlinkScore: 0, leftWink: false, rightWink: false, doubleWink: false, holdSide: null, holdMs: 0, doubleHoldMs: 0 };

// Threshold for emaScore dirty-check — changes smaller than this are imperceptible
const EMA_EPSILON = 0.005;
// Quantize hold progress updates to ~20fps (every 50ms)
const HOLD_QUANTUM = 50;

// MediaPipe blendshape indices (ARKit convention, subject perspective)
const BLINK_LEFT_INDEX = 9; // eyeBlinkLeft
const BLINK_RIGHT_INDEX = 10; // eyeBlinkRight

interface UseFaceDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  landmarker: FaceLandmarker | null;
  calibration: CalibrationData | null;
  enabled: boolean;
}

export function useFaceDetection({
  videoRef,
  landmarker,
  calibration,
  enabled,
}: UseFaceDetectionOptions): FaceDetectionState {
  const [state, setState] = useState<FaceDetectionState>({
    faceDetected: false,
    smileState: INITIAL_SMILE,
    winkState: INITIAL_WINK,
    currentInput: 'none',
  });

  const smile = useSmileDetection(calibration);
  const wink = useWinkDetection(calibration);
  const doubleWink = useDoubleWinkDetection();

  // Store hook callbacks in refs so the rAF loop doesn't depend on their object identity
  const smileRef = useRef(smile);
  const winkRef = useRef(wink);
  const doubleWinkRef = useRef(doubleWink);
  useEffect(() => { smileRef.current = smile; }, [smile]);
  useEffect(() => { winkRef.current = wink; }, [wink]);
  useEffect(() => { doubleWinkRef.current = doubleWink; }, [doubleWink]);

  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Persistent mutable objects — reused every frame to avoid allocations
  const smileBuf = useRef<SmileState>({ ...INITIAL_SMILE });
  const winkBuf = useRef<WinkState>({ ...INITIAL_WINK });

  // Previous setState'd values for dirty-checking
  const prevRef = useRef({
    faceDetected: false,
    currentInput: 'none' as FacialInput,
    isSmiling: false,
    smileEvent: false,
    emaScore: 0,
    leftWink: false,
    rightWink: false,
    doubleWink: false,
    holdMsQ: 0,
    doubleHoldMsQ: 0,
  });

  useEffect(() => {
    if (!enabled) return;

    const detect = () => {
      if (!landmarker || !videoRef.current || videoRef.current.readyState < 2) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      const now = performance.now();
      // Throttle to ~30fps
      if (now - lastTimeRef.current < 33) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }
      lastTimeRef.current = now;

      const result = landmarker.detectForVideo(videoRef.current, now);

      if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
        // Only fire setState if we were previously detecting a face
        const p = prevRef.current;
        if (p.faceDetected) {
          p.faceDetected = false;
          p.currentInput = 'none';
          p.isSmiling = false;
          p.smileEvent = false;
          p.emaScore = 0;
          p.leftWink = false;
          p.rightWink = false;
          p.doubleWink = false;
          p.holdMsQ = 0;
          p.doubleHoldMsQ = 0;
          setState({
            faceDetected: false,
            smileState: INITIAL_SMILE,
            winkState: INITIAL_WINK,
            currentInput: 'none',
          });
        }
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      const landmarks = result.faceLandmarks[0];
      const mouth = extractMouthMetrics(landmarks);

      // Extract blendshape blink scores (0→1, subject/ARKit perspective)
      let leftBlinkScore = 0;
      let rightBlinkScore = 0;
      const blendshapes = result.faceBlendshapes?.[0]?.categories;
      if (blendshapes) {
        leftBlinkScore = blendshapes[BLINK_LEFT_INDEX]?.score ?? 0;
        rightBlinkScore = blendshapes[BLINK_RIGHT_INDEX]?.score ?? 0;
      }

      // Priority order: double wink > single wink > smile
      const winkResult = winkRef.current.process({ leftBlinkScore, rightBlinkScore }, now);
      const doubleWinkResult = doubleWinkRef.current.process(winkResult.classification, now);
      const smileResult = smileRef.current.process(mouth, now);

      // Build final values via direct mutation on persistent buffers (zero allocations)
      const fs = smileBuf.current;
      fs.rawScore = smileResult.rawScore;
      fs.emaScore = smileResult.emaScore;
      fs.isSmiling = smileResult.isSmiling;
      fs.smileEvent = smileResult.smileEvent;
      fs.smileSuppressed = false;

      const fw = winkBuf.current;
      fw.leftBlinkScore = winkResult.leftBlinkScore;
      fw.rightBlinkScore = winkResult.rightBlinkScore;
      fw.leftWink = winkResult.leftWink;
      fw.rightWink = winkResult.rightWink;
      fw.doubleWink = doubleWinkResult.fired;
      fw.holdSide = winkResult.holdSide;
      fw.holdMs = winkResult.holdMs;
      fw.doubleHoldMs = doubleWinkResult.holdMs;

      // Priority suppression: higher-priority input suppresses lower-priority state
      let currentInput: FacialInput = 'none';

      if (doubleWinkResult.fired) {
        currentInput = 'doubleWink';
        if (smileResult.smileEvent || smileResult.isSmiling) fs.smileSuppressed = true;
        fs.smileEvent = false;
        fs.isSmiling = false;
        fw.leftWink = false;
        fw.rightWink = false;
      } else if (winkResult.leftWink) {
        currentInput = 'leftWink';
        if (smileResult.smileEvent || smileResult.isSmiling) fs.smileSuppressed = true;
        fs.smileEvent = false;
        fs.isSmiling = false;
      } else if (winkResult.rightWink) {
        currentInput = 'rightWink';
        if (smileResult.smileEvent || smileResult.isSmiling) fs.smileSuppressed = true;
        fs.smileEvent = false;
        fs.isSmiling = false;
      } else if (smileResult.smileEvent) {
        currentInput = 'smile';
      }

      // ─── Dirty check: only call setState when something meaningful changed ───
      const p = prevRef.current;
      const holdMsQ = Math.floor(fw.holdMs / HOLD_QUANTUM);
      const doubleHoldMsQ = Math.floor(fw.doubleHoldMs / HOLD_QUANTUM);

      const dirty =
        !p.faceDetected ||
        p.currentInput !== currentInput ||
        p.isSmiling !== fs.isSmiling ||
        p.smileEvent !== fs.smileEvent ||
        p.leftWink !== fw.leftWink ||
        p.rightWink !== fw.rightWink ||
        p.doubleWink !== fw.doubleWink ||
        Math.abs(p.emaScore - fs.emaScore) > EMA_EPSILON ||
        p.holdMsQ !== holdMsQ ||
        p.doubleHoldMsQ !== doubleHoldMsQ;

      if (dirty) {
        p.faceDetected = true;
        p.currentInput = currentInput;
        p.isSmiling = fs.isSmiling;
        p.smileEvent = fs.smileEvent;
        p.emaScore = fs.emaScore;
        p.leftWink = fw.leftWink;
        p.rightWink = fw.rightWink;
        p.doubleWink = fw.doubleWink;
        p.holdMsQ = holdMsQ;
        p.doubleHoldMsQ = doubleHoldMsQ;

        // Fresh objects so React sees new references
        setState({
          faceDetected: true,
          smileState: {
            rawScore: fs.rawScore,
            emaScore: fs.emaScore,
            isSmiling: fs.isSmiling,
            smileEvent: fs.smileEvent,
            smileSuppressed: fs.smileSuppressed,
          },
          winkState: {
            leftBlinkScore: fw.leftBlinkScore,
            rightBlinkScore: fw.rightBlinkScore,
            leftWink: fw.leftWink,
            rightWink: fw.rightWink,
            doubleWink: fw.doubleWink,
            holdSide: fw.holdSide,
            holdMs: fw.holdMs,
            doubleHoldMs: fw.doubleHoldMs,
          },
          currentInput,
        });
      }

      rafRef.current = requestAnimationFrame(detect);
    };

    rafRef.current = requestAnimationFrame(detect);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, landmarker, videoRef]);

  return state;
}
