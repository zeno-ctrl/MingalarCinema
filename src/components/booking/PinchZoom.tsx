"use client";

import { useEffect, useRef, useState } from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 2.5;
const clampScale = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

function distance(touches: TouchList) {
  const [a, b] = [touches[0], touches[1]];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export function PinchZoom({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const contentRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const startDistance = useRef(0);
  const startScale = useRef(1);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const measure = () => setSize({ width: content.offsetWidth, height: content.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        startDistance.current = distance(e.touches);
        startScale.current = scaleRef.current;
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 2 && startDistance.current > 0) {
        if (e.cancelable) e.preventDefault();
        setScale(clampScale(startScale.current * distance(e.touches) / startDistance.current));
      }
    }
    function onTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) startDistance.current = 0;
    }
    // React's touch handlers are passive in modern browsers. A native listener
    // lets a two-finger gesture zoom the map without a preventDefault warning.
    viewport.addEventListener("touchstart", onTouchStart, { passive: true });
    viewport.addEventListener("touchmove", onTouchMove, { passive: false });
    viewport.addEventListener("touchend", onTouchEnd);
    viewport.addEventListener("touchcancel", onTouchEnd);
    return () => {
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("touchmove", onTouchMove);
      viewport.removeEventListener("touchend", onTouchEnd);
      viewport.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  return (
    <div>
      <div className="mb-2 flex items-center justify-center gap-2 text-xs">
        <button type="button" aria-label="Zoom out seat map" disabled={scale <= MIN_SCALE} onClick={() => setScale((value) => clampScale(value - 0.25))} className="h-10 w-10 rounded-chip bg-bg shadow-card disabled:opacity-40">−</button>
        <button type="button" aria-label="Reset seat map zoom" onClick={() => setScale(1)} className="min-h-10 min-w-20 rounded-chip px-2 text-text-muted">{Math.round(scale * 100)}%</button>
        <button type="button" aria-label="Zoom in seat map" disabled={scale >= MAX_SCALE} onClick={() => setScale((value) => clampScale(value + 0.25))} className="h-10 w-10 rounded-chip bg-bg shadow-card disabled:opacity-40">+</button>
      </div>
      <div
        ref={viewportRef}
        className="max-w-full overflow-auto"
        style={{ touchAction: "pan-x pan-y" }}
        role="region"
        aria-label="Cinema seat map"
        tabIndex={0}
      >
        <div className="mx-auto" style={size.width ? { width: size.width * scale, height: size.height * scale } : { width: "max-content" }}>
          <div ref={contentRef} className="w-max origin-top-left" style={{ transform: `scale(${scale})` }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
