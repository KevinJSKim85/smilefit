import { useRef, useEffect } from 'react';

/**
 * requestAnimationFrame game loop with delta time.
 * The callback receives deltaMs (milliseconds since last frame).
 */
export function useGameLoop(
  callback: (deltaMs: number) => void,
  isRunning: boolean
) {
  const callbackRef = useRef(callback);
  const rafRef = useRef<number>(0);
  const prevTimeRef = useRef<number>(0);

  // Keep callback ref current to avoid stale closures
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!isRunning) {
      cancelAnimationFrame(rafRef.current);
      prevTimeRef.current = 0;
      return;
    }

    prevTimeRef.current = 0;

    const loop = (timestamp: number) => {
      if (prevTimeRef.current === 0) {
        prevTimeRef.current = timestamp;
      }

      const delta = timestamp - prevTimeRef.current;
      prevTimeRef.current = timestamp;

      // Cap delta to prevent huge jumps (e.g. after tab switch)
      const cappedDelta = Math.min(delta, 100);
      callbackRef.current(cappedDelta);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [isRunning]);
}
