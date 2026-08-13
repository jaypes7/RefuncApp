"use client";

import { useMemo, useRef, useEffect, useState, Fragment } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
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
  ChevronRight,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  MinusCircle,
  Users,
} from "lucide-react";
import { SheetUpload } from "@/components/sheet-upload";
import { ExportPdfButton } from "@/components/export-pdf-button";
import { KpiCard } from "@/components/ui/kpi-card";
import { useFilter } from "@/contexts/FilterContext";

// ============================================================================
// TIPOS
// ============================================================================

interface DistRow { label: string; value: number; }

interface TreinamentoMembro {
  nome:            string;
  status:          string;
  data_realizacao: string | null;
  data_validade:   string | null;
}

interface TreinamentoStatusRow {
  nome:          string;
  total:         number;
  ok:            number;
  aVencer:       number;
  vencido:       number;
  pendente:      number;
  realizados:    number;
  naoRealizados: number;
  membros:       TreinamentoMembro[];
}

interface KpiTreinamentoCatalogo {
  totalVinculos: number;
  ok:            number;
  aVencer:       number;
  vencido:       number;
  pendente:      number;
  realizados:    number;
  naoRealizados: number;
}

interface SegurancaDashboardData {
  total:                      number;
  distribuicaoRpv:            DistRow[];
  distribuicaoTreinamento:    DistRow[];
  distribuicaoStatusPortal:   DistRow[];
  treinamentosPorCurso:       TreinamentoStatusRow[];
  kpiTreinamentoCatalogo:     KpiTreinamentoCatalogo;
}

// ============================================================================
// PALETAS
// ============================================================================

const RPV_COLORS: Record<string, string> = {
  "OK":      "#337246",
  "Pendente":"#E5CF61",
  "N/A":     "#e2e2e2",
};

const PORTAL_COLORS: Record<string, string> = {
  "Liberado":  "#337246",
  "Pendente":  "#E5CF61",
  "Bloqueado": "#e2e2e2",
};

const FALLBACK_COLORS = ["#ff460a", "#19365b", "#416e7d", "#9c3022", "#ffa78b", "#9e708b"];

