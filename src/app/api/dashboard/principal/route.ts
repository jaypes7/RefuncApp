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

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth, resolveCentroCusto } from "@/lib/auth";
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

type CurvaSResult = {
  labels: string[];
  planejado: (number | null)[];
  realizado: (number | null)[];
  valoresHoje: { planejado: number; realizado: number } | null;
};

function gerarCurvaSEtapas(
  dataInicio: string,
  dataFim: string | null,
  etapas: EtapaConfig[],
  hojeStr: string,
): CurvaSResult {
  const totalDias = etapas.reduce((s, e) => s + (e.duracaoDias || 0), 0);
  if (!dataInicio || totalDias === 0 || etapas.length === 0) {
    return { labels: [], planejado: [], realizado: [], valoresHoje: null };
  }

  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

  const inicio = new Date(dataInicio + "T00:00:00Z");
  const fim = dataFim ? new Date(dataFim + "T00:00:00Z") : null;
  const labels: string[] = [];
  const planejado: (number | null)[] = [];
  const realizado: (number | null)[] = [];

  let ultimaEtapaComProgresso = -1;
  for (let i = etapas.length - 1; i >= 0; i--) {
    if ((etapas[i].percentualConcluido ?? 0) > 0) {
      ultimaEtapaComProgresso = i;
      break;
    }
  }

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
    pontoDt.setUTCDate(pontoDt.getUTCDate() + diasAcum - 1);

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

    if (i > ultimaEtapaComProgresso && ultimaEtapaComProgresso >= 0) {
      realizado.push(null);
    } else {
      realizado.push(Math.round(reAcum * 10) / 10);
    }

    if (indiceHoje === -1 && pontoDtStr >= hojeStr) {
      indiceHoje = i + 1;
    }
  }

  if (hojeStr < dataInicio) {
    let lastIndex = -1;
    for (let i = realizado.length - 1; i >= 0; i--) {
      if (realizado[i] !== null && realizado[i] !== undefined) {
        lastIndex = i;
        break;
      }
    }

    if (lastIndex > 0) {
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
    valoresHoje = {
      planejado: planejado[planejado.length - 1] ?? 0,
      realizado: realizado[realizado.length - 1] ?? 0,
    };
  }

  return { labels, planejado, realizado, valoresHoje };
}

