"use client";

import * as React from "react";
import { FileSpreadsheet, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho de proveniência de importação (ver ANALISE_PGV.md §4.2).
 *
 *   DEMO_Efetivo.xlsx · 16/07/2026, 12:10:13 · por João
 *   [novos 33] [atualizados 0] [ausentes 0] [rejeitados 0] [warnings 1]
 *
 * O painel diz de onde veio o dado. Todo fluxo que consome planilha deve
 * mostrar isto — hoje o resultado da importação vive num toast que some.
 */

export interface ImportProvenance {
  /** Nome do arquivo importado. */
  arquivo: string;
  /** Quando a importação rodou. */
  data: Date | string;
  /** Quem rodou. `null` → "—", como o PGV faz quando não sabe. */
  autor?: string | null;
  novos?: number;
  atualizados?: number;
  ausentes?: number;
  rejeitados?: number;
  warnings?: number;
}

function Badge({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "neutral" | "warning" | "danger";
}) {
  const zero = count === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        zero && "bg-muted text-muted-foreground",
        !zero && tone === "neutral" && "bg-primary/10 text-primary",
        !zero &&
          tone === "warning" &&
          "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
        !zero &&
          tone === "danger" &&
          "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400",
      )}
    >
      {label}
      <span className="font-mono font-semibold tabular-nums">
        {count.toLocaleString("pt-BR")}
      </span>
    </span>
  );
}

export interface ImportProvenanceHeaderProps {
  /** `null` → nunca importado; o componente declara isso em vez de sumir. */
  provenance: ImportProvenance | null;
  /** Ação "Ver detalhes da importação". */
  onDetails?: () => void;
  /** Banner de duplicidade no topo, ex.: "1 grupo / 2 registros" (§4.2). */
  duplicidades?: { grupos: number; registros: number } | null;
  className?: string;
}

export function ImportProvenanceHeader({
  provenance,
  onDetails,
  duplicidades,
  className,
}: ImportProvenanceHeaderProps) {
  if (!provenance) {
    return (
      <div
        className={cn(
          "glass-card rounded-md px-4 py-3 text-xs italic text-muted-foreground",
          className,
        )}
      >
        Nenhuma importação registrada para este escopo.
      </div>
    );
  }

  const data =
    typeof provenance.data === "string" ? new Date(provenance.data) : provenance.data;
  const stamp = Number.isNaN(data.getTime())
    ? "—"
    : `${data.toLocaleDateString("pt-BR")}, ${data.toLocaleTimeString("pt-BR")}`;

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {duplicidades && duplicidades.grupos > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Possíveis duplicidades:{" "}
            <span className="font-mono font-semibold tabular-nums">
              {duplicidades.grupos}
            </span>{" "}
            grupo{duplicidades.grupos === 1 ? "" : "s"} /{" "}
            <span className="font-mono font-semibold tabular-nums">
              {duplicidades.registros}
            </span>{" "}
            registros
          </span>
        </div>
      )}

      <div className="glass-card flex flex-col gap-2.5 rounded-md px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="font-medium text-foreground">{provenance.arquivo}</span>
          <span aria-hidden className="text-border">·</span>
          <span className="font-mono tabular-nums">{stamp}</span>
          <span aria-hidden className="text-border">·</span>
          <span>por {provenance.autor || "—"}</span>
          {onDetails && (
            <button
              type="button"
              onClick={onDetails}
              className="ml-auto shrink-0 font-medium text-primary underline-offset-2 hover:underline"
            >
              Ver detalhes da importação
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge label="novos" count={provenance.novos ?? 0} tone="neutral" />
          <Badge label="atualizados" count={provenance.atualizados ?? 0} tone="neutral" />
          <Badge label="ausentes" count={provenance.ausentes ?? 0} tone="warning" />
          <Badge label="rejeitados" count={provenance.rejeitados ?? 0} tone="danger" />
          <Badge label="warnings" count={provenance.warnings ?? 0} tone="warning" />
        </div>
      </div>
    </div>
  );
}
