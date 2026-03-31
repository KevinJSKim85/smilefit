import { useRef, useState, useCallback, useEffect } from 'react';

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  isReady: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startRef = useRef<() => Promise<void>>(undefined);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsReady(false);
  }, []);

  const start = useCallback(async () => {
    // Stop any existing stream first
    stop();

    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        try {
          await videoRef.current.play();
        } catch (e) {
          // Ignore AbortError — happens when play() is interrupted by a
          // navigation / new load request before the promise resolves.
          if (e instanceof DOMException && e.name === 'AbortError') return;
          throw e;
        }
        setIsReady(true);
      }
    } catch (err) {
      // Use i18n key so CalibrationScreen can show a translated message
      const isDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      setError(isDenied ? 'common.cameraBlocked' : 'common.error');
      setIsReady(false);
    }
  }, [stop]);

  // Keep a ref so the permission listener can call the latest start()
  startRef.current = start;

  // Auto-retry when user grants camera permission after initial denial/dismiss
  useEffect(() => {
    let permStatus: PermissionStatus | null = null;
    let handler: (() => void) | null = null;

    navigator.permissions?.query({ name: 'camera' as PermissionName }).then((status) => {
      permStatus = status;
      handler = () => {
        if (status.state === 'granted' && !streamRef.current) {
          startRef.current?.();
        }
      };
      status.addEventListener('change', handler);
    }).catch(() => {
      // Permissions API not supported — no-op
    });

    return () => {
      if (permStatus && handler) {
        permStatus.removeEventListener('change', handler);
      }
    };
  }, []);

  // Stop camera stream on unmount to prevent resource leak
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return { videoRef, stream, isReady, error, start, stop };
}
