/**
 * ============================================================================
 * API: GET /api/dashboard
 * ============================================================================
 *
 * Retorna métricas agregadas para alimentar o dashboard.
 * Todas as leituras de dados vêm do Supabase (Fase 4).
 *
 * Fontes:
 *   • colaboradores      → métricas, gráficos, distribuições
 *   • configuracoes      → datas, meta, orçamento, feriados
 *   • etapas             → curva S e déficit de mobilização
 *   • suprimentos_ordens → KPIs de suprimentos
 *   • logistica_controle → turno de trabalho e ocupação de hotéis
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth, resolveCentroCusto } from "@/lib/auth";
import type { DashboardData } from "@/lib/axios";
import {
  calcularMetricas,
  calcularProgressoReal,
  calcularDiaAtual,
  verificarAtrasoFisico,
} from "@/lib/curva-s";
import { ColaboradorSchema, type EtapaConfig } from "@/lib/schemas";

// ============================================================================
// HELPERS
// ============================================================================

function cleanNumeric(val: unknown): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (typeof val === "string") {
    const cleaned = val.replace(/[R$\s.]/g, "").replace(",", ".");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function parseSupabaseColaborador(row: Record<string, unknown>) {
  const upper = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.toUpperCase(), v]),
  );
  const result = ColaboradorSchema.safeParse(upper);
  return result.success ? result.data : null;
}

type ColaboradorRow = NonNullable<ReturnType<typeof parseSupabaseColaborador>>;

interface ConfigDB {
  dataInicio: string | null;
  dataFim: string | null;
  etapas: EtapaConfig[];
  metaAdmissoes: number;
  colaboradoresPrevistos: number;
  orcadoSuprimentos: number;
  feriados: Date[];
}

type CurvaSResult = {
  labels: string[];
  planejado: number[];
  realizado: number[];
};

function gerarCurvaSEtapas(
  dataInicio: string,
  etapas: EtapaConfig[],
): CurvaSResult {
  const totalDias = etapas.reduce((s, e) => s + (e.duracaoDias || 0), 0);
  if (!dataInicio || totalDias === 0 || etapas.length === 0) {
    return { labels: [], planejado: [], realizado: [] };
  }

  const fmtLabel = (d: Date) =>
    d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "UTC",
    });

  const inicio = new Date(dataInicio + "T00:00:00Z");
  const labels: string[] = [];
  const planejado: number[] = [];
  const realizado: number[] = [];

  labels.push(fmtLabel(inicio));
  planejado.push(0);
  realizado.push(0);

  let diasAcum = 0;
  let planejadoAcum = 0;
  let realizadoAcum = 0;

  for (const etapa of etapas) {
    diasAcum += etapa.duracaoDias || 0;
    const pontoDt = new Date(inicio);
    pontoDt.setUTCDate(pontoDt.getUTCDate() + diasAcum);
    const peso = (etapa.duracaoDias / totalDias) * 100;
    planejadoAcum = Math.min(100, planejadoAcum + peso);
    const pctFisico = etapa.percentualConcluido ?? 0;
    realizadoAcum = Math.min(100, realizadoAcum + (pctFisico / 100) * peso);
    labels.push(fmtLabel(pontoDt));
    planejado.push(Math.round(planejadoAcum * 10) / 10);
    realizado.push(Math.round(realizadoAcum * 10) / 10);
  }

  return { labels, planejado, realizado };
}

function calcularCurvaSMedia(curvas: CurvaSResult[]): CurvaSResult | null {
  if (curvas.length === 0) return null;
  if (curvas.length === 1) return curvas[0];

  const allLabels = Array.from(new Set(curvas.flatMap((c) => c.labels))).sort((a, b) => {
    const [da, ma] = a.split("/");
    const [db, mb] = b.split("/");
    return `${ma}-${da}`.localeCompare(`${mb}-${db}`);
  });

  const planejado: number[] = [];
  const realizado: number[] = [];

  for (const label of allLabels) {
    const pls: number[] = [];
    const res: number[] = [];
    for (const c of curvas) {
      const idx = c.labels.indexOf(label);
      if (idx !== -1) {
        pls.push(c.planejado[idx]);
        res.push(c.realizado[idx]);
      }
    }
    planejado.push(pls.length ? Math.round((pls.reduce((s, v) => s + v, 0) / pls.length) * 10) / 10 : 0);
    realizado.push(res.length ? Math.round((res.reduce((s, v) => s + v, 0) / res.length) * 10) / 10 : 0);
  }

  return { labels: allLabels, planejado, realizado };
}

async function getConfig(centroCusto?: string): Promise<ConfigDB> {
  const supabase = createServerClient();

  const configQuery = centroCusto
    ? supabase.from("configuracoes").select("*").eq("centro_custo", centroCusto).single()
    : supabase.from("configuracoes").select("*");

  const etapasQuery = centroCusto
    ? supabase.from("etapas").select("*").eq("centro_custo", centroCusto).order("ordem", { ascending: true })
    : supabase.from("etapas").select("*").order("ordem", { ascending: true });

  const [
    configResult,
    { data: etapasRows, error: etapasError },
  ] = await Promise.all([configQuery, etapasQuery]);

  const configError = (configResult as { error?: { message: string; code?: string } }).error;
  const configRow = (configResult as { data?: unknown }).data;

  if (configError && configError.code !== "PGRST116") {
    console.error("[Dashboard] Erro ao buscar config:", configError.message);
  }
  if (etapasError) {
    console.error("[Dashboard] Erro ao buscar etapas:", etapasError.message);
  }

  const configsAll = centroCusto
    ? (configRow ? [configRow as Record<string, unknown>] : [])
    : (configRow as Record<string, unknown>[] ?? []);

  const etapasRaw = (etapasRows ?? []) as Array<{
    id?: number;
    nome?: string;
    dias?: number;
    concluida?: boolean;
    percentual_concluido?: number;
    data_inicio?: string;
    data_fim?: string;
    ordem?: number;
    centro_custo?: string;
  }>;

  const etapasPorProjeto = new Map<string, EtapaConfig[]>();
  for (const e of etapasRaw) {
    const cc = String(e.centro_custo ?? "__sem_cc__");
    if (!etapasPorProjeto.has(cc)) etapasPorProjeto.set(cc, []);
    etapasPorProjeto.get(cc)!.push({
      id: e.id ?? 1,
      nome: e.nome ?? `Etapa ${(etapasPorProjeto.get(cc)!.length + 1)}`,
      duracaoDias: e.dias ?? 7,
      concluida: e.concluida ?? false,
      percentualConcluido: e.percentual_concluido ?? 0,
      dataInicio: e.data_inicio ?? undefined,
      dataFim: e.data_fim ?? undefined,
    });
  }

  // Se há centroCusto específico, retorna normalmente
  if (centroCusto) {
    const cfg = configsAll[0] ?? {};
    const rawMeta = Number(cfg.meta_admissoes ?? 0);
    const rawPrev = Number(cfg.colaboradores_previstos ?? 0);
    return {
      dataInicio: (cfg.data_inicio_projeto as string) ?? null,
      dataFim: (cfg.data_fim_projeto as string) ?? null,
      etapas: etapasPorProjeto.get(centroCusto) ?? [],
      metaAdmissoes: rawMeta > 0 ? rawMeta : rawPrev,
      colaboradoresPrevistos: rawPrev,
      orcadoSuprimentos: Number(cfg.orcado_suprimentos ?? 0),
      feriados: Array.isArray(cfg.feriados_projeto)
        ? (cfg.feriados_projeto as string[]).map((d) => new Date(d))
        : [],
    };
  }

  // Agregação "Todos"
  const dataInicio = configsAll.length
    ? configsAll.map((c) => c.data_inicio_projeto as string | null).filter(Boolean).sort()[0] ?? null
    : null;

  const dataFim = configsAll.length
    ? configsAll.map((c) => c.data_fim_projeto as string | null).filter(Boolean).sort().reverse()[0] ?? null
    : null;

  const rawMetaSum = configsAll.reduce((s, c) => s + Number(c.meta_admissoes ?? 0), 0);
  const rawPrevSum = configsAll.reduce((s, c) => s + Number(c.colaboradores_previstos ?? 0), 0);
  const orcadoSum = configsAll.reduce((s, c) => s + Number(c.orcado_suprimentos ?? 0), 0);

  // Concatenar todas as etapas para cálculo de pendências
  const todasEtapas: EtapaConfig[] = [];
  for (const cfg of configsAll) {
    const cc = cfg.centro_custo as string;
    const etapas = etapasPorProjeto.get(cc) ?? [];
    todasEtapas.push(...etapas);
  }

  return {
    dataInicio,
    dataFim,
    etapas: todasEtapas,
    metaAdmissoes: rawMetaSum > 0 ? rawMetaSum : rawPrevSum,
    colaboradoresPrevistos: rawPrevSum,
    orcadoSuprimentos: orcadoSum,
    feriados: [],
  };
}

async function getSuprimentos(centroCusto?: string): Promise<
  Array<{
    ordemCompra: string;
    totalReqPrevistas: number;
    valores: number;
    status: string;
    entregueObra: string;
  }>
> {
  const supabase = createServerClient();
  let query = supabase.from("suprimentos_ordens").select("*");
  if (centroCusto) {
    query = query.eq("centro_custo", centroCusto);
  }
  const { data, error } = await query;

  if (error) {
    console.error("[Dashboard] Erro ao buscar suprimentos:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    ordemCompra: String(row["ordem_compra"] ?? "").trim(),
    totalReqPrevistas: cleanNumeric(row["total_req_previstas"]),
    valores: cleanNumeric(row["valores"]),
    status: String(row["status"] ?? "").trim(),
    entregueObra: String(row["entregue_obra"] ?? "").trim(),
  }));
}

async function getHoteis(centroCusto?: string): Promise<Array<{ nome: string; vagas_totais: number }>> {
  const supabase = createServerClient();
  let query = supabase.from("configuracoes_hoteis").select("nome, qt_vagas");
  if (centroCusto) {
    query = query.eq("centro_custo", centroCusto);
  }
  const { data, error } = await query;
  if (error) {
    console.error("[Dashboard] Erro ao buscar configuracoes_hoteis:", error.message);
    return [];
  }
  return (data ?? []).map((h) => ({
    nome: String(h.nome ?? "").trim(),
    vagas_totais: Number(h.qt_vagas ?? 0),
  }));
}

function agruparPorFuncao(
  colaboradores: ColaboradorRow[],
): DashboardData["agregacoes"]["distribuicaoFuncoes"] {
  const contagem: Record<string, number> = {};
  for (const c of colaboradores) {
    const fn = c.FUNCAO_CLT?.trim();
    if (fn) contagem[fn] = (contagem[fn] || 0) + 1;
  }
  return Object.entries(contagem)
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total);
}

function agruparPorFaixaEtaria(
  colaboradores: ColaboradorRow[],
): DashboardData["agregacoes"]["distribuicaoIdades"] {
  const faixas: Record<string, number> = {
    "18-25": 0,
    "26-35": 0,
    "36-45": 0,
    "46+": 0,
  };
  for (const c of colaboradores) {
    const idade = parseInt(String(c.IDADE || ""), 10);
    if (isNaN(idade) || idade < 18) continue;
    if (idade <= 25) faixas["18-25"]++;
    else if (idade <= 35) faixas["26-35"]++;
    else if (idade <= 45) faixas["36-45"]++;
    else faixas["46+"]++;
  }
  return Object.entries(faixas).map(([faixa, total]) => ({ faixa, total }));
}

function agruparPorUF(
  colaboradores: ColaboradorRow[],
): DashboardData["agregacoes"]["distribuicaoUF"] {
  const contagem: Record<string, number> = {};
  for (const c of colaboradores) {
    const uf = c.UF?.trim();
    if (uf) contagem[uf] = (contagem[uf] || 0) + 1;
  }
  return Object.entries(contagem)
    .map(([uf, total]) => ({ uf, total }))
    .sort((a, b) => b.total - a.total);
}

function agruparPorTurno(
  colaboradores: ColaboradorRow[],
): DashboardData["agregacoes"]["turnoTrabalho"] {
  const contagem: Record<string, number> = {};
  for (const c of colaboradores) {
    const turno = c.turno_trabalho?.trim() || "Não informado";
    contagem[turno] = (contagem[turno] || 0) + 1;
  }
  return Object.entries(contagem)
    .map(([turno, total]) => ({ turno, total }))
    .sort((a, b) => b.total - a.total);
}

function agruparPorMob(
  colaboradores: ColaboradorRow[],
): DashboardData["agregacoes"]["distribuicaoMob"] {
  const contagem: Record<string, number> = {};
  for (const c of colaboradores) {
    const mob = c.MOB?.trim();
    if (mob) contagem[mob] = (contagem[mob] || 0) + 1;
  }
  return Object.entries(contagem)
    .map(([mob, total]) => ({ mob, total }))
    .sort((a, b) => a.mob.localeCompare(b.mob));
}

function agruparTerminoPorFuncao(
  colaboradores: ColaboradorRow[],
): DashboardData["agregacoes"]["terminoPorFuncao"] {
  const contagem: Record<string, number> = {};
  for (const c of colaboradores) {
    if (!c.TERMINO) continue;
    const funcao = c.FUNCAO_CLT?.trim() || "Não informado";
    contagem[funcao] = (contagem[funcao] || 0) + 1;
  }
  return Object.entries(contagem)
    .map(([funcao, total]) => ({ funcao, total }))
    .sort((a, b) => b.total - a.total);
}

function agruparTurnoLogistica(
  rows: Array<{ turno_trabalho: string | null }>,
): DashboardData["agregacoes"]["turnoTrabalho"] {
  const contagem: Record<string, number> = {};
  for (const r of rows) {
    const turno = r.turno_trabalho?.trim() || "Não informado";
    contagem[turno] = (contagem[turno] || 0) + 1;
  }
  return Object.entries(contagem)
    .map(([turno, total]) => ({ turno, total }))
    .sort((a, b) => b.total - a.total);
}

function calcularHoteisLogistica(
  rows: Array<{ hotel: string | null }>,
  hotelConfigs: Array<{ nome: string; vagas_totais: number }>,
): DashboardData["agregacoes"]["vagasHoteis"] {
  const ocupadas: Record<string, number> = {};
  for (const r of rows) {
    const h = r.hotel?.trim();
    if (h) ocupadas[h] = (ocupadas[h] || 0) + 1;
  }

  if (hotelConfigs.length > 0) {
    return hotelConfigs
      .map((h) => {
        const preenchidas = ocupadas[h.nome] ?? 0;
        return {
          hotel: h.nome,
          vagasTotais: h.vagas_totais,
          vagasPreenchidas: preenchidas,
          percentual: h.vagas_totais > 0
            ? Math.round((preenchidas / h.vagas_totais) * 100)
            : 0,
        };
      })
      .sort((a, b) => b.vagasPreenchidas - a.vagasPreenchidas);
  }

  return Object.entries(ocupadas)
    .map(([hotel, preenchidas]) => ({
      hotel,
      vagasTotais: preenchidas,
      vagasPreenchidas: preenchidas,
      percentual: 100,
    }))
    .sort((a, b) => b.vagasPreenchidas - a.vagasPreenchidas);
}

function sumarizarSuprimentos(
  ordens: Awaited<ReturnType<typeof getSuprimentos>>,
  orcado: number,
): DashboardData["agregacoes"]["suprimentos"] {
  const totalInvestido = ordens.reduce((s, o) => s + o.valores, 0);
  const entregues = ordens.filter((o) => o.entregueObra === "Sim").length;

  const statusMap: Record<string, number> = {};
  for (const o of ordens) {
    if (o.status) statusMap[o.status] = (statusMap[o.status] || 0) + 1;
  }
  const distribuicaoStatus = Object.entries(statusMap)
    .map(([status, total]) => ({ status, total }))
    .sort((a, b) => b.total - a.total);

  return {
    totalInvestido: Math.round(totalInvestido * 100) / 100,
    totalOrdens: ordens.length,
    entregues,
    percentualEntregue:
      ordens.length > 0 ? Math.round((entregues / ordens.length) * 100) : 0,
    orcado,
    distribuicaoStatus,
    ordens,
  };
}

// ============================================================================
// GET /api/dashboard
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();

    const { searchParams } = new URL(request.url);
    const ccParam = searchParams.get("centro_custo") || undefined;
    const centroCusto = resolveCentroCusto(currentUser, ccParam);

    const supabase = createServerClient();

    let colabQuery = supabase.from("colaboradores").select("*");
    if (centroCusto) {
      colabQuery = colabQuery.eq("centro_custo", centroCusto);
    }

    let logisticaQuery = supabase.from("logistica_controle").select("turno_trabalho, hotel");
    if (centroCusto) {
      logisticaQuery = logisticaQuery.eq("centro_custo", centroCusto);
    }

    const [
      { data: colaboradoresData, error: colabError },
      config,
      suprimentosRows,
      { data: logisticaData },
      hotelConfigs,
    ] = await Promise.all([
      colabQuery,
      getConfig(centroCusto),
      getSuprimentos(centroCusto),
      logisticaQuery,
      getHoteis(centroCusto),
    ]);
    const logisticaRows = (logisticaData ?? []) as Array<{
      turno_trabalho: string | null;
      hotel: string | null;
    }>;

    if (colabError) {
      throw new Error(`Falha ao buscar colaboradores: ${colabError.message}`);
    }

    const colaboradores = (colaboradoresData ?? [])
      .map((row) => parseSupabaseColaborador(row as Record<string, unknown>))
      .filter((c): c is ColaboradorRow => c !== null && !!c.CPF && !!c.NOME);

    const metricas = {
      ...calcularMetricas(colaboradores),
      colaboradoresPrevistos: config.colaboradoresPrevistos,
    };

    const progressoReal = calcularProgressoReal(colaboradores);

    const admissoesPorDia: Record<string, number> = {};
    for (const c of colaboradores) {
      const dataAdm = c.DATA_ADMISSAO
        ? c.DATA_ADMISSAO.split("T")[0]
        : null;
      if (dataAdm) {
        admissoesPorDia[dataAdm] = (admissoesPorDia[dataAdm] || 0) + 1;
      }
    }

    const admissoesAcumuladas = Object.entries(admissoesPorDia)
      .sort(([a], [b]) => a.localeCompare(b))
      .reduce(
        (acc, [data, count], index) => {
          const anterior = index > 0 ? acc[index - 1].acumulado : 0;
          acc.push({ data, quantidade: count, acumulado: anterior + count });
          return acc;
        },
        [] as Array<{ data: string; quantidade: number; acumulado: number }>,
      );

    // ── Curva S — quando "Todos", calcula média entre projetos ───────────────
    let curvaS = null;
    let statusProjeto = null;

    if (!centroCusto) {
      // Buscar configs e etapas novamente de forma estruturada para curva S média
      const { data: allConfigs } = await supabase.from("configuracoes").select("centro_custo, data_inicio_projeto");
      const { data: allEtapas } = await supabase.from("etapas").select("*").order("ordem", { ascending: true });
      const etapasMap = new Map<string, EtapaConfig[]>();
      for (const e of (allEtapas ?? [])) {
        const cc = String(e.centro_custo ?? "__sem_cc__");
        if (!etapasMap.has(cc)) etapasMap.set(cc, []);
        etapasMap.get(cc)!.push({
          id: e.id ?? 1,
          nome: e.nome ?? `Etapa ${etapasMap.get(cc)!.length + 1}`,
          duracaoDias: e.dias ?? 7,
          concluida: e.concluida ?? false,
          percentualConcluido: e.percentual_concluido ?? 0,
          dataInicio: e.data_inicio ?? undefined,
          dataFim: e.data_fim ?? undefined,
        });
      }
      const curvas: CurvaSResult[] = [];
      for (const cfg of (allConfigs ?? [])) {
        const cc = cfg.centro_custo as string;
        const di = cfg.data_inicio_projeto as string | null;
        if (di && etapasMap.has(cc)) {
          const c = gerarCurvaSEtapas(di, etapasMap.get(cc)!);
          if (c.labels.length) curvas.push(c);
        }
      }
      curvaS = calcularCurvaSMedia(curvas);
    } else if (config.dataInicio && config.etapas.length > 0) {
      curvaS = gerarCurvaSEtapas(config.dataInicio, config.etapas);
    }

    if (curvaS && curvaS.planejado.length > 0) {
      const lastPlanejado = ([...curvaS.planejado].reverse().find((v) => v != null) ?? 0) as number;
      const lastRealizado = ([...curvaS.realizado].reverse().find((v) => v != null) ?? 0) as number;
      statusProjeto = { ...verificarAtrasoFisico(lastPlanejado, lastRealizado), diasAtraso: 0 };
    }

    const total = colaboradores.length || 1;
    const totalMob = colaboradores.filter((c) => c.MOB?.trim()).length;
    const evolucaoPorSetor = {
      rh: {
        total: colaboradores.filter((c) => c.STATUS && c.STATUS !== "Pendente").length,
        percentual: Math.round(
          (colaboradores.filter((c) => c.STATUS && c.STATUS !== "Pendente").length / total) * 100,
        ),
      },
      logistica: {
        total: totalMob,
        percentual: Math.round((totalMob / total) * 100),
      },
      seguranca: {
        total: colaboradores.filter((c) => c.ASO === "Apto").length,
        percentual: Math.round(
          (colaboradores.filter((c) => c.ASO === "Apto").length / total) * 100,
        ),
      },
    };

    const statusCount = {
      Ativo: colaboradores.filter((c) => c.STATUS === "Ativo").length,
      Pendente: colaboradores.filter((c) => c.STATUS === "Pendente").length,
      Inativo: colaboradores.filter((c) => c.STATUS === "Inativo").length,
      Desligado: colaboradores.filter((c) => c.STATUS === "Desligado").length,
    };

    const diasProjeto = config.dataInicio
      ? calcularDiaAtual(config.dataInicio)
      : 0;

    const hoje = new Date().toISOString().split("T")[0];
    const hojeMs = new Date(hoje + "T00:00:00Z").getTime();

    const pendencias: DashboardData["pendencias"] = [];

    if (config.dataInicio && config.etapas.length > 0) {
      if (centroCusto) {
        // Pendências de um único projeto
        const inicioProjetoMs = new Date(config.dataInicio + "T00:00:00Z").getTime();
        let diasAcum = 0;
        for (const etapa of config.etapas) {
          const inicioEtapaDias = diasAcum;
          diasAcum += etapa.duracaoDias || 0;
          const fimEtapaDias = diasAcum;

          const inicioEtapaMs = inicioProjetoMs + inicioEtapaDias * 86400000;
          const fimEtapaMs = inicioProjetoMs + fimEtapaDias * 86400000;
          const fimEtapaStr = new Date(fimEtapaMs).toISOString().split("T")[0];
          const inicioEtapaStr = new Date(inicioEtapaMs).toISOString().split("T")[0];

          if (hoje < inicioEtapaStr) continue;
          if ((etapa.percentualConcluido ?? 0) >= 100) continue;

          const passouPrazo = hoje > fimEtapaStr;
          const diasAtraso = passouPrazo
            ? Math.floor((hojeMs - fimEtapaMs) / 86400000)
            : 0;
          const percentualFaltando = 100 - (etapa.percentualConcluido ?? 0);

          pendencias.push({
            tipo: "etapa",
            nivel: passouPrazo ? 1 : 2,
            cor: passouPrazo ? "red" : "yellow",
            nome: etapa.nome || `Etapa ${etapa.id}`,
            dataLimite: fimEtapaStr,
            diasAtraso,
            percentualFaltando,
            status: passouPrazo ? "Atrasado" : "Em Andamento",
          });
        }
      } else {
        // Pendências de todos os projetos
        const { data: allConfigsPend } = await supabase.from("configuracoes").select("centro_custo, data_inicio_projeto");
        const { data: allEtapasPend } = await supabase.from("etapas").select("*").order("ordem", { ascending: true });
        const etapasMapPend = new Map<string, EtapaConfig[]>();
        for (const e of (allEtapasPend ?? [])) {
          const cc = String(e.centro_custo ?? "__sem_cc__");
          if (!etapasMapPend.has(cc)) etapasMapPend.set(cc, []);
          etapasMapPend.get(cc)!.push({
            id: e.id ?? 1,
            nome: e.nome ?? `Etapa ${etapasMapPend.get(cc)!.length + 1}`,
            duracaoDias: e.dias ?? 7,
            concluida: e.concluida ?? false,
            percentualConcluido: e.percentual_concluido ?? 0,
            dataInicio: e.data_inicio ?? undefined,
            dataFim: e.data_fim ?? undefined,
          });
        }
        for (const cfg of (allConfigsPend ?? [])) {
          const cc = cfg.centro_custo as string;
          const projDataInicio = cfg.data_inicio_projeto as string | null;
          const etapas = etapasMapPend.get(cc) ?? [];
          if (!projDataInicio || etapas.length === 0) continue;
          const inicioProjetoMs = new Date(projDataInicio + "T00:00:00Z").getTime();
          let diasAcum = 0;
          for (const etapa of etapas) {
            const inicioEtapaDias = diasAcum;
            diasAcum += etapa.duracaoDias || 0;
            const fimEtapaDias = diasAcum;
            const inicioEtapaStr = new Date(inicioProjetoMs + inicioEtapaDias * 86400000).toISOString().split("T")[0];
            const fimEtapaMs = inicioProjetoMs + fimEtapaDias * 86400000;
            const fimEtapaStr = new Date(fimEtapaMs).toISOString().split("T")[0];

            if (hoje < inicioEtapaStr) continue;
            if ((etapa.percentualConcluido ?? 0) >= 100) continue;

            const passouPrazo = hoje > fimEtapaStr;
            const diasAtraso = passouPrazo ? Math.floor((hojeMs - fimEtapaMs) / 86400000) : 0;
            const percentualFaltando = 100 - (etapa.percentualConcluido ?? 0);

            pendencias.push({
              tipo: "etapa",
              nivel: passouPrazo ? 1 : 2,
              cor: passouPrazo ? "red" : "yellow",
              nome: `[${cc}] ${etapa.nome || `Etapa ${etapa.id}`}`,
              dataLimite: fimEtapaStr,
              diasAtraso,
              percentualFaltando,
              status: passouPrazo ? "Atrasado" : "Em Andamento",
            });
          }
        }
      }
    }

    pendencias.sort((a, b) => {
      if (a.nivel !== b.nivel) return a.nivel - b.nivel;
      return b.percentualFaltando - a.percentualFaltando;
    });

    const responseData: DashboardData = {
      metricas,
      progresso: {
        real: progressoReal,
        planejado: curvaS?.planejado[curvaS.planejado.length - 1] || 0,
      },
      projeto: {
        dataInicio: config.dataInicio,
        dataFim: config.dataFim,
        diasCorridos: diasProjeto,
        metaAdmissoes: config.metaAdmissoes,
        status: statusProjeto,
      },
      pendencias: pendencias.slice(0, 10),
      graficos: {
        curvaS,
        evolucaoPorSetor,
        admissoesAcumuladas,
        statusCount,
      },
      agregacoes: {
        distribuicaoFuncoes: agruparPorFuncao(colaboradores),
        distribuicaoIdades: agruparPorFaixaEtaria(colaboradores),
        distribuicaoUF: agruparPorUF(colaboradores),
        distribuicaoMob: agruparPorMob(colaboradores),
        turnoTrabalho: agruparTurnoLogistica(logisticaRows),
        terminoPorFuncao: agruparTerminoPorFuncao(colaboradores),
        vagasHoteis: calcularHoteisLogistica(logisticaRows, hotelConfigs),
        suprimentos: sumarizarSuprimentos(
          suprimentosRows,
          config.orcadoSuprimentos,
        ),
      },
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("[Dashboard API] Erro:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