function colorFor(label: string, map: Record<string, string>, idx: number): string {
  return map[label] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

// ============================================================================
// STATUS DE TREINAMENTOS — helpers
// ============================================================================

const STATUS_PILL: Record<string, string> = {
  "OK":       "bg-[#337246]/10 text-[#337246]",
  "A Vencer": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "Vencido":  "bg-red-500/10 text-red-600 dark:text-red-400",
  "Pendente": "bg-slate-500/10 text-muted-foreground",
};

/** Formata YYYY-MM-DD em DD/MM/AAAA; retorna "—" se vazio. */
function formatarDataTreino(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  if (!ano || !mes || !dia) return data;
  return `${dia}/${mes}/${ano}`;
}

// ============================================================================
// CARD: STATUS DE TREINAMENTOS (por curso do catálogo)
// ============================================================================

function TreinamentosStatusCard({ treinamentos }: { treinamentos: TreinamentoStatusRow[] }) {
  const [filtro, setFiltro] = useState("");
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const lista = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return treinamentos;
    return treinamentos.filter((t) => t.nome.toLowerCase().includes(q));
  }, [treinamentos, filtro]);

  // Ordenação fixa: piores no topo. Menor %OK primeiro; empate desempata
  // por mais Vencidos. Cursos sem vínculos vão pro fim (não carregam sinal).
  const listaOrdenada = useMemo(() => {
    const arr = [...lista];
    arr.sort((a, b) => {
      const aTotal = a.total === 0 ? Infinity : a.ok / a.total;
      const bTotal = b.total === 0 ? Infinity : b.ok / b.total;
      if (aTotal !== bTotal) return aTotal - bTotal;
      return b.vencido - a.vencido;
    });
    return arr;
  }, [lista]);

  // Totais agregados para a faixa de KPIs no topo — PGV §3.2/4.1:
  // cada card tem absoluto + %, cor semântica, e fundo tonal quando exige ação.
  const totais = useMemo(
    () =>
      treinamentos.reduce(
        (acc, t) => {
          acc.total += t.total;
          acc.ok += t.ok;
          acc.aVencer += t.aVencer;
          acc.vencido += t.vencido;
          acc.pendente += t.pendente;
          acc.realizados += t.realizados;
          acc.naoRealizados += t.naoRealizados;
          return acc;
        },
        { total: 0, ok: 0, aVencer: 0, vencido: 0, pendente: 0, realizados: 0, naoRealizados: 0 },
      ),
    [treinamentos],
  );

  const toggle = (nome: string) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(nome)) next.delete(nome);
      else next.add(nome);
      return next;
    });
  };

  return (
    <Card data-cardtv-id="seguranca-status-treinamento" className="glass-card">
      <CardHeader className="flex flex-row items-center gap-2 pb-2 flex-wrap">
        <GraduationCap className="h-4 w-4 text-primary" />
        <CardTitle>Status de Treinamentos</CardTitle>
      </CardHeader>
      <CardContent>
        {treinamentos.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            Sem treinamentos cadastrados para os colaboradores
          </div>
        ) : (
          <>
            {/* Faixa de KPIs agregados — padrão PGV §3.2/4.1:
                absoluto + %, cor semântica, fundo tonal quando exige ação. */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <KpiCard
                icon={Users}
                label="Vínculos"
                value={totais.total}
                hint={`${treinamentos.length} treinamentos no catálogo`}
                tone="neutral"
              />
              <KpiCard
                icon={CheckCircle2}
                label="OK"
                value={totais.ok}
                total={totais.total}
                tone="success"
                emphasis={totais.ok > 0 && totais.ok === totais.total}
              />
              <KpiCard
                icon={Clock}
                label="A vencer"
                value={totais.aVencer}
                total={totais.total}
                tone="warning"
                emphasis={totais.aVencer > 0}
              />
              <KpiCard
                icon={XCircle}
                label="Vencido"
                value={totais.vencido}
                total={totais.total}
                tone="danger"
                emphasis={totais.vencido > 0}
              />
              <KpiCard
                icon={MinusCircle}
                label="Pendente"
                value={totais.pendente}
                total={totais.total}
                tone="neutral"
                hint={totais.pendente > 0 ? "sem data agendada" : undefined}
              />
            </div>

            {/* Filtro + contador — o contador é dinâmico com a busca. */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filtrar por treinamento..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  className="pl-9"
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                <span className="font-mono font-semibold">{lista.length}</span> de{" "}
                <span className="font-mono font-semibold">{treinamentos.length}</span> treinamentos
              </span>
            </div>

            {/* Tabela densa — piores no topo, células zeradas em cinza-fantasma,
                Vencido > 0 pinta a célula em rosa. Ver plano correspondente. */}
            <Table containerClassName="max-h-[640px] overflow-y-auto rounded-lg border border-border">
              <TableHeader sticky>
                <TableRow>
                  <TableHead className="w-8 pl-3" />
                  <TableHead className="min-w-0">Treinamento</TableHead>
                  <TableHead className="w-16 text-right font-mono text-[10px] uppercase tracking-wider">Vínc.</TableHead>
                  <TableHead className="w-16 text-right font-mono text-[10px] uppercase tracking-wider">% OK</TableHead>
                  <TableHead className="w-14 text-right font-mono text-[10px] uppercase tracking-wider">OK</TableHead>
                  <TableHead className="w-16 text-right font-mono text-[10px] uppercase tracking-wider">A vencer</TableHead>
                  <TableHead className="w-16 text-right font-mono text-[10px] uppercase tracking-wider">Vencido</TableHead>
                  <TableHead className="w-16 text-right font-mono text-[10px] uppercase tracking-wider pr-3">Pendente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listaOrdenada.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum treinamento encontrado para o filtro.
                    </TableCell>
                  </TableRow>
                ) : (
                  listaOrdenada.map((t) => {
                    const aberto = expandidos.has(t.nome);
                    const pct = t.total > 0 ? Math.round((t.ok / t.total) * 100) : null;
                    const pctClass =
                      pct === null
                        ? "text-muted-foreground"
                        : pct >= 90
                          ? "text-[#337246]"
                          : pct >= 60
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-red-600 dark:text-red-400 font-semibold";
                    const ghost = "text-muted-foreground/40 font-normal";
                    return (
                      <Fragment key={t.nome}>
                        <TableRow
                          className="cursor-pointer"
                          aria-expanded={aberto}
                          onClick={() => toggle(t.nome)}
                        >
                          <TableCell className="pl-3">
                            <ChevronRight
                              className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform",
                                aberto && "rotate-90",
                              )}
                            />
                          </TableCell>
                          <TableCell className="min-w-0">
                            <span className="block truncate font-semibold text-foreground" title={t.nome}>
                              {t.nome}
                            </span>
                          </TableCell>
                          <TableCell className="w-16 text-right font-mono tabular-nums text-muted-foreground">
                            {t.total}
                          </TableCell>
                          <TableCell className={cn("w-16 text-right font-mono tabular-nums", pctClass)}>
                            {pct === null ? "—" : `${pct}%`}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "w-14 text-right font-mono tabular-nums",
                              t.ok > 0 ? "text-[#337246]" : ghost,
                            )}
                          >
                            {t.ok}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "w-16 text-right font-mono tabular-nums",
                              t.aVencer > 0 ? "text-amber-600 dark:text-amber-400" : ghost,
                            )}
                          >
                            {t.aVencer}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "w-16 text-right font-mono tabular-nums",
                              t.vencido > 0
                                ? "bg-red-500/10 text-red-600 dark:text-red-400 font-semibold"
                                : ghost,
                            )}
                          >
                            {t.vencido}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "w-16 pr-3 text-right font-mono tabular-nums",
                              t.pendente > 0 ? "text-muted-foreground" : ghost,
                            )}
                          >
                            {t.pendente}
                          </TableCell>
                        </TableRow>

                        {aberto && (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={8} className="p-0">
                              <div className="border-t border-border bg-background/40 p-3 space-y-1">
                                {t.membros.length === 0 ? (
                                  <p className="py-2 text-center text-xs text-muted-foreground">
                                    Nenhum colaborador vinculado.
                                  </p>
                                ) : (
                                  t.membros.map((mb, i) => (
                                    <div
                                      key={`${t.nome}-${mb.nome}-${i}`}
                                      className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card/60 px-3 py-2"
                                    >
                                      <span className="text-sm text-foreground/90 truncate" title={mb.nome}>
                                        {mb.nome}
                                      </span>
                                      <div className="flex shrink-0 items-center gap-3">
                                        {mb.data_realizacao && (
                                          <span className="hidden sm:inline text-xs text-muted-foreground tabular-nums">
                                            Realizado: {formatarDataTreino(mb.data_realizacao)}
                                          </span>
                                        )}
                                        {mb.data_validade && (
                                          <span className="hidden sm:inline text-xs text-muted-foreground tabular-nums">
                                            Validade: {formatarDataTreino(mb.data_validade)}
                                          </span>
                                        )}
                                        <span
                                          className={cn(
                                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                            STATUS_PILL[mb.status] ?? STATUS_PILL["Pendente"],
                                          )}
                                        >
                                          {mb.status}
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
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

  const { centroCusto, isReady: filterReady } = useFilter();

  const { data, isLoading, isError, error, refetch } = useQuery<SegurancaDashboardData>({
    queryKey: ["seguranca-dashboard", centroCusto],
    queryFn:  async () => {
      const params = centroCusto ? `?centro_custo=${encodeURIComponent(centroCusto)}` : "";
      const res = await fetch(`/api/seguranca/dashboard${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Erro ${res.status}`);
      }
      return res.json();
    },
    staleTime: 30_000,
    enabled: filterReady,
  });

  // ── KPIs derivados ────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    if (!data) return null;
    const cat       = data.kpiTreinamentoCatalogo;
    const concl     = cat?.ok ?? 0;
    const totalCat  = cat?.totalVinculos ?? 0;
    const aprovados = data.distribuicaoStatusPortal.find((r) => r.label === "Liberado")?.value ?? 0;
    return { total: data.total, concl, totalCat, aprovados };
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

  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading || !data) {
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
                <h1 className="page-title">
                  Gestão a Vista - Segurança
                </h1>
                <p className="text-muted-foreground 2xl:text-lg">
                  FITs, RPV e status de acesso ao portal
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ExportPdfButton targetRef={contentRef} filename="dashboard-seguranca" />
              <SheetUpload
                endpoint="/api/seguranca/fits"
                label="Fazer upload de FITs"
                headerDetectionKeys={["RE", "CPF", "NOME"]}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ["seguranca-dashboard"], type: "all" })}
                variant="outline"
                size="sm"
              />
            </div>
          </div>

          <div ref={contentRef} className="space-y-8">

          {/* KPI Cards — 3 colunas: Total FITs | Treinamentos | Aprovados Portal */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card data-cardtv-id="seguranca-total-fits" className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  Total de FITs
                </CardTitle>
                <ClipboardList className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="big-number text-[40px]">{kpis?.total ?? "—"}</div>
                <p className="text-xs text-muted-foreground">Fichas cadastradas</p>
              </CardContent>
            </Card>

            <Card data-cardtv-id="seguranca-treinamentos-concluidos" className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  Treinamentos OK
                </CardTitle>
                <GraduationCap className="h-4 w-4 text-[#19365b]" />
              </CardHeader>
              <CardContent>
                <div className="big-number text-[40px] text-[#19365b]">
                  {kpis?.concl ?? "—"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {kpis && kpis.totalCat > 0
                    ? `${Math.round((kpis.concl / kpis.totalCat) * 100)}% dos vínculos do catálogo`
                    : "Sem vínculos no catálogo"}
                </p>
              </CardContent>
            </Card>

            <Card data-cardtv-id="seguranca-aprovados-portal" className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                  Aprovados Portal
                </CardTitle>
                <FileCheck2 className="h-4 w-4 text-[#337246]" />
              </CardHeader>
              <CardContent>
                <div className="big-number text-[40px] text-[#337246]">
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
            <Card data-cardtv-id="seguranca-status-portal" className="glass-card">
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
                      config={{
                        Liberado: { label: "Liberado", color: "#337246" },
                        Pendente: { label: "Pendente", color: "#E5CF61" },
                        Bloqueado: { label: "Bloqueado", color: "#e2e2e2" },
                      }}
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
                          label={({ percent }) =>
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
            <Card data-cardtv-id="seguranca-distribuicao-rpv" className="glass-card">
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
                      config={{
                        OK: { label: "OK", color: "#337246" },
                        Pendente: { label: "Pendente", color: "#E5CF61" },
                        "N/A": { label: "N/A", color: "#e2e2e2" },
                      }}
                      className="h-[260px] 2xl:h-[320px] w-full"
                    >
                      <BarChart data={dadosRpv} margin={{ top: 16, right: 40, left: 10, bottom: 10 }}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e2e2e2"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          stroke="#e2e2e2"
                          tick={{ fontSize: 10, fontFamily: "IBM Plex Sans", fontWeight: 300, fill: "#737373" }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#e2e2e2"
                          tick={{ fontSize: 10, fontFamily: "IBM Plex Sans", fontWeight: 300, fill: "#737373" }}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
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
                            className="big-number text-[40px]"
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

          {/* Status de Treinamentos — por curso do catálogo */}
          <TreinamentosStatusCard treinamentos={data.treinamentosPorCurso ?? []} />

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
