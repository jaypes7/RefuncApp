"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ShieldCheck,
  ClipboardList,
  GraduationCap,
  FileCheck2,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { SheetUpload } from "@/components/sheet-upload";

// ============================================================================
// TIPOS
// ============================================================================

interface DistRow { label: string; value: number; }

interface SegurancaDashboardData {
  total:                    number;
  distribuicaoRpv:          DistRow[];
  distribuicaoTreinamento:  DistRow[];
  distribuicaoStatusPortal: DistRow[];
}

// ============================================================================
// PALETAS
// ============================================================================

const RPV_COLORS: Record<string, string> = {
  "OK":      "#22c55e",
  "Pendente":"#f59e0b",
  "N/A":     "#64748b",
};

const PORTAL_COLORS: Record<string, string> = {
  "Aprovado":           "#22c55e",
  "Pendente":           "#f59e0b",
  "Aprovado - DEMITIDO":"#64748b",
};

const TREIN_COLORS: Record<string, string> = {
  "Concluído":    "#22c55e",
  "Em Andamento": "#5bc0ec",
  "Pendente":     "#f59e0b",
};

const FALLBACK_COLORS = ["#5bc0ec", "#a78bfa", "#fb923c", "#34d399", "#f43f5e", "#64748b"];

function colorFor(label: string, map: Record<string, string>, idx: number): string {
  return map[label] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

// ============================================================================
// SKELETON
// ============================================================================

function SegurancaSkeleton() {
  return (
    <div className="min-h-screen w-full p-4 md:p-8">
      <div className="mx-auto max-w-7xl 2xl:max-w-[1800px] space-y-8">
        <div>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-2 h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="glass-card">
              <CardHeader className="pb-2"><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-20" />
                <Skeleton className="mt-2 h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <Card key={i} className="glass-card">
              <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
              <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
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

export default function DashboardSegurancaPage() {
  const router      = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery<SegurancaDashboardData>({
    queryKey: ["seguranca-dashboard"],
    queryFn:  async () => {
      const res = await fetch("/api/seguranca/dashboard");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Erro ${res.status}`);
      }
      return res.json();
    },
    staleTime: 30_000,
  });

  // ── KPIs derivados ────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    if (!data) return null;
    const concl     = data.distribuicaoTreinamento.find((r) => r.label === "Concluído")?.value ?? 0;
    const aprovados = data.distribuicaoStatusPortal.find((r) => r.label === "Aprovado")?.value ?? 0;
    return { total: data.total, concl, aprovados };
  }, [data]);

  // ── Dados do gráfico de rosca — Status Portal ─────────────────────────────

  const dadosPortal = useMemo(
    () =>
      (data?.distribuicaoStatusPortal ?? []).map((d, i) => ({
        name:  d.label,
        value: d.value,
        fill:  colorFor(d.label, PORTAL_COLORS, i),
      })),
    [data],
  );

  // ── Dados do gráfico de barras — RPV ─────────────────────────────────────

  const dadosRpv = useMemo(
    () =>
      (data?.distribuicaoRpv ?? []).map((d, i) => ({
        name:  d.label,
        value: d.value,
        fill:  colorFor(d.label, RPV_COLORS, i),
      })),
    [data],
  );

  // ── Dados do gráfico — Treinamentos ──────────────────────────────────────

  const dadosTrein = useMemo(
    () =>
      (data?.distribuicaoTreinamento ?? []).map((d, i) => ({
        name:  d.label,
        value: d.value,
        fill:  colorFor(d.label, TREIN_COLORS, i),
      })),
    [data],
  );

  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <ProtectedRoute>
        <SegurancaSkeleton />
      </ProtectedRoute>
    );
  }

  if (isError) {
    const msg =
      (error as { message?: string })?.message ?? "Erro desconhecido";

    return (
      <ProtectedRoute>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
          <AlertCircle className="h-16 w-16 text-destructive/50" />
          <p className="text-lg text-muted-foreground">Erro ao carregar dashboard de Segurança</p>
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
                <h1 className="text-3xl 2xl:text-4xl font-bold text-foreground">
                  Dashboard Segurança
                </h1>
                <p className="text-muted-foreground 2xl:text-lg">
                  FITs, RPV e status de acesso ao portal
                </p>
              </div>
            </div>
            <SheetUpload
              endpoint="/api/seguranca/fits"
              label="Importar FITs"
              headerDetectionKeys={["RE", "CPF", "NOME"]}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: ["seguranca-dashboard"] })}
              variant="outline"
              size="sm"
            />
          </div>

          {/* KPI Cards — 3 colunas: Total FITs | Treinamentos | Aprovados Portal */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  Total de FITs
                </CardTitle>
                <ClipboardList className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl 2xl:text-3xl font-bold">{kpis?.total ?? "—"}</div>
                <p className="text-xs text-muted-foreground">Fichas cadastradas</p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  Treinamentos Concluídos
                </CardTitle>
                <GraduationCap className="h-4 w-4 text-violet-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl 2xl:text-3xl font-bold text-violet-400">
                  {kpis?.concl ?? "—"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {kpis && kpis.total > 0
                    ? `${Math.round((kpis.concl / kpis.total) * 100)}% do total`
                    : "Sem dados"}
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  Aprovados Portal
                </CardTitle>
                <FileCheck2 className="h-4 w-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl 2xl:text-3xl font-bold text-emerald-400">
                  {kpis?.aprovados ?? "—"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {kpis && kpis.total > 0
                    ? `${Math.round((kpis.aprovados / kpis.total) * 100)}% do total`
                    : "Sem dados"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos linha 1 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* Rosca — Status Portal */}
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <FileCheck2 className="h-4 w-4 text-primary" />
                <CardTitle>Status Portal</CardTitle>
              </CardHeader>
              <CardContent>
                {dadosPortal.length === 0 ? (
                  <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    Sem dados de status portal
                  </div>
                ) : (
                  <>
                    <ChartContainer
                      config={{ total: { label: "Colaboradores", color: "#5bc0ec" } }}
                      className="h-[300px] 2xl:h-[360px] w-full"
                    >
                      <PieChart>
                        <Pie
                          data={dadosPortal}
                          cx="50%"
                          cy="50%"
                          outerRadius="80%"
                          innerRadius="40%"
                          paddingAngle={3}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) =>
                            percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : ""
                          }
                          labelLine={false}
                        >
                          {dadosPortal.map((entry, i) => (
                            <Cell key={`portal-${i}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                        <ChartLegend content={<ChartLegendContent />} />
                      </PieChart>
                    </ChartContainer>

                    {/* Legenda numérica */}
                    <div className="mt-4 space-y-2">
                      {dadosPortal.map((d) => {
                        const pct = kpis?.total
                          ? Math.round((d.value / kpis.total) * 100)
                          : 0;
                        return (
                          <div
                            key={d.name}
                            className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: d.fill }}
                              />
                              <span className="text-sm font-medium">{d.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">{pct}%</span>
                              <span className="text-sm font-bold">{d.value}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Barras — RPV */}
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <CardTitle>Distribuição RPV</CardTitle>
              </CardHeader>
              <CardContent>
                {dadosRpv.length === 0 ? (
                  <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    Sem dados de RPV
                  </div>
                ) : (
                  <>
                    <ChartContainer
                      config={{ value: { label: "Colaboradores", color: "#5bc0ec" } }}
                      className="h-[260px] 2xl:h-[320px] w-full"
                    >
                      <BarChart data={dadosRpv} margin={{ top: 16, right: 40, left: 10, bottom: 10 }}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.08)"
                          vertical={false}
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
                          allowDecimals={false}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" name="Colaboradores" radius={[6, 6, 0, 0]}>
                          {dadosRpv.map((entry, i) => (
                            <Cell key={`rpv-${i}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {dadosRpv.map((d) => (
                        <div
                          key={d.name}
                          className="flex flex-col items-center rounded-lg border border-white/5 bg-white/5 px-2 py-3"
                        >
                          <span
                            className="text-2xl 2xl:text-3xl font-bold"
                            style={{ color: d.fill }}
                          >
                            {d.value}
                          </span>
                          <span className="mt-0.5 text-xs text-muted-foreground text-center">
                            {d.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Gráfico — Treinamentos */}
          {dadosTrein.length > 0 && (
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                <CardTitle>Status de Treinamento</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{ value: { label: "Colaboradores", color: "#5bc0ec" } }}
                  className="h-[220px] 2xl:h-[280px] w-full"
                >
                  <BarChart data={dadosTrein} margin={{ top: 16, right: 40, left: 10, bottom: 10 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.08)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      stroke="rgba(255,255,255,0.5)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.5)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" name="Colaboradores" radius={[6, 6, 0, 0]}>
                      {dadosTrein.map((entry, i) => (
                        <Cell key={`trein-${i}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>

                <div className="mt-4 flex flex-wrap gap-3">
                  {dadosTrein.map((d) => (
                    <div
                      key={d.name}
                      className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: d.fill }}
                      />
                      <span className="text-sm font-medium">{d.name}</span>
                      <span className="text-sm font-bold" style={{ color: d.fill }}>
                        {d.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}
