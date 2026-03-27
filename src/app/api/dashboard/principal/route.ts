/**
 * ============================================================================
 * API: GET /api/dashboard/principal
 * ============================================================================
 *
 * Métricas gerais do projeto: colaboradores, curva S, pendências.
 *
 * Fontes:
 *   • colaboradores  → métricas, gráficos, distribuição de funções
 *   • configuracoes  → datas, meta, orçamento
 *   • etapas         → curva S e déficit de mobilização
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import {
  calcularMetricas,
  calcularDiaAtual,
  verificarAtrasoFisico,
} from "@/lib/curva-s";
import type { EtapaConfig } from "@/lib/schemas";

// ============================================================================
// HELPERS
// ============================================================================

function toStr(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v);
}

function mapColab(row: Record<string, unknown>) {
  return {
    CPF: row["cpf"] ? String(row["cpf"]).replace(/\D/g, "").padStart(11, "0") : null,
    NOME: toStr(row["nome"]),
    STATUS: toStr(row["status"]),
    MOB: toStr(row["mob"]),
    ASO: toStr(row["aso"]),
    PORTAL: toStr(row["portal"]),
    DATA_ADMISSAO: toStr(row["data_admissao"])?.split("T")[0] ?? null,
    FUNCAO_CLT: toStr(row["funcao_clt"]),
    TREINAMENTO: toStr(row["treinamento"]),
    PRE_ADMISSAO: toStr(row["pre_admissao"]),
  };
}

type ColabRow = ReturnType<typeof mapColab>;

function gerarCurvaSEtapas(
  dataInicio: string,
  etapas: EtapaConfig[],
  hojeStr: string,
): { labels: string[]; planejado: (number | null)[]; realizado: (number | null)[] } {
  const totalDias = etapas.reduce((s, e) => s + (e.duracaoDias || 0), 0);
  if (!dataInicio || totalDias === 0 || etapas.length === 0) {
    return { labels: [], planejado: [], realizado: [] };
  }

  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

  const inicio = new Date(dataInicio + "T00:00:00Z");
  const labels: string[] = [];
  const planejado: (number | null)[] = [];
  const realizado: (number | null)[] = [];

  const futuro = (dateStr: string) => dateStr > hojeStr;

  labels.push(fmt(inicio));
  planejado.push(futuro(dataInicio) ? null : 0);
  realizado.push(futuro(dataInicio) ? null : 0);

  let diasAcum = 0, plAcum = 0, reAcum = 0;
  for (const etapa of etapas) {
    diasAcum += etapa.duracaoDias || 0;
    const pontoDt = new Date(inicio);
    pontoDt.setUTCDate(pontoDt.getUTCDate() + diasAcum);
    const pontoDtStr = pontoDt.toISOString().split("T")[0];
    const peso = (etapa.duracaoDias / totalDias) * 100;
    plAcum = Math.min(100, plAcum + peso);
    const pct = etapa.percentualConcluido ?? 0;
    reAcum = Math.min(100, reAcum + (pct / 100) * peso);
    labels.push(fmt(pontoDt));
    planejado.push(futuro(pontoDtStr) ? null : Math.round(plAcum * 10) / 10);
    realizado.push(futuro(pontoDtStr) ? null : Math.round(reAcum * 10) / 10);
  }

  return { labels, planejado, realizado };
}

function agruparPorFuncao(cols: ColabRow[]) {
  const m: Record<string, number> = {};
  for (const c of cols) {
    const fn = c.FUNCAO_CLT?.trim();
    if (fn) m[fn] = (m[fn] || 0) + 1;
  }
  return Object.entries(m)
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total);
}

// ============================================================================
// GET /api/dashboard/principal
// ============================================================================

export async function GET() {
  try {
    await requireAuth();

    const db = createServerClient();

    const [
      { data: colabData, error: colabErr },
      { data: configRow, error: configErr },
      { data: etapasRows, error: etapasErr },
    ] = await Promise.all([
      db
        .from("colaboradores")
        .select("cpf,nome,status,mob,aso,portal,data_admissao,funcao_clt,treinamento,pre_admissao"),
      db.from("configuracoes").select("*").single(),
      db.from("etapas").select("*").order("ordem", { ascending: true }),
    ]);

    if (colabErr) throw new Error(`Falha ao buscar colaboradores: ${colabErr.message}`);
    if (configErr && configErr.code !== "PGRST116") {
      console.error("[Dashboard/Principal] config:", configErr.message);
    }
    if (etapasErr) console.error("[Dashboard/Principal] etapas:", etapasErr.message);

    // ── Config ──────────────────────────────────────────────────────────────
    const etapas: EtapaConfig[] = (etapasRows ?? []).map((e, idx) => ({
      id: e.id ?? idx + 1,
      nome: e.nome ?? `Etapa ${idx + 1}`,
      duracaoDias: e.dias ?? 7,
      concluida: e.concluida ?? false,
      percentualConcluido: e.percentual_concluido ?? 0,
    }));

    const rawMeta = Number(configRow?.meta_admissoes ?? 0);
    const rawPrev = Number(configRow?.colaboradores_previstos ?? 0);
    const metaAdmissoes = rawMeta > 0 ? rawMeta : rawPrev;
    const dataInicio = configRow?.data_inicio_projeto ?? null;
    const dataFim = configRow?.data_fim_projeto ?? null;

    // ── Colaboradores ────────────────────────────────────────────────────────
    const colaboradores = (colabData ?? [])
      .map((r) => mapColab(r as Record<string, unknown>))
      .filter((c) => c.CPF && c.NOME);

    const metricas = {
      ...calcularMetricas(colaboradores),
      colaboradoresPrevistos: rawPrev,
    };

    // ── Admissões acumuladas ─────────────────────────────────────────────────
    const admsMap: Record<string, number> = {};
    for (const c of colaboradores) {
      if (c.DATA_ADMISSAO) admsMap[c.DATA_ADMISSAO] = (admsMap[c.DATA_ADMISSAO] || 0) + 1;
    }
    const admissoesAcumuladas = Object.entries(admsMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .reduce(
        (acc, [data, count], i) => {
          const anterior = i > 0 ? acc[i - 1].acumulado : 0;
          acc.push({ data, quantidade: count, acumulado: anterior + count });
          return acc;
        },
        [] as Array<{ data: string; quantidade: number; acumulado: number }>,
      );

    const hoje = new Date().toISOString().split("T")[0];
    const hojeMs = new Date(hoje + "T00:00:00Z").getTime();

    // ── Curva S ──────────────────────────────────────────────────────────────
    const curvaS =
      dataInicio && etapas.length > 0
        ? gerarCurvaSEtapas(dataInicio, etapas, hoje)
        : null;

    // statusProjeto: atraso físico comparando último ponto planejado vs. realizado
    let statusProjeto: { atrasado: boolean; diasAtraso: number; percentualAtraso: number } | null = null;
    if (curvaS && curvaS.planejado.length > 0) {
      const lastPlanejado = ([...curvaS.planejado].reverse().find((v) => v != null) ?? 0) as number;
      const lastRealizado = (curvaS.realizado
        ? ([...curvaS.realizado].reverse().find((v) => v != null) ?? 0)
        : 0) as number;
      statusProjeto = { ...verificarAtrasoFisico(lastPlanejado, lastRealizado), diasAtraso: 0 };
    }

    // ── Evolução por setor ───────────────────────────────────────────────────
    const total = colaboradores.length || 1;
    const evolucaoPorSetor = {
      rh: {
        total: colaboradores.filter((c) => c.STATUS && c.STATUS !== "Pendente").length,
        percentual: Math.round(
          (colaboradores.filter((c) => c.STATUS && c.STATUS !== "Pendente").length / total) * 100,
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

    const statusCount = {
      Ativo: colaboradores.filter((c) => c.STATUS === "Ativo").length,
      Pendente: colaboradores.filter((c) => c.STATUS === "Pendente").length,
      Inativo: colaboradores.filter((c) => c.STATUS === "Inativo").length,
      Desligado: colaboradores.filter((c) => c.STATUS === "Desligado").length,
    };

    // ── Atraso físico por etapa ──────────────────────────────────────────────
    const pendencias: Array<{
      tipo: "etapa";
      nivel: 1 | 2;
      cor: "red" | "yellow";
      nome: string;
      dataLimite: string;
      diasAtraso: number;
      percentualFaltando: number;
      status: "Atrasado" | "Em Andamento";
    }> = [];

    if (dataInicio && etapas.length > 0) {
      const inicioMs = new Date(dataInicio + "T00:00:00Z").getTime();
      let diasAcum = 0;
      for (const etapa of etapas) {
        const inicioEtapaDias = diasAcum;
        diasAcum += etapa.duracaoDias || 0;
        const fimEtapaDias = diasAcum;
        const inicioEtapaStr = new Date(inicioMs + inicioEtapaDias * 86400000).toISOString().split("T")[0];
        const fimEtapaMs = inicioMs + fimEtapaDias * 86400000;
        const fimEtapaStr = new Date(fimEtapaMs).toISOString().split("T")[0];

        if (hoje < inicioEtapaStr) continue;
        if ((etapa.percentualConcluido ?? 0) >= 100) continue;

        const passou = hoje > fimEtapaStr;
        const diasAtraso = passou ? Math.floor((hojeMs - fimEtapaMs) / 86400000) : 0;
        const percentualFaltando = 100 - (etapa.percentualConcluido ?? 0);

        pendencias.push({
          tipo: "etapa",
          nivel: passou ? 1 : 2,
          cor: passou ? "red" : "yellow",
          nome: etapa.nome || `Etapa ${etapa.id}`,
          dataLimite: fimEtapaStr,
          diasAtraso,
          percentualFaltando,
          status: passou ? "Atrasado" : "Em Andamento",
        });
      }
    }

    pendencias.sort((a, b) =>
      a.nivel !== b.nivel ? a.nivel - b.nivel : b.percentualFaltando - a.percentualFaltando,
    );

    return NextResponse.json({
      metricas,
      projeto: {
        dataInicio,
        dataFim,
        diasCorridos: dataInicio ? calcularDiaAtual(dataInicio) : 0,
        metaAdmissoes,
        status: statusProjeto,
      },
      etapasCount: etapas.length,
      pendencias: pendencias.slice(0, 10),
      graficos: {
        curvaS,
        evolucaoPorSetor,
        admissoesAcumuladas,
        statusCount,
      },
      agregacoes: {
        distribuicaoFuncoes: agruparPorFuncao(colaboradores),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[GET /api/dashboard/principal]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
