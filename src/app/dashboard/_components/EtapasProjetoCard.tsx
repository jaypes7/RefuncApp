"use client";

import { useState } from "react";
import { ChevronDown, FolderOpen, ListChecks } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDate, type EtapaDashboard, type EtapasPorGrupo } from "./helpers";

export function EtapasProjetoCard({
  etapas,
  etapasPorGrupo,
}: {
  etapas: EtapaDashboard[];
  etapasPorGrupo: EtapasPorGrupo;
}) {
  // Estado para seleção de dia previsto por etapa (cards de etapas)
  const [selectedDayPerEtapa, setSelectedDayPerEtapa] = useState<Record<number, string>>({});

  // Inicia com todos os grupos colapsados: enquanto o usuário não interage
  // (override === null), deriva o estado "todos colapsados" no render
  const [collapsedOverride, setCollapsedOverride] = useState<Set<number> | null>(null);
  const collapsedGrupos =
    collapsedOverride ?? new Set((etapasPorGrupo?.grupos ?? []).map((g) => g.id));

  const toggleGrupo = (id: number) =>
    setCollapsedOverride(() => {
      const next = new Set(collapsedGrupos);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const hojeRealStr = new Date().toISOString().split("T")[0];

  const renderEtapaCard = (etapa: EtapaDashboard) => {
    let previstoEtapa = 0;
    let realizadoEtapa = 0;

    if (etapa.evolucaoDiaria && etapa.evolucaoDiaria.length > 0) {
      let todayIdx = -1;
      for (let i = 0; i < etapa.evolucaoDiaria.length; i++) {
        if (etapa.evolucaoDiaria[i].data <= hojeRealStr) todayIdx = i;
        else break;
      }
      if (todayIdx !== -1) {
        previstoEtapa = etapa.evolucaoDiaria[todayIdx].previsto;
        realizadoEtapa = etapa.evolucaoDiaria[todayIdx].realizado;
      }
    } else {
      if ((etapa.dataFim && hojeRealStr >= etapa.dataFim) || etapa.concluida || etapa.percentualConcluido >= 100) {
        previstoEtapa = etapa.percentualConcluido ?? 0;
        realizadoEtapa = etapa.percentualConcluido ?? 0;
      }
    }

    const selectedDia = selectedDayPerEtapa[etapa.id] ?? "";
    const selectedDayData = selectedDia
      ? etapa.evolucaoDiaria?.find((d) => d.data === selectedDia)
      : undefined;
    const displayPrevisto = selectedDayData != null ? selectedDayData.previsto : previstoEtapa;
    const displayRealizado = selectedDayData != null ? selectedDayData.realizado : realizadoEtapa;

    return (
      <div key={etapa.id} className="flex flex-col gap-2 rounded-lg border border-border bg-muted/50 p-4">
        <span className="text-sm font-semibold">{etapa.nome}</span>
        {(etapa.dataInicio || etapa.dataFim) && (
          <div className="text-xs text-muted-foreground">
            {fmtDate(etapa.dataInicio) ?? "—"} - {fmtDate(etapa.dataFim) ?? "—"}
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          {etapa.duracaoDias} dia{etapa.duracaoDias !== 1 ? "s" : ""} trabalhado{etapa.duracaoDias !== 1 ? "s" : ""}
        </div>
        {etapa.evolucaoDiaria && etapa.evolucaoDiaria.length > 0 && (
          <select
            value={selectedDia}
            onChange={(e) =>
              setSelectedDayPerEtapa((prev) => ({ ...prev, [etapa.id]: e.target.value }))
            }
            className="text-xs rounded-md px-2 py-1 border border-border bg-background text-foreground"
          >
            <option value="">Previsto hoje</option>
            {etapa.evolucaoDiaria.map((d) => {
              const diaMes = new Date(d.data + "T00:00:00Z").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
              const diaSemana = new Date(d.data + "T00:00:00Z").toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" });
              return <option key={d.data} value={d.data}>{diaMes} ({diaSemana})</option>;
            })}
          </select>
        )}
        <div className="mt-2 space-y-1">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(100, displayPrevisto)}%` }} />
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-[#DA291B] transition-all" style={{ width: `${Math.min(100, displayRealizado)}%` }} />
          </div>
        </div>
        <div className="text-sm text-muted-foreground text-center mt-1">
          Previsto: {displayPrevisto}%
          <span className="mx-1">·</span>
          Realizado: {displayRealizado}%
        </div>
      </div>
    );
  };

  return (
    <div className="mb-6">
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          <CardTitle>Etapas do Projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4 mb-4 text-lg text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded-full bg-blue-500" />
              <span>Previsto</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded-full bg-[#DA291B]" />
              <span>Realizado</span>
            </div>
          </div>
          {etapasPorGrupo ? (
            <div className="space-y-6">
              {etapasPorGrupo.grupos.map((grupo) => {
                const etapasDoGrupo = etapasPorGrupo.byGrupo.get(grupo.id) ?? [];
                const isCollapsed = collapsedGrupos.has(grupo.id);
                return (
                  <div key={grupo.id} className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
                    <button
                      type="button"
                      onClick={() => toggleGrupo(grupo.id)}
                      className="flex w-full items-center gap-2 text-left"
                    >
                      <ChevronDown className={`w-4 h-4 text-primary transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`} />
                      <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-semibold text-foreground flex-1">{grupo.nome}</span>
                      <span className="text-xs text-muted-foreground">{etapasDoGrupo.length} etapa(s)</span>
                    </button>
                    {!isCollapsed && (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {etapasDoGrupo.map(renderEtapaCard)}
                      </div>
                    )}
                  </div>
                );
              })}
              {(etapasPorGrupo.byGrupo.get(null) ?? []).length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Sem grupo</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {(etapasPorGrupo.byGrupo.get(null) ?? []).map(renderEtapaCard)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {etapas.map(renderEtapaCard)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
