"use client";

import { memo, useMemo } from "react";
import { Briefcase } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Colaborador } from "@/lib/axios";
import {
  contarStatusTreinamentos,
  indexarResumos,
  type ResumoTreinamentos,
} from "@/lib/treinamentos";
import { cn } from "@/lib/utils";

type StatTone = "ok" | "warn" | "danger" | "info" | "muted";

const TONE_DOT: Record<StatTone, string> = {
  ok: "bg-[#337246]",
  warn: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-blue-500",
  muted: "bg-slate-400",
};

const TONE_TEXT: Record<StatTone, string> = {
  ok: "text-[#337246]",
  warn: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
  info: "text-blue-600 dark:text-blue-400",
  muted: "text-muted-foreground",
};

// Cores de fundo/borda "tonais" para o card inteiro — segue o padrão PGV §3.2:
// o card exige ação quando há danger/warn na categoria, e sinaliza pintando o
// fundo em vez de só a barra. Escala de atenção em duas camadas.
const TONE_SURFACE: Record<StatTone, string> = {
  ok: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/5",
  warn: "border-amber-200 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/5",
  danger: "border-rose-200 bg-rose-50/60 dark:border-rose-500/20 dark:bg-rose-500/5",
  info: "border-sky-200 bg-sky-50/60 dark:border-sky-500/20 dark:bg-sky-500/5",
  muted: "border-border bg-card",
};

// Cor de barra hex por tom (dark-mode compatível via opacity Tailwind não cobre,
// então fixamos hex — barras são elementos gráficos, não texto).
const TONE_BAR: Record<StatTone, string> = {
  ok: "#337246",
  warn: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
  muted: "#e2e2e2",
};

/**
 * Card de categoria de status — estilo PGV (§3.2 e §4.1).
 *
 * Anatomia:
 *   [eyebrow: nome da categoria]
 *   [número grande do "concluído principal"] [/ %]
 *   [barra de proporção segmentada mostrando OK/Warn/Danger]
 *   [linha compacta: · Apto 37 · Inapto 0 · Pendente 182]
 *
 * O card ganha fundo tonal quando há danger > 0 (rosa) ou warn > 0 (âmbar).
 * Só fica branco quando tudo está OK.
 */
