"use client";

import { useEffect, useRef, useState } from "react";

function computeRemaining(targetIso: string | null): number | null {
  if (!targetIso) return null;
  const target = new Date(targetIso).getTime();
  return Number.isFinite(target) ? Math.max(0, target - Date.now()) : null;
}

export function useCountdown(targetIso: string | null, onExpire: () => void) {
  const [remainingMs, setRemainingMs] = useState<number | null>(() => computeRemaining(targetIso));
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    let expired = false;
    function tick() {
      const next = computeRemaining(targetIso);
      setRemainingMs(next);
      if (next === 0 && !expired) {
        expired = true;
        onExpireRef.current();
      }
    }
    // Deferred (not called synchronously in the effect body) so the very
    // first tick after targetIso changes still goes through a task queue.
    const initial = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [targetIso]);

  if (remainingMs == null) return null;
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return { minutes, seconds, label: `${minutes}:${seconds.toString().padStart(2, "0")}` };
}
