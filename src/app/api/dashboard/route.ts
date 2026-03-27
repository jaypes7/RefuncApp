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

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
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

/**
 * Limpa qualquer representação numérica (R$ 1.234,56 → 1234.56).
 */
function cleanNumeric(val: unknown): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (typeof val === "string") {
    const cleaned = val.replace(/[R$\s.]/g, "").replace(",", ".");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

// ============================================================================
// MAPEAMENTO: Supabase (snake_case) → ColaboradorSchema (UPPERCASE)
// ============================================================================

/**
 * Converte as chaves snake_case do Supabase para SCREAMING_SNAKE_CASE e
 * delega ao ColaboradorSchema a validação/transformação dos valores
 * (CPF padding, datas, enums, etc.).
 * Retorna null quando o registro falha na validação.
 */
function parseSupabaseColaborador(row: Record<string, unknown>) {
  const upper = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.toUpperCase(), v]),
  );
  const result = ColaboradorSchema.safeParse(upper);
  return result.success ? result.data : null;
}

type ColaboradorRow = NonNullable<ReturnType<typeof parseSupabaseColaborador>>;

// ============================================================================
// TIPOS INTERNOS
// ============================================================================

interface ConfigDB {
  dataInicio: string | null;
  dataFim: string | null;
  etapas: EtapaConfig[];
  metaAdmissoes: number;
  colaboradoresPrevistos: number;
  orcadoSuprimentos: number;
  feriados: Date[];
}

// ============================================================================
// CURVA S — BASEADA EM PESO PROPORCIONAL DE ETAPAS
// ============================================================================

/**
 * Gera arrays para o AreaChart da Curva S sem valores hardcoded.
 *
 * Planejado (linha azul):
 *   Cada etapa contribui exatamente (dias_etapa / totalDias) × 100 pontos
 *   percentuais ao progresso. O ponto final é sempre 100%.
 *
 * Realizado (linha verde):
 *   Baseado no `percentualConcluido` inserido manualmente pelo supervisor.
 *   Contribuição de cada etapa = (percentualConcluido/100) × (dias_etapa/totalDias) × 100.
 *   A soma acumulada forma a linha de acompanhamento físico.
 *
 * Proteção divisão por zero:
 *   Se não houver etapas cadastradas, retorna arrays vazios.
 */
function gerarCurvaSEtapas(
  dataInicio: string,
  etapas: EtapaConfig[],
): { labels: string[]; planejado: number[]; realizado: number[] } {
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

  // Ponto 0 — início do projeto (progresso = 0%)
  labels.push(fmtLabel(inicio));
  planejado.push(0);
  realizado.push(0);

  let diasAcum = 0;
  let planejadoAcum = 0;
  let realizadoAcum = 0;

  for (const etapa of etapas) {
    diasAcum += etapa.duracaoDias || 0;

    // Data do fim desta etapa
    const pontoDt = new Date(inicio);
    pontoDt.setUTCDate(pontoDt.getUTCDate() + diasAcum);

    // Peso desta etapa no cronograma (%)
    const peso = (etapa.duracaoDias / totalDias) * 100;

    // Planejado: acumula linearmente até 100% na última etapa
    planejadoAcum = Math.min(100, planejadoAcum + peso);

    // Realizado: avanço físico proporcional ao percentual informado
    const pctFisico = etapa.percentualConcluido ?? 0;
    realizadoAcum = Math.min(100, realizadoAcum + (pctFisico / 100) * peso);

    labels.push(fmtLabel(pontoDt));
    planejado.push(Math.round(planejadoAcum * 10) / 10);
    realizado.push(Math.round(realizadoAcum * 10) / 10);
  }

  return { labels, planejado, realizado };
}

// ============================================================================
// FUNÇÕES DE DADOS — SUPABASE
// ============================================================================

/**
 * Busca config + etapas do Supabase em paralelo.
 */