function StatCategory({
  label,
  items,
  total,
}: {
  label: string;
  items: Array<{ label: string; value: number; tone: StatTone }>;
  /** Base para o percentual. Se ausente, soma os itens. */
  total?: number;
}) {
  const soma = total ?? items.reduce((acc, it) => acc + it.value, 0);
  const primary = items.find((it) => it.tone === "ok") ?? items[0];
  const pct = soma > 0 ? Math.round((primary.value / soma) * 100) : 0;

  // Surface: rosa se tem danger > 0, âmbar se tem warn > 0, verde-claro se
  // 100% ok. Segue a "escala de atenção em duas camadas" do PGV.
  const hasDanger = items.some((it) => it.tone === "danger" && it.value > 0);
  const hasWarn = items.some((it) => it.tone === "warn" && it.value > 0);
  const surfaceTone: StatTone = hasDanger ? "danger" : hasWarn ? "warn" : "ok";

  return (
    <div className={cn("rounded-md border p-3 flex flex-col gap-2", TONE_SURFACE[surfaceTone])}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
        {label}
      </p>

      <p className="flex items-baseline gap-1.5">
        <span className={cn("font-mono text-2xl font-bold leading-none tabular-nums", TONE_TEXT[primary.tone])}>
          {primary.value.toLocaleString("pt-BR")}
        </span>
        <span className="font-mono text-[11px] font-semibold text-muted-foreground tabular-nums">
          / {pct}%
        </span>
      </p>

      {/* Barra de proporção segmentada — PGV §4.2, mais legível que gráfico. */}
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
        {items.map((it) =>
          it.value > 0 && soma > 0 ? (
            <div
              key={it.label}
              style={{ width: `${(it.value / soma) * 100}%`, backgroundColor: TONE_BAR[it.tone] }}
              title={`${it.label}: ${it.value}`}
            />
          ) : null,
        )}
      </div>

      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
        {items.map((it) => (
          <span key={it.label} className="inline-flex items-center gap-1 text-[11px]">
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", TONE_DOT[it.tone])} />
            <span className="text-muted-foreground">{it.label}</span>
            <span className={cn("font-mono font-semibold tabular-nums", TONE_TEXT[it.tone])}>
              {it.value}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export const StatusGeralCard = memo(function StatusGeralCard({
  colaboradores,
  resumosTreinamentos,
}: {
  colaboradores: Colaborador[];
  /** Agregado de `colaborador_treinamentos` vindo de /api/treinamentos/resumo. */
  resumosTreinamentos?: ResumoTreinamentos[];
}) {
  // Agregação global de todos os colaboradores
  const statusGeral = useMemo(() => {
    const stats = {
      aso: { apto: 0, inapto: 0, pendente: 0 },
      mob: { ok: 0, pendente: 0 },
      docs: { completo: 0, incompleto: 0, pendente: 0 },
      exame: { realizado: 0, agendado: 0, pendente: 0 },
      portal: { liberado: 0, bloqueado: 0, pendente: 0 },
      cracha: { emitido: 0, pendente: 0 },
      ponto: { cadastrado: 0, pendente: 0 },
    };
    // Treinamento vem do modelo relacional, não da coluna legada
    // `colaboradores.treinamento` — que fica vazia na prática.
    const treinamento = contarStatusTreinamentos(
      colaboradores,
      indexarResumos(resumosTreinamentos),
    );
    for (const c of colaboradores) {
      if (c.ASO === "Apto") stats.aso.apto++;
      else if (c.ASO === "Inapto") stats.aso.inapto++;
      else stats.aso.pendente++;

      if (c.MOB?.trim()) stats.mob.ok++;
      else stats.mob.pendente++;

      if (c.DOCS === "Completo") stats.docs.completo++;
      else if (c.DOCS === "Incompleto") stats.docs.incompleto++;
      else stats.docs.pendente++;

      if (c.EXAME === "Realizado") stats.exame.realizado++;
      else if (c.EXAME === "Agendado") stats.exame.agendado++;
      else stats.exame.pendente++;

      if (c.PORTAL === "Liberado") stats.portal.liberado++;
      else if (c.PORTAL === "Bloqueado") stats.portal.bloqueado++;
      else stats.portal.pendente++;

      if (c.CRACHA === "Emitido") stats.cracha.emitido++;
      else stats.cracha.pendente++;

      if (c.PONTO === "Cadastrado") stats.ponto.cadastrado++;
      else stats.ponto.pendente++;
    }
    return { total: colaboradores.length, stats, treinamento };
  }, [colaboradores, resumosTreinamentos]);

  if (statusGeral.total === 0) return null;

  return (
    <div className="mb-6">
      <Card data-cardtv-id="geral-status-geral" className="glass-card">
        <CardHeader className="flex flex-row items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" />
          <CardTitle>Status Geral</CardTitle>
          <span className="text-sm font-normal text-muted-foreground">
            ({statusGeral.total} colaboradores)
          </span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCategory
              label="ASO"
              items={[
                { label: "Apto", value: statusGeral.stats.aso.apto, tone: "ok" },
                { label: "Inapto", value: statusGeral.stats.aso.inapto, tone: "danger" },
                { label: "Pendente", value: statusGeral.stats.aso.pendente, tone: "warn" },
              ]}
            />
            <StatCategory
              label="MOB"
              items={[
                { label: "OK", value: statusGeral.stats.mob.ok, tone: "ok" },
                { label: "Pendente", value: statusGeral.stats.mob.pendente, tone: "warn" },
              ]}
            />
            <StatCategory
              label="Documentação"
              items={[
                { label: "Completo", value: statusGeral.stats.docs.completo, tone: "ok" },
                { label: "Incompleto", value: statusGeral.stats.docs.incompleto, tone: "danger" },
                { label: "Pendente", value: statusGeral.stats.docs.pendente, tone: "warn" },
              ]}
            />
            <StatCategory
              label="Exame"
              items={[
                { label: "Realizado", value: statusGeral.stats.exame.realizado, tone: "ok" },
                { label: "Agendado", value: statusGeral.stats.exame.agendado, tone: "info" },
                { label: "Pendente", value: statusGeral.stats.exame.pendente, tone: "warn" },
              ]}
            />
            <StatCategory
              label="Portal"
              items={[
                { label: "Liberado", value: statusGeral.stats.portal.liberado, tone: "ok" },
                { label: "Bloqueado", value: statusGeral.stats.portal.bloqueado, tone: "danger" },
                { label: "Pendente", value: statusGeral.stats.portal.pendente, tone: "warn" },
              ]}
            />
            <StatCategory
              label="Treinamento"
              items={[
                { label: "Concluído", value: statusGeral.treinamento.concluido, tone: "ok" },
                { label: "A Vencer", value: statusGeral.treinamento.aVencer, tone: "warn" },
                { label: "Vencido", value: statusGeral.treinamento.vencido, tone: "danger" },
                { label: "Pendente", value: statusGeral.treinamento.pendente, tone: "warn" },
                { label: "Sem cadastro", value: statusGeral.treinamento.semCadastro, tone: "muted" },
              ]}
            />
            <StatCategory
              label="Crachá"
              items={[
                { label: "Emitido", value: statusGeral.stats.cracha.emitido, tone: "ok" },
                { label: "Pendente", value: statusGeral.stats.cracha.pendente, tone: "warn" },
              ]}
            />
            <StatCategory
              label="Ponto"
              items={[
                { label: "Cadastrado", value: statusGeral.stats.ponto.cadastrado, tone: "ok" },
                { label: "Pendente", value: statusGeral.stats.ponto.pendente, tone: "warn" },
              ]}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
