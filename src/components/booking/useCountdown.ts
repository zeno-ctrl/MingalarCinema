"use client";

import { useEffect, useState } from "react";

function computeRemaining(targetIso: string | null): number | null {
  if (!targetIso) return null;
  return Math.max(0, new Date(targetIso).getTime() - Date.now());
}

export function useCountdown(targetIso: string | null, onExpire: () => void) {
  const [remainingMs, setRemainingMs] = useState<number | null>(() => computeRemaining(targetIso));

  useEffect(() => {
    function tick() {
      const next = computeRemaining(targetIso);
      setRemainingMs(next);
      if (next === 0) onExpire();
    }
    // Deferred (not called synchronously in the effect body) so the very
    // first tick after targetIso changes still goes through a task queue.
    const initial = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetIso]);

  if (remainingMs == null) return null;
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return { minutes, seconds, label: `${minutes}:${seconds.toString().padStart(2, "0")}` };
}
