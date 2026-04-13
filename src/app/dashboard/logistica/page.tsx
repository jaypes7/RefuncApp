"use client";

import { useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "recharts";
import {
  Hotel,
  Users,
  BedDouble,
  DoorOpen,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { dashboardLogisticaApi } from "@/lib/axios";
import { useFilter } from "@/contexts/FilterContext";
import { SheetUpload } from "@/components/sheet-upload";
import { ExportPdfButton } from "@/components/export-pdf-button";
import { useQueryClient } from "@tanstack/react-query";
import { MANSERV_CHART, MANSERV_STATUS, MANSERV_PIE_COLORS, CHART_GRID_COLOR, CHART_AXIS_TICK } from "@/lib/chart-colors";

// ============================================================================
// CONFIG DO CHART
// ============================================================================

const chartConfig = {
  vagasPreenchidas: { label: "Ocupadas",    color: "#ff460a" },
  vagasDisponiveis: { label: "Disponíveis", color: "#232323" },
};

const chartConfigTurnos = {
  total: { label: "Colaboradores", color: "#ff460a" },
};

const TURNO_COLORS = [
  "#ff460a", "#19365b", "#416e7d", "#9c3022", "#ffa78b", "#9e708b",
];

// ============================================================================
// HELPERS
// ============================================================================

function ocupacaoBadge(percentual: number | undefined) {
  const pct = percentual ?? 0;
  if (pct >= 90) {
    return (
      <Badge
        className="border font-medium"
        style={{ backgroundColor: "#DA291B22", color: "#DA291B", borderColor: "#DA291B44" }}
      >
        {pct}%
      </Badge>
    );
  }
  if (pct >= 70) {
    return (
      <Badge
        className="border font-medium"
        style={{ backgroundColor: "#E5CF6122", color: "#E5CF61", borderColor: "#E5CF6144" }}
      >
        {pct}%
      </Badge>
    );
  }
  return (
    <Badge
      className="border font-medium"
      style={{ backgroundColor: "#33724622", color: "#337246", borderColor: "#33724644" }}
    >
      {pct}%
    </Badge>
  );
}

// ============================================================================
// SKELETON
// ============================================================================

function LogisticaSkeleton() {
  return (
    <div className="min-h-screen w-full p-4 md:p-8">
      <div className="mx-auto max-w-7xl 2xl:max-w-[1800px] space-y-8">
        <div>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-2 h-5 w-80" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="glass-card">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-24" />
                <Skeleton className="mt-2 h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="glass-card">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] 2xl:h-[420px] w-full" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function DashboardLogisticaPage() {
  const contentRef = useRef<HTMLDivElement>(null);
  const router      = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Redireciona guests para o Dashboard Geral (única página permitida)
  useEffect(() => {
    if (!authLoading && user?.perfil === "guest") {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  const { centroCusto } = useFilter();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard-logistica", centroCusto],
    queryFn: async () => {
      const res = await dashboardLogisticaApi.get(centroCusto);
      return res.data;
    },
    staleTime: 120_000,
  });

  const hoteis = useMemo(
    () => data?.vagasHoteis ?? [],
    [data],
  );

  // ── KPIs — calculados pela API com base em SUM(hoteis.vagas_totais) ─────────
  // Não recalcular aqui: o denominador correto é SUM(hoteis.vagas_totais),
  // e o numerador é COUNT(logistica_controle onde hotel preenchido).
  // Hotéis sem cadastro na tabela hoteis não entram no denominador.
  const kpis = useMemo(() => data?.kpis ?? null, [data]);

  // ── Dados do gráfico ──────────────────────────────────────────────────────

  const dadosGrafico = useMemo(
    () =>
      hoteis.map((h) => {
        const preenchidas  = h.vagasPreenchidas || 0;
        const totais       = h.vagasTotais      || 0;
        const disponiveis  = Math.max(0, totais - preenchidas);
        return {
          hotel:            h.hotel.length > 16 ? h.hotel.slice(0, 14) + "…" : h.hotel,
          hotelCompleto:    h.hotel,
          vagasPreenchidas: preenchidas,
          vagasDisponiveis: disponiveis,
        };
      }),
    [hoteis],
  );

  // ── Turnos de trabalho ────────────────────────────────────────────────────
  // Filtra "Não informado" e valores vazios para não poluir o gráfico

  const dadosTurnos = useMemo(
    () =>
      (data?.turnoTrabalho ?? [])
        .filter((t) => t.turno && t.turno !== "Não informado")
        .map((t, i) => ({
          turno: t.turno,
          total: t.total,
          fill: TURNO_COLORS[i % TURNO_COLORS.length],
        })),
    [data],
  );

  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <ProtectedRoute>
        <LogisticaSkeleton />
      </ProtectedRoute>
    );
  }

  if (isError) {
    const msg =
      (error as { response?: { data?: { error?: string } }; message?: string })
        ?.response?.data?.error ??
      (error as { message?: string })?.message ??
      "Erro desconhecido";

    return (
      <ProtectedRoute>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
          <AlertCircle className="h-16 w-16 text-destructive/50" />
          <p className="text-lg text-muted-foreground">
            Erro ao carregar dashboard de Logística
          </p>
          <p className="text-sm text-muted-foreground max-w-md text-center">{msg}</p>
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
          <div className="flex items-center justify-between gap-3 flex-wrap">
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
                <h1 className="page-title">
                  Gestão a Vista - Logística
                </h1>
                <p className="text-muted-foreground 2xl:text-lg">
                  Ocupação e disponibilidade dos hotéis
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ExportPdfButton targetRef={contentRef} filename="dashboard-logistica" />
              <SheetUpload
                endpoint="/api/logistica/controle"
                label="Importar controle logístico"
                headerDetectionKeys={["CPF", "RE", "NOME"]}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ["dashboard-logistica"] })}
                variant="outline"
                size="sm"
              />
            </div>
          </div>

          <div ref={contentRef} className="space-y-8">

          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  Ocupação Total
                </CardTitle>
                <Hotel className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="big-number text-[40px]">
                  {kpis ? `${kpis.ocupacaoTotal}%` : "—"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {kpis ? `${kpis.totalPreenchidas} de ${kpis.totalVagas} vagas` : "Sem dados"}
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  Total de Hóspedes
                </CardTitle>
                <Users className="h-4 w-4 text-[#337246]" />
              </CardHeader>
              <CardContent>
                <div className="big-number text-[40px] text-[#337246]">
                  {kpis?.totalPreenchidas ?? "—"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Vagas preenchidas
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  Vagas Disponíveis
                </CardTitle>
                <DoorOpen className="h-4 w-4 text-[#19365b]" />
              </CardHeader>
              <CardContent>
                <div className="big-number text-[40px] text-[#19365b]">
                  {kpis?.totalDisponiveis ?? "—"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Em todos os hotéis
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Barras */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BedDouble className="h-5 w-5 text-primary" />
                Ocupação por Hotel
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dadosGrafico.length === 0 ? (
                <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                  Nenhum hotel cadastrado
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="h-[450px] 2xl:h-[550px] w-full">
                  <BarChart
                    data={dadosGrafico}
                    barSize={40}
                    barGap={5}
                    margin={{ top: 20, right: 60, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid vertical={false} stroke="#e2e2e2" />
                    <XAxis
                      dataKey="hotel"
                      tick={{ fontSize: 10, fontFamily: "IBM Plex Sans", fontWeight: 300, fill: "#737373" }}
                      stroke="#e2e2e2"
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      height={60}
                      dy={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fontFamily: "IBM Plex Sans", fontWeight: 300, fill: "#737373" }}
                      stroke="#e2e2e2"
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelKey="hotelCompleto"
                          indicator="dot"
                        />
                      }
                    />
                    <ChartLegend wrapperStyle={{ paddingTop: "15px", position: "relative" }} content={<ChartLegendContent />} />
                    <Bar
                      dataKey="vagasPreenchidas"
                      name="vagasPreenchidas"
                      stackId="a"
                      fill={chartConfig.vagasPreenchidas.color}
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="vagasDisponiveis"
                      name="vagasDisponiveis"
                      stackId="a"
                      fill={chartConfig.vagasDisponiveis.color}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Tabela de detalhes */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hotel className="h-5 w-5 text-primary" />
                Detalhes por Hotel
                {hoteis.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    ({hoteis.length} hotéis)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hoteis.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  Nenhum hotel cadastrado
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableHead className="text-muted-foreground 2xl:text-sm">Hotel</TableHead>
                        <TableHead className="text-right text-muted-foreground 2xl:text-sm">Vagas Totais</TableHead>
                        <TableHead className="text-right text-muted-foreground 2xl:text-sm">Ocupadas</TableHead>
                        <TableHead className="text-right text-muted-foreground 2xl:text-sm">Disponíveis</TableHead>
                        <TableHead className="text-muted-foreground 2xl:text-sm">Ocupação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hoteis
                        .slice()
                        .sort((a, b) => b.percentual - a.percentual)
                        .map((h, i) => (
                          <TableRow
                            key={`${h.hotel}-${i}`}
                            className="border-white/5 hover:bg-white/5"
                          >
                            <TableCell className="font-medium max-w-[200px] 2xl:max-w-[320px] truncate" title={h.hotel}>{h.hotel}</TableCell>
                            <TableCell className="text-right text-sm 2xl:text-base">{h.vagasTotais}</TableCell>
                            <TableCell className="text-right text-sm 2xl:text-base text-primary">
                              {h.vagasPreenchidas}
                            </TableCell>
                            <TableCell className="text-right text-sm 2xl:text-base text-muted-foreground">
                              {Math.max(0, h.vagasTotais - h.vagasPreenchidas)}
                            </TableCell>
                            <TableCell>{ocupacaoBadge(h.percentual)}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Turnos de Trabalho */}
          {dadosTurnos.length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Turnos de Trabalho</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfigTurnos} className="h-[300px] 2xl:h-[380px] w-full">
                  <PieChart>
                    <Pie
                      data={dadosTurnos}
                      dataKey="total"
                      nameKey="turno"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      label={({ turno, percent }) =>
                        `${turno} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {dadosTurnos.map((entry, i) => (
                        <Cell key={`turno-${i}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {dadosTurnos.map((t) => (
                    <div
                      key={t.turno}
                      className="flex flex-col items-center rounded-lg border border-white/5 bg-white/5 px-3 py-3"
                    >
                      <span
                        className="big-number text-[40px]"
                        style={{ color: t.fill }}
                      >
                        {t.total}
                      </span>
                      <span className="mt-0.5 text-xs text-muted-foreground text-center">
                        {t.turno}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
