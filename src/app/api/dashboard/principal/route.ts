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
import { getNationalHolidays } from "@/lib/date-utils";

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
    TERMINO: toStr(row["termino"])?.split("T")[0] ?? null,
    PRORROGACAO: toStr(row["prorrogacao"])?.split("T")[0] ?? null,
    UF: toStr(row["uf"]),
  };
}

type ColabRow = ReturnType<typeof mapColab>;

type DetalhesDia = {
  etapaId: number;
  etapaNome: string;
  planejadoEtapa: number;
  realizadoEtapa: number;
  mediaPlanejadoEtapas: number;
  mediaRealizadoEtapas: number;
};

type CurvaSResult = {
  labels: string[];
  planejado: (number | null)[];
  realizado: (number | null)[];
  detalhes: DetalhesDia[];
  valoresHoje: {
    diario: { planejado: number; realizado: number } | null;
    etapas: { planejado: number; realizado: number } | null;
  } | null;
};

type ProgressoDiarioRow = {
  etapa_id: number;
  data: string;      // YYYY-MM-DD
  percentual: number;
};

/**
 * Calcula o progresso global planejado em uma data específica, com base nas
 * datas reais de início/fim de cada etapa (interpolação linear dentro da etapa).
 *
 * Fallback para o modo legado (baseado em duracaoDias) se as etapas não tiverem datas.
 */
function contarDiasTrabalhadosNoIntervalo(
  dataInicio: string,
  dataFim: string,
  diasTrabalhados: string[],
): number {
  let count = 0;
  for (const d of diasTrabalhados) {
    if (d >= dataInicio && d <= dataFim) count++;
  }
  return count;
}

function calcularPlanejadoNaData(
  dateStr: string,
  etapas: EtapaConfig[],
  totalDias: number,
  dataInicioProjeto: string,
  diasTrabalhados: string[] = [],
): number {
  // Verifica se todas as etapas têm datas configuradas
  const todasComDatas = etapas.every((e) => e.dataInicio && e.dataFim);

  if (todasComDatas) {
    let plAcum = 0;
    for (const etapa of etapas) {
      const peso = (etapa.duracaoDias / totalDias) * 100;
      const ini = etapa.dataInicio!;
      const fim = etapa.dataFim!;

      if (dateStr < ini) {
        // Ainda não começou esta etapa
        continue;
      } else if (dateStr >= fim) {
        // Etapa totalmente planejada
        plAcum += peso;
      } else {
        // Dentro da etapa: interpolação linear proporcional aos dias decorridos
        let diasDecorridos: number;
        let totalDiasEtapa: number;
        if (diasTrabalhados.length > 0) {
          diasDecorridos = contarDiasTrabalhadosNoIntervalo(ini, dateStr, diasTrabalhados);
          totalDiasEtapa = contarDiasTrabalhadosNoIntervalo(ini, fim, diasTrabalhados);
        } else {
          const MS_PER_DAY = 86_400_000;
          const iniMs = new Date(ini + "T00:00:00Z").getTime();
          const fimMs = new Date(fim + "T00:00:00Z").getTime();
          const curMs = new Date(dateStr + "T00:00:00Z").getTime();
          diasDecorridos = (curMs - iniMs) / MS_PER_DAY + 1;
          totalDiasEtapa = (fimMs - iniMs) / MS_PER_DAY + 1;
        }
        const frac = totalDiasEtapa > 0 ? Math.max(0, Math.min(1, diasDecorridos / totalDiasEtapa)) : 0;
        plAcum += frac * peso;
      }
    }
    return Math.min(100, Math.round(plAcum * 10) / 10);
  }

  // Fallback legado: posiciona os pontos com base na duração acumulada
  const inicio = new Date(dataInicioProjeto + "T00:00:00Z");
  let diasAcum = 0;
  let plAcum = 0;
  for (const etapa of etapas) {
    const diasAntes = diasAcum;
    diasAcum += etapa.duracaoDias || 0;
    const peso = (etapa.duracaoDias / totalDias) * 100;

    const fimEtapaDt = new Date(inicio);
    fimEtapaDt.setUTCDate(fimEtapaDt.getUTCDate() + diasAcum - 1);
    const fimEtapaStr = fimEtapaDt.toISOString().split("T")[0];

    const iniEtapaDt = new Date(inicio);
    iniEtapaDt.setUTCDate(iniEtapaDt.getUTCDate() + diasAntes);
    const iniEtapaStr = iniEtapaDt.toISOString().split("T")[0];

    if (dateStr < iniEtapaStr) continue;
    if (dateStr >= fimEtapaStr) {
      plAcum += peso;
    } else {
      let diasDecorridos: number;
      let totalDiasEtapa: number;
      if (diasTrabalhados.length > 0) {
        diasDecorridos = contarDiasTrabalhadosNoIntervalo(iniEtapaStr, dateStr, diasTrabalhados);
        totalDiasEtapa = contarDiasTrabalhadosNoIntervalo(iniEtapaStr, fimEtapaStr, diasTrabalhados);
      } else {
        const MS_PER_DAY = 86_400_000;
        const iniMs = iniEtapaDt.getTime();
        const fimMs = fimEtapaDt.getTime();
        const curMs = new Date(dateStr + "T00:00:00Z").getTime();
        diasDecorridos = (curMs - iniMs) / MS_PER_DAY + 1;
        totalDiasEtapa = (fimMs - iniMs) / MS_PER_DAY + 1;
      }
      const frac = totalDiasEtapa > 0 ? Math.max(0, Math.min(1, diasDecorridos / totalDiasEtapa)) : 0;
      plAcum += frac * peso;
    }
  }
  return Math.min(100, Math.round(plAcum * 10) / 10);
}