function calcularCurvaSMedia(curvas: CurvaSResult[]): CurvaSResult | null {
  if (curvas.length === 0) return null;
  if (curvas.length === 1) return curvas[0];

  // Conjunto único de labels ordenado
  const allLabels = Array.from(new Set(curvas.flatMap((c) => c.labels))).sort((a, b) => {
    const [da, ma] = a.split("/");
    const [db, mb] = b.split("/");
    return `${ma}-${da}`.localeCompare(`${mb}-${db}`);
  });

  const planejado: (number | null)[] = [];
  const realizado: (number | null)[] = [];

  for (const label of allLabels) {
    const pls: number[] = [];
    const res: number[] = [];
    for (const c of curvas) {
      const idx = c.labels.indexOf(label);
      if (idx !== -1 && c.planejado[idx] != null) pls.push(c.planejado[idx] as number);
      if (idx !== -1 && c.realizado[idx] != null) res.push(c.realizado[idx] as number);
    }
    planejado.push(pls.length ? Math.round((pls.reduce((s, v) => s + v, 0) / pls.length) * 10) / 10 : null);
    realizado.push(res.length ? Math.round((res.reduce((s, v) => s + v, 0) / res.length) * 10) / 10 : null);
  }

  // valoresHoje: média do último ponto válido de cada curva
  const lastPls = curvas.map((c) => {
    const arr = c.planejado.filter((v): v is number => v != null);
    return arr[arr.length - 1] ?? 0;
  });
  const lastRes = curvas.map((c) => {
    const arr = c.realizado.filter((v): v is number => v != null);
    return arr[arr.length - 1] ?? 0;
  });

  const valoresHoje = {
    planejado: Math.round((lastPls.reduce((s, v) => s + v, 0) / lastPls.length) * 10) / 10,
    realizado: Math.round((lastRes.reduce((s, v) => s + v, 0) / lastRes.length) * 10) / 10,
  };

  return { labels: allLabels, planejado, realizado, valoresHoje };
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

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();

    const { searchParams } = new URL(request.url);
    const ccParam = searchParams.get("centro_custo") || undefined;
    const centroCusto = resolveCentroCusto(currentUser, ccParam);

    const db = createServerClient();

    let colabQuery = db
      .from("colaboradores")
      .select("cpf,nome,status,mob,aso,portal,data_admissao,funcao_clt,treinamento,pre_admissao");
    if (centroCusto) colabQuery = colabQuery.eq("centro_custo", centroCusto);

    const configQuery = centroCusto
      ? db.from("configuracoes").select("*").eq("centro_custo", centroCusto).single()
      : db.from("configuracoes").select("*");

    const etapasQuery = centroCusto
      ? db.from("etapas").select("*").eq("centro_custo", centroCusto).order("ordem", { ascending: true })
      : db.from("etapas").select("*").order("ordem", { ascending: true });

    const [
      { data: colabData, error: colabErr },
      configResult,
      { data: etapasRows, error: etapasErr },
    ] = await Promise.all([
      colabQuery,
      configQuery,
      etapasQuery,
    ]);

    if (colabErr) throw new Error(`Falha ao buscar colaboradores: ${colabErr.message}`);
    if (etapasErr) console.error("[Dashboard/Principal] etapas:", etapasErr.message);

    // ── Configs e Etapas ─────────────────────────────────────────────────────
    const configsAll = (
      centroCusto
        ? (configResult.data ? [configResult.data] : [])
        : (configResult.data ?? [])
    ) as Array<Record<string, unknown>>;

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

    // Agrupar etapas por centro de custo
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

    // ── Curva S ──────────────────────────────────────────────────────────────
    const hoje = new Date().toISOString().split("T")[0];
    let curvaS: CurvaSResult | null = null;
    let statusProjeto: { atrasado: boolean; diasAtraso: number; percentualAtraso: number } | null = null;

    if (configsAll.length > 0) {
      const curvasIndividuais: CurvaSResult[] = [];
      for (const cfg of configsAll) {
        const cc = cfg.centro_custo as string;
        const etapas = etapasPorProjeto.get(cc) ?? [];
        if (cfg.data_inicio_projeto && etapas.length > 0) {
          const c = gerarCurvaSEtapas(
            cfg.data_inicio_projeto as string,
            cfg.data_fim_projeto as string | null,
            etapas,
            hoje,
          );
          if (c.labels.length) curvasIndividuais.push(c);
        }
      }
      curvaS = calcularCurvaSMedia(curvasIndividuais);
    }

    if (curvaS && curvaS.valoresHoje) {
      const { planejado, realizado } = curvaS.valoresHoje;
      statusProjeto = { ...verificarAtrasoFisico(planejado, realizado), diasAtraso: 0 };
    }

    // ── Agregações de configuração ───────────────────────────────────────────
    const dataInicio = configsAll.length
      ? configsAll
          .map((c) => c.data_inicio_projeto as string | null)
          .filter(Boolean)
          .sort()[0] ?? null
      : null;

    const dataFim = configsAll.length
      ? configsAll
          .map((c) => c.data_fim_projeto as string | null)
          .filter(Boolean)
          .sort()
          .reverse()[0] ?? null
      : null;

    const rawMetaSum = configsAll.reduce((s, c) => s + Number(c.meta_admissoes ?? 0), 0);
    const rawPrevSum = configsAll.reduce((s, c) => s + Number(c.colaboradores_previstos ?? 0), 0);
    const metaAdmissoes = rawMetaSum > 0 ? rawMetaSum : rawPrevSum;

    // ── Colaboradores ────────────────────────────────────────────────────────
    const colaboradores = (colabData ?? [])
      .map((r) => mapColab(r as Record<string, unknown>))
      .filter((c) => c.CPF && c.NOME);

    const metricas = {
      ...calcularMetricas(colaboradores),
      colaboradoresPrevistos: rawPrevSum,
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

    const hojeMs = new Date(hoje + "T00:00:00Z").getTime();

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

    for (const cfg of configsAll) {
      const cc = cfg.centro_custo as string;
      const etapas = etapasPorProjeto.get(cc) ?? [];
      const projDataInicio = cfg.data_inicio_projeto as string | null;
      if (!projDataInicio || etapas.length === 0) continue;

      const inicioMs = new Date(projDataInicio + "T00:00:00Z").getTime();
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
          nome: `[${cc}] ${etapa.nome || `Etapa ${etapa.id}`}`,
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

    // Etapas concatenadas para exibição (apenas quando um CC específico)
    const etapasExibicao = centroCusto
      ? (etapasPorProjeto.get(centroCusto) ?? [])
      : [];

    return NextResponse.json({
      metricas,
      projeto: {
        dataInicio,
        dataFim,
        diasCorridos: dataInicio ? calcularDiaAtual(dataInicio) : 0,
        metaAdmissoes,
        status: statusProjeto,
      },
      etapasCount: etapasExibicao.length,
      etapas: etapasExibicao.map((e) => ({
        id: e.id,
        nome: e.nome,
        duracaoDias: e.duracaoDias,
        percentualConcluido: e.percentualConcluido ?? 0,
        concluida: e.concluida ?? false,
        dataInicio: e.dataInicio,
        dataFim: e.dataFim,
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
