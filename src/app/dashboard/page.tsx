"use client";

import { useMemo, useRef, useState, useEffect } from "react";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceDot,
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
  ChevronDown,
  ChevronUp,
  CalendarClock,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { dashboardPrincipalApi, configApi, ocorrenciasApi, comentariosClienteApi, pendenciasApi, colaboradoresApi, type DashboardPrincipalData, type Ocorrencia, type ComentarioCliente, type PendenciaManual, type Colaborador } from "@/lib/axios";
import { useFilter } from "@/contexts/FilterContext";
import { CanAccess } from "@/components/CanAccess";
import { ExportPdfButton } from "@/components/export-pdf-button";
import { MANSERV_CHART, MANSERV_STATUS, CHART_GRID_COLOR, CHART_AXIS_TICK } from "@/lib/chart-colors";
import { cn } from "@/lib/utils";

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

// ============================================================================
// HELPERS — cores de término
// ============================================================================

/** Retorna classificação de urgência baseada em comparação de datas (YYYY-MM-DD). */
function fmtDate(v: string | undefined | null): string | null {
  if (!v) return null;
  const d = new Date(v + "T00:00:00Z");
  return isNaN(d.getTime()) ? null : d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function isEtapaAtrasada(etapa: DashboardPrincipalData["etapas"][number]): boolean {
  const hojeRealStr = new Date().toISOString().split("T")[0];

  // Caso 1: etapa passou do prazo final e não foi concluída
  if (etapa.dataFim && hojeRealStr > etapa.dataFim && etapa.percentualConcluido < 100) {
    return true;
  }

  // Caso 2: dentro do prazo, mas evolução diária está abaixo do previsto
  if (etapa.evolucaoDiaria && etapa.evolucaoDiaria.length > 0) {
    let lastBeforeToday = -1;
    for (let i = 0; i < etapa.evolucaoDiaria.length; i++) {
      if (etapa.evolucaoDiaria[i].data <= hojeRealStr) lastBeforeToday = i;
      else break;
    }

    if (lastBeforeToday !== -1) {
      const previsto = etapa.evolucaoDiaria[lastBeforeToday].previsto;
      const realizado = etapa.evolucaoDiaria[lastBeforeToday].realizado;
      return realizado < previsto;
    }
  }

  return false;
}

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
// RELATÓRIO POR FUNÇÃO — sub-componentes
// ============================================================================

type StatTone = "ok" | "warn" | "danger" | "info" | "muted";

const TONE_DOT: Record<StatTone, string> = {
  ok: "bg-[#337246]",
  warn: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-blue-500",
  muted: "bg-slate-400",
};

const TONE_TEXT: Record<StatTone, string> = {
  ok: "text-[#337246]",
  warn: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
  info: "text-blue-600 dark:text-blue-400",
  muted: "text-muted-foreground",
};

function StatCategory({
  label,
  items,
}: {
  label: string;
  items: Array<{ label: string; value: number; tone: StatTone }>;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
        {label}
      </p>
      <div className="space-y-1">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-1.5">
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", TONE_DOT[it.tone])} />
            <span className="text-foreground/80 truncate">{it.label}</span>
            <span className={cn("ml-auto font-semibold tabular-nums", TONE_TEXT[it.tone])}>
              {it.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
  okIf,
  dangerIf,
}: {
  label: string;
  value: string | null | undefined;
  okIf?: string[] | null;
  dangerIf?: string[];
}) {
  const v = value?.toString().trim();
  let tone: StatTone = "warn";
  if (!v) {
    tone = "warn";
  } else if (dangerIf?.includes(v)) {
    tone = "danger";
  } else if (okIf === null || (okIf && okIf.includes(v))) {
    tone = "ok";
  } else {
    tone = "info";
  }
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", TONE_DOT[tone])} />
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className={cn("truncate font-medium", TONE_TEXT[tone])}>
        {v || "Pendente"}
      </span>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function DashboardPage() {
  const contentRef = useRef<HTMLDivElement>(null);
  const evolucaoTimelineRef = useRef<HTMLDivElement>(null);
  const { centroCusto, isReady: filterReady } = useFilter();

  // Busca dados da API
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard-principal", centroCusto],
    queryFn: async () => {
      const response = await dashboardPrincipalApi.get(centroCusto);
      return response.data;
    },
    retry: 2,
    staleTime: 0,
    enabled: filterReady,
  });

  // Busca configurações do projeto para o card de cabeçalho
  const { data: configData } = useQuery({
    queryKey: ["config", centroCusto],
    queryFn: async () => {
      const response = await configApi.get(centroCusto);
      return response.data.data;
    },
    staleTime: 60000,
    enabled: filterReady,
  });

  const dashboardData: DashboardPrincipalData | undefined = data;

  // Busca todos os colaboradores para a lista de funções (inclui contratos indeterminados)
  const { data: colaboradoresData } = useQuery({
    queryKey: ["colaboradores", centroCusto],
    queryFn: async () => {
      const first = await colaboradoresApi.listar({
        centro_custo: centroCusto || undefined,
        limit: 100,
        page: 1,
      });
      const all = [...first.data.data];
      const totalPages = first.data.pagination.totalPages;
      if (totalPages > 1) {
        const promises = [];
        for (let p = 2; p <= totalPages; p++) {
          promises.push(
            colaboradoresApi.listar({
              centro_custo: centroCusto || undefined,
              limit: 100,
              page: p,
            })
          );
        }
        const rest = await Promise.all(promises);
        for (const r of rest) {
          all.push(...r.data.data);
        }
      }
      return { data: all, pagination: first.data.pagination };
    },
    enabled: filterReady,
    staleTime: 0,
  });

  // Estado para seleção de dia previsto por etapa (cards de etapas)
  const [selectedDayPerEtapa, setSelectedDayPerEtapa] = useState<Record<number, string>>({});
  const [selectedCurvaDayIdx, setSelectedCurvaDayIdx] = useState<number>(-1);

  // Grupos de etapas no dashboard
  const [collapsedDashboardGrupos, setCollapsedDashboardGrupos] = useState<Set<number>>(new Set());

  const toggleDashboardGrupo = (id: number) =>
    setCollapsedDashboardGrupos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const etapasPorGrupo = useMemo(() => {
    if (!dashboardData?.etapas || !configData?.GRUPOS_ETAPAS?.length) return null;
    const grupos = [...configData.GRUPOS_ETAPAS].sort((a, b) => a.ordem - b.ordem);
    const grupoIdMap = new Map<number, number | null>();
    for (const e of configData.ETAPAS_PROJETO ?? []) {
      grupoIdMap.set(e.id, e.grupoId ?? null);
    }
    const byGrupo = new Map<number | null, typeof dashboardData.etapas>();
    for (const etapa of dashboardData.etapas) {
      const gId = grupoIdMap.get(etapa.id) ?? null;
      if (!byGrupo.has(gId)) byGrupo.set(gId, []);
      byGrupo.get(gId)!.push(etapa);
    }
    return { grupos, byGrupo };
  }, [dashboardData, configData]);

  // ── Lista de Funções — agrupada por funcao_clt ──────────────────────────
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [filterNomeFuncoes, setFilterNomeFuncoes] = useState("");

  const toggleGroup = (funcao: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(funcao)) next.delete(funcao);
      else next.add(funcao);
      return next;
    });
  };

  const terminoAgrupado = useMemo(() => {
    const lista = dashboardData?.agregacoes?.terminoDetalhado ?? [];
    if (lista.length === 0) return [];
    const grupos = new Map<string, typeof lista>();
    for (const row of lista) {
      const fn = (row.funcao_clt as string) ?? "Não informado";
      if (!grupos.has(fn)) grupos.set(fn, []);
      grupos.get(fn)!.push(row);
    }
    return Array.from(grupos.entries()).map(([funcao, membros]) => ({ funcao, membros }));
  }, [dashboardData]);

  // ── Lista de Funções — agrupada por FUNCAO_CLT (todos os colaboradores) ───
  const funcoesAgrupado = useMemo(() => {
    const lista = colaboradoresData?.data ?? [];
    if (lista.length === 0) return [];
    const filtrada = filterNomeFuncoes
      ? lista.filter((row) => (row.NOME as string)?.toLowerCase().includes(filterNomeFuncoes.toLowerCase()))
      : lista;
    const grupos = new Map<string, Colaborador[]>();
    for (const row of filtrada) {
      const fn = row.FUNCAO_CLT ?? "Não informado";
      if (!grupos.has(fn)) grupos.set(fn, []);
      grupos.get(fn)!.push(row);
    }
    return Array.from(grupos.entries()).map(([funcao, membros]) => ({ funcao, membros }));
  }, [colaboradoresData, filterNomeFuncoes]);

  // ── Relatório por Função — agregação de status + detalhamento ─────────────
  const [expandedFuncoes, setExpandedFuncoes] = useState<Set<string>>(new Set());
  const [expandedRelatorio, setExpandedRelatorio] = useState<Set<string>>(new Set());
  const [filterRelatorio, setFilterRelatorio] = useState("");

  const toggleFuncao = (funcao: string) => {
    setExpandedFuncoes((prev) => {
      const next = new Set(prev);
      if (next.has(funcao)) {
        next.delete(funcao);
        // also collapse individual details when collapsing the group
        setExpandedRelatorio((r) => { const nr = new Set(r); nr.delete(funcao); return nr; });
      } else next.add(funcao);
      return next;
    });
  };

  const toggleRelatorio = (funcao: string) => {
    setExpandedRelatorio((prev) => {
      const next = new Set(prev);
      if (next.has(funcao)) next.delete(funcao);
      else next.add(funcao);
      return next;
    });
  };

  const relatorioPorFuncao = useMemo(() => {
    const lista = colaboradoresData?.data ?? [];
    if (lista.length === 0) return [];
    const filtrada = filterRelatorio
      ? lista.filter((c) =>
          (c.FUNCAO_CLT ?? "Não informado")
            .toLowerCase()
            .includes(filterRelatorio.toLowerCase()),
        )
      : lista;
    const grupos = new Map<string, Colaborador[]>();
    for (const row of filtrada) {
      const fn = row.FUNCAO_CLT ?? "Não informado";
      if (!grupos.has(fn)) grupos.set(fn, []);
      grupos.get(fn)!.push(row);
    }
    return Array.from(grupos.entries())
      .map(([funcao, membros]) => {
        const stats = {
          aso: { apto: 0, inapto: 0, pendente: 0 },
          mob: { ok: 0, pendente: 0 },
          docs: { completo: 0, incompleto: 0, pendente: 0 },
          exame: { realizado: 0, agendado: 0, pendente: 0 },
          portal: { liberado: 0, bloqueado: 0, pendente: 0 },
          treinamento: { concluido: 0, andamento: 0, pendente: 0 },
          cracha: { emitido: 0, pendente: 0 },
          ponto: { cadastrado: 0, pendente: 0 },
        };
        for (const c of membros) {
          if (c.ASO === "Apto") stats.aso.apto++;
          else if (c.ASO === "Inapto") stats.aso.inapto++;
          else stats.aso.pendente++;

          if (c.MOB?.trim()) stats.mob.ok++;
          else stats.mob.pendente++;

          if (c.DOCS === "Completo") stats.docs.completo++;
          else if (c.DOCS === "Incompleto") stats.docs.incompleto++;
          else stats.docs.pendente++;

          if (c.EXAME === "Realizado") stats.exame.realizado++;
          else if (c.EXAME === "Agendado") stats.exame.agendado++;
          else stats.exame.pendente++;

          if (c.PORTAL === "Liberado") stats.portal.liberado++;
          else if (c.PORTAL === "Bloqueado") stats.portal.bloqueado++;
          else stats.portal.pendente++;

          if (c.TREINAMENTO === "Concluído") stats.treinamento.concluido++;
          else if (c.TREINAMENTO === "Em Andamento") stats.treinamento.andamento++;
          else stats.treinamento.pendente++;

          if (c.CRACHA === "Emitido") stats.cracha.emitido++;
          else stats.cracha.pendente++;

          if (c.PONTO === "Cadastrado") stats.ponto.cadastrado++;
          else stats.ponto.pendente++;
        }
        return { funcao, membros, stats };
      })
      .sort((a, b) => b.membros.length - a.membros.length);
  }, [colaboradoresData, filterRelatorio]);

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
    enabled: filterReady,
  });
  const ocorrencias: Ocorrencia[] = ocorrenciasData ?? [];

  const criarOcorrencia = useMutation({
    mutationFn: () => ocorrenciasApi.criar({ texto: novoTexto.trim(), data: novaData, centro_custo: centroCusto || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ocorrencias", centroCusto], type: "all" });
      setNovoTexto("");
      setNovaData("");
    },
  });

  const deletarOcorrencia = useMutation({
    mutationFn: (id: number) => ocorrenciasApi.deletar(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ocorrencias", centroCusto], type: "all" }),
  });

  const atualizarOcorrencia = useMutation({
    mutationFn: ({ id, texto, data }: { id: number; texto: string; data: string }) =>
      ocorrenciasApi.atualizar(id, { texto: texto.trim(), data, centro_custo: centroCusto || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ocorrencias", centroCusto], type: "all" });
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
    enabled: filterReady,
  });
  const comentarios: ComentarioCliente[] = comentariosData ?? [];

  const criarComentario = useMutation({
    mutationFn: () => comentariosClienteApi.criar({ texto: novoComentario.trim(), data: novaDataComentario, centro_custo: centroCusto || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comentarios-cliente", centroCusto], type: "all" });
      setNovoComentario("");
      setNovaDataComentario("");
    },
  });

  const deletarComentario = useMutation({
    mutationFn: (id: number) => comentariosClienteApi.deletar(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comentarios-cliente", centroCusto], type: "all" }),
  });

  const atualizarComentario = useMutation({
    mutationFn: ({ id, texto, data }: { id: number; texto: string; data: string }) =>
      comentariosClienteApi.atualizar(id, { texto: texto.trim(), data, centro_custo: centroCusto || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comentarios-cliente", centroCusto], type: "all" });
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

  // ── Pendências manuais ───────────────────────────────────────────────────────
  const [painelPendenciasAberto, setPainelPendenciasAberto] = useState(false);
  const [novoTextoPendencia, setNovoTextoPendencia] = useState("");

  const { data: pendenciasData } = useQuery({
    queryKey: ["pendencias-manuais", centroCusto],
    queryFn: async () => (await pendenciasApi.listar(centroCusto)).data.data,
    staleTime: 30_000,
    enabled: filterReady,
  });
  const pendenciasManuais = useMemo<PendenciaManual[]>(() => pendenciasData ?? [], [pendenciasData]);

  const criarPendencia = useMutation({
    mutationFn: () =>
      pendenciasApi.criar({ texto: novoTextoPendencia.trim(), centro_custo: centroCusto || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendencias-manuais", centroCusto], type: "all" });
      setNovoTextoPendencia("");
    },
  });

  const deletarPendencia = useMutation({
    mutationFn: (id: number) => pendenciasApi.deletar(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pendencias-manuais", centroCusto], type: "all" }),
  });

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

  // Array compartilhado: realizado vira null após o dia selecionado
  const chartDisplayData = useMemo(() => {
    if (selectedCurvaDayIdx < 0) return curveData;
    return curveData.map((d, i) => ({
      ...d,
      realizado: i <= selectedCurvaDayIdx ? d.realizado : null,
    }));
  }, [curveData, selectedCurvaDayIdx]);

  const xAxisTicks = useMemo(() => {
    if (curveData.length === 0) return [];
    const step = Math.max(1, Math.floor(curveData.length / 10));
    const lastIdx = curveData.length - 1;
    const ticks: string[] = [curveData[0].mes];
    for (let i = step; i <= lastIdx - step; i += step) {
      ticks.push(curveData[i].mes);
    }
    ticks.push(curveData[lastIdx].mes);
    return ticks;
  }, [curveData]);

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

  // Coordenadas do ponto selecionado no gráfico
  const pontoSelecionado = useMemo(() => {
    if (selectedCurvaDayIdx < 0 || curveData.length === 0) return null;
    const dia = curveData[selectedCurvaDayIdx];
    if (!dia || dia.realizado == null) return null;
    return { x: dia.mes, y: dia.realizado };
  }, [curveData, selectedCurvaDayIdx]);

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

  // Cálculos dos KPIs
  const kpis = useMemo(() => {
    const etapasAtrasadas = dashboardData?.etapas?.filter((e) => isEtapaAtrasada(e)).length ?? 0;
    const totalPendencias = etapasAtrasadas + pendenciasManuais.length;

    if (!dashboardData?.metricas) {
      return {
        total: 0,
        asoPercentual: 0,
        pendenciasSetoriais: totalPendencias,
        etapasAtrasadas,
      };
    }

    return {
      total: dashboardData.metricas.totalCadastrados,
      asoPercentual: dashboardData.metricas.percentualASO,
      pendenciasSetoriais: totalPendencias,
      etapasAtrasadas,
    };
  }, [dashboardData, pendenciasManuais]);

  if (isLoading || !data) {
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
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </Button>
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
              <Card
                className={cn(
                  "glass-card transition-colors",
                  kpis.pendenciasSetoriais > 0 && "border-[#FFB800]/60 bg-[#FFB800]/10"
                )}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
                    Pontos de atenção
                  </CardTitle>
                  <AlertCircle
                    className={cn(
                      "h-4 w-4",
                      kpis.pendenciasSetoriais > 0 ? "text-[#FFB800]" : "text-destructive"
                    )}
                  />
                </CardHeader>
                <CardContent>
                  <div
                    className="big-number text-[40px]"
                    style={{
                      color: kpis.pendenciasSetoriais > 0 ? "#FFB800" : undefined,
                    }}
                  >
                    {kpis.pendenciasSetoriais}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Etapas atrasadas + Pendências
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                      onClick={() => setPainelPendenciasAberto((v) => !v)}
                    >
                      {painelPendenciasAberto ? (
                        <>
                          Ocultar <ChevronUp className="h-3 w-3 ml-1" />
                        </>
                      ) : (
                        <>
                          Ver detalhes <ChevronDown className="h-3 w-3 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>

                  {painelPendenciasAberto && (
                    <div className="mt-3 space-y-3 border-t border-border/30 pt-3">
                      {/* Etapas atrasadas */}
                      {kpis.etapasAtrasadas > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-1.5">
                            Etapas atrasadas
                          </p>
                          <div className="space-y-1">
                            {dashboardData?.etapas
                              ?.filter((e) => isEtapaAtrasada(e))
                              .map((etapa) => (
                                <div
                                  key={etapa.id}
                                  className="flex items-center gap-2 text-xs text-[#FFB800]"
                                >
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{etapa.nome}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Pendências manuais */}
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-1.5">
                          Pendências manuais
                        </p>
                        {pendenciasManuais.length === 0 ? (
                          <p className="text-xs text-muted-foreground/60 italic">
                            Nenhuma pendência manual registrada
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {pendenciasManuais.map((p) => (
                              <div
                                key={p.id}
                                className="flex items-start justify-between gap-2 rounded-md border border-white/5 bg-white/5 px-2 py-1.5"
                              >
                                <span className="text-xs break-words leading-relaxed">{p.texto}</span>
                                <CanAccess role="user">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-5 w-5 text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
                                    onClick={() => deletarPendencia.mutate(p.id)}
                                    disabled={deletarPendencia.isPending}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </CanAccess>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Formulário de adicionar */}
                        <CanAccess role="user">
                          <div className="flex gap-2 mt-2">
                            <Input
                              className="glass-input h-8 text-xs flex-1"
                              placeholder="Nova pendência..."
                              value={novoTextoPendencia}
                              onChange={(e) => setNovoTextoPendencia(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && novoTextoPendencia.trim() && !criarPendencia.isPending) {
                                  criarPendencia.mutate();
                                }
                              }}
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              disabled={!novoTextoPendencia.trim() || criarPendencia.isPending}
                              onClick={() => criarPendencia.mutate()}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </CanAccess>
                      </div>
                    </div>
                  )}
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
                              {curveData.length > 0 && (
                                <select
                                  value={selectedCurvaDayIdx}
                                  onChange={(e) => setSelectedCurvaDayIdx(Number(e.target.value))}
                                  className="text-[10px] uppercase tracking-wide rounded px-1 py-0.5 border border-border bg-background text-muted-foreground font-medium"
                                >
                                  <option value={-1}>Diário</option>
                                  {curveData.map((d, i) => (
                                    <option key={i} value={i}>{d.mes}</option>
                                  ))}
                                </select>
                              )}
                              <span className="text-xs text-muted-foreground">
                                Plan:{" "}
                                <span className="font-semibold text-foreground">
                                  {(() => {
                                    if (selectedCurvaDayIdx >= 0) {
                                      const dia = curveData[selectedCurvaDayIdx];
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
                                        const dia = curveData[selectedCurvaDayIdx];
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
                                      const dia = curveData[selectedCurvaDayIdx];
                                      const v = dia?.realizado;
                                      if (v != null) return `${(v as number).toFixed(1)}%`;
                                      return "-";
                                    }
                                    return temProgressoReal ? `${indicadorCurvaS.diario.realizado.toFixed(1)}%` : "-";
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
                            data={chartDisplayData}
                            margin={{ top: 20, right: 60, left: 20, bottom: 20 }}
                          >
                            <defs>
                              <linearGradient
                                id="gradientAdmitidos"
                                x1="0" y1="0" x2="0" y2="1"
                              >
                                <stop offset="5%" stopColor="#DA291B" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#DA291B" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient
                                id="gradientMeta"
                                x1="0" y1="0" x2="0" y2="1"
                              >
                                <stop offset="5%" stopColor="#e2e2e2" stopOpacity={0.12} />
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
                              ticks={xAxisTicks}
                              interval={0}
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
                                  previsto?: number;
                                  realizado?: number;
                                };
                                return (
                                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                                    <p className="text-xs text-muted-foreground">{label}</p>
                                    <p className="text-xs">
                                      Planejado:{" "}
                                      <span className="font-semibold">
                                        {p.previsto?.toFixed(1) ?? 0}%
                                      </span>
                                    </p>
                                    <p className="text-xs">
                                      Realizado:{" "}
                                      <span className="font-semibold">
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

                            {pontoSelecionado && (
                              <ReferenceDot
                                x={pontoSelecionado.x}
                                y={pontoSelecionado.y}
                                r={6}
                                fill="#DA291B"
                                stroke="#fff"
                                strokeWidth={2}
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
                    <div className="flex items-center justify-center gap-4 mb-4 text-lg text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-4 rounded-full bg-blue-500" />
                        <span>Previsto</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-4 rounded-full bg-[#DA291B]" />
                        <span>Realizado</span>
                      </div>
                    </div>
                    {(() => {
                      const hojeRealStr = new Date().toISOString().split("T")[0];

                      const renderEtapaCard = (etapa: DashboardPrincipalData["etapas"][number]) => {
                        let previstoEtapa = 0;
                        let realizadoEtapa = 0;

                        if (etapa.evolucaoDiaria && etapa.evolucaoDiaria.length > 0) {
                          let todayIdx = -1;
                          for (let i = 0; i < etapa.evolucaoDiaria.length; i++) {
                            if (etapa.evolucaoDiaria[i].data <= hojeRealStr) todayIdx = i;
                            else break;
                          }
                          if (todayIdx !== -1) {
                            previstoEtapa = etapa.evolucaoDiaria[todayIdx].previsto;
                            realizadoEtapa = etapa.evolucaoDiaria[todayIdx].realizado;
                          }
                        } else {
                          if ((etapa.dataFim && hojeRealStr >= etapa.dataFim) || etapa.concluida || etapa.percentualConcluido >= 100) {
                            previstoEtapa = etapa.percentualConcluido ?? 0;
                            realizadoEtapa = etapa.percentualConcluido ?? 0;
                          }
                        }

                        const selectedDia = selectedDayPerEtapa[etapa.id] ?? "";
                        const selectedDayData = selectedDia
                          ? etapa.evolucaoDiaria?.find((d) => d.data === selectedDia)
                          : undefined;
                        const displayPrevisto = selectedDayData != null ? selectedDayData.previsto : previstoEtapa;
                        const displayRealizado = selectedDayData != null ? selectedDayData.realizado : realizadoEtapa;

                        return (
                          <div key={etapa.id} className="flex flex-col gap-2 rounded-lg border border-border bg-muted/50 p-4">
                            <span className="text-sm font-semibold">{etapa.nome}</span>
                            {(etapa.dataInicio || etapa.dataFim) && (
                              <div className="text-xs text-muted-foreground">
                                {fmtDate(etapa.dataInicio) ?? "—"} - {fmtDate(etapa.dataFim) ?? "—"}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {etapa.duracaoDias} dia{etapa.duracaoDias !== 1 ? "s" : ""} trabalhado{etapa.duracaoDias !== 1 ? "s" : ""}
                            </div>
                            {etapa.evolucaoDiaria && etapa.evolucaoDiaria.length > 0 && (
                              <select
                                value={selectedDia}
                                onChange={(e) =>
                                  setSelectedDayPerEtapa((prev) => ({ ...prev, [etapa.id]: e.target.value }))
                                }
                                className="text-xs rounded-md px-2 py-1 border border-border bg-background text-foreground"
                              >
                                <option value="">Previsto hoje</option>
                                {etapa.evolucaoDiaria.map((d) => {
                                  const diaMes = new Date(d.data + "T00:00:00Z").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
                                  const diaSemana = new Date(d.data + "T00:00:00Z").toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" });
                                  return <option key={d.data} value={d.data}>{diaMes} ({diaSemana})</option>;
                                })}
                              </select>
                            )}
                            <div className="mt-2 space-y-1">
                              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(100, displayPrevisto)}%` }} />
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full bg-[#DA291B] transition-all" style={{ width: `${Math.min(100, displayRealizado)}%` }} />
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground text-center mt-1">
                              Previsto: {displayPrevisto}%
                              <span className="mx-1">·</span>
                              Realizado: {displayRealizado}%
                            </div>
                          </div>
                        );
                      };

                      if (etapasPorGrupo) {
                        const semGrupo = etapasPorGrupo.byGrupo.get(null) ?? [];
                        return (
                          <div className="space-y-6">
                            {etapasPorGrupo.grupos.map((grupo) => {
                              const etapasDoGrupo = etapasPorGrupo.byGrupo.get(grupo.id) ?? [];
                              const isCollapsed = collapsedDashboardGrupos.has(grupo.id);
                              return (
                                <div key={grupo.id} className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
                                  <button
                                    type="button"
                                    onClick={() => toggleDashboardGrupo(grupo.id)}
                                    className="flex w-full items-center gap-2 text-left"
                                  >
                                    <ChevronDown className={`w-4 h-4 text-primary transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`} />
                                    <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                                    <span className="font-semibold text-foreground flex-1">{grupo.nome}</span>
                                    <span className="text-xs text-muted-foreground">{etapasDoGrupo.length} etapa(s)</span>
                                  </button>
                                  {!isCollapsed && (
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                      {etapasDoGrupo.map(renderEtapaCard)}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {semGrupo.length > 0 && (
                              <div className="space-y-3">
                                <p className="text-sm font-medium text-muted-foreground">Sem grupo</p>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                  {semGrupo.map(renderEtapaCard)}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {dashboardData.etapas.map(renderEtapaCard)}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── Status Contratual + Lista de Términos — grid side-by-side ── */}
            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
              {/* Card Status Contratação */}
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

              {/* Card Lista de Funções */}
              <Card className="glass-card h-[480px] 2xl:h-[520px]">
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  <CardTitle>Lista de Funções</CardTitle>
                  <span className="text-sm font-normal text-muted-foreground">
                    ({funcoesAgrupado.reduce((acc, g) => acc + g.membros.length, 0)} colaboradores)
                  </span>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 overflow-hidden">
                  <Input
                    placeholder="Pesquisa avançada"
                    value={filterNomeFuncoes}
                    onChange={(e) => setFilterNomeFuncoes(e.target.value)}
                    className="mb-3 h-8 text-sm"
                  />
                  {/* Lista agrupada por função com scroll fixo */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
                    {funcoesAgrupado.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        Nenhum colaborador encontrado.
                      </p>
                    ) : (
                      funcoesAgrupado.map(({ funcao, membros }) => {
                        const isOpen = expandedGroups.has(funcao);
                        return (
                          <div key={funcao} className="rounded-lg border border-white/5 bg-white/5">
                            <button
                              type="button"
                              onClick={() => toggleGroup(funcao)}
                              className="flex w-full items-center justify-between px-3 py-2 text-left"
                            >
                              <span className="text-xs font-bold uppercase tracking-wider text-black">
                                {funcao}
                                <span className="ml-2 font-bold normal-case">({membros.length})</span>
                              </span>
                              {isOpen ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                            {isOpen && (
                              <div className="space-y-1 px-3 pb-2">
                                {membros.map((m, i) => (
                                  <div
                                    key={`${m.NOME}-${i}`}
                                    className="flex items-center justify-between rounded-md px-3 py-2 border border-white/5 bg-white/5"
                                  >
                                    <span className="text-sm 2xl:text-base font-medium truncate max-w-[60%]" title={m.NOME}>
                                      {m.NOME}
                                    </span>
                                    <span className="text-xs 2xl:text-sm font-bold tabular-nums text-muted-foreground">
                                      {m.FUNCAO_CLT ?? "Não informado"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Relatório por Função ── */}
            {relatorioPorFuncao.length > 0 && (
              <div className="mb-6">
                <Card className="glass-card">
                  <CardHeader className="flex flex-row items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <CardTitle>Relatório por Função</CardTitle>
                    <span className="text-sm font-normal text-muted-foreground">
                      ({relatorioPorFuncao.reduce((acc, g) => acc + g.membros.length, 0)} colaboradores em {relatorioPorFuncao.length} {relatorioPorFuncao.length === 1 ? "função" : "funções"})
                    </span>
                  </CardHeader>
                  <CardContent>
                    <Input
                      placeholder="Filtrar por função..."
                      value={filterRelatorio}
                      onChange={(e) => setFilterRelatorio(e.target.value)}
                      className="mb-4 max-w-md"
                    />
                    <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                      {relatorioPorFuncao.map(({ funcao, membros, stats }) => {
                        const grupoAberto = expandedFuncoes.has(funcao);
                        const expanded = expandedRelatorio.has(funcao);
                        return (
                          <div
                            key={funcao}
                            className="rounded-lg border border-border bg-card/40 overflow-hidden"
                          >
                            <button
                              type="button"
                              className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                              onClick={() => toggleFuncao(funcao)}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {grupoAberto ? (
                                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                )}
                                <span className="font-semibold text-foreground truncate">{funcao}</span>
                                <span className="shrink-0 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                  {membros.length} {membros.length === 1 ? "colaborador" : "colaboradores"}
                                </span>
                              </div>
                            </button>

                            {grupoAberto && (
                              <>
                            {/* Status agregados */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 p-3 text-xs">
                              <StatCategory
                                label="ASO"
                                items={[
                                  { label: "Apto", value: stats.aso.apto, tone: "ok" },
                                  { label: "Inapto", value: stats.aso.inapto, tone: "danger" },
                                  { label: "Pendente", value: stats.aso.pendente, tone: "warn" },
                                ]}
                              />
                              <StatCategory
                                label="MOB"
                                items={[
                                  { label: "OK", value: stats.mob.ok, tone: "ok" },
                                  { label: "Pendente", value: stats.mob.pendente, tone: "warn" },
                                ]}
                              />
                              <StatCategory
                                label="Documentação"
                                items={[
                                  { label: "Completo", value: stats.docs.completo, tone: "ok" },
                                  { label: "Incompleto", value: stats.docs.incompleto, tone: "danger" },
                                  { label: "Pendente", value: stats.docs.pendente, tone: "warn" },
                                ]}
                              />
                              <StatCategory
                                label="Exame"
                                items={[
                                  { label: "Realizado", value: stats.exame.realizado, tone: "ok" },
                                  { label: "Agendado", value: stats.exame.agendado, tone: "info" },
                                  { label: "Pendente", value: stats.exame.pendente, tone: "warn" },
                                ]}
                              />
                              <StatCategory
                                label="Portal"
                                items={[
                                  { label: "Liberado", value: stats.portal.liberado, tone: "ok" },
                                  { label: "Bloqueado", value: stats.portal.bloqueado, tone: "danger" },
                                  { label: "Pendente", value: stats.portal.pendente, tone: "warn" },
                                ]}
                              />
                              <StatCategory
                                label="Treinamento"
                                items={[
                                  { label: "Concluído", value: stats.treinamento.concluido, tone: "ok" },
                                  { label: "Em Andamento", value: stats.treinamento.andamento, tone: "info" },
                                  { label: "Pendente", value: stats.treinamento.pendente, tone: "warn" },
                                ]}
                              />
                              <StatCategory
                                label="Crachá"
                                items={[
                                  { label: "Emitido", value: stats.cracha.emitido, tone: "ok" },
                                  { label: "Pendente", value: stats.cracha.pendente, tone: "warn" },
                                ]}
                              />
                              <StatCategory
                                label="Ponto"
                                items={[
                                  { label: "Cadastrado", value: stats.ponto.cadastrado, tone: "ok" },
                                  { label: "Pendente", value: stats.ponto.pendente, tone: "warn" },
                                ]}
                              />
                            </div>

                            {/* Ver mais detalhes toggle */}
                            <div className="flex justify-end px-3 pb-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-xs h-7"
                                onClick={() => toggleRelatorio(funcao)}
                              >
                                {expanded ? (
                                  <>
                                    <ChevronUp className="h-3.5 w-3.5" />
                                    Ocultar detalhes
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-3.5 w-3.5" />
                                    Ver mais detalhes
                                  </>
                                )}
                              </Button>
                            </div>

                            {/* Detalhes individuais */}
                            {expanded && (
                              <div className="border-t border-border bg-background/40 p-3 space-y-2">
                                {membros.map((c) => (
                                  <div
                                    key={c.id ?? `${c.CPF}-${c.NOME}`}
                                    className="rounded-md border border-border/60 bg-card/60 p-3"
                                  >
                                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-2">
                                      <span className="font-medium text-sm text-foreground">
                                        {c.NOME}
                                      </span>
                                      {c.RE && (
                                        <span className="font-mono text-xs text-muted-foreground">
                                          RE {c.RE}
                                        </span>
                                      )}
                                      {c.STATUS && (
                                        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                                          {c.STATUS}
                                        </span>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-1 text-xs">
                                      <DetailField label="ASO" value={c.ASO} okIf={["Apto"]} dangerIf={["Inapto"]} />
                                      <DetailField label="MOB" value={c.MOB?.trim() || null} okIf={null} />
                                      <DetailField label="Docs" value={c.DOCS} okIf={["Completo"]} dangerIf={["Incompleto"]} />
                                      <DetailField label="Exame" value={c.EXAME} okIf={["Realizado"]} />
                                      <DetailField label="Portal" value={c.PORTAL} okIf={["Liberado"]} dangerIf={["Bloqueado"]} />
                                      <DetailField label="Treinamento" value={c.TREINAMENTO} okIf={["Concluído"]} />
                                      <DetailField label="Crachá" value={c.CRACHA} okIf={["Emitido"]} />
                                      <DetailField label="Ponto" value={c.PONTO} okIf={["Cadastrado"]} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
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
