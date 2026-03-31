import { createContext, useContext, useState, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

interface DetectionContextValue {
  landmarker: FaceLandmarker | null;
  isLoading: boolean;
  error: string | null;
}

const DetectionContext = createContext<DetectionContextValue | null>(null);

export function DetectionProvider({ children }: { children: ReactNode }) {
  const [landmarker, setLandmarker] = useState<FaceLandmarker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm'
        );

        const fl = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: false,
        });

        if (!cancelled) {
          landmarkerRef.current = fl;
          setLandmarker(fl);
          setIsLoading(false);
        } else {
          fl.close();
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load face detection model';
          setError(message);
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  const value = useMemo<DetectionContextValue>(
    () => ({ landmarker, isLoading, error }),
    [landmarker, isLoading, error],
  );

  return (
    <DetectionContext.Provider value={value}>
      {children}
    </DetectionContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSharedLandmarker(): DetectionContextValue {
  const context = useContext(DetectionContext);
  if (!context) {
    throw new Error('useSharedLandmarker must be used within DetectionProvider');
  }
  return context;
}
