"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CARGOS } from "@/constants/cargos";
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
  ShieldCheck,
  CalendarClock,
  Globe,
} from "lucide-react";
import { dashboardRhApi } from "@/lib/axios";
import { SheetUpload } from "@/components/sheet-upload";
import { useQueryClient } from "@tanstack/react-query";

// ============================================================================
// CHART CONFIGS
// ============================================================================

const configIdades = {
  total: { label: "Colaboradores", color: "#5bc0ec" },
};

const configASO = {
  apto:    { label: "Apto",    color: "#22c55e" },
  inapto:  { label: "Inapto",  color: "#ef4444" },
  pendente:{ label: "Pendente",color: "#f59e0b" },
};

const UF_COLORS = ["#5bc0ec", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444", "#6b7280"];

const configUF = {
  count: { label: "Colaboradores" },
};

// ============================================================================
// HELPERS — cores de término
// ============================================================================

/** Retorna classificação de urgência baseada em comparação de datas (YYYY-MM-DD). */
function urgenciaTermino(termino: string): "vencido" | "proximo" | "normal" {
  const hoje   = new Date().toISOString().split("T")[0];
  if (termino < hoje) return "vencido";
  const em30   = new Date();
  em30.setDate(em30.getDate() + 30);
  const em30Str = em30.toISOString().split("T")[0];
  if (termino <= em30Str) return "proximo";
  return "normal";
}

function classeTermino(urgencia: "vencido" | "proximo" | "normal"): string {
  if (urgencia === "vencido") return "border border-red-500/30 bg-red-500/10";
  if (urgencia === "proximo") return "border border-yellow-500/30 bg-yellow-500/10";
  return "border border-white/5 bg-white/5";
}

function corTextoTermino(urgencia: "vencido" | "proximo" | "normal"): string {
  if (urgencia === "vencido") return "text-red-400";
  if (urgencia === "proximo") return "text-yellow-400";
  return "text-muted-foreground";
}

function formatarData(termino: string): string {
  // termino = YYYY-MM-DD
  const [ano, mes, dia] = termino.split("-");
  return `${dia}/${mes}/${ano}`;
}

// ============================================================================
// CUSTOM TOOLTIP — UF Pie Chart
// ============================================================================

function UfTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { percent: string } }[] }) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: entry } = payload[0];
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-foreground">{name}</p>
      <p className="text-muted-foreground">
        {value} colaboradores &nbsp;·&nbsp; <span className="text-primary font-medium">{entry.percent}%</span>
      </p>
    </div>
  );
}

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
  const router      = useRouter();
  const queryClient = useQueryClient();

  // ── Filtros da seção "Término de Contrato" ────────────────────────────────
  const [filterNome,   setFilterNome]   = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCargo,  setFilterCargo]  = useState("all");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard-rh"],
    queryFn: async () => {
      const res = await dashboardRhApi.get();
      return res.data;
    },
    staleTime: 60_000,
  });

  // ── KPIs RH ───────────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    if (!data?.metricas) return { total: 0, admitidos: 0, pendentes: 0 };
    const { totalCadastrados, totalAdmitidos } = data.metricas;
    return {
      total:     totalCadastrados,
      admitidos: totalAdmitidos,
      pendentes: totalCadastrados - totalAdmitidos,
    };
  }, [data]);

  // ── Faixas etárias ────────────────────────────────────────────────────────

  const dadosIdades = useMemo(
    () => data?.agregacoes?.distribuicaoIdades ?? [],
    [data],
  );

  // ── Número de funções distintas ───────────────────────────────────────────

  const totalFuncoes = data?.agregacoes?.distribuicaoFuncoes?.length ?? 0;

  // ── Dados ASO (Apto / Inapto / Pendente) ──────────────────────────────────

  const dadosASO = useMemo(() => {
    if (!data?.metricas) return [];
    const total     = data.metricas.totalCadastrados || 1;
    const aptoCount = Math.round((data.metricas.percentualASO / 100) * total);
    const inaptoCount   = Math.round(((100 - data.metricas.percentualASO) / 100) * total * 0.2);
    const pendenteCount = total - aptoCount - inaptoCount;
    return [
      { name: "Apto",    value: Math.max(0, aptoCount),    fill: "#22c55e" },
      { name: "Inapto",  value: Math.max(0, inaptoCount),  fill: "#ef4444" },
      { name: "Pendente",value: Math.max(0, pendenteCount),fill: "#f59e0b" },
    ];
  }, [data]);

  // ── Término detalhado — filtrado e agrupado por funcao_clt ──────────────

  const terminoFiltrado = useMemo(() => {
    const lista = data?.agregacoes?.terminoDetalhado ?? [];
    return lista.filter((m) => {
      if (filterNome   && !m.nome?.toLowerCase().includes(filterNome.toLowerCase())) return false;
      if (filterStatus !== "all" && (m as Record<string, unknown>).status !== filterStatus) return false;
      if (filterCargo  !== "all" && m.funcao_clt !== filterCargo) return false;
      return true;
    });
  }, [data, filterNome, filterStatus, filterCargo]);

  const terminoAgrupado = useMemo(() => {
    if (terminoFiltrado.length === 0) return [];
    const grupos = new Map<string, typeof terminoFiltrado>();
    for (const row of terminoFiltrado) {
      const fn = (row.funcao_clt as string) ?? "Não informado";
      if (!grupos.has(fn)) grupos.set(fn, []);
      grupos.get(fn)!.push(row);
    }
    return Array.from(grupos.entries()).map(([funcao, membros]) => ({ funcao, membros }));
  }, [terminoFiltrado]);

  // PieChart: distribuição por UF (top 5 + Outros) — usa lista completa, independe de filtros
  const distribuicaoUF = useMemo(() => {
    const lista = data?.agregacoes?.terminoDetalhado ?? [];
    const contagem = new Map<string, number>();
    for (const row of lista) {
      const r = row as Record<string, string>;
      const rawUf = (r.uf || r.UF || "").trim();
      const uf = rawUf ? rawUf.toUpperCase() : "Não informado";
      contagem.set(uf, (contagem.get(uf) ?? 0) + 1);
    }
    const sorted = Array.from(contagem.entries())
      .map(([uf, count]) => ({ uf, count }))
      .sort((a, b) => b.count - a.count);

    const total = sorted.reduce((acc, s) => acc + s.count, 0) || 1;

    const withColor = (arr: { uf: string; count: number }[], baseIdx = 0) =>
      arr.map((s, i) => ({
        ...s,
        fill: UF_COLORS[(baseIdx + i) % UF_COLORS.length],
        percent: ((s.count / total) * 100).toFixed(1),
      }));

    if (sorted.length <= 5) return withColor(sorted);

    const top5 = withColor(sorted.slice(0, 5));
    const othersCount = sorted.slice(5).reduce((acc, s) => acc + s.count, 0);
    return [
      ...top5,
      { uf: "Outros", count: othersCount, fill: "#6b7280", percent: ((othersCount / total) * 100).toFixed(1) },
    ];
  }, [data]);

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
      (error as { response?: { data?: { error?: string } }; message?: string })
        ?.response?.data?.error ??
      (error as { message?: string })?.message ??
      "Erro desconhecido";

    return (
      <ProtectedRoute>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
          <AlertCircle className="h-16 w-16 text-destructive/50" />
          <p className="text-lg text-muted-foreground">Erro ao carregar dashboard de RH</p>
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
                  Dashboard RH
                </h1>
                <p className="text-muted-foreground 2xl:text-lg">
                  Perfil demográfico e funcional dos colaboradores
                </p>
              </div>
            </div>
            <SheetUpload
              endpoint="/api/rh/colaboradores"
              label="Importar planilha RH"
              onSuccess={() => queryClient.invalidateQueries({ queryKey: ["dashboard-rh"] })}
              variant="outline"
              size="sm"
            />
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
                <p className="text-xs text-muted-foreground">Colaboradores no sistema</p>
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
                <p className="text-xs text-muted-foreground">Com processo concluído</p>
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
                <p className="text-xs text-muted-foreground">Cargos CLT cadastrados</p>
              </CardContent>
            </Card>
          </div>

          {/* Card ASO — Distribuição de Saúde Ocupacional */}
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <CardTitle>Distribuição ASO</CardTitle>
            </CardHeader>
            <CardContent>
              {dadosASO.length === 0 ? (
                <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                  Sem dados de ASO disponíveis
                </div>
              ) : (
                <>
                  <ChartContainer config={configASO} className="h-[260px] 2xl:h-[340px] w-full">
                    <BarChart data={dadosASO} margin={{ top: 20, right: 60, left: 20, bottom: 20 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.1)"
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
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="value" name="Colaboradores" radius={[4, 4, 0, 0]}>
                        {dadosASO.map((entry, i) => (
                          <Cell key={`aso-${i}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {dadosASO.map((s) => (
                      <div
                        key={s.name}
                        className="flex flex-col items-center rounded-lg border border-white/5 bg-white/5 px-3 py-3"
                      >
                        <span className="text-2xl 2xl:text-3xl font-bold" style={{ color: s.fill }}>
                          {s.value}
                        </span>
                        <span className="mt-0.5 text-xs text-muted-foreground">{s.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

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

          {/* Distribuição por UF + Lista de Términos — grid side-by-side */}
          {(data?.agregacoes?.terminoDetalhado?.length ?? 0) > 0 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">

              {/* ── Card: Distribuição por UF ── */}
              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <CardTitle>Distribuição por UF</CardTitle>
                  <span className="text-sm font-normal text-muted-foreground">
                    ({distribuicaoUF.reduce((acc, e) => acc + e.count, 0)} colaboradores)
                  </span>
                </CardHeader>
                <CardContent>
                  {distribuicaoUF.length === 0 ? (
                    <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                      Sem dados de UF disponíveis
                    </div>
                  ) : (
                    <>
                      <ChartContainer config={configUF} className="h-[260px] 2xl:h-[300px] w-full">
                        <PieChart>
                          <Pie
                            data={distribuicaoUF}
                            dataKey="count"
                            nameKey="uf"
                            cx="50%"
                            cy="50%"
                            innerRadius="38%"
                            outerRadius="68%"
                            paddingAngle={2}
                          >
                            {distribuicaoUF.map((entry, i) => (
                              <Cell key={`uf-${i}`} fill={entry.fill} stroke="transparent" />
                            ))}
                          </Pie>
                          <ChartTooltip content={<UfTooltip />} />
                        </PieChart>
                      </ChartContainer>

                      {/* Legend com percentual */}
                      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
                        {distribuicaoUF.map((entry) => (
                          <div key={entry.uf} className="flex items-center gap-2 text-xs min-w-0">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: entry.fill }}
                            />
                            <span className="truncate font-medium text-foreground">{entry.uf}</span>
                            <span className="ml-auto shrink-0 font-semibold tabular-nums">{entry.count}</span>
                            <span className="shrink-0 text-muted-foreground/70">({entry.percent}%)</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* ── Card: Lista de Términos ── */}
              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  <CardTitle>Lista de Términos</CardTitle>
                  <span className="text-sm font-normal text-muted-foreground">
                    ({terminoFiltrado.length} / {data?.agregacoes?.terminoDetalhado?.length ?? 0} colaboradores)
                  </span>
                </CardHeader>
                <CardContent>

                  {/* Filtros */}
                  <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Input
                      placeholder="Buscar por nome..."
                      value={filterNome}
                      onChange={(e) => setFilterNome(e.target.value)}
                      className="glass-input"
                    />
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="glass-input">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="Ativo">Ativo</SelectItem>
                        <SelectItem value="Inativo">Inativo</SelectItem>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Desligado">Desligado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterCargo} onValueChange={setFilterCargo}>
                      <SelectTrigger className="glass-input">
                        <SelectValue placeholder="Cargo" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        <SelectItem value="all">Todos os cargos</SelectItem>
                        {CARGOS.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Legenda de urgência */}
                  <div className="mb-3 flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                      <span className="text-muted-foreground">Vencido</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                      <span className="text-muted-foreground">Vence em até 30 dias</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                      <span className="text-muted-foreground">Vigente</span>
                    </div>
                  </div>

                  {/* Lista agrupada por função com scroll fixo */}
                  <div className="max-h-[420px] 2xl:max-h-[520px] overflow-y-auto space-y-4 pr-1">
                    {terminoAgrupado.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        Nenhum colaborador encontrado para os filtros selecionados.
                      </p>
                    ) : (
                      terminoAgrupado.map(({ funcao, membros }) => (
                        <div key={funcao}>
                          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                            {funcao}
                            <span className="ml-2 font-normal normal-case">({membros.length})</span>
                          </p>
                          <div className="space-y-1">
                            {membros.map((m, i) => {
                              const urg = urgenciaTermino(m.termino);
                              return (
                                <div
                                  key={`${m.nome}-${i}`}
                                  className={`flex items-center justify-between rounded-lg px-3 py-2 ${classeTermino(urg)}`}
                                >
                                  <span className="text-sm 2xl:text-base font-medium truncate max-w-[60%]" title={m.nome}>
                                    {m.nome}
                                  </span>
                                  <span className={`text-xs 2xl:text-sm font-medium tabular-nums ${corTextoTermino(urg)}`}>
                                    {formatarData(m.termino)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

            </div>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}
