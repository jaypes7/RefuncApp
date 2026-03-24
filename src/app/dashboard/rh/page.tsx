"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  Users,
  MapPin,
  GraduationCap,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { dashboardApi } from "@/lib/axios";

// ============================================================================
// PALETA
// ============================================================================

const BAR_COLORS_UF = [
  "#5bc0ec", "#22c55e", "#f59e0b", "#a78bfa", "#f43f5e",
  "#34d399", "#fb923c", "#818cf8", "#4ade80", "#60a5fa",
  "#e879f9", "#facc15", "#2dd4bf", "#f97316", "#c084fc",
];

const PIE_COLORS_UF = BAR_COLORS_UF;

// ============================================================================
// CHART CONFIGS
// ============================================================================

const configIdades = {
  total: { label: "Colaboradores", color: "#5bc0ec" },
};

const configUF = {
  total: { label: "Colaboradores", color: "#a78bfa" },
};

// ============================================================================
// SKELETON
// ============================================================================

function RhSkeleton() {
  return (
    <div className="min-h-screen w-full p-4 md:p-8">
      <div className="mx-auto max-w-7xl 2xl:max-w-[1800px] space-y-8">
        <div>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-2 h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="glass-card">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-72 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function DashboardRhPage() {
  const router = useRouter();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await dashboardApi.get();
      return res.data;
    },
    staleTime: 30_000,
  });

  // ── KPIs RH ───────────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    if (!data?.metricas) return { total: 0, admitidos: 0, pendentes: 0 };
    const { totalCadastrados, totalAdmitidos } = data.metricas;
    return {
      total: totalCadastrados,
      admitidos: totalAdmitidos,
      pendentes: totalCadastrados - totalAdmitidos,
    };
  }, [data]);

  // ── Faixas etárias ────────────────────────────────────────────────────────

  const dadosIdades = useMemo(
    () => data?.agregacoes?.distribuicaoIdades ?? [],
    [data],
  );

  // ── Distribuição UF — top 15 + "Outros" ──────────────────────────────────

  const dadosUF = useMemo(() => {
    const lista = data?.agregacoes?.distribuicaoUF ?? [];
    if (lista.length === 0) return [];
    const top = lista.slice(0, 15);
    const outrosTotal = lista.slice(15).reduce((s, i) => s + i.total, 0);
    const result = top.map((u, i) => ({
      uf: u.uf,
      total: u.total,
      fill: PIE_COLORS_UF[i % PIE_COLORS_UF.length],
    }));
    if (outrosTotal > 0)
      result.push({ uf: "Outros", total: outrosTotal, fill: "#64748b" });
    return result;
  }, [data]);

  // ── Número de funções distintas ───────────────────────────────────────────
  const totalFuncoes = data?.agregacoes?.distribuicaoFuncoes?.length ?? 0;

  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <ProtectedRoute>
        <RhSkeleton />
      </ProtectedRoute>
    );
  }

  if (isError) {
    const msg =
      (
        error as {
          response?: { data?: { error?: string } };
          message?: string;
        }
      )?.response?.data?.error ??
      (error as { message?: string })?.message ??
      "Erro desconhecido";

    return (
      <ProtectedRoute>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
          <AlertCircle className="h-16 w-16 text-destructive/50" />
          <p className="text-lg text-muted-foreground">
            Erro ao carregar dashboard de RH
          </p>
          <p className="text-sm text-muted-foreground max-w-md text-center">
            {msg}
          </p>
          <Button onClick={() => refetch()} variant="outline" className="gap-2 mt-2">
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
        <div className="mx-auto max-w-7xl 2xl:max-w-[1800px] space-y-8">

          {/* Header */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard")}
              className="h-9 w-9 border border-border bg-card/60 hover:bg-card"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl 2xl:text-4xl font-bold text-foreground">
                Dashboard RH
              </h1>
              <p className="text-muted-foreground 2xl:text-lg">
                Perfil demográfico e funcional dos colaboradores
              </p>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  Total Cadastrados
                </CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl 2xl:text-3xl font-bold">{kpis.total}</div>
                <p className="text-xs text-muted-foreground">
                  Colaboradores no sistema
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  Admitidos
                </CardTitle>
                <GraduationCap className="h-4 w-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl 2xl:text-3xl font-bold text-emerald-400">
                  {kpis.admitidos}
                </div>
                <p className="text-xs text-muted-foreground">
                  Com processo concluído
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  Funções Distintas
                </CardTitle>
                <MapPin className="h-4 w-4 text-violet-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl 2xl:text-3xl font-bold text-violet-400">
                  {totalFuncoes}
                </div>
                <p className="text-xs text-muted-foreground">
                  Cargos CLT cadastrados
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* Faixa Etária */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Distribuição por Faixa Etária</CardTitle>
              </CardHeader>
              <CardContent>
                {dadosIdades.length === 0 ? (
                  <div className="flex h-[300px] 2xl:h-[420px] items-center justify-center text-sm text-muted-foreground">
                    Sem dados de idade disponíveis
                  </div>
                ) : (
                  <ChartContainer config={configIdades} className="h-[300px] 2xl:h-[420px] w-full">
                    <BarChart data={dadosIdades} margin={{ top: 20, right: 60, left: 20, bottom: 20 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.1)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="faixa"
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
                        allowDecimals={false}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="total"
                        name="Colaboradores"
                        fill="#5bc0ec"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Distribuição por UF — Pie */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Colaboradores por Estado (UF)</CardTitle>
              </CardHeader>
              <CardContent>
                {dadosUF.length === 0 ? (
                  <div className="flex h-[300px] 2xl:h-[420px] items-center justify-center text-sm text-muted-foreground">
                    Sem dados de UF disponíveis
                  </div>
                ) : (
                  <ChartContainer config={configUF} className="h-[300px] 2xl:h-[420px] w-full">
                    <PieChart>
                      <Pie
                        data={dadosUF}
                        cx="50%"
                        cy="50%"
                        outerRadius="80%"
                        paddingAngle={2}
                        dataKey="total"
                        nameKey="uf"
                        label={({ uf, percent }) =>
                          percent > 0.04
                            ? `${uf} (${(percent * 100).toFixed(0)}%)`
                            : ""
                        }
                        labelLine={false}
                      >
                        {dadosUF.map((entry, i) => (
                          <Cell key={`uf-${i}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={<ChartTooltipContent nameKey="uf" />}
                      />
                    </PieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Distribuição UF — BarChart horizontal (top 10) */}
          {dadosUF.length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Ranking de Estados</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={configUF} className="h-[28rem] 2xl:h-[36rem] w-full">
                  <BarChart
                    data={dadosUF.slice(0, 10)}
                    layout="vertical"
                    margin={{ top: 20, right: 60, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.1)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      stroke="rgba(255,255,255,0.5)"
                      fontSize={13}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="uf"
                      stroke="rgba(255,255,255,0.5)"
                      fontSize={13}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total" name="Colaboradores" radius={[0, 6, 6, 0]}>
                      {dadosUF.slice(0, 10).map((entry, i) => (
                        <Cell
                          key={`bar-uf-${i}`}
                          fill={BAR_COLORS_UF[i % BAR_COLORS_UF.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}
