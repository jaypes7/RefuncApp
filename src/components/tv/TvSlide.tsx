"use client";

import { useEffect, useRef } from "react";

interface TvSlideProps {
  intervalSec: number;
  children: React.ReactNode;
}

export function TvSlide({ intervalSec, children }: TvSlideProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const scrollStartedRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.scrollTop = 0;
    scrollStartedRef.current = false;

    function startScroll() {
      if (scrollStartedRef.current || !el) return;
      const overflow = el.scrollHeight - el.clientHeight;
      if (overflow <= 10) return;

      scrollStartedRef.current = true;

      const totalMs = intervalSec * 1000;
      const waitTop = totalMs * 0.10;
      const scrollDuration = totalMs * 0.85;
      const startTime = performance.now() + waitTop;

      function tick() {
        if (!el) return;
        const currentOverflow = el.scrollHeight - el.clientHeight;
        const now = performance.now();
        const elapsed = now - startTime;
        if (elapsed < 0) {
          animRef.current = requestAnimationFrame(tick);
          return;
        }
        const progress = Math.min(elapsed / scrollDuration, 1);
        el.scrollTop = progress * currentOverflow;
        if (progress < 1) animRef.current = requestAnimationFrame(tick);
      }

      animRef.current = requestAnimationFrame(tick);
    }

    const ro = new ResizeObserver(() => {
      if (!el || scrollStartedRef.current) return;
      const overflow = el.scrollHeight - el.clientHeight;
      if (overflow > 10) {
        startScroll();
      }
    });

    ro.observe(el);

    const fallbackId = setTimeout(() => startScroll(), 3000);

    return () => {
      ro.disconnect();
      clearTimeout(fallbackId);
      cancelAnimationFrame(animRef.current);
    };
  }, [intervalSec]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-y-auto"
      style={{ scrollBehavior: "auto" }}
    >
      {children}
    </div>
  );
}
