"use client";

import { useMemo, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";
import {
  Package,
  DollarSign,
  CheckCircle2,
  ClipboardList,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { dashboardSuprimentosApi } from "@/lib/axios";
import { SheetUpload } from "@/components/sheet-upload";
import { toast } from "sonner";
import { CanAccess } from "@/components/CanAccess";

// ============================================================================
// PALETA & CONFIG
// ============================================================================

const STATUS_COLORS: Record<string, string> = {
  Aprovada:       "#22c55e",
  Cancelada:      "#f43f5e",
  "Em Aprovação": "#f59e0b",
};

const PIE_FALLBACK_COLORS = ["#5bc0ec", "#a78bfa", "#fb923c", "#34d399", "#f43f5e"];

const chartConfigStatus = {
  total: { label: "Ordens", color: "#5bc0ec" },
};

// ============================================================================
// TIPOS
// ============================================================================

interface OrdemRow {
  id:                  string;
  ordem_compra:        string | null;
  descricao:           string | null;
  total_req_previstas: number;
  valores:             number;
  status:              string | null;
  entregue_obra:       boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency", currency: "BRL", minimumFractionDigits: 2,
});

function formatBRL(value: number): string {
  return brlFormatter.format(value);
}

function StatusBadge({ status }: { status: string }) {
  const color   = STATUS_COLORS[status];
  const variant = status === "Aprovada" ? "default" : status === "Cancelada" ? "destructive" : "secondary";
  return (
    <Badge
      variant={variant}
      style={color ? { backgroundColor: color + "22", color, borderColor: color + "44" } : undefined}
      className="border font-medium"
    >
      {status || "—"}
    </Badge>
  );
}

// ============================================================================
// SKELETON
// ============================================================================

function SuprimentosSkeleton() {
  return (
    <div className="min-h-screen w-full p-4 md:p-8">
      <div className="mx-auto max-w-7xl 2xl:max-w-[1800px] space-y-8">
        <div>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-2 h-5 w-80" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="glass-card">
              <CardHeader className="pb-2"><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-24" />
                <Skeleton className="mt-2 h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <Card key={i} className="glass-card">
              <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
              <CardContent><Skeleton className="h-[300px] 2xl:h-[420px] w-full" /></CardContent>
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

export default function DashboardSuprimentosPage() {
  const router      = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Redireciona guests para o Dashboard Geral (única página permitida)
  useEffect(() => {
    if (!authLoading && user?.perfil === "guest") {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  // ── Query do dashboard de suprimentos (KPIs + gráficos) ───────────────────
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard-suprimentos"],
    queryFn:  async () => (await dashboardSuprimentosApi.get()).data,
    staleTime: 120_000,
  });

  // ── Query dedicada das ordens (inclui id para Switch) ─────────────────────
  const {
    data: ordensData,
    refetch: refetchOrdens,
  } = useQuery<{ data: OrdemRow[] }>({
    queryKey: ["suprimentos-ordens"],
    queryFn:  async () => {
      const res = await fetch("/api/suprimentos/ordens?limit=200");
      if (!res.ok) throw new Error("Erro ao buscar ordens");
      return res.json();
    },
    staleTime: 30_000,
  });

  const ordens = useMemo(() => ordensData?.data ?? [], [ordensData]);

  const sup = data?.suprimentos;

  // ── KPIs (do dashboard) ───────────────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!sup) return null;
    return {
      totalInvestido:     sup.totalInvestido,
      totalOrdens:        sup.totalOrdens,
      entregues:          sup.entregues,
      percentualEntregue: sup.percentualEntregue,
    };
  }, [sup]);

  // ── Pie de Status (do dashboard) ──────────────────────────────────────────
  const dadosStatus = useMemo(
    () =>
      (sup?.distribuicaoStatus ?? []).map((d, i) => ({
        name:  d.status,
        value: d.total,
        fill:  STATUS_COLORS[d.status] ?? PIE_FALLBACK_COLORS[i % PIE_FALLBACK_COLORS.length],
      })),
    [sup],
  );

  // ── Toggle entregue_obra ───────────────────────────────────────────────────
  const handleToggleEntregue = useCallback(
    async (id: string, novoValor: boolean) => {
      // Optimistic update
      queryClient.setQueryData<{ data: OrdemRow[] }>(
        ["suprimentos-ordens"],
        (old) =>
          old
            ? {
                ...old,
                data: old.data.map((o) =>
                  o.id === id ? { ...o, entregue_obra: novoValor } : o,
                ),
              }
            : old,
      );

      try {
        const res = await fetch(`/api/suprimentos/ordens/${id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ entregue_obra: novoValor }),
        });
        if (!res.ok) throw new Error("Falha ao atualizar");
      } catch {
        // Reverte em caso de erro
        queryClient.setQueryData<{ data: OrdemRow[] }>(
          ["suprimentos-ordens"],
          (old) =>
            old
              ? {
                  ...old,
                  data: old.data.map((o) =>
                    o.id === id ? { ...o, entregue_obra: !novoValor } : o,
                  ),
                }
              : old,
        );
        toast.error("Erro ao atualizar entrega");
      }
    },
    [queryClient],
  );

  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <ProtectedRoute>
        <SuprimentosSkeleton />
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
          <p className="text-lg text-muted-foreground">Erro ao carregar dashboard de Suprimentos</p>
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
                  Dashboard Suprimentos
                </h1>
                <p className="text-muted-foreground 2xl:text-lg">
                  Acompanhamento de ordens de compra e entregas
                </p>
              </div>
            </div>
            <SheetUpload
              endpoint="/api/suprimentos/ordens"
              label="Importar ordens"
              headerDetectionKeys={["Descrição", "Ordem de Compra", "Valor OC", "Item"]}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ["dashboard-suprimentos"] });
                refetchOrdens();
              }}
              variant="outline"
              size="sm"
            />
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  Total Investido
                </CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl 2xl:text-3xl font-bold text-emerald-400">
                  {kpis ? formatBRL(kpis.totalInvestido) : "—"}
                </div>
                <p className="text-xs text-muted-foreground">Soma de todos os valores</p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  Ordens de Compra
                </CardTitle>
                <ClipboardList className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl 2xl:text-3xl font-bold">{kpis?.totalOrdens ?? "—"}</div>
                <p className="text-xs text-muted-foreground">Total de requisições</p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  Entregas Realizadas
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl 2xl:text-3xl font-bold text-emerald-400">
                  {kpis?.entregues ?? "—"}
                </div>
                <p className="text-xs text-muted-foreground">Entregues na obra</p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  % Entregue
                </CardTitle>
                <Package className="h-4 w-4 text-violet-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl 2xl:text-3xl font-bold text-violet-400">
                  {kpis ? `${kpis.percentualEntregue}%` : "—"}
                </div>
                <p className="text-xs text-muted-foreground">Das ordens entregues</p>
              </CardContent>
            </Card>
          </div>

          {/* Orçado vs Investido */}
          {sup && sup.orcado > 0 && (
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center gap-2 pb-3">
                <DollarSign className="h-4 w-4 text-primary" />
                <CardTitle>Orçado vs Investido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Orçado</p>
                    <p className="text-2xl 2xl:text-3xl font-bold text-primary">
                      {formatBRL(sup.orcado)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Investido</p>
                    <p className="text-2xl 2xl:text-3xl font-bold text-emerald-400">
                      {formatBRL(sup.totalInvestido)}
                    </p>
                  </div>
                </div>
                {(() => {
                  const pct        = Math.min(100, Math.round((sup.totalInvestido / sup.orcado) * 100));
                  const overBudget = sup.totalInvestido > sup.orcado;
                  return (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{pct}% do orçamento utilizado</span>
                        <span className={overBudget ? "text-red-400 font-medium" : "text-emerald-400"}>
                          {overBudget
                            ? `+${formatBRL(sup.totalInvestido - sup.orcado)} acima`
                            : `${formatBRL(sup.orcado - sup.totalInvestido)} disponível`}
                        </span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${overBudget ? "bg-red-400" : "bg-emerald-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Gráficos */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* Pie — Distribuição por Status */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Distribuição por Status</CardTitle>
              </CardHeader>
              <CardContent>
                {dadosStatus.length === 0 ? (
                  <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                    Sem dados de status disponíveis
                  </div>
                ) : (
                  <ChartContainer config={chartConfigStatus} className="h-[300px] 2xl:h-[420px] w-full">
                    <PieChart>
                      <Pie
                        data={dadosStatus}
                        cx="50%"
                        cy="50%"
                        outerRadius="80%"
                        innerRadius="30%"
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) =>
                          percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : ""
                        }
                        labelLine={false}
                      >
                        {dadosStatus.map((entry, i) => (
                          <Cell key={`status-${i}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                      <ChartLegend content={<ChartLegendContent />} />
                    </PieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Resumo por status */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Resumo por Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dadosStatus.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados disponíveis</p>
                ) : (
                  dadosStatus.map((d) => {
                    const pct =
                      (kpis?.totalOrdens ?? 0) > 0
                        ? Math.round((d.value / kpis!.totalOrdens) * 100)
                        : 0;
                    return (
                      <div
                        key={d.name}
                        className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.fill }} />
                          <span className="text-sm 2xl:text-base font-medium">{d.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm 2xl:text-base text-muted-foreground">{pct}%</span>
                          <span className="text-sm 2xl:text-base font-bold">{d.value}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Ordens — com Switch "Entregue na obra" */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Ordens de Compra
                {ordens.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    ({ordens.length} registros)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ordens.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  Nenhuma ordem de compra registrada
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableHead className="text-muted-foreground 2xl:text-sm">Ordem de Compra</TableHead>
                        <TableHead className="text-muted-foreground 2xl:text-sm">Descrição</TableHead>
                        <TableHead className="text-right text-muted-foreground 2xl:text-sm">Req. Previstas</TableHead>
                        <TableHead className="text-right text-muted-foreground 2xl:text-sm">Valor (R$)</TableHead>
                        <TableHead className="text-muted-foreground 2xl:text-sm">Status</TableHead>
                        <TableHead className="text-muted-foreground 2xl:text-sm">
                          Entregue na Obra
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordens.map((o) => (
                        <TableRow
                          key={o.id}
                          className="border-white/5 hover:bg-white/5"
                        >
                          <TableCell
                            className="font-mono text-sm 2xl:text-base font-medium max-w-[160px] truncate"
                            title={o.ordem_compra ?? "—"}
                          >
                            {o.ordem_compra || "—"}
                          </TableCell>
                          <TableCell
                            className="text-sm 2xl:text-base max-w-[200px] truncate text-muted-foreground"
                            title={o.descricao ?? "—"}
                          >
                            {o.descricao || "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm 2xl:text-base">
                            {o.total_req_previstas > 0 ? o.total_req_previstas : "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm 2xl:text-base">
                            {o.valores > 0 ? formatBRL(o.valores) : "—"}
                          </TableCell>
                          <TableCell>
                            {o.status ? <StatusBadge status={o.status} /> : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CanAccess role="user">
                                <Switch
                                  checked={o.entregue_obra}
                                  onCheckedChange={(checked) => handleToggleEntregue(o.id, checked)}
                                  aria-label={`Marcar ordem ${o.ordem_compra ?? o.id} como entregue`}
                                  size="sm"
                                />
                              </CanAccess>
                              <span
                                className={`text-xs font-medium ${
                                  o.entregue_obra ? "text-emerald-400" : "text-muted-foreground"
                                }`}
                              >
                                {o.entregue_obra ? "Sim" : "Não"}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </ProtectedRoute>
  );
}
