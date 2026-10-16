"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

function subscribeToMotionPreference(onChange: () => void) {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  preference.addEventListener("change", onChange);
  return () => preference.removeEventListener("change", onChange);
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export type HeroSlide = {
  id: string;
  imageUrl: string;
  title: string;
  subtitle?: string;
  href: string;
};

export function Hero({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeToMotionPreference, prefersReducedMotion, () => true);
  const { locale } = useI18n();
  const activeIndex = Math.min(index, slides.length - 1);
  const shouldRotate = !paused && !hovered && !focused && !reducedMotion;

  useEffect(() => {
    if (slides.length <= 1 || !shouldRotate) return;
    const id = setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % slides.length);
    }, 6000);
    return () => clearInterval(id);
  }, [slides.length, shouldRotate]);

  if (slides.length === 0) return null;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={locale === "mm" ? "အထူးရုပ်ရှင်များနှင့် အစီအစဉ်များ" : "Featured movies and promotions"}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
      className="relative aspect-[16/9] w-full overflow-hidden sm:aspect-[21/9]"
    >
      {slides.map((slide, i) => (
        <Link
          key={slide.id}
          href={slide.href}
          tabIndex={i === activeIndex ? 0 : -1}
          aria-hidden={i !== activeIndex}
          aria-label={`${slide.title} — ${locale === "mm" ? "အသေးစိတ်ကြည့်ရန်" : "View details"}`}
          className={cn(
            "absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none focus-visible:-outline-offset-4",
            i === activeIndex ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <Image src={slide.imageUrl} alt="" fill priority={i === 0} className="object-cover" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute bottom-10 left-4 right-4 text-white sm:bottom-12 sm:left-8">
            <h2 className="line-clamp-2 text-lg font-bold leading-tight drop-shadow sm:text-3xl">{slide.title}</h2>
            {slide.subtitle && <p className="mt-1 line-clamp-1 text-xs opacity-90 sm:text-base">{slide.subtitle}</p>}
            <span className="mt-1 inline-flex min-h-8 items-center gap-2 text-xs font-semibold underline underline-offset-4 sm:mt-2 sm:min-h-11 sm:text-sm">
              {locale === "mm" ? "အသေးစိတ်ကြည့်ရန်" : "View details"}<span aria-hidden="true">→</span>
            </span>
          </div>
        </Link>
      ))}
      {slides.length > 1 && (
        <div className="absolute bottom-0 left-1/2 flex max-w-[calc(100%-6rem)] -translate-x-1/2 overflow-x-auto">
          {slides.map((slide, i) => (
            <button
              type="button"
              key={slide.id}
              onClick={() => { setIndex(i); setPaused(true); }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded focus-visible:-outline-offset-4"
              aria-label={locale === "mm" ? `ဆလိုက် ${i + 1} ကြည့်ရန်` : `Show slide ${i + 1}: ${slide.title}`}
              aria-current={i === activeIndex ? "true" : undefined}
            >
              <span className={cn("h-1.5 rounded-full transition-all motion-reduce:transition-none", i === activeIndex ? "w-6 bg-white" : "w-1.5 bg-white/50")} />
            </button>
          ))}
        </div>
      )}
      {slides.length > 1 && !reducedMotion && (
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          className="absolute bottom-0 right-2 flex h-11 w-11 items-center justify-center rounded text-white focus-visible:-outline-offset-4"
          aria-label={paused ? (locale === "mm" ? "ဆလိုက်များ ဆက်ပြရန်" : "Play slideshow") : (locale === "mm" ? "ဆလိုက်များ ခေတ္တရပ်ရန်" : "Pause slideshow")}
        >
          {paused ? <span aria-hidden="true">▶</span> : <span aria-hidden="true" className="flex gap-1"><span className="h-3 w-1 rounded-sm bg-current" /><span className="h-3 w-1 rounded-sm bg-current" /></span>}
        </button>
      )}
    </div>
  );
}
