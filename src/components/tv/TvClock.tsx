"use client";

import { useEffect, useState } from "react";

export function TvClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hora = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const data = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="text-right shrink-0">
      <p className="text-2xl font-light tabular-nums tracking-wider text-white">{hora}</p>
      <p className="text-xs text-white/50 capitalize">{data}</p>
    </div>
  );
}
