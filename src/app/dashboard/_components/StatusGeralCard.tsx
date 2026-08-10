"use client";

import { memo, useMemo } from "react";
import { Briefcase } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Colaborador } from "@/lib/axios";
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

function StatCategory({
  label,
  items,
}: {
  label: string;
  items: Array<{ label: string; value: number; tone: StatTone }>;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2.5">
        {label}
      </p>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full shrink-0", TONE_DOT[it.tone])} />
            <span className="text-sm text-foreground/80 truncate">{it.label}</span>
            <span className={cn("ml-auto text-sm font-semibold tabular-nums", TONE_TEXT[it.tone])}>
              {it.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const StatusGeralCard = memo(function StatusGeralCard({
  colaboradores,
}: {
  colaboradores: Colaborador[];
}) {
  // Agregação global de todos os colaboradores
  const statusGeral = useMemo(() => {
    const stats = {
      aso: { apto: 0, inapto: 0, pendente: 0 },
      mob: { ok: 0, pendente: 0 },
      docs: { completo: 0, incompleto: 0, pendente: 0 },
      exame: { realizado: 0, agendado: 0, pendente: 0 },
      portal: { liberado: 0, bloqueado: 0, pendente: 0 },
      treinamento: { concluido: 0, andamento: 0, pendente: 0 },
      cracha: { emitido: 0, pendente: 0 },
      ponto: { cadastrado: 0, pendente: 0 },
    };
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

      if (c.TREINAMENTO === "Concluído") stats.treinamento.concluido++;
      else if (c.TREINAMENTO === "Em Andamento") stats.treinamento.andamento++;
      else stats.treinamento.pendente++;

      if (c.CRACHA === "Emitido") stats.cracha.emitido++;
      else stats.cracha.pendente++;

      if (c.PONTO === "Cadastrado") stats.ponto.cadastrado++;
      else stats.ponto.pendente++;
    }
    return { total: colaboradores.length, stats };
  }, [colaboradores]);

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
                { label: "Concluído", value: statusGeral.stats.treinamento.concluido, tone: "ok" },
                { label: "Em Andamento", value: statusGeral.stats.treinamento.andamento, tone: "info" },
                { label: "Pendente", value: statusGeral.stats.treinamento.pendente, tone: "warn" },
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