/**
 * Calcula o progresso global REALIZADO em uma data específica, usando os
 * dados de progresso diário (etapas_progresso_diario).
 *
 * Para cada etapa, pega o ÚLTIMO registro com data ≤ dateStr e usa esse
 * percentual ponderado pelo peso da etapa no total do projeto.
 *
 * Retorna null se não houver nenhum registro diário preenchido até dateStr.
 */
function calcularRealizadoNaData(
  dateStr: string,
  etapas: EtapaConfig[],
  totalDias: number,
  progressoDiario: ProgressoDiarioRow[],
): number | null {
  let reAcum = 0;
  let temAlgumDado = false;

  for (const etapa of etapas) {
    const peso = (etapa.duracaoDias / totalDias) * 100;

    // Soma de TODOS os incrementos diários desta etapa até dateStr
    // (cada entrada representa o progresso daquele dia, não o total)
    const registros = progressoDiario
      .filter((r) => r.etapa_id === etapa.id && r.data <= dateStr && r.data >= (etapa.dataInicio ?? ""));

    if (registros.length > 0) {
      const soma = registros.reduce((s, r) => s + r.percentual, 0);
      reAcum += (Math.min(100, soma) / 100) * peso;
      temAlgumDado = true;
    }
  }

  return temAlgumDado ? Math.min(100, Math.round(reAcum * 10) / 10) : null;
}

/**
 * Calcula o progresso global REALIZADO suavizado para o gráfico.
 * Distribui o percentual real acumulado de cada etapa linearmente ao longo
 * de seus dias (mesma forma geométrica do planejado), criando uma curva
 * contínua que acompanha o planejado proporcionalmente.
 */
