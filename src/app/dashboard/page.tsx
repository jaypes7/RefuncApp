"use client";

import { useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import {
  Users,
  Truck,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Construction,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { dashboardApi, type DashboardData } from "@/lib/axios";

// ============================================================================
// CONFIGURAÇÃO DOS GRÁFICOS
// ============================================================================

const chartConfigASO = {
  apto: {
    label: "Apto",
    color: "#22c55e", // verde
  },
  inapto: {
    label: "Inapto",
    color: "#ef4444", // vermelho
  },
  pendente: {
    label: "Pendente",
    color: "#f59e0b", // amarelo
  },
};

const chartConfigStatus = {
  ativo: {
    label: "Ativo",
    color: "#5bc0ec", // azul marca
  },
  inativo: {
    label: "Inativo",
    color: "#64748b", // cinza
  },
  pendente: {
    label: "Pendente",
    color: "#f59e0b", // amarelo
  },
};

const chartConfigCurvaS = {
  previsto: {
    label: "Meta (Sigmoide)",
    color: "#94a3b8",
  },
  realizado: {
    label: "Admitidos",
    color: "#5bc0ec",
  },
};

const chartConfigFuncoes = {
  total: { label: "Colaboradores", color: "#5bc0ec" },
};

// Paleta de cores para o pie de funções
const PIE_COLORS = [
  "#5bc0ec", "#22c55e", "#f59e0b", "#a78bfa", "#f43f5e",
  "#34d399", "#fb923c", "#818cf8", "#4ade80", "#60a5fa",
];

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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
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
  console.log("[Dashboard] Componente montado");

  // Busca dados da API
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      console.log("[Dashboard] Fazendo requisição para /api/dashboard...");
      try {
        const response = await dashboardApi.get();
        console.log("[Dashboard] Resposta recebida:", response.data);
        return response.data;
      } catch (err) {
        console.error("[Dashboard] Erro na requisição:", err);
        throw err;
      }
    },
    retry: 2,
    staleTime: 30000, // 30 segundos
  });

  // Log para debug
  useEffect(() => {
    console.log("[Dashboard] Estado da query:", { isLoading, isError, data });
    if (data) {
      console.log("[Dashboard] Dados recebidos:", data);
      console.log("[Dashboard] Gráficos:", data?.graficos);
      console.log("[Dashboard] Curva S:", data?.graficos?.curvaS);
    }
    if (isError && error) {
      console.error("[Dashboard] Erro ao carregar dados:", error);
    }
  }, [data, isLoading, isError, error]);

  const dashboardData: DashboardData | undefined = data;

  // Gera dados da Curva S dinamicamente
  const curveData = useMemo(() => {
    console.log(
      "[Dashboard] Gerando curveData:",
      dashboardData?.graficos?.curvaS,
    );
    if (!dashboardData?.graficos?.curvaS) return [];

    const { labels, planejado, realizado } = dashboardData.graficos.curvaS;
    const data = labels.map((mes, index) => ({
      mes,
      previsto: planejado[index] || 0,
      realizado: realizado?.[index] || 0,
    }));
    console.log("[Dashboard] curveData gerado:", data);
    return data;
  }, [dashboardData]);

  // Dados para gráfico de barras (ASO)
  const dadosASO = useMemo(() => {
    if (!dashboardData?.metricas) return [];

    const total = dashboardData.metricas.totalCadastrados || 1;
    const aptoCount = Math.round(
      (dashboardData.metricas.percentualASO / 100) * total,
    );
    const inaptoCount = Math.round(
      ((100 - dashboardData.metricas.percentualASO) / 100) * total * 0.2,
    );
    const pendenteCount = total - aptoCount - inaptoCount;

    return [
      { name: "Apto", value: Math.max(0, aptoCount), fill: "#22c55e" },
      { name: "Inapto", value: Math.max(0, inaptoCount), fill: "#ef4444" },
      { name: "Pendente", value: Math.max(0, pendenteCount), fill: "#f59e0b" },
    ];
  }, [dashboardData]);

  // Dados para gráfico de rosca (Status)
  const dadosStatus = useMemo(() => {
    if (!dashboardData?.graficos?.statusCount) return [];

    const { Ativo, Inativo, Pendente } = dashboardData.graficos.statusCount;

    return [
      { name: "Ativo", value: Ativo || 0, color: "#5bc0ec" },
      { name: "Inativo", value: Inativo || 0, color: "#64748b" },
      { name: "Pendente", value: Pendente || 0, color: "#f59e0b" },
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
    if (outrosTotal > 0) result.push({ name: "Outros", value: outrosTotal, fill: "#64748b" });
    return result;
  }, [dashboardData]);

  // Cálculos dos KPIs
  const kpis = useMemo(() => {
    if (!dashboardData?.metricas) {
      return {
        total: 0,
        mobPercentual: 0,
        asoPercentual: 0,
        pendenciasRh: 0,
      };
    }

    return {
      total: dashboardData.metricas.totalCadastrados,
      mobPercentual: dashboardData.metricas.percentualMOB,
      asoPercentual: dashboardData.metricas.percentualASO,
      pendenciasRh:
        dashboardData.metricas.totalCadastrados -
        dashboardData.metricas.totalAdmitidos,
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
          <div className="mb-8">
            <h1 className="text-3xl 2xl:text-4xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground 2xl:text-lg">
              Visão geral dos colaboradores e métricas
            </p>
          </div>

          {/* Cards de KPIs */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total de Colaboradores */}
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  Total de Colaboradores
                </CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl 2xl:text-3xl font-bold text-foreground">
                  {kpis.total}
                </div>
                <p className="text-xs text-muted-foreground">
                  Cadastrados no sistema
                </p>
              </CardContent>
            </Card>

            {/* Mobilização (MOB) */}
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  Mobilização
                </CardTitle>
                <Truck className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl 2xl:text-3xl font-bold text-foreground">
                  {kpis.mobPercentual}%
                </div>
                <p className="text-xs text-muted-foreground">MOB Concluído</p>
              </CardContent>
            </Card>

            {/* Saúde (ASO) */}
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  Saúde Ocupacional
                </CardTitle>
                <ShieldCheck className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl 2xl:text-3xl font-bold text-foreground">
                  {kpis.asoPercentual}%
                </div>
                <p className="text-xs text-muted-foreground">ASO Apto</p>
              </CardContent>
            </Card>

            {/* Pendências RH */}
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  Pendências RH
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl 2xl:text-3xl font-bold text-destructive">
                  {kpis.pendenciasRh}
                </div>
                <p className="text-xs text-muted-foreground">
                  Não enviados ao RH
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Gráfico de Barras - ASO */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Distribuição ASO</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfigASO} className="h-[300px] 2xl:h-[420px] w-full">
                  <BarChart data={dadosASO} margin={{ top: 20, right: 60, left: 20, bottom: 20 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.1)"
                    />
                    <XAxis
                      dataKey="name"
                      stroke="rgba(255,255,255,0.5)"
                      fontSize={13}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.5)"
                      fontSize={13}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#5bc0ec" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Gráfico de Rosca - Status */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Status Contratual</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfigStatus} className="h-[300px] 2xl:h-[420px] w-full">
                  <PieChart>
                    <Pie
                      data={dadosStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius="30%"
                      outerRadius="70%"
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
              </CardContent>
            </Card>
          </div>

          {/* Distribuição por Função CLT */}
          {dadosFuncoes.length > 0 && (
            <div className="mt-6">
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

          {/* Curva S + Pendências — lado a lado */}
          {dashboardData?.projeto?.dataInicio && curveData.length > 0 && (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Curva S — 2/3 da largura */}
              <Card className="glass-card lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Curva de Projeto — Curva S</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Meta planejada (sigmoide) vs. admitidos reais acumulados
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      Início:{" "}
                      {new Date(
                        dashboardData.projeto.dataInicio! + "T00:00:00Z",
                      ).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Dia {dashboardData.projeto.diasCorridos} do projeto
                    </p>
                    {dashboardData.projeto.status?.atrasado && (
                      <p className="text-xs font-medium text-destructive">
                        ▼ {dashboardData.projeto.status.diasAtraso}d de atraso
                      </p>
                    )}
                    {dashboardData.projeto.status &&
                      !dashboardData.projeto.status.atrasado && (
                        <p className="text-xs font-medium text-emerald-400">
                          ▲ No prazo
                        </p>
                      )}
                  </div>
                </CardHeader>
                <CardContent>
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
                          <stop offset="5%"  stopColor="#5bc0ec" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#5bc0ec" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient
                          id="gradientMeta"
                          x1="0" y1="0" x2="0" y2="1"
                        >
                          <stop offset="5%"  stopColor="#94a3b8" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.07)"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="mes"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        interval={Math.max(0, Math.floor(curveData.length / 10) - 1)}
                      />
                      <YAxis
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        tickFormatter={(v) => String(v)}
                        label={{
                          value: "Pessoas",
                          angle: -90,
                          position: "insideLeft",
                          offset: 10,
                          style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 },
                        }}
                      />

                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value, name) => [
                              `${value} pessoas`,
                              name === "previsto" ? "Meta (sigmoide)" : "Admitidos",
                            ]}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />

                      <Area
                        type="monotone"
                        dataKey="previsto"
                        stroke="#94a3b8"
                        strokeWidth={2}
                        strokeDasharray="6 3"
                        fill="url(#gradientMeta)"
                        dot={false}
                        activeDot={{ r: 5, fill: "#94a3b8" }}
                      />

                      <Area
                        type="monotone"
                        dataKey="realizado"
                        stroke="#5bc0ec"
                        strokeWidth={3}
                        fill="url(#gradientAdmitidos)"
                        dot={false}
                        activeDot={{ r: 7, fill: "#5bc0ec", stroke: "#fff", strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Déficit de Mobilização (Etapas) — 1/3 da largura */}
              <Card className="glass-card lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Déficit de Mobilização
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(!dashboardData.pendencias ||
                    dashboardData.pendencias.length === 0) ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                      <ShieldCheck className="h-10 w-10 text-emerald-400/50" />
                      <p className="text-sm">Todas as metas de etapa atingidas</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[26rem] 2xl:max-h-[34rem] overflow-y-auto pr-1">
                      {dashboardData.pendencias.map((p, i) => {
                        const isRed = p.cor === "red";
                        const badgeColors = isRed
                          ? { bg: "#f43f5e22", fg: p.diasAtraso > 15 ? "#b91c1c" : "#f43f5e", border: "#f43f5e44" }
                          : { bg: "#f59e0b22", fg: "#f59e0b", border: "#f59e0b44" };
                        return (
                          <div
                            key={`${p.nome}-${i}`}
                            className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2.5"
                          >
                            <Construction
                              className="mt-0.5 h-4 w-4 shrink-0"
                              style={{ color: badgeColors.fg }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm 2xl:text-base font-medium truncate" title={p.nome}>
                                {p.nome}
                              </p>
                              <p className="text-xs 2xl:text-sm text-muted-foreground">
                                Meta: {p.metaEtapa} · Atual: {p.realizadoAtual}
                              </p>
                              {p.dataLimite && (
                                <p className="text-xs 2xl:text-sm text-muted-foreground">
                                  Prazo:{" "}
                                  {new Date(p.dataLimite + "T00:00:00Z").toLocaleDateString(
                                    "pt-BR",
                                    { timeZone: "UTC" },
                                  )}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <Badge
                                className={`border font-medium${p.pessoasFaltando > 15 ? " animate-pulse" : ""}`}
                                style={{
                                  backgroundColor: badgeColors.bg,
                                  color: badgeColors.fg,
                                  borderColor: badgeColors.border,
                                }}
                              >
                                Faltam {p.pessoasFaltando}
                              </Badge>
                              {p.diasAtraso > 0 && (
                                <Badge
                                  className={`border font-medium${p.diasAtraso > 15 ? " animate-pulse" : ""}`}
                                  style={{
                                    backgroundColor: "#f43f5e22",
                                    color: p.diasAtraso > 15 ? "#b91c1c" : "#f43f5e",
                                    borderColor: "#f43f5e44",
                                  }}
                                >
                                  {p.diasAtraso}d atrasado
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
