"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Significado fixo das cores de KPI (ver ANALISE_PGV.md §3.2).
 *
 * A cor é semântica, nunca decorativa — é o que permite escanear um grid de 12
 * KPIs e ir direto no laranja. Não introduza tons novos sem estender esta tabela.
 *
 *   neutral  → número sem juízo de valor (totais, contagens)
 *   success  → concluído / dentro do esperado
 *   warning  → pendente / merece atenção
 *   info     → em andamento
 *   danger   → crítico / vencido
 */
export type KpiTone = "neutral" | "success" | "warning" | "info" | "danger";

const TONE_ICON: Record<KpiTone, string> = {
  neutral: "bg-primary/10 text-primary",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  info: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400",
  danger: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400",
};

const TONE_VALUE: Record<KpiTone, string> = {
  neutral: "text-foreground",
  success: "text-emerald-700 dark:text-emerald-400",
  warning: "text-amber-700 dark:text-amber-500",
  info: "text-sky-700 dark:text-sky-400",
  danger: "text-rose-700 dark:text-rose-400",
};

/** Fundo tonal do card inteiro — reservado aos KPIs que exigem ação (§3.2). */
const TONE_SURFACE: Record<KpiTone, string> = {
  neutral: "",
  success: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/5",
  warning: "border-amber-200 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/5",
  info: "border-sky-200 bg-sky-50/60 dark:border-sky-500/20 dark:bg-sky-500/5",
  danger: "border-rose-200 bg-rose-50/60 dark:border-rose-500/20 dark:bg-rose-500/5",
};

export interface KpiCardProps {
  icon?: React.ElementType;
  label: string;
  value: number | string;
  /** Unidade pequena ao lado do número, ex.: "km", "dias". */
  unit?: string;
  /**
   * Denominador para o percentual sob o valor. `50 / 83%` conta mais história
   * que `50` (§3.2). Só use com `value` numérico.
   */
  total?: number;
  /** Linha de contexto pequena sob o valor. */
  hint?: string;
  /** Texto que o card admite não saber, ex.: "11 sem informação" (§4.2). */
  unknown?: string;
  tone?: KpiTone;
  /** Tinge o card inteiro, não só o número. Use apenas quando exige ação. */
  emphasis?: boolean;
  className?: string;
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  unit,
  total,
  hint,
  unknown,
  tone = "neutral",
  emphasis = false,
  className,
}: KpiCardProps) {
  const pct =
    typeof value === "number" && typeof total === "number" && total > 0
      ? Math.round((value / total) * 100)
      : null;

  return (
    <div
      className={cn(
        "glass-card flex items-start gap-3 rounded-md px-4 py-3.5",
        emphasis && TONE_SURFACE[tone],
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            TONE_ICON[tone],
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "font-mono text-2xl font-bold leading-tight tabular-nums",
              TONE_VALUE[tone],
            )}
          >
            {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
          </span>
          {unit && (
            <span className="text-xs font-medium text-muted-foreground">{unit}</span>
          )}
          {pct !== null && (
            <span className="font-mono text-xs font-semibold text-muted-foreground tabular-nums">
              / {pct}%
            </span>
          )}
        </p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        {unknown && (
          <p className="text-[11px] italic text-muted-foreground/70">{unknown}</p>
        )}
      </div>
    </div>
  );
}