function calcularRealizadoSuavizadoNaData(
  dateStr: string,
  etapas: EtapaConfig[],
  totalDias: number,
  progressoDiario: ProgressoDiarioRow[],
  diasTrabalhados: string[] = [],
): number | null {
  let reAcum = 0;
  let temAlgumDado = false;

  for (const etapa of etapas) {
    const peso = (etapa.duracaoDias / totalDias) * 100;
    const ini = etapa.dataInicio;
    const fim = etapa.dataFim;

    if (!ini || !fim) continue;

    const registros = progressoDiario.filter((r) => r.etapa_id === etapa.id && r.data <= dateStr && r.data >= ini);
    const pctRealAteAgora = Math.min(100, registros.reduce((s, r) => s + r.percentual, 0));
    if (registros.length > 0) temAlgumDado = true;

    if (dateStr < ini) {
      continue;
    } else if (dateStr >= fim) {
      // Etapa encerrada: contribuição proporcional ao realizado físico total
      reAcum += (pctRealAteAgora / 100) * peso;
    } else {
      let diasDecorridos: number;
      let totalDiasEtapa: number;
      if (diasTrabalhados.length > 0) {
        diasDecorridos = contarDiasTrabalhadosNoIntervalo(ini, dateStr, diasTrabalhados);
        totalDiasEtapa = contarDiasTrabalhadosNoIntervalo(ini, fim, diasTrabalhados);
      } else {
        const MS_PER_DAY = 86_400_000;
        const iniMs = new Date(ini + "T00:00:00Z").getTime();
        const fimMs = new Date(fim + "T00:00:00Z").getTime();
        const curMs = new Date(dateStr + "T00:00:00Z").getTime();
        diasDecorridos = (curMs - iniMs) / MS_PER_DAY + 1;
        totalDiasEtapa = (fimMs - iniMs) / MS_PER_DAY + 1;
      }
      const fracTempo = totalDiasEtapa > 0 ? Math.max(0, Math.min(1, diasDecorridos / totalDiasEtapa)) : 0;
      const planejadoEtapaAteData = fracTempo * 100;

      if (planejadoEtapaAteData > 0) {
        const fatorRitmo = pctRealAteAgora / planejadoEtapaAteData;
        reAcum += peso * fracTempo * fatorRitmo;
      }
    }
  }

  return temAlgumDado ? Math.min(100, Math.round(reAcum * 10) / 10) : null;
}

function gerarDiasTrabalhadosFallback(dataInicio: string, dataFim: string): string[] {
  const inicio = new Date(dataInicio + "T00:00:00Z");
  const fim = new Date(dataFim + "T00:00:00Z");
  const dias: string[] = [];

  const startYear = inicio.getUTCFullYear();
  const endYear = fim.getUTCFullYear();
  const holidays = new Set<string>();
  for (let year = startYear; year <= endYear; year++) {
    for (const h of getNationalHolidays(year)) {
      holidays.add(h);
    }
  }

  const MS_PER_DAY = 86_400_000;
  let current = inicio.getTime();
  const endTime = fim.getTime();

  while (current <= endTime) {
    const d = new Date(current);
    const dow = d.getUTCDay();
    const iso = d.toISOString().split("T")[0];
    if (dow !== 0 && dow !== 6 && !holidays.has(iso)) {
      dias.push(iso);
    }
    current += MS_PER_DAY;
  }

  return dias;
}