async function getConfig(): Promise<ConfigDB> {
  const supabase = createServerClient();

  const [
    { data: configRow, error: configError },
    { data: etapasRows, error: etapasError },
  ] = await Promise.all([
    supabase.from("configuracoes").select("*").single(),
    supabase.from("etapas").select("*").order("ordem", { ascending: true }),
  ]);

  if (configError && configError.code !== "PGRST116") {
    console.error("[Dashboard] Erro ao buscar config:", configError.message);
  }
  if (etapasError) {
    console.error("[Dashboard] Erro ao buscar etapas:", etapasError.message);
  }

  // Mapeia etapas do Supabase incluindo percentual de avanço físico
  const etapasFinal: EtapaConfig[] = (etapasRows ?? []).map((e, idx) => ({
    id: e.id ?? idx + 1,
    nome: e.nome ?? `Etapa ${idx + 1}`,
    duracaoDias: e.dias ?? 7,
    concluida: e.concluida ?? false,
    percentualConcluido: e.percentual_concluido ?? 0,
  }));

  // meta_admissoes pode nunca ter sido preenchido na rota /api/config/projeto-dados
  // (que não persiste esse campo). Nesse caso, usamos colaboradores_previstos como
  // proxy — semanticamente equivalente: "quantas pessoas planejamos mobilizar".
  const rawMeta       = Number(configRow?.meta_admissoes ?? 0);
  const rawPrevistos  = Number(configRow?.colaboradores_previstos ?? 0);
  const metaAdmissoes = rawMeta > 0 ? rawMeta : rawPrevistos;

  return {
    dataInicio: configRow?.data_inicio_projeto ?? null,
    dataFim: configRow?.data_fim_projeto ?? null,
    etapas: etapasFinal,
    metaAdmissoes,
    colaboradoresPrevistos: rawPrevistos,
    orcadoSuprimentos: Number(configRow?.orcado_suprimentos ?? 0),
    feriados: Array.isArray(configRow?.feriados_projeto)
      ? (configRow.feriados_projeto as string[]).map((d) => new Date(d))
      : [],
  };
}

/**
 * Busca suprimentos do Supabase.
 */
async function getSuprimentos(): Promise<
  Array<{
    ordemCompra: string;
    totalReqPrevistas: number;
    valores: number;
    status: string;
    entregueObra: string;
  }>
> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("suprimentos_ordens").select("*");

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

/**
 * Busca a capacidade dos hotéis cadastrados na tabela `configuracoes_hoteis`.
 * Usado para compor vagasTotais no cálculo de ocupação.
 */
async function getHoteis(): Promise<Array<{ nome: string; vagas_totais: number }>> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("configuracoes_hoteis")
    .select("nome, qt_vagas");
  if (error) {
    console.error("[Dashboard] Erro ao buscar configuracoes_hoteis:", error.message);
    return [];
  }
  return (data ?? []).map((h) => ({
    nome: String(h.nome ?? "").trim(),
    vagas_totais: Number(h.qt_vagas ?? 0),
  }));
}

