"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from "@/components/ui/chart";
import type { ConfigData, DashboardPrincipalData } from "@/lib/axios";
import {
  CHART_AXIS_TICK_THEMED,
  CHART_GRID_DASH,
  CHART_SERIES,
  CHART_THEME,
} from "@/lib/chart-colors";
import type { EtapasPorGrupo } from "./helpers";

const chartConfigCurvaS = {
  previsto: {
    label: "Planejado",
    color: CHART_SERIES.planejado,
  },
  realizado: {
    label: "Realizado",
    color: CHART_SERIES.realizado,
  },
};

export function EvolucaoProjetoCard({
  dashboardData,
  configData,
  etapasPorGrupo,
}: {
  dashboardData: DashboardPrincipalData | undefined;
  configData: ConfigData;
  etapasPorGrupo: EtapasPorGrupo;
}) {
  const [selectedCurvaDayIdx, setSelectedCurvaDayIdx] = useState<number>(-1);
  const [selectedCurvaGrupoId, setSelectedCurvaGrupoId] = useState<number | 'geral'>('geral');

  // Curva S por fase: computa curvaS points a partir de evolucaoDiaria das etapas de cada fase
  const curvaDataPorFase = useMemo(() => {
    if (!etapasPorGrupo) return new Map<number, Array<{ mes: string; data: string; previsto: number; realizado: number | null }>>();
    const hoje = new Date().toISOString().slice(0, 10);
    const result = new Map<number, Array<{ mes: string; data: string; previsto: number; realizado: number | null }>>();
    for (const grupo of etapasPorGrupo.grupos) {
      const etapasFase = etapasPorGrupo.byGrupo.get(grupo.id) ?? [];
      const totalDias = etapasFase.reduce((s, e) => s + e.duracaoDias, 0);
      if (totalDias === 0) { result.set(grupo.id, []); continue; }
      const datasSet = new Set<string>();
      for (const e of etapasFase) for (const d of (e.evolucaoDiaria ?? [])) datasSet.add(d.data);
      const datas = [...datasSet].sort();
      const pontos = datas.map((data) => {
        let previsto = 0;
        let realizado = 0;
        for (const e of etapasFase) {
          const peso = e.duracaoDias / totalDias;
          const entry = (e.evolucaoDiaria ?? []).find(d => d.data === data);
          if (entry) {
            previsto += entry.previsto * peso;
            realizado += entry.realizado * peso;
          } else {
            const dias = e.evolucaoDiaria ?? [];
            const last = dias[dias.length - 1];
            const first = dias[0];
            if (last && data > last.data) {
              previsto += last.previsto * peso;
              realizado += last.realizado * peso;
            } else if (!first || data < first.data) {
              // antes do início: sem contribuição
            }
          }
        }
        const [, month, day] = data.split("-");
        return { mes: `${day}/${month}`, data, previsto: Math.round(previsto * 10) / 10, realizado: data > hoje ? null : Math.round(realizado * 10) / 10 };
      });
      result.set(grupo.id, pontos);
    }
    return result;
  }, [etapasPorGrupo]);

  // Gera dados da Curva S dinamicamente
  const curveData = useMemo(() => {
    if (!dashboardData?.graficos?.curvaS) return [];

    const { labels, planejado, realizado, detalhes } = dashboardData.graficos.curvaS;
    const d = labels.map((mes, index) => ({
      mes,
      previsto: planejado[index] ?? undefined,
      realizado: realizado?.[index] ?? undefined,
      previstoEtapa: detalhes?.[index]?.planejadoEtapa,
      realizadoEtapa: detalhes?.[index]?.realizadoEtapa,
      mediaPlanejadoEtapas: detalhes?.[index]?.mediaPlanejadoEtapas,
      mediaRealizadoEtapas: detalhes?.[index]?.mediaRealizadoEtapas,
      etapaNome: detalhes?.[index]?.etapaNome,
    }));

    // Forward-fill previsto: garante que a linha de meta se estende até o fim
    let lastPrevisto: number | undefined;
    for (const point of d) {
      if (point.previsto != null) {
        lastPrevisto = point.previsto;
      } else if (lastPrevisto != null) {
        point.previsto = lastPrevisto;
      }
    }

    return d;
  }, [dashboardData]);

  // Curva ativa: global ou por fase
  const activeCurveData = useMemo(() => {
    if (selectedCurvaGrupoId === 'geral') return curveData;
    return (curvaDataPorFase.get(selectedCurvaGrupoId) ?? []) as unknown as typeof curveData;
  }, [selectedCurvaGrupoId, curveData, curvaDataPorFase]);

  // Array compartilhado: realizado vira null após o dia selecionado
  const chartDisplayData = useMemo(() => {
    if (selectedCurvaDayIdx < 0) return activeCurveData;
    return activeCurveData.map((d, i) => ({
      ...d,
      realizado: i <= selectedCurvaDayIdx ? d.realizado : null,
    }));
  }, [activeCurveData, selectedCurvaDayIdx]);

  const xAxisTicks = useMemo(() => {
    if (activeCurveData.length === 0) return [];
    const step = Math.max(1, Math.floor(activeCurveData.length / 10));
    const lastIdx = activeCurveData.length - 1;
    const ticks: string[] = [activeCurveData[0].mes];
    for (let i = step; i <= lastIdx - step; i += step) {
      ticks.push(activeCurveData[i].mes);
    }
    ticks.push(activeCurveData[lastIdx].mes);
    return ticks;
  }, [activeCurveData]);

  // Indicador: valores do dia atual — global ou por fase
  const indicadorCurvaS = useMemo(() => {
    if (selectedCurvaGrupoId === 'geral') {
      if (!dashboardData?.graficos?.curvaS?.valoresHoje) return null;
      const { diario, etapas } = dashboardData.graficos.curvaS.valoresHoje;
      return { diario, etapas };
    }
    const faseCurva = curvaDataPorFase.get(selectedCurvaGrupoId) ?? [];
    if (faseCurva.length === 0) return null;
    const hoje = new Date().toISOString().split("T")[0];
    const pontosAteHoje = faseCurva.filter(p => p.data <= hoje);
    const todayPoint = pontosAteHoje.length > 0 ? pontosAteHoje[pontosAteHoje.length - 1] : null;
    if (!todayPoint) return null;
    return { diario: { planejado: todayPoint.previsto, realizado: todayPoint.realizado }, etapas: null };
  }, [selectedCurvaGrupoId, dashboardData, curvaDataPorFase]);

  // Verifica se existe algum progresso real (alguma etapa com % > 0)
  const temProgressoReal = useMemo(() => {
    if (selectedCurvaGrupoId === 'geral') {
      if (!dashboardData?.graficos?.curvaS?.realizado) return false;
      return dashboardData.graficos.curvaS.realizado.some((v) => v !== null && v > 0);
    }
    return (curvaDataPorFase.get(selectedCurvaGrupoId) ?? []).some(p => p.realizado !== null && p.realizado > 0);
  }, [selectedCurvaGrupoId, dashboardData, curvaDataPorFase]);

  // Coordenadas do ponto selecionado no gráfico
  const pontoSelecionado = useMemo(() => {
    if (selectedCurvaDayIdx < 0 || activeCurveData.length === 0) return null;
    const dia = activeCurveData[selectedCurvaDayIdx];
    if (!dia || dia.realizado == null) return null;
    return { x: dia.mes, y: dia.realizado };
  }, [activeCurveData, selectedCurvaDayIdx]);

  return (
    <Card data-cardtv-id="geral-evolucao-projeto" className="glass-card lg:col-span-2">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Evolução do Projeto</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Avanço Planejado vs. Realizado do Cronograma
          </p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            <p className="text-xs text-muted-foreground">
              Início:{" "}
              {new Date(
                configData.DATA_INICIO_PROJETO + "T00:00:00Z",
              ).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
            </p>
            {configData.DATA_FIM_PROJETO && (
              <p className="text-xs text-muted-foreground">
                Término:{" "}
                {new Date(
                  configData.DATA_FIM_PROJETO + "T00:00:00Z",
                ).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Dia {dashboardData?.projeto?.diasCorridos ?? 0} do projeto
            </p>
          </div>
        </div>
        {/* Indicadores: Diário (Curva S) + Macro (Etapas) */}
        {indicadorCurvaS && (
          <div className="shrink-0 flex flex-col sm:flex-row items-end sm:items-center gap-3 text-right">
            {/* Comparação Diária */}
            {indicadorCurvaS.diario && (
              <div className="flex flex-col items-end gap-0.5">
                {activeCurveData.length > 0 && (
                  <select
                    value={selectedCurvaDayIdx}
                    onChange={(e) => setSelectedCurvaDayIdx(Number(e.target.value))}
                    className="text-[10px] uppercase tracking-wide rounded px-1 py-0.5 border border-border bg-background text-muted-foreground font-medium"
                  >
                    <option value={-1}>Diário</option>
                    {activeCurveData.map((d, i) => (
                      <option key={i} value={i}>{d.mes}</option>
                    ))}
                  </select>
                )}
                <span className="text-xs text-muted-foreground">
                  Plan:{" "}
                  <span className="font-semibold text-foreground">
                    {(() => {
                      if (selectedCurvaDayIdx >= 0) {
                        const dia = activeCurveData[selectedCurvaDayIdx];
                        const v = dia?.previsto;
                        if (v != null) return `${(v as number).toFixed(1)}%`;
                        return "-";
                      }
                      return `${indicadorCurvaS.diario.planejado.toFixed(1)}%`;
                    })()}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  Real:{" "}
                  <span
                    className="font-semibold"
                    style={{
                      color: (() => {
                        let plan: number | null = null;
                        let real: number | null = null;
                        if (selectedCurvaDayIdx >= 0) {
                          const dia = activeCurveData[selectedCurvaDayIdx];
                          plan = dia?.previsto ?? null;
                          real = dia?.realizado ?? null;
                        } else {
                          plan = indicadorCurvaS.diario.planejado;
                          real = indicadorCurvaS.diario.realizado;
                        }
                        return real != null && plan != null && real >= plan ? "#337246" : "#DA291B";
                      })(),
                    }}
                  >
                    {(() => {
                      if (selectedCurvaDayIdx >= 0) {
                        const dia = activeCurveData[selectedCurvaDayIdx];
                        const v = dia?.realizado;
                        if (v != null) return `${(v as number).toFixed(1)}%`;
                        return "-";
                      }
                      return temProgressoReal && indicadorCurvaS.diario.realizado != null ? `${indicadorCurvaS.diario.realizado.toFixed(1)}%` : "-";
                    })()}
                  </span>
                </span>
              </div>
            )}

            {indicadorCurvaS.diario && indicadorCurvaS.etapas && (
              <div className="hidden sm:block w-px h-8 bg-border/50" />
            )}

            {/* Comparação Macro (Etapas) */}
            {indicadorCurvaS.etapas && (
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                  Geral
                </span>
                <span className="text-xs text-muted-foreground">
                  Plan:{" "}
                  <span className="font-semibold text-foreground">
                    {indicadorCurvaS.etapas.planejado.toFixed(1)}%
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  Real:{" "}
                  <span
                    className="font-semibold"
                    style={{
                      color:
                        indicadorCurvaS.etapas.realizado >= indicadorCurvaS.etapas.planejado
                          ? "#337246"
                          : "#DA291B",
                    }}
                  >
                    {indicadorCurvaS.etapas.realizado.toFixed(1)}%
                  </span>
                </span>
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* Tabs de seleção: Geral + uma por fase */}
        {etapasPorGrupo && etapasPorGrupo.grupos.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-4">
            <button
              type="button"
              onClick={() => { setSelectedCurvaGrupoId('geral'); setSelectedCurvaDayIdx(-1); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedCurvaGrupoId === 'geral'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              Geral
            </button>
            {etapasPorGrupo.grupos.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => { setSelectedCurvaGrupoId(g.id); setSelectedCurvaDayIdx(-1); }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedCurvaGrupoId === g.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {g.nome}
              </button>
            ))}
          </div>
        )}
        {activeCurveData.length === 0 ? (
          <div className="flex h-[350px] flex-col items-center justify-center gap-2 text-muted-foreground">
            <AlertTriangle className="h-10 w-10 opacity-30" />
            <p className="text-sm">
              {selectedCurvaGrupoId === 'geral'
                ? 'Configure as etapas do cronograma para gerar a curva'
                : 'Defina datas nas etapas desta fase para gerar a curva'}
            </p>
          </div>
        ) : (
          <ChartContainer config={chartConfigCurvaS} className="h-[350px] 2xl:h-[480px] w-full">
            {/* Estilo Curva S adotado do PGV — ver ANALISE_PGV.md §8.
                Ambas séries sólidas com gradient da própria cor; grid
                pontilhado fino; ticks mono; tooltip colorido por série. */}
            <AreaChart
              data={chartDisplayData}
              margin={{ top: 20, right: 60, left: 20, bottom: 20 }}
            >
              <defs>
                <linearGradient
                  id="gradientPlanejado"
                  x1="0" y1="0" x2="0" y2="1"
                >
                  <stop offset="0%" stopColor={CHART_SERIES.planejado} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={CHART_SERIES.planejado} stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id="gradientRealizado"
                  x1="0" y1="0" x2="0" y2="1"
                >
                  <stop offset="0%" stopColor={CHART_SERIES.realizado} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={CHART_SERIES.realizado} stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray={CHART_GRID_DASH}
                stroke={CHART_THEME.grid}
                vertical={false}
              />

              <XAxis
                dataKey="mes"
                tick={CHART_AXIS_TICK_THEMED}
                tickLine={false}
                axisLine={false}
                ticks={xAxisTicks}
                interval={0}
              />
              <YAxis
                tick={CHART_AXIS_TICK_THEMED}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                label={{
                  value: "Progresso (%)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  style: { fill: CHART_THEME.axis, fontSize: 11, fontFamily: "var(--font-mono, monospace)" },
                }}
              />

              <ChartTooltip
                cursor={{ stroke: CHART_THEME.axis, strokeWidth: 1, strokeDasharray: "3 3" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const p = payload[0].payload as {
                    previsto?: number;
                    realizado?: number;
                  };
                  return (
                    <div
                      className="rounded-md border bg-card p-2.5 shadow-sm"
                      style={{ borderColor: CHART_THEME.border }}
                    >
                      <p className="mb-1 font-mono text-xs font-semibold text-foreground">{label}</p>
                      <p className="font-mono text-xs" style={{ color: CHART_SERIES.planejado }}>
                        Planejado :{" "}
                        <span className="font-semibold tabular-nums">
                          {p.previsto?.toFixed(1) ?? 0}%
                        </span>
                      </p>
                      <p className="font-mono text-xs" style={{ color: CHART_SERIES.realizado }}>
                        Realizado :{" "}
                        <span className="font-semibold tabular-nums">
                          {p.realizado?.toFixed(1) ?? 0}%
                        </span>
                      </p>
                    </div>
                  );
                }}
              />
              <ChartLegend content={<ChartLegendContent />} />

              <Area
                type="monotone"
                dataKey="previsto"
                stroke={CHART_SERIES.planejado}
                strokeWidth={2}
                fill="url(#gradientPlanejado)"
                dot={false}
                activeDot={{ r: 4, fill: CHART_SERIES.planejado }}
              />

              {temProgressoReal && (
                <Area
                  type="monotone"
                  dataKey="realizado"
                  stroke={CHART_SERIES.realizado}
                  strokeWidth={2}
                  fill="url(#gradientRealizado)"
                  dot={false}
                  activeDot={{ r: 4, fill: CHART_SERIES.realizado }}
                />
              )}

              {pontoSelecionado && (
                <ReferenceDot
                  x={pontoSelecionado.x}
                  y={pontoSelecionado.y}
                  r={5}
                  fill={CHART_SERIES.realizado}
                />
              )}

            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