function gerarCurvaSEtapas(
  dataInicio: string,
  dataFim: string | null,
  etapas: EtapaConfig[],
  hojeStr: string,
  progressoDiario: ProgressoDiarioRow[],
  diasTrabalhados: string[] = [],
): CurvaSResult {
  const totalDias = etapas.reduce((s, e) => s + (e.duracaoDias || 0), 0);
  if (!dataInicio || totalDias === 0 || etapas.length === 0) {
    return { labels: [], planejado: [], realizado: [], detalhes: [], valoresHoje: null };
  }
  if (etapas.some((e) => !e.dataInicio || !e.dataFim)) {
    return { labels: [], planejado: [], realizado: [], detalhes: [], valoresHoje: null };
  }

  const fmt = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00Z");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
  };

  const fim = dataFim ? dataFim : hojeStr;

  // Determina o conjunto de dias trabalhados a serem plotados
  let diasPlot: string[];
  if (diasTrabalhados && diasTrabalhados.length > 0) {
    diasPlot = [...diasTrabalhados]
      .filter((d) => d >= dataInicio && d <= fim)
      .sort((a, b) => a.localeCompare(b));
  } else {
    diasPlot = gerarDiasTrabalhadosFallback(dataInicio, fim);
  }

  if (diasPlot.length === 0) {
    return { labels: [], planejado: [], realizado: [], detalhes: [], valoresHoje: null };
  }

  // Data do último registro diário (apenas registros com progresso real > 0)
  const progressoReal = progressoDiario.filter((r) => r.percentual > 0);
  const ultimaDataComDado = progressoReal.length > 0
    ? progressoReal.map((r) => r.data).sort().reverse()[0]
    : null;

  const labels: string[] = [];
  const planejado: (number | null)[] = [];
  const realizado: (number | null)[] = [];
  const detalhes: DetalhesDia[] = [];

  const MS_PER_DAY = 86_400_000;

  // Limite até onde o realizado é calculado: sempre respeita a data base
  // selecionada (hojeStr). Isso garante que o gráfico nunca exiba dados além
  // da data de referência escolhida pelo usuário.
  const limiteRealizado = hojeStr;

  for (const dateStr of diasPlot) {
    labels.push(fmt(dateStr));
    planejado.push(calcularPlanejadoNaData(dateStr, etapas, totalDias, dataInicio, diasTrabalhados));

    if (dateStr > limiteRealizado) {
      realizado.push(null);
    } else {
      realizado.push(calcularRealizadoSuavizadoNaData(dateStr, etapas, totalDias, progressoDiario, diasTrabalhados));
    }

    // Identifica TODAS as etapas ativas neste dia
    const etapasAtivas = etapas.filter(
      (e) => e.dataInicio && e.dataFim && dateStr >= e.dataInicio && dateStr <= e.dataFim,
    );

    // Fallback quando nenhuma etapa está ativa no dia
    let etapaAtiva: EtapaConfig | undefined;
    if (etapasAtivas.length > 0) {
      etapaAtiva = etapasAtivas[0];
    } else {
      const etapasIniciadas = etapas.filter((e) => e.dataInicio && dateStr >= e.dataInicio);
      etapaAtiva = etapasIniciadas.length > 0 ? etapasIniciadas[etapasIniciadas.length - 1] : etapas[0];
    }

    // Calcula planejado/realizado de uma etapa específica (para tooltip do gráfico)
    function calcularPlanejadoEtapa(etapa: EtapaConfig, data: string): number {
      if (!etapa.dataInicio || !etapa.dataFim) return etapa.percentualConcluido ?? 0;
      let diaDentro: number;
      let totalDiasEtapa: number;
      if (diasTrabalhados.length > 0) {
        diaDentro = contarDiasTrabalhadosNoIntervalo(etapa.dataInicio, data, diasTrabalhados);
        totalDiasEtapa = contarDiasTrabalhadosNoIntervalo(etapa.dataInicio, etapa.dataFim, diasTrabalhados);
      } else {
        const iniMs = new Date(etapa.dataInicio + "T00:00:00Z").getTime();
        const fimMs = new Date(etapa.dataFim + "T00:00:00Z").getTime();
        const curMs = new Date(data + "T00:00:00Z").getTime();
        diaDentro = (curMs - iniMs) / MS_PER_DAY + 1;
        totalDiasEtapa = (fimMs - iniMs) / MS_PER_DAY + 1;
      }
      return totalDiasEtapa > 0
        ? Math.min(100, Math.round((diaDentro / totalDiasEtapa) * 1000) / 10)
        : 0;
    }

    function calcularRealizadoEtapa(etapa: EtapaConfig, data: string): number {
      const registros = progressoDiario.filter((r) => r.etapa_id === etapa.id && r.data <= data);
      return Math.min(100, Math.round(registros.reduce((s, r) => s + r.percentual, 0) * 10) / 10);
    }

    let planejadoEtapa = 0;
    let realizadoEtapa = 0;
    let mediaPlanejadoEtapas = 0;
    let mediaRealizadoEtapas = 0;

    if (etapaAtiva) {
      if (etapaAtiva.dataInicio && etapaAtiva.dataFim) {
        planejadoEtapa = calcularPlanejadoEtapa(etapaAtiva, dateStr);
        realizadoEtapa = calcularRealizadoEtapa(etapaAtiva, dateStr);
      } else {
        planejadoEtapa = etapaAtiva.percentualConcluido ?? 0;
        realizadoEtapa = etapaAtiva.percentualConcluido ?? 0;
      }
    }

    // Média de TODAS as etapas ativas no dia
    if (etapasAtivas.length > 0) {
      let somaPl = 0;
      let somaRe = 0;
      for (const etapa of etapasAtivas) {
        if (etapa.dataInicio && etapa.dataFim) {
          somaPl += calcularPlanejadoEtapa(etapa, dateStr);
          somaRe += calcularRealizadoEtapa(etapa, dateStr);
        } else {
          somaPl += etapa.percentualConcluido ?? 0;
          somaRe += etapa.percentualConcluido ?? 0;
        }
      }
      mediaPlanejadoEtapas = Math.round((somaPl / etapasAtivas.length) * 10) / 10;
      mediaRealizadoEtapas = Math.round((somaRe / etapasAtivas.length) * 10) / 10;
    } else if (etapaAtiva) {
      mediaPlanejadoEtapas = planejadoEtapa;
      mediaRealizadoEtapas = realizadoEtapa;
    }

    detalhes.push({
      etapaId: etapaAtiva?.id ?? 0,
      etapaNome: etapaAtiva?.nome ?? "—",
      planejadoEtapa,
      realizadoEtapa,
      mediaPlanejadoEtapas,
      mediaRealizadoEtapas,
    });
  }

  // Data de referência para o indicador: hoje se estiver no projeto
  let dataReferencia = hojeStr;
  if (diasPlot.length > 0 && dataReferencia < diasPlot[0]) {
    dataReferencia = diasPlot[0]; // antes do início → usa primeiro dia
  }
  if (diasPlot.length > 0 && dataReferencia > diasPlot[diasPlot.length - 1]) {
    dataReferencia = diasPlot[diasPlot.length - 1]; // depois do fim → usa último dia
  }
  // Se hoje não for um dia trabalhado, usa o último dia trabalhado <= hoje
  if (!diasPlot.includes(dataReferencia)) {
    const ultimoDiaUtilAteHoje = [...diasPlot].reverse().find((d) => d <= hojeStr);
    if (ultimoDiaUtilAteHoje) {
      dataReferencia = ultimoDiaUtilAteHoje;
    } else if (diasPlot.length > 0) {
      dataReferencia = diasPlot[0];
    }
  }

  // DIÁRIO: indicador padrão (quando nenhum dia está selecionado no SELECT).
  // Sempre reflete o dia atual (hoje). Se hoje não for um dia trabalhado,
  // mostra o último dia trabalhado.
  let dataReferenciaDiaria: string;
  if (diasPlot.includes(hojeStr)) {
    dataReferenciaDiaria = hojeStr;
  } else {
    const ultimoDiaUtilAteHoje = [...diasPlot].reverse().find((d) => d <= hojeStr);
    dataReferenciaDiaria = ultimoDiaUtilAteHoje ?? diasPlot[0] ?? dataInicio;
  }

  const plDiario = calcularPlanejadoNaData(dataReferenciaDiaria, etapas, totalDias, dataInicio, diasTrabalhados);
  const reDiario = ultimaDataComDado
    ? (calcularRealizadoNaData(dataReferenciaDiaria, etapas, totalDias, progressoDiario) ?? 0)
    : 0;

  // ETAPAS: visão acumulada total do projeto (100% planejado vs realizado total)
  // O previsto é sempre 100% porque referencia o projeto como um todo.
  // O realizado é calculado até a data de referência selecionada.
  const reTotal = calcularRealizadoNaData(dataReferenciaDiaria, etapas, totalDias, progressoDiario) ?? 0;

  return {
    labels,
    planejado,
    realizado,
    detalhes,
    valoresHoje: {
      diario: { planejado: plDiario, realizado: reDiario },
      etapas: { planejado: 100, realizado: reTotal },
    },
  };
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
  const detalhes: DetalhesDia[] = [];

  for (const label of allLabels) {
    const pls: number[] = [];
    const res: number[] = [];
    let detalheEscolhido: DetalhesDia | null = null;
    const mediasPl: number[] = [];
    const mediasRe: number[] = [];
    for (const c of curvas) {
      const idx = c.labels.indexOf(label);
      if (idx !== -1 && c.planejado[idx] != null) pls.push(c.planejado[idx] as number);
      if (idx !== -1 && c.realizado[idx] != null) res.push(c.realizado[idx] as number);
      if (idx !== -1 && c.detalhes[idx]) {
        if (detalheEscolhido === null) {
          detalheEscolhido = c.detalhes[idx];
        }
        if (c.detalhes[idx].mediaPlanejadoEtapas > 0 || c.detalhes[idx].mediaRealizadoEtapas > 0) {
          mediasPl.push(c.detalhes[idx].mediaPlanejadoEtapas);
          mediasRe.push(c.detalhes[idx].mediaRealizadoEtapas);
        }
      }
    }
    planejado.push(pls.length ? Math.round((pls.reduce((s, v) => s + v, 0) / pls.length) * 10) / 10 : null);
    realizado.push(res.length ? Math.round((res.reduce((s, v) => s + v, 0) / res.length) * 10) / 10 : null);

    const mediaPl = mediasPl.length ? Math.round((mediasPl.reduce((s, v) => s + v, 0) / mediasPl.length) * 10) / 10 : 0;
    const mediaRe = mediasRe.length ? Math.round((mediasRe.reduce((s, v) => s + v, 0) / mediasRe.length) * 10) / 10 : 0;

    detalhes.push(
      detalheEscolhido
        ? { ...detalheEscolhido, mediaPlanejadoEtapas: mediaPl, mediaRealizadoEtapas: mediaRe }
        : { etapaId: 0, etapaNome: "—", planejadoEtapa: 0, realizadoEtapa: 0, mediaPlanejadoEtapas: mediaPl, mediaRealizadoEtapas: mediaRe },
    );
  }

  const diarioPls = curvas.map((c) => c.valoresHoje?.diario?.planejado ?? 0);
  const diarioRes = curvas.map((c) => c.valoresHoje?.diario?.realizado ?? 0);
  const etapasPls = curvas.map((c) => c.valoresHoje?.etapas?.planejado ?? 100);
  const etapasRes = curvas.map((c) => c.valoresHoje?.etapas?.realizado ?? 0);

  const valoresHoje = {
    diario: {
      planejado: Math.round((diarioPls.reduce((s, v) => s + v, 0) / diarioPls.length) * 10) / 10,
      realizado: Math.round((diarioRes.reduce((s, v) => s + v, 0) / diarioRes.length) * 10) / 10,
    },
    etapas: {
      planejado: Math.round((etapasPls.reduce((s, v) => s + v, 0) / etapasPls.length) * 10) / 10,
      realizado: Math.round((etapasRes.reduce((s, v) => s + v, 0) / etapasRes.length) * 10) / 10,
    },
  };

  return { labels: allLabels, planejado, realizado, detalhes, valoresHoje };
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

    const dataBaseParam = searchParams.get("data_base");
    const hoje = dataBaseParam && /^\d{4}-\d{2}-\d{2}$/.test(dataBaseParam)
      ? dataBaseParam
      : new Date().toISOString().split("T")[0];

    const db = createServerClient();

    let colabQuery = db
      .from("colaboradores")
      .select("cpf,nome,status,mob,aso,portal,data_admissao,funcao_clt,treinamento,pre_admissao,termino,prorrogacao,uf");
    if (centroCusto?.length) colabQuery = colabQuery.in("centro_custo", centroCusto);

    let configQuery = db.from("configuracoes").select("*");
    if (centroCusto?.length) configQuery = configQuery.in("centro_custo", centroCusto) as typeof configQuery;

    let etapasQuery = db.from("etapas").select("*").order("ordem", { ascending: true });
    if (centroCusto?.length) etapasQuery = etapasQuery.in("centro_custo", centroCusto) as typeof etapasQuery;

    let progressoQuery = db.from("etapas_progresso_diario").select("centro_custo,etapa_id,data,percentual");
    if (centroCusto?.length) progressoQuery = progressoQuery.in("centro_custo", centroCusto) as typeof progressoQuery;

    let atrasosQuery = db.from("etapas_atraso").select("centro_custo,etapa_id,dias_extras,motivo");
    if (centroCusto?.length) atrasosQuery = atrasosQuery.in("centro_custo", centroCusto) as typeof atrasosQuery;

    const [
      { data: colabData, error: colabErr },
      configResult,
      { data: etapasRows, error: etapasErr },
      { data: progressoRows },
      { data: atrasosRows },
    ] = await Promise.all([
      colabQuery,
      configQuery,
      etapasQuery,
      progressoQuery,
      atrasosQuery,
    ]);

    if (colabErr) throw new Error(`Falha ao buscar colaboradores: ${colabErr.message}`);
    if (etapasErr) console.error("[Dashboard/Principal] etapas:", etapasErr.message);

    // ── Configs e Etapas ─────────────────────────────────────────────────────
    const configsAll = (configResult.data ?? []) as Array<Record<string, unknown>>;

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

    // ── Agrupar progresso diário por centro_custo ─────────────────────────────
    const progressoPorProjeto = new Map<string, ProgressoDiarioRow[]>();
    for (const r of (progressoRows ?? []) as Array<{ centro_custo?: string; etapa_id?: number; data?: string; percentual?: number }>) {
      const cc = r.centro_custo
        ? String(r.centro_custo)
        : (Array.isArray(centroCusto) ? (centroCusto[0] ?? "__sem_cc__") : (centroCusto ?? "__sem_cc__"));
      if (!progressoPorProjeto.has(cc)) progressoPorProjeto.set(cc, []);
      progressoPorProjeto.get(cc)!.push({
        etapa_id: Number(r.etapa_id ?? 0),
        data: String(r.data ?? ""),
        percentual: Number(r.percentual ?? 0),
      });
    }

    // ── Curva S ──────────────────────────────────────────────────────────────
    let curvaS: CurvaSResult | null = null;
    let statusProjeto: { atrasado: boolean; diasAtraso: number; percentualAtraso: number } | null = null;

    if (configsAll.length > 0) {
      const curvasIndividuais: CurvaSResult[] = [];
      for (const cfg of configsAll) {
        const cc = cfg.centro_custo as string;
        const etapas = etapasPorProjeto.get(cc) ?? [];
        const progresso = progressoPorProjeto.get(cc) ?? [];
        if (cfg.data_inicio_projeto && etapas.length > 0) {
          const c = gerarCurvaSEtapas(
            cfg.data_inicio_projeto as string,
            cfg.data_fim_projeto as string | null,
            etapas,
            hoje,
            progresso,
            (cfg.dias_trabalhados as string[] | undefined) ?? [],
          );
          if (c.labels.length) curvasIndividuais.push(c);
        }
      }
      curvaS = calcularCurvaSMedia(curvasIndividuais);
    }

    if (curvaS && curvaS.valoresHoje?.diario) {
      const { planejado, realizado } = curvaS.valoresHoje.diario;
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
      Desistente: colaboradores.filter((c) => c.STATUS === "Desistente").length,
      Desligado: colaboradores.filter((c) => c.STATUS === "Desligado").length,
      "Restrição Cliente": colaboradores.filter(
        (c) => c.STATUS === "Restrição Cliente",
      ).length,
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
    const ccAtivo = Array.isArray(centroCusto) ? centroCusto[0] : centroCusto;
    const etapasExibicao = ccAtivo
      ? (etapasPorProjeto.get(ccAtivo) ?? [])
      : [];

    const progressoDoCc = ccAtivo
      ? (progressoPorProjeto.get(ccAtivo) ?? [])
      : [];

    // Lookup de atraso por etapa_id para o CC ativo
    const atrasosMapDoCc = new Map<number, { diasExtras: number; motivo: string | null }>();
    for (const a of (atrasosRows ?? []) as Array<{ centro_custo?: string; etapa_id?: number; dias_extras?: number; motivo?: string | null }>) {
      if (a.centro_custo === ccAtivo) {
        atrasosMapDoCc.set(Number(a.etapa_id ?? 0), {
          diasExtras: Number(a.dias_extras ?? 0),
          motivo: a.motivo ?? null,
        });
      }
    }

    // Dias trabalhados do CC atual (para filtrar finais de semana/feriados na evolucaoDiaria)
    const diasTrabalhadosDoCc: Set<string> = (() => {
      if (!ccAtivo) return new Set<string>();
      const cfg = configsAll.find((c) => c.centro_custo === ccAtivo);
      const lista = (cfg?.dias_trabalhados as string[] | undefined) ?? [];
      if (lista.length > 0) return new Set(lista);
      // Fallback: gerar dias úteis excluindo fins de semana e feriados
      const cfgInicio = cfg?.data_inicio_projeto as string | undefined;
      const cfgFim = cfg?.data_fim_projeto as string | undefined;
      if (cfgInicio && cfgFim) {
        return new Set(gerarDiasTrabalhadosFallback(cfgInicio, cfgFim));
      }
      return new Set<string>();
    })();

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
      etapas: etapasExibicao.map((e) => {
        const evolucaoDiaria: Array<{ data: string; previsto: number; realizado: number }> = [];
        if (e.dataInicio && e.dataFim) {
          const dias: string[] = [];
          const cur = new Date(e.dataInicio + "T00:00:00Z");
          const fim = new Date(e.dataFim + "T00:00:00Z");
          while (cur <= fim) {
            const iso = cur.toISOString().split("T")[0];
            // Inclui apenas dias marcados como trabalhados (ou, se o set estiver vazio, todos os dias)
            if (diasTrabalhadosDoCc.size === 0 || diasTrabalhadosDoCc.has(iso)) {
              dias.push(iso);
            }
            cur.setUTCDate(cur.getUTCDate() + 1);
          }
          let acum = 0;
          for (let i = 0; i < dias.length; i++) {
            const data = dias[i];
            const previsto = Math.round(((i + 1) / dias.length) * 100);
            const incrementos = progressoDoCc.filter(
              (p) => p.etapa_id === e.id && p.data === data,
            );
            for (const inc of incrementos) {
              acum += inc.percentual;
            }
            evolucaoDiaria.push({
              data,
              previsto,
              realizado: Math.min(100, Math.round(acum * 10) / 10),
            });
          }
        }

        const temRegistros = progressoDoCc.some(
          (p) => p.etapa_id === e.id && p.data >= (e.dataInicio ?? "") && p.data <= (e.dataFim ?? "")
        );

        return {
          id: e.id,
          nome: e.nome,
          duracaoDias: e.duracaoDias,
          percentualConcluido: e.percentualConcluido ?? 0,
          concluida: e.concluida ?? false,
          dataInicio: e.dataInicio,
          dataFim: e.dataFim,
          evolucaoDiaria,
          temRegistros,
          diasExtras: atrasosMapDoCc.get(e.id)?.diasExtras ?? 0,
          motivoAtraso: atrasosMapDoCc.get(e.id)?.motivo ?? null,
        };
      }),
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
        terminoDetalhado: colaboradores
          .filter((c) => {
            const dataEfetiva = c.PRORROGACAO || c.TERMINO;
            return dataEfetiva && String(dataEfetiva).trim() !== "";
          })
          .map((c) => {
            const prorrogacao = c.PRORROGACAO ? String(c.PRORROGACAO).trim() : null;
            const termino     = c.TERMINO     ? String(c.TERMINO).trim()     : null;
            const dataEfetiva = (prorrogacao || termino)!;
            return {
              nome:       String(c.NOME ?? "").trim(),
              funcao_clt: c.FUNCAO_CLT ? String(c.FUNCAO_CLT).trim() : null,
              termino:    dataEfetiva.split("T")[0], // normaliza para YYYY-MM-DD
              prorrogado: !!prorrogacao,              // flag para exibição visual
              status:     c.STATUS ? String(c.STATUS).trim() : null,
              uf:         c.UF     ? String(c.UF).trim().toUpperCase() : null,
            };
          })
          .sort((a, b) => {
            const fnCmp = (a.funcao_clt ?? "").localeCompare(b.funcao_clt ?? "", "pt-BR");
            if (fnCmp !== 0) return fnCmp;
            return a.termino.localeCompare(b.termino);
          }),
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
