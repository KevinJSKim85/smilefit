import { useState, useEffect } from 'react';

/**
 * Animates a number from 0 to `target` over `duration` ms.
 * Uses ease-out cubic for a satisfying deceleration.
 */
export function useCountUp(target: number, duration: number = 1000): number {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (target <= 0) {
      setCurrent(0);
      return;
    }

    const startTime = performance.now();
    let raf: number;

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.floor(eased * target));
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return current;
}
