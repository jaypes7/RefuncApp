"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Users,
  Truck,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Briefcase,
  Trash2,
  Plus,
  Pencil,
  X,
  Check,
  ListChecks,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dashboardPrincipalApi, configApi, ocorrenciasApi, comentariosClienteApi, type DashboardPrincipalData, type Ocorrencia, type ComentarioCliente } from "@/lib/axios";
import { useFilter } from "@/contexts/FilterContext";
import { CanAccess } from "@/components/CanAccess";
import { ExportPdfButton } from "@/components/export-pdf-button";
import { MANSERV_CHART, MANSERV_STATUS, MANSERV_PIE_COLORS, CHART_GRID_COLOR, CHART_AXIS_TICK } from "@/lib/chart-colors";

// ============================================================================
// CONFIGURAÇÃO DOS GRÁFICOS
// ============================================================================

const chartConfigStatus = {
  ativo: {
    label: "Ativo",
    color: MANSERV_CHART.primary,
  },
  inativo: {
    label: "Inativo",
    color: MANSERV_CHART.gray,
  },
  pendente: {
    label: "Pendente",
    color: MANSERV_STATUS.warning,
  },
  desligado: {
    label: "Desligado",
    color: MANSERV_STATUS.danger,
  },
};

const chartConfigCurvaS = {
  previsto: {
    label: "Planejado",
    color: MANSERV_CHART.gray,
  },
  realizado: {
    label: "Realizado",
    color: MANSERV_STATUS.danger,
  },
};

const chartConfigFuncoes = {
  total: { label: "Colaboradores", color: MANSERV_CHART.primary },
};

