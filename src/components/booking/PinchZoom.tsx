"use client";

import { useRef, useState } from "react";

function distance(touches: React.TouchList) {
  const [a, b] = [touches[0], touches[1]];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export function PinchZoom({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);
  const startDistance = useRef(0);
  const startScale = useRef(1);

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      startDistance.current = distance(e.touches);
      startScale.current = scale;
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && startDistance.current > 0) {
      e.preventDefault();
      const newDistance = distance(e.touches);
      const ratio = newDistance / startDistance.current;
      const next = Math.min(2.5, Math.max(1, startScale.current * ratio));
      setScale(next);
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) startDistance.current = 0;
  }

  return (
    <div
      className="overflow-auto touch-pan-x"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
        className="mx-auto w-fit transition-transform duration-75"
      >
        {children}
      </div>
      {scale > 1 && (
        <button
          onClick={() => setScale(1)}
          className="fixed bottom-24 right-4 z-30 rounded-full bg-bg px-3 py-1.5 text-xs font-medium shadow-card-hover"
        >
          Reset zoom
        </button>
      )}
    </div>
  );
}
