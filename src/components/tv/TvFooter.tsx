"use client";

import { useEffect, useState } from "react";

interface TvFooterProps {
  intervalSec: number;
}

export function TvFooter({ intervalSec }: TvFooterProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const stepMs = 100;
    const id = setInterval(() => {
      setProgress((p) => {
        const next = p + (stepMs / (intervalSec * 1000)) * 100;
        return next >= 100 ? 100 : next;
      });
    }, stepMs);
    return () => clearInterval(id);
  }, [intervalSec]);

  return (
    <div className="h-1 w-full bg-black/10 shrink-0">
      <div
        className="h-full bg-[#ff460a]/70 transition-none"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