function fmtDate(v: string | undefined | null): string | null {
  if (!v) return null;
  const d = new Date(v + "T00:00:00Z");
  return isNaN(d.getTime()) ? null : d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

// Paleta de cores para o pie de funções
const PIE_COLORS = MANSERV_PIE_COLORS;

// ============================================================================
// LOADING SKELETON
// ============================================================================

function DashboardSkeleton() {
  return (
    <div className="min-h-screen w-full p-4 md:p-8">
      <div className="mx-auto max-w-7xl 2xl:max-w-[1800px] space-y-8">
        {/* Header */}
        <div>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-2 h-5 w-96" />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="glass-card">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-20" />
                <Skeleton className="mt-2 h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-75 w-full" />
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-75 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function DashboardPage() {
  const contentRef = useRef<HTMLDivElement>(null);
  const evolucaoTimelineRef = useRef<HTMLDivElement>(null);
  const { centroCusto } = useFilter();

  // Busca dados da API
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard-principal", centroCusto],
    queryFn: async () => {
      const response = await dashboardPrincipalApi.get(centroCusto);
      return response.data;
    },
    retry: 2,
    staleTime: 60_000,
  });

  // Busca configurações do projeto para o card de cabeçalho
  const { data: configData } = useQuery({
    queryKey: ["config", centroCusto],
    queryFn: async () => {
      const response = await configApi.get(centroCusto);
      return response.data.data;
    },
    staleTime: 60000,
  });

  const dashboardData: DashboardPrincipalData | undefined = data;

  // ── Ocorrências manuais ──────────────────────────────────────────────────────
  const queryClient = useQueryClient();
  const [novoTexto, setNovoTexto] = useState("");
  const [novaData, setNovaData] = useState("");
  
  // Estados para edição
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editandoTexto, setEditandoTexto] = useState("");
  const [editandoData, setEditandoData] = useState("");

  const { data: ocorrenciasData } = useQuery({
    queryKey: ["ocorrencias", centroCusto],
    queryFn: async () => (await ocorrenciasApi.listar(centroCusto)).data.data,
    staleTime: 30_000,
  });
  const ocorrencias: Ocorrencia[] = ocorrenciasData ?? [];

  const criarOcorrencia = useMutation({
    mutationFn: () => ocorrenciasApi.criar({ texto: novoTexto.trim(), data: novaData, centro_custo: centroCusto || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ocorrencias"] });
      setNovoTexto("");
      setNovaData("");
    },
  });

  const deletarOcorrencia = useMutation({
    mutationFn: (id: number) => ocorrenciasApi.deletar(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ocorrencias"] }),
  });

  const atualizarOcorrencia = useMutation({
    mutationFn: ({ id, texto, data }: { id: number; texto: string; data: string }) =>
      ocorrenciasApi.atualizar(id, { texto: texto.trim(), data, centro_custo: centroCusto || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ocorrencias"] });
      setEditandoId(null);
      setEditandoTexto("");
      setEditandoData("");
    },
  });

  const iniciarEdicao = (o: Ocorrencia) => {
    setEditandoId(o.id);
    setEditandoTexto(o.texto);
    setEditandoData(o.data);
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setEditandoTexto("");
    setEditandoData("");
  };

  // ── Comentários do Cliente ────────────────────────────────────────────────────
  const [novoComentario, setNovoComentario] = useState("");
  const [novaDataComentario, setNovaDataComentario] = useState("");
  const [editandoComentarioId, setEditandoComentarioId] = useState<number | null>(null);
  const [editandoComentarioTexto, setEditandoComentarioTexto] = useState("");
  const [editandoComentarioData, setEditandoComentarioData] = useState("");

  const { data: comentariosData } = useQuery({
    queryKey: ["comentarios-cliente", centroCusto],
    queryFn: async () => (await comentariosClienteApi.listar(centroCusto)).data.data,
    staleTime: 30_000,
  });
  const comentarios: ComentarioCliente[] = comentariosData ?? [];

  const criarComentario = useMutation({
    mutationFn: () => comentariosClienteApi.criar({ texto: novoComentario.trim(), data: novaDataComentario, centro_custo: centroCusto || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comentarios-cliente"] });
      setNovoComentario("");
      setNovaDataComentario("");
    },
  });

  const deletarComentario = useMutation({
    mutationFn: (id: number) => comentariosClienteApi.deletar(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comentarios-cliente"] }),
  });

  const atualizarComentario = useMutation({
    mutationFn: ({ id, texto, data }: { id: number; texto: string; data: string }) =>
      comentariosClienteApi.atualizar(id, { texto: texto.trim(), data, centro_custo: centroCusto || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comentarios-cliente"] });
      setEditandoComentarioId(null);
      setEditandoComentarioTexto("");
      setEditandoComentarioData("");
    },
  });

  const iniciarEdicaoComentario = (c: ComentarioCliente) => {
    setEditandoComentarioId(c.id);
    setEditandoComentarioTexto(c.texto);
    setEditandoComentarioData(c.data);
  };

  const cancelarEdicaoComentario = () => {
    setEditandoComentarioId(null);
    setEditandoComentarioTexto("");
    setEditandoComentarioData("");
  };

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

  // Indicador: usar valores do dia atual retornados pela API
  const indicadorCurvaS = useMemo(() => {
    if (!dashboardData?.graficos?.curvaS?.valoresHoje) return null;
    const { diario, etapas } = dashboardData.graficos.curvaS.valoresHoje;
    return { diario, etapas };
  }, [dashboardData]);

  // Verifica se existe algum progresso real (alguma etapa com % > 0)
  const temProgressoReal = useMemo(() => {
    if (!dashboardData?.graficos?.curvaS?.realizado) return false;
    const realizado = dashboardData.graficos.curvaS.realizado;
    return realizado.some((v) => v !== null && v > 0);
  }, [dashboardData]);

  // Dados para gráfico de rosca (Status) — inclui Desligado
  const dadosStatus = useMemo(() => {
    if (!dashboardData?.graficos?.statusCount) return [];

    const { Ativo, Inativo, Pendente, Desligado } = dashboardData.graficos.statusCount;

    return [
      { name: "Ativo", value: Ativo || 0, color: "#ff460a" },
      { name: "Inativo", value: Inativo || 0, color: "#e2e2e2" },
      { name: "Pendente", value: Pendente || 0, color: "#E5CF61" },
      { name: "Desligado", value: Desligado || 0, color: "#DA291B" },
    ];
  }, [dashboardData]);

  // Top 9 funções + "Outros" agrupados — alimenta PieChart
  const dadosFuncoes = useMemo(() => {
    const lista = dashboardData?.agregacoes?.distribuicaoFuncoes ?? [];
    if (lista.length === 0) return [];
    const top = lista.slice(0, 9);
    const outrosTotal = lista.slice(9).reduce((s, i) => s + i.total, 0);
    const result = top.map((f, i) => ({
      name: f.nome,
      value: f.total,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    }));
    if (outrosTotal > 0) result.push({ name: "Outros", value: outrosTotal, fill: "#e2e2e2" });
    return result;
  }, [dashboardData]);

  // Cálculos dos KPIs
  const kpis = useMemo(() => {
    if (!dashboardData?.metricas) {
      return {
        total: 0,
        asoPercentual: 0,
        pendenciasSetoriais: 0,
      };
    }

    return {
      total: dashboardData.metricas.totalCadastrados,
      asoPercentual: dashboardData.metricas.percentualASO,
      pendenciasSetoriais:
        dashboardData.pendencias?.filter((p) => p.status === "Atrasado").length ?? 0,
    };
  }, [dashboardData]);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <DashboardSkeleton />
      </ProtectedRoute>
    );
  }

  if (isError) {
    const typedError = error as {
      response?: { data?: { error?: string }; status?: number };
      message?: string;
    };
    const errorMessage =
      typedError?.response?.data?.error ||
      typedError?.message ||
      "Erro desconhecido";
    const errorStatus = typedError?.response?.status;

    return (
      <ProtectedRoute>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
          <AlertCircle className="h-16 w-16 text-destructive/50" />
          <p className="text-lg text-muted-foreground">
            Erro ao carregar dashboard
          </p>
          {errorStatus && (
            <p className="text-sm text-destructive">Status: {errorStatus}</p>
          )}
          <p className="text-sm text-muted-foreground max-w-md text-center">
            {errorMessage}
          </p>
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="gap-2 mt-4"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen w-full p-4 md:p-8">
        <div className="mx-auto max-w-7xl 2xl:max-w-[1800px]">

          {/* Header */}
          <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="page-title">Gestão a Vista - Geral</h1>
              <p className="page-subtitle">
                Visão geral do projeto e métricas
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ExportPdfButton targetRef={contentRef} filename="dashboard-principal" />
              <ExportPdfButton
                targetRef={evolucaoTimelineRef}
                filename="evolucao-e-timeline"
                label="Exportar Evolução + Timeline"
              />
            </div>
          </div>

          <div ref={contentRef}>

          {/* ── Card de Cabeçalho do Projeto ── */}
          {configData && centroCusto && (
            <Card className="glass-card mb-6">
              <CardHeader className="pb-3 flex flex-row items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Informações do Projeto
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
                  {configData.NOME_CLIENTE && (
                    <div>
                      <p className="text-xs text-muted-foreground">Cliente</p>
                      <p className="text-sm font-semibold truncate" title={configData.NOME_CLIENTE}>{configData.NOME_CLIENTE}</p>
                    </div>
                  )}
                  {configData.CENTRO_CUSTO && (
                    <div>
                      <p className="text-xs text-muted-foreground">Centro de Custo</p>
                      <p className="text-sm font-semibold truncate" title={configData.CENTRO_CUSTO}>{configData.CENTRO_CUSTO}</p>
                    </div>
                  )}
                  {configData.GERENTE_OPERACOES && (
                    <div>
                      <p className="text-xs text-muted-foreground">Ger. Operações</p>
                      <p className="text-sm font-semibold truncate" title={configData.GERENTE_OPERACOES}>{configData.GERENTE_OPERACOES}</p>
                    </div>
                  )}
                  {configData.GERENTE_CONTRATO && (
                    <div>
                      <p className="text-xs text-muted-foreground">Ger. Contrato</p>
                      <p className="text-sm font-semibold truncate" title={configData.GERENTE_CONTRATO}>{configData.GERENTE_CONTRATO}</p>
                    </div>
                  )}
                  {configData.DATA_INICIO_PROJETO && (
                    <div>
                      <p className="text-xs text-muted-foreground">Início da mobilização</p>
                      <p className="text-sm font-semibold">
                        {new Date(configData.DATA_INICIO_PROJETO + "T00:00:00Z").toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                      </p>
                    </div>
                  )}
                  {configData.DATA_FIM_PROJETO && (
                    <div>
                      <p className="text-xs text-muted-foreground">Término da mobilização</p>
                      <p className="text-sm font-semibold">
                        {new Date(configData.DATA_FIM_PROJETO + "T00:00:00Z").toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                      </p>
                    </div>
                  )}
                  {configData.META_ADMISSOES > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">Meta Admissões</p>
                      <p className="text-sm font-semibold">{configData.META_ADMISSOES}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Cards de KPIs ── */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Previsto vs Real */}
            {(() => {
              const previsto = dashboardData?.metricas?.colaboradoresPrevistos ?? 0;
              const pct = previsto > 0
                ? Math.min(100, Math.round((kpis.total / previsto) * 100))
                : 0;
              return (
                <Card className="glass-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                      Previsto vs Real
                    </CardTitle>
                    <Users className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="big-number text-[40px]">
                      {kpis.total}
                      {previsto > 0 && (
                        <span className="ml-1 text-sm font-normal text-muted-foreground">
                          / {previsto}
                        </span>
                      )}
                    </div>
                    {previsto > 0 ? (
                      <>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {pct}% do previsto atingido
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Cadastrados no sistema
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Saúde (ASO) */}
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  Saúde Ocupacional
                </CardTitle>
                <ShieldCheck className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="big-number text-[40px]">
                  {kpis.asoPercentual}%
                </div>
                <p className="text-xs text-muted-foreground">ASO Apto</p>
              </CardContent>
            </Card>

            {/* Pendências setoriais */}
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  Pendências setoriais
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="big-number text-[40px] text-destructive">
                  {kpis.pendenciasSetoriais}
                </div>
                <p className="text-xs text-muted-foreground">
                  Etapas atrasadas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ── Curva de mobilização + Plano de ação ── */}
          {/* Gated em configData (fonte canônica de datas) para não depender
              de dashboardData.projeto.dataInicio, que só existe quando a
              meta de admissões > 0. O gráfico é exibido apenas quando há
              dados de curva; o "Plano de ação" aparece sempre que o projeto
              estiver configurado. */}
          {configData?.DATA_INICIO_PROJETO && (
            <div ref={evolucaoTimelineRef}>
              <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Curva S (Avanço Físico) — 2/3 da largura */}
              <Card className="glass-card lg:col-span-2">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>Evolução do projeto</CardTitle>
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
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                            Diário
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Plan:{" "}
                            <span className="font-semibold text-foreground">
                              {indicadorCurvaS.diario.planejado.toFixed(1)}%
                            </span>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Real:{" "}
                            <span
                              className="font-semibold"
                              style={{
                                color:
                                  indicadorCurvaS.diario.realizado >= indicadorCurvaS.diario.planejado
                                    ? "#337246"
                                    : "#DA291B",
                              }}
                            >
                              {temProgressoReal
                                ? `${indicadorCurvaS.diario.realizado.toFixed(1)}%`
                                : "-"}
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
                            Etapas
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
                  {curveData.length === 0 ? (
                    <div className="flex h-[350px] flex-col items-center justify-center gap-2 text-muted-foreground">
                      <AlertTriangle className="h-10 w-10 opacity-30" />
                      <p className="text-sm">
                        Configure as etapas do cronograma para gerar a curva
                      </p>
                    </div>
                  ) : (
                  <ChartContainer config={chartConfigCurvaS} className="h-[350px] 2xl:h-[480px] w-full">
                    <AreaChart
                      data={curveData}
                      margin={{ top: 20, right: 60, left: 20, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient
                          id="gradientAdmitidos"
                          x1="0" y1="0" x2="0" y2="1"
                        >
                          <stop offset="5%"  stopColor="#DA291B" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#DA291B" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient
                          id="gradientMeta"
                          x1="0" y1="0" x2="0" y2="1"
                        >
                          <stop offset="5%"  stopColor="#e2e2e2" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="#e2e2e2" stopOpacity={0} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={CHART_GRID_COLOR}
                        vertical={false}
                      />

                      <XAxis
                        dataKey="mes"
                        tick={CHART_AXIS_TICK}
                        tickLine={false}
                        axisLine={false}
                        interval={Math.max(0, Math.floor(curveData.length / 10) - 1)}
                      />
                      <YAxis
                        tick={CHART_AXIS_TICK}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        label={{
                          value: "Progresso (%)",
                          angle: -90,
                          position: "insideLeft",
                          offset: 10,
                          style: { fill: CHART_AXIS_TICK.fill, fontSize: CHART_AXIS_TICK.fontSize },
                        }}
                      />

                      <ChartTooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload || !payload.length) return null;
                          const p = payload[0].payload as {
                            mes?: string;
                            previstoEtapa?: number;
                            realizadoEtapa?: number;
                            etapaNome?: string;
                          };
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                              <p className="text-xs text-muted-foreground">{label}</p>
                              {p.etapaNome && p.etapaNome !== "—" && (
                                <p className="text-xs font-medium">{p.etapaNome}</p>
                              )}
                              <p className="text-xs">
                                Planejado:{" "}
                                <span className="font-semibold">
                                  {p.previstoEtapa?.toFixed(1) ?? 0}%
                                </span>
                              </p>
                              <p className="text-xs">
                                Realizado:{" "}
                                <span className="font-semibold">
                                  {p.realizadoEtapa?.toFixed(1) ?? 0}%
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
                        stroke={MANSERV_CHART.gray}
                        strokeWidth={2}
                        strokeDasharray="6 3"
                        fill="url(#gradientMeta)"
                        dot={false}
                        activeDot={{ r: 5, fill: "#e2e2e2" }}
                      />

                      {temProgressoReal && (
                        <Area
                          type="monotone"
                          dataKey="realizado"
                          stroke={MANSERV_STATUS.danger}
                          strokeWidth={3}
                          fill="url(#gradientAdmitidos)"
                          dot={false}
                          activeDot={{ r: 7, fill: "#DA291B", stroke: "#fff", strokeWidth: 2 }}
                        />
                      )}
                    </AreaChart>
                  </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* Ocorrências — 1/3 da largura */}
              <Card className="glass-card lg:col-span-1 flex flex-col h-[460px] 2xl:h-[590px] overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Linha do tempo do Contrato
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col overflow-hidden">
                  {/* Seção Ocorrências */}
                  <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    {/* Formulário — somente admin/user */}
                    <CanAccess role="user">
                      <div className="flex gap-2 mb-4 shrink-0">
                      <Input
                        className="glass-input flex-1 min-w-0"
                        placeholder="Descreva a ocorrência..."
                        value={novoTexto}
                        onChange={(e) => setNovoTexto(e.target.value)}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            novoTexto.trim() &&
                            novaData &&
                            !criarOcorrencia.isPending
                          )
                            criarOcorrencia.mutate();
                        }}
                      />
                      <Input
                        className="glass-input w-36 shrink-0"
                        type="date"
                        value={novaData}
                        onChange={(e) => setNovaData(e.target.value)}
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        disabled={!novoTexto.trim() || !novaData || criarOcorrencia.isPending}
                        onClick={() => criarOcorrencia.mutate()}
                        title="Adicionar ocorrência"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CanAccess>

                    <div className="border-t border-white/10 mb-3 shrink-0" />

                    {/* Lista */}
                    {ocorrencias.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
                        <AlertTriangle className="h-8 w-8 opacity-20" />
                        <p className="text-sm">Nenhuma ocorrência registrada</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto pr-1">
                      {ocorrencias.map((o) => (
                        <div
                          key={o.id}
                          className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                        >
                          {editandoId === o.id ? (
                            // Modo de edição
                            <>
                              <div className="min-w-0 flex-1 space-y-2">
                                <Input
                                  className="glass-input h-8 text-sm"
                                  value={editandoTexto}
                                  onChange={(e) => setEditandoTexto(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && editandoTexto.trim() && editandoData) {
                                      atualizarOcorrencia.mutate({
                                        id: o.id,
                                        texto: editandoTexto,
                                        data: editandoData,
                                      });
                                    }
                                  }}
                                  placeholder="Descrição da ocorrência..."
                                />
                                <Input
                                  className="glass-input h-8 text-sm w-36"
                                  type="date"
                                  value={editandoData}
                                  onChange={(e) => setEditandoData(e.target.value)}
                                />
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                                  disabled={!editandoTexto.trim() || !editandoData || atualizarOcorrencia.isPending}
                                  onClick={() =>
                                    atualizarOcorrencia.mutate({
                                      id: o.id,
                                      texto: editandoTexto,
                                      data: editandoData,
                                    })
                                  }
                                  title="Salvar alterações"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground hover:text-muted-foreground"
                                  onClick={cancelarEdicao}
                                  title="Cancelar edição"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </>
                          ) : (
                            // Modo de visualização
                            <>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate" title={o.texto}>
                                  {o.texto}
                                </p>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(o.data + "T00:00:00Z").toLocaleDateString("pt-BR", {
                                      timeZone: "UTC",
                                    })}
                                  </p>
                                  {!centroCusto && o.centro_custo && (
                                    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/20 text-primary">
                                      {o.centro_custo}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <CanAccess role="user">
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                                    onClick={() => iniciarEdicao(o)}
                                    title="Editar ocorrência"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    disabled={deletarOcorrencia.isPending}
                                    onClick={() => deletarOcorrencia.mutate(o.id)}
                                    title="Remover ocorrência"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </CanAccess>
                            </>
                          )}
                        </div>
                      ))}
                      </div>
                    )}
                  </div>

                  {/* ── Comentários do Cliente ── */}
                  <div className="border-t border-white/10 my-4 shrink-0" />

                  {/* Seção Comentários do Cliente */}
                  <div className="shrink-0 max-h-[45%] flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2 mb-3 shrink-0">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Comentários do Cliente</span>
                    </div>

                    {/* Formulário — todos os perfis autenticados */}
                    <div className="flex gap-2 mb-4 shrink-0">
                    <Input
                      className="glass-input flex-1 min-w-0"
                      placeholder="Adicionar comentário do cliente..."
                      value={novoComentario}
                      onChange={(e) => setNovoComentario(e.target.value)}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          novoComentario.trim() &&
                          novaDataComentario &&
                          !criarComentario.isPending
                        )
                          criarComentario.mutate();
                      }}
                    />
                    <Input
                      className="glass-input w-36 shrink-0"
                      type="date"
                      value={novaDataComentario}
                      onChange={(e) => setNovaDataComentario(e.target.value)}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      disabled={!novoComentario.trim() || !novaDataComentario || criarComentario.isPending}
                      onClick={() => criarComentario.mutate()}
                      title="Adicionar comentário"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                    {/* Lista de comentários */}
                    {comentarios.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-6 text-center text-muted-foreground">
                        <MessageSquare className="h-6 w-6 opacity-20" />
                        <p className="text-sm">Nenhum comentário registrado</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto pr-1">
                      {comentarios.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                        >
                          {editandoComentarioId === c.id ? (
                            <>
                              <div className="min-w-0 flex-1 space-y-2">
                                <Input
                                  className="glass-input h-8 text-sm"
                                  value={editandoComentarioTexto}
                                  onChange={(e) => setEditandoComentarioTexto(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && editandoComentarioTexto.trim() && editandoComentarioData) {
                                      atualizarComentario.mutate({
                                        id: c.id,
                                        texto: editandoComentarioTexto,
                                        data: editandoComentarioData,
                                      });
                                    }
                                  }}
                                  placeholder="Comentário..."
                                />
                                <Input
                                  className="glass-input h-8 text-sm w-36"
                                  type="date"
                                  value={editandoComentarioData}
                                  onChange={(e) => setEditandoComentarioData(e.target.value)}
                                />
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                                  disabled={!editandoComentarioTexto.trim() || !editandoComentarioData || atualizarComentario.isPending}
                                  onClick={() =>
                                    atualizarComentario.mutate({
                                      id: c.id,
                                      texto: editandoComentarioTexto,
                                      data: editandoComentarioData,
                                    })
                                  }
                                  title="Salvar"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground"
                                  onClick={cancelarEdicaoComentario}
                                  title="Cancelar"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate" title={c.texto}>
                                  {c.texto}
                                </p>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(c.data + "T00:00:00Z").toLocaleDateString("pt-BR", {
                                      timeZone: "UTC",
                                    })}
                                  </p>
                                  {!centroCusto && c.centro_custo && (
                                    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/20 text-primary">
                                      {c.centro_custo}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                                  onClick={() => iniciarEdicaoComentario(c)}
                                  title="Editar comentário"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  disabled={deletarComentario.isPending}
                                  onClick={() => deletarComentario.mutate(c.id)}
                                  title="Remover comentário"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                </CardContent>
              </Card>
              </div>
            </div>
          )}

          {/* ── Etapas do Projeto ── */}
          {dashboardData?.etapas && dashboardData.etapas.length > 0 && (
            <div className="mb-6">
              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center gap-2">
                  <ListChecks className="h-5 w-5 text-primary" />
                  <CardTitle>Etapas do Projeto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {dashboardData.etapas.map((etapa) => (
                      <div
                        key={etapa.id}
                        className="flex flex-col gap-2 rounded-lg border border-border bg-muted/50 p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold">{etapa.nome}</span>
                          {etapa.concluida || etapa.percentualConcluido >= 100 ? (
                            <Check className="h-4 w-4 text-green-500 shrink-0" />
                          ) : null}
                        </div>
                        {(etapa.dataInicio || etapa.dataFim) && (
                          <div className="text-xs text-muted-foreground">
                            {fmtDate(etapa.dataInicio) ?? "—"} - {fmtDate(etapa.dataFim) ?? "—"}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {etapa.duracaoDias} dia{etapa.duracaoDias !== 1 ? "s" : ""}
                        </div>
                        <div className="mt-2 space-y-1">
                          {/* Barra Previsto (azul) */}
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  etapa.evolucaoDiaria?.[etapa.evolucaoDiaria.length - 1]?.previsto ??
                                    etapa.percentualConcluido,
                                )}%`,
                              }}
                            />
                          </div>
                          {/* Barra Realizado (vermelho) */}
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#DA291B] transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  etapa.evolucaoDiaria?.[etapa.evolucaoDiaria.length - 1]?.realizado ??
                                    etapa.percentualConcluido,
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground text-right mt-1">
                          Previsto: {etapa.evolucaoDiaria?.[etapa.evolucaoDiaria.length - 1]?.previsto ?? etapa.percentualConcluido}% · Realizado: {etapa.evolucaoDiaria?.[etapa.evolucaoDiaria.length - 1]?.realizado ?? etapa.percentualConcluido}%
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Status Contratual (com números absolutos) ── */}
          <div className="mb-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Status Contratação</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfigStatus} className="h-[260px] 2xl:h-[340px] w-full">
                  <PieChart>
                    <Pie
                      data={dadosStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius="30%"
                      outerRadius="65%"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {dadosStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
                {/* Números absolutos por status */}
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {dadosStatus.map((s) => (
                    <div
                      key={s.name}
                      className="flex flex-col items-center rounded-lg border border-white/5 bg-white/5 px-3 py-3"
                    >
                      <span
                        className="big-number text-[40px]"
                        style={{ color: s.color }}
                      >
                        {s.value}
                      </span>
                      <span className="mt-0.5 text-xs text-muted-foreground">
                        {s.name}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Distribuição por Função CLT ── */}
          {dadosFuncoes.length > 0 && (
            <div className="mb-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Distribuição por Função CLT</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfigFuncoes} className="h-[350px] 2xl:h-[480px] w-full">
                    <PieChart>
                      <Pie
                        data={dadosFuncoes}
                        cx="50%"
                        cy="50%"
                        outerRadius="80%"
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) =>
                          percent > 0.04 ? `${name} (${(percent * 100).toFixed(0)}%)` : ""
                        }
                        labelLine={false}
                      >
                        {dadosFuncoes.map((entry, i) => (
                          <Cell key={`fn-${i}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={<ChartTooltipContent nameKey="name" />}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          )}

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
