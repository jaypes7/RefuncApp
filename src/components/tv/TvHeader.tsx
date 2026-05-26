"use client";

import { TvClock } from "./TvClock";

const DASHBOARD_LABELS: Record<string, string> = {
  geral: "Gestao a Vista - Geral",
  rh: "Gestao a Vista - RH",
  logistica: "Gestao a Vista - Logistica",
  seguranca: "Gestao a Vista - Seguranca",
  suprimentos: "Gestao a Vista - Suprimentos",
  cronograma: "Cronograma",
};

interface TvHeaderProps {
  centroCusto: string;
  dashboard: string;
  slideIndex: number;
  totalSlides: number;
  lastUpdate: Date | null;
}

export function TvHeader({ centroCusto, dashboard, slideIndex, totalSlides, lastUpdate }: TvHeaderProps) {
  return (
    <header className="flex items-center justify-between px-8 py-4 bg-[#232323] border-b border-white/10 shrink-0">
      <div className="flex items-center gap-6 min-w-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-[#ff460a]" />
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-white truncate">
              {DASHBOARD_LABELS[dashboard] ?? dashboard}
            </h1>
            <p className="text-xs text-white/50">
              Projeto {centroCusto}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === slideIndex ? "w-6 bg-[#ff460a]" : "w-1.5 bg-white/20"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-white/40 tabular-nums">
            {slideIndex + 1}/{totalSlides}
          </span>
        </div>

        {lastUpdate && (
          <p className="text-xs text-white/30">
            Atualizado {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}

        <TvClock />
      </div>
    </header>
  );
}
