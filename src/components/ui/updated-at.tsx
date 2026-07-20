"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Linha de contexto sob os KPIs (ver ANALISE_PGV.md §3.3).
 *
 *   Avanço geral: 41% · Vence hoje: 0 · Atualizado em 16/07/2026 às 20:00
 *
 * Junta resumo executivo, alertas de prazo curto e a recência do dado numa
 * linha discreta. Regra do plano de adoção (item 2): nenhum número sem data.
 */

export interface ContextItem {
  label: string;
  value: React.ReactNode;
  /** Destaca o valor quando merece atenção (ex.: vencidos > 0). */
  alert?: boolean;
}

function formatTimestamp(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  const dia = date.toLocaleDateString("pt-BR");
  const hora = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dia} às ${hora}`;
}

export interface ContextLineProps {
  items?: ContextItem[];
  /** Quando o dado foi atualizado. `null` → declara que não sabemos. */
  updatedAt?: Date | string | null;
  /**
   * Origem do número, ex.: "Tomorrow.io", "planilha de frota". Segue a lição do
   * painel de clima (§4.5): o painel diz de onde veio o dado.
   */
  source?: string;
  /** Ação de recarregar, ex.: um <Button size="sm" variant="ghost">. */
  action?: React.ReactNode;
  className?: string;
}

export function ContextLine({
  items = [],
  updatedAt,
  source,
  action,
  className,
}: ContextLineProps) {
  const stamp = formatTimestamp(updatedAt);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground",
        className,
      )}
    >
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 && <span aria-hidden className="text-border">·</span>}
          <span>
            {item.label}:{" "}
            <span
              className={cn(
                "font-mono font-semibold tabular-nums",
                item.alert ? "text-amber-700 dark:text-amber-500" : "text-foreground",
              )}
            >
              {item.value}
            </span>
          </span>
        </React.Fragment>
      ))}

      {items.length > 0 && <span aria-hidden className="text-border">·</span>}

      <span>
        {stamp ? (
          <>Atualizado em <span className="font-mono tabular-nums">{stamp}</span></>
        ) : (
          // Nunca omitir a linha: declarar que não sabemos é mais honesto que
          // deixar o número sem data (§4.5).
          <span className="italic">Atualização não informada</span>
        )}
      </span>

      {source && (
        <>
          <span aria-hidden className="text-border">·</span>
          <span>Fonte: {source}</span>
        </>
      )}

      {action && <span className="ml-1">{action}</span>}
    </div>
  );
}

/** Atalho para quando só há o timestamp a mostrar. */
export function UpdatedAt(props: Omit<ContextLineProps, "items">) {
  return <ContextLine {...props} />;
}
