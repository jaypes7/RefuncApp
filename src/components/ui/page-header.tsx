"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho de página padrão — eyebrow / H1 / subtítulo / ação primária + régua.
 *
 * Anatomia (ver ANALISE_PGV.md §3.1):
 *   [eyebrow]   categoria, caixa alta, pequeno, cor de marca  → onde você está
 *   [title]     H1                                            → o que a tela faz
 *   [subtitle]  uma frase                                     → qual o escopo dos dados
 *   [action]    ação primária, sempre no mesmo lugar
 *   ─────────── régua separando cabeçalho do conteúdo
 */
export interface PageHeaderProps {
  /** Categoria da tela, ex.: "PAINEL DE FROTA". Renderizado em caixa alta. */
  eyebrow?: string;
  /** Título da tela (H1). */
  title: string;
  /** Uma frase declarando o que a tela faz e o escopo dos dados. */
  subtitle?: string;
  /** Ícone da categoria, ex.: `Car` do lucide-react. */
  icon?: React.ElementType;
  /** Badge ao lado do título, ex.: "128 veículos". */
  badge?: React.ReactNode;
  /** Ação primária — por convenção, sempre à direita e sempre no mesmo lugar. */
  action?: React.ReactNode;
  /** Linha de contexto sob o cabeçalho, ex.: <UpdatedAt />. */
  meta?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  badge,
  action,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            {eyebrow && (
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-primary">
                {eyebrow}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
              {badge}
            </div>
            {subtitle && (
              <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>

      {meta}

      <div className="border-b border-border/60" />
    </div>
  );
}