// ============================================================================
// FUNÇÕES DE AGREGAÇÃO
// ============================================================================

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
  // Conta ocupados por hotel a partir de logistica_controle
  const ocupadas: Record<string, number> = {};
  for (const r of rows) {
    const h = r.hotel?.trim();
    if (h) ocupadas[h] = (ocupadas[h] || 0) + 1;
  }

  // Com configuracoes_hoteis: usa capacidade real para percentual correto
  if (hotelConfigs.length > 0) {
    return hotelConfigs
      .map((h) => {
        const preenchidas = ocupadas[h.nome] ?? 0;
        return {
          hotel:            h.nome,
          vagasTotais:      h.vagas_totais,
          vagasPreenchidas: preenchidas,
          percentual:       h.vagas_totais > 0
            ? Math.round((preenchidas / h.vagas_totais) * 100)
            : 0,
        };
      })
      .sort((a, b) => b.vagasPreenchidas - a.vagasPreenchidas);
  }

  // Fallback sem configurações cadastradas: trata total = preenchidas
  return Object.entries(ocupadas)
    .map(([hotel, preenchidas]) => ({
      hotel,
      vagasTotais:      preenchidas,
      vagasPreenchidas: preenchidas,
      percentual:       100,
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

export async function GET() {
  try {
    await requireAuth();

    const supabase = createServerClient();

    // ── 5 leituras em paralelo (Supabase) ────────────────────────────────────
    const [
      { data: colaboradoresData, error: colabError },
      config,
      suprimentosRows,
      { data: logisticaData },
      hotelConfigs,
    ] = await Promise.all([
      supabase.from("colaboradores").select("*"),
      getConfig(),
      getSuprimentos(),
      supabase.from("logistica_controle").select("turno_trabalho, hotel"),
      getHoteis(),
    ]);
    const logisticaRows = (logisticaData ?? []) as Array<{
      turno_trabalho: string | null;
      hotel: string | null;
    }>;

    if (colabError) {
      throw new Error(`Falha ao buscar colaboradores: ${colabError.message}`);
    }

    // Valida e transforma Supabase rows via ColaboradorSchema; descarta inválidos
    const colaboradores = (colaboradoresData ?? [])
      .map((row) => parseSupabaseColaborador(row as Record<string, unknown>))
      .filter((c): c is ColaboradorRow => c !== null && !!c.CPF && !!c.NOME);

    // ── Métricas principais ──────────────────────────────────────────────────
    const metricas = {
      ...calcularMetricas(colaboradores),
      colaboradoresPrevistos: config.colaboradoresPrevistos,
    };

    const progressoReal = calcularProgressoReal(colaboradores);

    // ── Admissões acumuladas por DATA_ADMISSAO ────────────────────────────────
    // Normaliza para YYYY-MM-DD: Supabase pode retornar timestamps com timezone
    // (ex: "2024-01-15T00:00:00+00:00") que quebrariam a comparação lexicográfica
    // usada em gerarDadosGraficoCurvaS.
    const admissoesPorDia: Record<string, number> = {};
    for (const c of colaboradores) {
      const dataAdm = c.DATA_ADMISSAO
        ? c.DATA_ADMISSAO.split("T")[0]   // garante YYYY-MM-DD
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

    // ── Curva S — peso proporcional por etapa ────────────────────────────────
    // A geração NÃO depende mais de meta_admissoes: usa os dias e o
    // percentual_concluido de cada etapa cadastrada no banco.
    let curvaS = null;
    let statusProjeto = null;

    if (config.dataInicio && config.etapas.length > 0) {
      curvaS = gerarCurvaSEtapas(config.dataInicio, config.etapas);
    }

    // statusProjeto: atraso físico usando último ponto da curva S por etapas
    if (curvaS && curvaS.planejado.length > 0) {
      const lastPlanejado = ([...curvaS.planejado].reverse().find((v) => v != null) ?? 0) as number;
      const lastRealizado = ([...curvaS.realizado].reverse().find((v) => v != null) ?? 0) as number;
      statusProjeto = { ...verificarAtrasoFisico(lastPlanejado, lastRealizado), diasAtraso: 0 };
    }

    // ── Evolução por setor ───────────────────────────────────────────────────
    const total = colaboradores.length || 1;
    const evolucaoPorSetor = {
      rh: {
        total: colaboradores.filter((c) => c.STATUS && c.STATUS !== "Pendente")
          .length,
        percentual: Math.round(
          (colaboradores.filter((c) => c.STATUS && c.STATUS !== "Pendente")
            .length / total) *
            100,
        ),
      },
      logistica: {
        total: colaboradores.filter((c) => c.MOB === "Sim").length,
        percentual: Math.round(
          (colaboradores.filter((c) => c.MOB === "Sim").length / total) * 100,
        ),
      },
      seguranca: {
        total: colaboradores.filter((c) => c.ASO === "Apto").length,
        percentual: Math.round(
          (colaboradores.filter((c) => c.ASO === "Apto").length / total) * 100,
        ),
      },
    };

    // ── Status dos colaboradores ─────────────────────────────────────────────
    const statusCount = {
      Ativo: colaboradores.filter((c) => c.STATUS === "Ativo").length,
      Pendente: colaboradores.filter((c) => c.STATUS === "Pendente").length,
      Inativo: colaboradores.filter((c) => c.STATUS === "Inativo").length,
      Desligado: colaboradores.filter((c) => c.STATUS === "Desligado").length,
    };

    const diasProjeto = config.dataInicio
      ? calcularDiaAtual(config.dataInicio)
      : 0;

    // ── Atraso físico por etapa ──────────────────────────────────────────────
    const hoje = new Date().toISOString().split("T")[0];
    const hojeMs = new Date(hoje + "T00:00:00Z").getTime();

    const pendencias: DashboardData["pendencias"] = [];

    if (config.dataInicio && config.etapas.length > 0) {
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
    }

    pendencias.sort((a, b) => {
      if (a.nivel !== b.nivel) return a.nivel - b.nivel;
      return b.percentualFaltando - a.percentualFaltando;
    });

    // ── Monta resposta ───────────────────────────────────────────────────────
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
