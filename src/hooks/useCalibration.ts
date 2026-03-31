import { useRef, useState, useCallback, useEffect } from 'react';
import { FaceLandmarker } from '@mediapipe/tasks-vision';
import type { CalibrationData } from '../types/detection';
import { CalibrationProcessor } from '../detection/calibrationProcessor';
import { extractMouthMetrics } from '../detection/landmarkExtractor';
import { CALIBRATION_DURATION_MS, MIN_CALIBRATION_FRAMES } from '../constants/detection';
import { soundManager } from '../audio/SoundManager';

// MediaPipe blendshape indices (ARKit convention, subject perspective)
const BLINK_LEFT_INDEX = 9; // eyeBlinkLeft
const BLINK_RIGHT_INDEX = 10; // eyeBlinkRight

interface UseCalibrationOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  landmarker: FaceLandmarker | null;
}

interface UseCalibrationReturn {
  isCalibrating: boolean;
  secondsLeft: number;
  faceDetected: boolean;
  calibrationResult: CalibrationData | null;
  calibrationFailed: boolean;
  startCalibration: () => void;
  cancelCalibration: () => void;
}

const CALIBRATION_SECONDS = CALIBRATION_DURATION_MS / 1000;

/** Frames without a face before showing the "no face" warning. */
const NO_FACE_THRESHOLD = 10;

export function useCalibration({
  videoRef,
  landmarker,
}: UseCalibrationOptions): UseCalibrationReturn {
  const processorRef = useRef(new CalibrationProcessor());
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(CALIBRATION_SECONDS);
  const [faceDetected, setFaceDetected] = useState(true);
  const [calibrationResult, setCalibrationResult] = useState<CalibrationData | null>(null);
  const [calibrationFailed, setCalibrationFailed] = useState(false);

  const landmarkerRef = useRef(landmarker);
  useEffect(() => {
    landmarkerRef.current = landmarker;
  }, [landmarker]);

  // Throttle countdown updates to avoid unnecessary renders
  const prevSecondsRef = useRef(-1);
  // Debounce face detection to avoid flickering
  const noFaceFramesRef = useRef(0);

  // Stable rAF loop function stored in a ref
  const collectFrameRef = useRef<() => void>(null!);
  useEffect(() => {
    collectFrameRef.current = () => {
      // Wall-clock countdown
      const elapsed = performance.now() - startTimeRef.current;
      const remaining = Math.max(0, Math.ceil((CALIBRATION_DURATION_MS - elapsed) / 1000));

      if (remaining !== prevSecondsRef.current) {
        prevSecondsRef.current = remaining;
        setSecondsLeft(remaining);
        if (remaining > 0) soundManager.play('calibrationTick');
      }

      // Time's up — process results
      if (elapsed >= CALIBRATION_DURATION_MS) {
        setIsCalibrating(false);
        if (processorRef.current.frameCount >= MIN_CALIBRATION_FRAMES) {
          const data = processorRef.current.getCalibrationData();
          if (data) {
            soundManager.play('calibrationDone');
            setCalibrationResult(data);
          } else {
            setCalibrationFailed(true);
          }
        } else {
          // Not enough frames collected (face was missing too much)
          setCalibrationFailed(true);
        }
        return;
      }

      // Try to detect face and collect a frame
      if (!landmarkerRef.current || !videoRef.current || videoRef.current.readyState < 2) {
        rafRef.current = requestAnimationFrame(collectFrameRef.current);
        return;
      }

      const now = performance.now();
      const result = landmarkerRef.current.detectForVideo(videoRef.current, now);

      if (result.faceLandmarks && result.faceLandmarks.length > 0) {
        noFaceFramesRef.current = 0;
        setFaceDetected(true);

        const landmarks = result.faceLandmarks[0];
        const mouth = extractMouthMetrics(landmarks);

        let leftBlinkScore = 0;
        let rightBlinkScore = 0;
        const blendshapes = result.faceBlendshapes?.[0]?.categories;
        if (blendshapes) {
          leftBlinkScore = blendshapes[BLINK_LEFT_INDEX]?.score ?? 0;
          rightBlinkScore = blendshapes[BLINK_RIGHT_INDEX]?.score ?? 0;
        }

        processorRef.current.addFrame(mouth.mouthW, mouth.mouthH, leftBlinkScore, rightBlinkScore);
      } else {
        noFaceFramesRef.current++;
        if (noFaceFramesRef.current >= NO_FACE_THRESHOLD) {
          setFaceDetected(false);
        }
      }

      rafRef.current = requestAnimationFrame(collectFrameRef.current);
    };
  }, [videoRef]);

  const startCalibration = useCallback(() => {
    processorRef.current.reset();
    prevSecondsRef.current = -1;
    noFaceFramesRef.current = 0;
    startTimeRef.current = performance.now();
    setSecondsLeft(CALIBRATION_SECONDS);
    setFaceDetected(true);
    setCalibrationResult(null);
    setCalibrationFailed(false);
    setIsCalibrating(true);
    rafRef.current = requestAnimationFrame(() => collectFrameRef.current());
  }, []);

  const cancelCalibration = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    processorRef.current.reset();
    setIsCalibrating(false);
    setSecondsLeft(CALIBRATION_SECONDS);
  }, []);

  return {
    isCalibrating,
    secondsLeft,
    faceDetected,
    calibrationResult,
    calibrationFailed,
    startCalibration,
    cancelCalibration,
  };
}
