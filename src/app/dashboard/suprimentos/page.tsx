"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  DollarSign,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  CreditCard,
  Package,
  ClipboardList,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import { dashboardSuprimentosApi } from "@/lib/axios";
import { useFilter } from "@/contexts/FilterContext";
import { CHART_GRID_COLOR, CHART_AXIS_TICK } from "@/lib/chart-colors";
import { ExportPdfButton } from "@/components/export-pdf-button";

// ============================================================================
// PALETA & CONFIG
// ============================================================================

const STATUS_REQ_COLORS: Record<string, string> = {
  rascunho:      "#737373",
  aberta:        "#19365b",
  em_andamento:  "#E5CF61",
  concluida:     "#337246",
  cancelada:     "#DA291B",
};

const STATUS_REQ_LABELS: Record<string, string> = {
  rascunho:     "Rascunho",
  aberta:       "Aberta",
  em_andamento: "Em andamento",
  concluida:    "Concluída",
  cancelada:    "Cancelada",
};

const TIPO_COLORS: Record<string, string> = {
  item:    "#337246",
  servico: "#ff460a",
};

const TIPO_LABELS: Record<string, string> = {
  item:    "Itens",
  servico: "Serviços",
};

const chartConfigCategoria = {
  valor: { label: "Valor (R$)", color: "#19365b" },
};

const chartConfigSGP = {
  valor: { label: "Valor (R$)", color: "#337246" },
};

// ============================================================================
// TIPOS
// ============================================================================

interface OrdemRow {
  id:               string;
  numero_oc:        string | null;
  fornecedor:       string | null;
  valor:            number | null;
  valor_previsto:   number | null;
  previsao_entrega: string | null;
  requisicao_id:    string | null;
  status_req:       string | null;
  titulo_req:       string | null;
}

interface ItemPendente {
  requisicao_id: string;
  numero_oc: string;
  item_id: string;
  nome_item: string;
  quantidade: number;
  quantidade_recebida: number;
  faltam: number;
}

interface OcAtrasada {
  numero_oc: string;
  fornecedor: string;
  previsao_entrega: string;
  itens_pendentes: Array<{
    nome_item: string;
    quantidade: number;
    recebido: number;
    faltam: number;
  }>;
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

function formatBRLShort(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `R$ ${(value / 1_000).toFixed(0)}k`;
  return brlFormatter.format(value);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function StatusReqBadge({ status }: { status: string }) {
  const color = STATUS_REQ_COLORS[status];
  const label = STATUS_REQ_LABELS[status] ?? status;
  return (
    <Badge
      variant="secondary"
      style={color ? { backgroundColor: color + "22", color, borderColor: color + "44" } : undefined}
      className="border font-medium capitalize"
    >
      {label}
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
  const contentRef = useRef<HTMLDivElement>(null);
  const router      = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [showAlertDetails, setShowAlertDetails] = useState(false);
  const [showRelatorio, setShowRelatorio] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.perfil === "guest") {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  const { centroCusto } = useFilter();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard-suprimentos", centroCusto],
    queryFn:  async () => (await dashboardSuprimentosApi.get(centroCusto)).data,
    staleTime: 120_000,
  });

  const { data: ordensData } = useQuery<{ data: OrdemRow[] }>({
    queryKey: ["suprimentos-ordens"],
    queryFn:  async () => {
      const res = await fetch("/api/suprimentos/ordens?limit=200");
      if (!res.ok) throw new Error("Erro ao buscar ordens");
      return res.json();
    },
    staleTime: 30_000,
  });

  const ordens = useMemo(() => ordensData?.data ?? [], [ordensData]);
  const sup     = data?.suprimentos;

  const kpis = useMemo(() => {
    if (!sup) return null;
    return {
      totalInvestido: sup.totalInvestido,
      totalAPagar:    sup.totalAPagar,
    };
  }, [sup]);

  const porCategoria   = useMemo(() => sup?.porCategoria   ?? [], [sup]);
  const sgpPorTipo     = useMemo(() => sup?.sgpPorTipo     ?? [], [sup]);
  const itensPendentes = useMemo(() => (sup?.itensPendentes ?? []) as ItemPendente[], [sup]);
  const ocAtrasadas    = useMemo(() => (sup?.ocAtrasadas    ?? []) as OcAtrasada[], [sup]);

  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading || !data) {
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
                <h1 className="page-title">Gestão a Vista — Suprimentos</h1>
                <p className="text-muted-foreground 2xl:text-lg">
                  Acompanhamento de ordens de compra e entregas
                </p>
              </div>
            </div>
            <ExportPdfButton targetRef={contentRef} filename="dashboard-suprimentos" />
          </div>

          <div ref={contentRef} className="space-y-8">

          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Investido */}
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  Total Realizado
                </CardTitle>
                <DollarSign className="h-4 w-4 text-[#337246]" />
              </CardHeader>
              <CardContent>
                <div className="big-number text-[40px] text-[#337246]">
                  {kpis ? formatBRL(kpis.totalInvestido) : "—"}
                </div>
                <p className="text-xs text-muted-foreground">Soma de todas as OCs</p>
              </CardContent>
            </Card>

