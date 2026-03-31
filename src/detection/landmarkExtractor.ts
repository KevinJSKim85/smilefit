import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import {
  MOUTH_LEFT,
  MOUTH_RIGHT,
  MOUTH_TOP,
  MOUTH_BOTTOM,
  LEFT_EYE_POINTS,
  RIGHT_EYE_POINTS,
} from '../constants/landmarks';
import { distance } from '../utils/math';

export interface MouthMetrics {
  mouthW: number;
  mouthH: number;
}

function centroid(landmarks: NormalizedLandmark[], indices: number[]): { x: number; y: number } {
  let sx = 0;
  let sy = 0;
  for (const i of indices) {
    sx += landmarks[i].x;
    sy += landmarks[i].y;
  }
  const n = indices.length;
  return { x: sx / n, y: sy / n };
}

/**
 * Extract mouth width and height normalized by inter-ocular distance.
 * Ported from SmileCam CameraService.swift.
 */
export function extractMouthMetrics(landmarks: NormalizedLandmark[]): MouthMetrics {
  const mL = landmarks[MOUTH_LEFT];
  const mR = landmarks[MOUTH_RIGHT];
  const mTop = landmarks[MOUTH_TOP];
  const mBot = landmarks[MOUTH_BOTTOM];

  const eL = centroid(landmarks, LEFT_EYE_POINTS);
  const eR = centroid(landmarks, RIGHT_EYE_POINTS);
  const eyeDist = distance(eL.x, eL.y, eR.x, eR.y) + 1e-6;

  const mouthW = distance(mL.x, mL.y, mR.x, mR.y) / eyeDist;
  const mouthH = Math.abs(mTop.y - mBot.y) / eyeDist;

  return { mouthW, mouthH };
}

