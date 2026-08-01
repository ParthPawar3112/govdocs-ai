// Animates a number counting up to its target value using requestAnimationFrame.
import { useEffect, useState } from "react";

export function useCountUp(target, durationMs = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    let frame;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / durationMs, 1);
      // easeOutCubic - starts fast, settles gently, matches the "smooth" brief requirement.
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}