            {/* Relatório */}
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  Relatório
                </CardTitle>
                <FileText className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">OCs Abertas</span>
                  <span className="text-lg font-bold">{sup?.ocAbertas ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Recebimentos</span>
                  <span className="text-lg font-bold">{sup?.qtRecebimentos ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Itens Pendentes</span>
                  <span className="text-lg font-bold text-amber-500">{itensPendentes.length}</span>
                </div>
                {itensPendentes.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-1 gap-1 text-xs"
                    onClick={() => setShowRelatorio(!showRelatorio)}
                  >
                    {showRelatorio ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {showRelatorio ? "Ocultar detalhes" : "Ver itens pendentes"}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Total a Pagar */}
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  Total a Pagar
                </CardTitle>
                <CreditCard className="h-4 w-4 text-[#DA291B]" />
              </CardHeader>
              <CardContent>
                <div className="big-number text-[40px] text-[#DA291B]">
                  {kpis ? formatBRL(kpis.totalAPagar) : "—"}
                </div>
                <p className="text-xs text-muted-foreground">OCs ainda não entregues</p>
              </CardContent>
            </Card>

            {/* Alerta de Atrasos */}
            <Card className={`glass-card ${ocAtrasadas.length > 0 ? "border-amber-500/40" : ""}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  Entregas Atrasadas
                </CardTitle>
                <AlertTriangle className={`h-4 w-4 ${ocAtrasadas.length > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
              </CardHeader>
              <CardContent>
                <div className={`big-number text-[40px] ${ocAtrasadas.length > 0 ? "text-amber-500" : ""}`}>
                  {ocAtrasadas.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {ocAtrasadas.length === 0
                    ? "Nenhuma entrega atrasada"
                    : `${ocAtrasadas.length === 1 ? "1 OC" : `${ocAtrasadas.length} OCs`} com atraso`}
                </p>
                {ocAtrasadas.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 gap-1 text-xs border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                    onClick={() => setShowAlertDetails(!showAlertDetails)}
                  >
                    {showAlertDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {showAlertDetails ? "Ocultar detalhes" : "Ver detalhes"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detalhes de Itens Pendentes (Relatório expandido) */}
          {showRelatorio && itensPendentes.length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Itens Pendentes — Recebimentos Parciais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#e2e2e2]/20 hover:bg-[#e2e2e2]/10">
                        <TableHead className="text-muted-foreground 2xl:text-sm">Nº OC</TableHead>
                        <TableHead className="text-muted-foreground 2xl:text-sm">Item</TableHead>
                        <TableHead className="text-right text-muted-foreground 2xl:text-sm">Qt Solicitada</TableHead>
                        <TableHead className="text-right text-muted-foreground 2xl:text-sm">Qt Recebida</TableHead>
                        <TableHead className="text-right text-muted-foreground 2xl:text-sm">Faltam</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itensPendentes.map((item) => (
                        <TableRow key={item.item_id} className="border-[#e2e2e2]/10 hover:bg-[#e2e2e2]/10">
                          <TableCell className="font-mono text-sm 2xl:text-base font-medium">
                            {item.numero_oc}
                          </TableCell>
                          <TableCell className="text-sm 2xl:text-base">
                            {item.nome_item}
                          </TableCell>
                          <TableCell className="text-right text-sm 2xl:text-base">
                            {item.quantidade}
                          </TableCell>
                          <TableCell className="text-right text-sm 2xl:text-base text-muted-foreground">
                            {item.quantidade_recebida}
                          </TableCell>
                          <TableCell className="text-right text-sm 2xl:text-base font-bold text-amber-500">
                            {item.faltam}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detalhes de OCs Atrasadas */}
          {showAlertDetails && ocAtrasadas.length > 0 && (
            <Card className="glass-card border-amber-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-500">
                  <AlertTriangle className="h-5 w-5" />
                  OCs com Entrega Atrasada
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ocAtrasadas.map((oc, idx) => (
                  <div key={idx} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold">{oc.numero_oc}</span>
                        <span className="text-sm text-muted-foreground">{oc.fornecedor}</span>
                      </div>
                      <Badge variant="secondary" className="border border-amber-500/40 bg-amber-500/10 text-amber-500">
                        Previsto: {formatDate(oc.previsao_entrega)}
                      </Badge>
                    </div>
                    {oc.itens_pendentes.length > 0 && (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-amber-500/10">
                              <TableHead className="text-xs text-muted-foreground">Item</TableHead>
                              <TableHead className="text-right text-xs text-muted-foreground">Qt Total</TableHead>
                              <TableHead className="text-right text-xs text-muted-foreground">Recebido</TableHead>
                              <TableHead className="text-right text-xs text-muted-foreground">Faltam</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {oc.itens_pendentes.map((item, iIdx) => (
                              <TableRow key={iIdx} className="border-amber-500/10">
                                <TableCell className="text-sm">{item.nome_item}</TableCell>
                                <TableCell className="text-right text-sm">{item.quantidade}</TableCell>
                                <TableCell className="text-right text-sm text-muted-foreground">{item.recebido}</TableCell>
                                <TableCell className="text-right text-sm font-bold text-amber-500">{item.faltam}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    {oc.itens_pendentes.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Todos os itens desta OC ainda não foram recebidos.
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Orçado vs Investido */}
          {sup && (sup.orcado > 0 || sup.investido > 0) && (
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center gap-2 pb-3">
                <DollarSign className="h-4 w-4 text-primary" />
                <CardTitle>Previsto X Realizado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Previsto (OCs Abertas)</p>
                    <p className="big-number text-[40px]">{formatBRL(sup.orcado)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Soma dos valores previstos das OCs não recebidas
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Realizado (OCs Recebidas)</p>
                    <p className="big-number text-[40px] text-[#337246]">{formatBRL(sup.investido)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Soma dos valores reais das OCs com recebimento total
                    </p>
                  </div>
                </div>
                {sup.orcado > 0 && (() => {
                  const diff = sup.investido - sup.orcado;
                  const totalRef = sup.orcado + sup.investido;
                  const pctInvestido = totalRef > 0 ? Math.round((sup.investido / totalRef) * 100) : 0;
                  return (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Proporção: {pctInvestido}% já recebido</span>
                        <span className={diff > 0 ? "text-red-400 font-medium" : "text-[#337246]"}>
                          {diff > 0
                            ? `Investido ficou +${formatBRL(diff)} acima do previsto`
                            : diff < 0
                              ? `Investido ficou ${formatBRL(Math.abs(diff))} abaixo do previsto`
                              : "Valores alinhados"}
                        </span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-[#e2e2e2]/20 overflow-hidden flex">
                        <div
                          className="h-full rounded-l-full bg-[#19365b] transition-all"
                          style={{ width: `${100 - pctInvestido}%` }}
                          title={`Orçado: ${formatBRL(sup.orcado)}`}
                        />
                        <div
                          className="h-full rounded-r-full bg-[#337246] transition-all"
                          style={{ width: `${pctInvestido}%` }}
                          title={`Investido: ${formatBRL(sup.investido)}`}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <span className="inline-block h-2 w-2 rounded-full bg-[#19365b]" />
                          Orçado (Abertas)
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="inline-block h-2 w-2 rounded-full bg-[#337246]" />
                          Investido (Recebidas)
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Gráficos */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* Valor por Categoria */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Valor por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                {porCategoria.length === 0 ? (
                  <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                    Sem dados de categoria disponíveis
                  </div>
                ) : (
                  <ChartContainer config={chartConfigCategoria} className="h-[300px] 2xl:h-[420px] w-full">
                    <BarChart data={porCategoria} margin={{ top: 16, right: 20, left: 10, bottom: 60 }}>
                      <CartesianGrid vertical={false} stroke={CHART_GRID_COLOR} />
                      <XAxis
                        dataKey="categoria"
                        tick={{ ...CHART_AXIS_TICK }}
                        angle={-40}
                        textAnchor="end"
                        interval={0}
                        height={60}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tickFormatter={formatBRLShort}
                        tick={{ ...CHART_AXIS_TICK }}
                        tickLine={false}
                        axisLine={false}
                        width={70}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent formatter={(v) => formatBRL(Number(v))} />}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="valor" name="valor" fill="#19365b" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* SGP — Gestão de Pagamentos */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  SPG — Gestão de Pagamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sgpPorTipo.length === 0 ? (
                  <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                    Sem dados de itens/serviços disponíveis
                  </div>
                ) : (
                  <>
                    <ChartContainer config={chartConfigSGP} className="h-[220px] 2xl:h-[300px] w-full">
                      <BarChart
                        data={sgpPorTipo.map((d) => ({ ...d, label: TIPO_LABELS[d.tipo] ?? d.tipo }))}
                        margin={{ top: 16, right: 20, left: 10, bottom: 10 }}
                      >
                        <CartesianGrid vertical={false} stroke={CHART_GRID_COLOR} />
                        <XAxis
                          dataKey="label"
                          tick={{ ...CHART_AXIS_TICK }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tickFormatter={formatBRLShort}
                          tick={{ ...CHART_AXIS_TICK }}
                          tickLine={false}
                          axisLine={false}
                          width={70}
                        />
                        <ChartTooltip
                          content={<ChartTooltipContent formatter={(v) => formatBRL(Number(v))} />}
                        />
                        <Bar dataKey="valor" name="valor" radius={[6, 6, 0, 0]}>
                          {sgpPorTipo.map((entry, i) => (
                            <Cell key={`sgp-${i}`} fill={TIPO_COLORS[entry.tipo] ?? "#416e7d"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>

                    <div className="mt-4 space-y-2">
                      {sgpPorTipo.map((d) => (
                        <div
                          key={d.tipo}
                          className="flex items-center justify-between rounded-lg border border-[#e2e2e2]/10 bg-[#e2e2e2]/10 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: TIPO_COLORS[d.tipo] ?? "#416e7d" }} />
                            <span className="text-sm 2xl:text-base font-medium">
                              {TIPO_LABELS[d.tipo] ?? d.tipo}
                            </span>
                          </div>
                          <span className="text-sm 2xl:text-base font-bold">{formatBRL(d.valor)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Ordens de Compra */}
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
                      <TableRow className="border-[#e2e2e2]/20 hover:bg-[#e2e2e2]/10">
                        <TableHead className="text-muted-foreground 2xl:text-sm">Nº OC</TableHead>
                        <TableHead className="text-muted-foreground 2xl:text-sm">Fornecedor</TableHead>
                        <TableHead className="text-right text-muted-foreground 2xl:text-sm">Valor (R$)</TableHead>
                        <TableHead className="text-right text-muted-foreground 2xl:text-sm">Valor Previsto</TableHead>
                        <TableHead className="text-muted-foreground 2xl:text-sm">Prev. Entrega</TableHead>
                        <TableHead className="text-muted-foreground 2xl:text-sm">Status Requisição</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordens.map((o) => (
                        <TableRow key={o.id} className="border-[#e2e2e2]/10 hover:bg-[#e2e2e2]/10">
                          <TableCell
                            className="font-mono text-sm 2xl:text-base font-medium max-w-[160px] truncate"
                            title={o.numero_oc ?? "—"}
                          >
                            {o.numero_oc || "—"}
                          </TableCell>
                          <TableCell
                            className="text-sm 2xl:text-base max-w-[200px] truncate text-muted-foreground"
                            title={o.fornecedor ?? "—"}
                          >
                            {o.fornecedor || "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm 2xl:text-base">
                            {o.valor != null ? formatBRL(o.valor) : "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm 2xl:text-base text-muted-foreground">
                            {o.valor_previsto != null ? formatBRL(o.valor_previsto) : "—"}
                          </TableCell>
                          <TableCell className="text-sm 2xl:text-base">
                            {formatDate(o.previsao_entrega)}
                          </TableCell>
                          <TableCell>
                            {o.status_req
                              ? <StatusReqBadge status={o.status_req} />
                              : <span className="text-muted-foreground">—</span>
                            }
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
      </div>
    </ProtectedRoute>
  );
}
