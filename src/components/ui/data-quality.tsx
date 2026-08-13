"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bloco "Qualidade dos Dados" (ver ANALISE_PGV.md §4.2).
 *
 * Conta o que está faltando ou errado e transforma inconsistência em métrica
 * visível e permanente, em vez de um toast que some. Num app movido a
 * importação de planilha, é o bloco que mais paga.
 *
 * Convenção: zero é bom e fica discreto; qualquer valor > 0 ganha cor e vira
 * item de trabalho.
 */

export interface DataQualityIndicator {
  label: string;
  count: number;
  /** `danger` para o que quebra o dado; `warning` (padrão) para o que só falta. */
  severity?: "warning" | "danger";
  /** Explica a regra de contagem deste indicador específico. */
  hint?: string;
}

export interface DataQualityBlockProps {
  title?: string;
  indicators: DataQualityIndicator[];
  /**
   * Nota de rodapé com a regra de contagem. O default reproduz a do PGV, que
   * evita a leitura errada de somar as linhas.
   */
  footnote?: string;
  className?: string;
}

const DEFAULT_FOOTNOTE =
  "Um mesmo registro pode aparecer em mais de uma linha. Cada indicador conta registros distintos afetados pelo critério.";

export function DataQualityBlock({
  title = "Qualidade dos dados",
  indicators,
  footnote = DEFAULT_FOOTNOTE,
  className,
}: DataQualityBlockProps) {
  const totalAfetado = indicators.reduce((acc, i) => acc + i.count, 0);

  return (
    <div className={cn("glass-card rounded-md", className)}>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        {totalAfetado === 0 ? (
          <span className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            Sem inconsistências
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-amber-700 dark:text-amber-500">
            <AlertTriangle className="h-3.5 w-3.5" />
            {totalAfetado.toLocaleString("pt-BR")} ocorrência
            {totalAfetado === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="grid gap-x-6 gap-y-0.5 px-4 py-3 sm:grid-cols-2">
        {indicators.map((ind) => {
          const zero = ind.count === 0;
          const severity = ind.severity ?? "warning";
          return (
            <div
              key={ind.label}
              className="flex items-baseline justify-between gap-3 border-b border-border/40 py-1.5 last:border-0"
              title={ind.hint}
            >
              <span
                className={cn(
                  "truncate text-xs",
                  zero ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {ind.label}
              </span>
              <span
                className={cn(
                  "shrink-0 font-mono text-sm font-semibold tabular-nums",
                  zero && "text-muted-foreground/50",
                  !zero &&
                    severity === "warning" &&
                    "text-amber-700 dark:text-amber-500",
                  !zero && severity === "danger" && "text-rose-700 dark:text-rose-400",
                )}
              >
                {ind.count.toLocaleString("pt-BR")}
              </span>
            </div>
          );
        })}
      </div>

      {footnote && (
        <p className="border-t px-4 py-2.5 text-[11px] italic text-muted-foreground">
          {footnote}
        </p>
      )}
    </div>
  );
}

/**
 * Barra de proporção inline — mais legível que um gráfico para listas de
 * tamanhos de uniforme/EPI (§4.2): `38 ▮▮▯▯▯ 4 · 12%`.
 */
export function ProportionBar({
  label,
  value,
  total,
  className,
}: {
  label: string;
  value: number;
  total: number;
  className?: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="w-32 shrink-0 truncate text-xs text-foreground/80" title={label}>
        {label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 shrink-0 text-right font-mono text-xs tabular-nums">
        <span className="font-semibold">{value.toLocaleString("pt-BR")}</span>
        <span className="text-muted-foreground"> · {pct}%</span>
      </span>
    </div>
  );
}
