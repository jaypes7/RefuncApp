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
  dataFim: string | null,
  etapas: EtapaConfig[],
  hojeStr: string,
): {
  labels: string[];
  planejado: (number | null)[];
  realizado: (number | null)[];
  valoresHoje: { planejado: number; realizado: number } | null;
} {
  const totalDias = etapas.reduce((s, e) => s + (e.duracaoDias || 0), 0);
  if (!dataInicio || totalDias === 0 || etapas.length === 0) {
    return { labels: [], planejado: [], realizado: [], valoresHoje: null };
  }

  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

  const parseDate = (dateStr: string): Date => {
    const [dia, mes] = dateStr.split("/");
    return new Date(`2026-${mes}-${dia}T00:00:00Z`); // Assumindo ano 2026
  };

  const inicio = new Date(dataInicio + "T00:00:00Z");
  const fim = dataFim ? new Date(dataFim + "T00:00:00Z") : null;
  const labels: string[] = [];
  const planejado: (number | null)[] = [];
  const realizado: (number | null)[] = [];

  // Encontrar última etapa com progresso (> 0%)
  let ultimaEtapaComProgresso = -1;
  for (let i = etapas.length - 1; i >= 0; i--) {
    if ((etapas[i].percentualConcluido ?? 0) > 0) {
      ultimaEtapaComProgresso = i;
      break;
    }
  }

  // Ponto inicial (início do projeto = dia 0)
  labels.push(fmt(inicio));
  planejado.push(0);
  realizado.push(0);

  let diasAcum = 0;
  let plAcum = 0;
  let reAcum = 0;
  let valoresHoje: { planejado: number; realizado: number } | null = null;
  let indiceHoje = -1;

  for (let i = 0; i < etapas.length; i++) {
    const etapa = etapas[i];
    diasAcum += etapa.duracaoDias || 0;

    const pontoDt = new Date(inicio);
    // Subtrai 1 porque uma etapa de 1 dia termina no mesmo dia (não no dia seguinte)
    pontoDt.setUTCDate(pontoDt.getUTCDate() + diasAcum - 1);

    // Se for a última etapa e tiver dataFim, usar dataFim para garantir que o gráfico vá até o fim
    let pontoFinalDt: Date;
    if (i === etapas.length - 1 && fim) {
      pontoFinalDt = fim;
    } else {
      pontoFinalDt = pontoDt;
    }

    const pontoDtStr = pontoFinalDt.toISOString().split("T")[0];
    const peso = (etapa.duracaoDias / totalDias) * 100;
    plAcum = Math.min(100, plAcum + peso);

    const pct = etapa.percentualConcluido ?? 0;
    reAcum = Math.min(100, reAcum + (pct / 100) * peso);

    labels.push(fmt(pontoFinalDt));
    planejado.push(Math.round(plAcum * 10) / 10);

    // Realizado: só até a última etapa com progresso
    if (i > ultimaEtapaComProgresso && ultimaEtapaComProgresso >= 0) {
      realizado.push(null);
    } else {
      realizado.push(Math.round(reAcum * 10) / 10);
    }

    // Encontrar índice do dia atual
    if (indiceHoje === -1 && pontoDtStr >= hojeStr) {
      indiceHoje = i + 1; // +1 porque o índice 0 é o ponto inicial
    }
  }

  // Calcular valores para o dia atual ou último dia com progresso
  if (hojeStr < dataInicio) {
    // Projeto ainda não começou, pegar o último índice com valor não-nulo
    let lastIndex = -1;
    for (let i = realizado.length - 1; i >= 0; i--) {
      if (realizado[i] !== null && realizado[i] !== undefined) {
        lastIndex = i;
        break;
      }
    }

    if (lastIndex > 0) {  // > 0 para ignorar o ponto inicial (índice 0)
      valoresHoje = {
        planejado: planejado[lastIndex] ?? 0,
        realizado: realizado[lastIndex] ?? 0,
      };
    } else {
      valoresHoje = { planejado: 0, realizado: 0 };
    }
  } else if (indiceHoje > 0) {
    valoresHoje = {
      planejado: planejado[indiceHoje] ?? planejado[planejado.length - 1] ?? 0,
      realizado: realizado[indiceHoje] ?? realizado[realizado.length - 1] ?? 0,
    };
  } else {
    // Hoje é depois do último ponto
    valoresHoje = {
      planejado: planejado[planejado.length - 1] ?? 0,
      realizado: realizado[realizado.length - 1] ?? 0,
    };
  }

  return { labels, planejado, realizado, valoresHoje };
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

function agruparPorMob(cols: ColabRow[]) {
  const m: Record<string, number> = {};
  for (const c of cols) {
    const mob = c.MOB?.trim();
    if (mob) m[mob] = (m[mob] || 0) + 1;
  }
  return Object.entries(m)
    .map(([mob, total]) => ({ mob, total }))
    .sort((a, b) => a.mob.localeCompare(b.mob));
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
        ? gerarCurvaSEtapas(dataInicio, dataFim, etapas, hoje)
        : null;

    // statusProjeto: atraso físico comparando planejado vs. realizado do DIA ATUAL
    let statusProjeto: { atrasado: boolean; diasAtraso: number; percentualAtraso: number } | null = null;
    if (curvaS && curvaS.valoresHoje) {
      const { planejado, realizado } = curvaS.valoresHoje;
      statusProjeto = { ...verificarAtrasoFisico(planejado, realizado), diasAtraso: 0 };
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
        total: colaboradores.filter((c) => c.MOB?.trim()).length,
        percentual: Math.round(
          (colaboradores.filter((c) => c.MOB?.trim()).length / total) * 100,
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
      etapas: etapas.map((e) => ({
        id: e.id,
        nome: e.nome,
        duracaoDias: e.duracaoDias,
        percentualConcluido: e.percentualConcluido ?? 0,
        concluida: e.concluida ?? false,
      })),
      pendencias: pendencias.slice(0, 10),
      graficos: {
        curvaS,
        evolucaoPorSetor,
        admissoesAcumuladas,
        statusCount,
      },
      agregacoes: {
        distribuicaoFuncoes: agruparPorFuncao(colaboradores),
        distribuicaoMob: agruparPorMob(colaboradores),
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
