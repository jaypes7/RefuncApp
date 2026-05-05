/**
 * ============================================================================
 * API: POST /api/relatorio/gerar
 * ============================================================================
 *
 * Gera um Relatório Executivo via IA (Moonshot / Kimi) a partir dos dados
 * do dashboard geral e do cronograma do centro de custo selecionado.
 *
 * Request body: { centro_custo?: string }
 * Response:     { relatorio: string }  // Markdown
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth, resolveCentroCusto } from "@/lib/auth";
import { chatCompletions } from "@/lib/moonshot";
import { calculateWorkingDays } from "@/lib/date-utils";

// ============================================================================
// HELPERS
// ============================================================================

function toStr(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v);
}

function fmtDateBR(dateStr: string | null): string {
  if (!dateStr) return "—";
  const [ano, mes, dia] = dateStr.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Conta quantos dias do array `diasTrabalhados` caem no intervalo [inicio, fim].
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

/**
 * Remove trechos de raciocínio interno (thinking) que possam ter vazado
 * no texto gerado pela IA. Segunda camada de proteção além do prompt.
 * MANTENHA esta função conservadora — remova APENAS padrões óbvios de thinking.
 */
function sanitizarRelatorio(texto: string): string {
  const linhas = texto.split("\n");
  const resultado: string[] = [];
  let dentroDoRelatorio = false;

  for (const linha of linhas) {
    const trim = linha.trim();

    // Ignora linhas vazias no início
    if (!dentroDoRelatorio && trim === "") continue;

    // Detecta início do relatório real
    if (!dentroDoRelatorio && (trim.startsWith("#") || trim.startsWith("Relatório Executivo"))) {
      dentroDoRelatorio = true;
    }

    // Se ainda não entrou no relatório, ignora
    if (!dentroDoRelatorio) continue;

    // Remove APENAS linhas que começam com padrões claros de thinking
    const thinkingStarters = [
      "Vou ", "Vamos ", "Analisando", "Análise", "Refletindo", "Pensando",
      "Preciso", "Devo", "Vou preencher", "Vou redigir", "Vou analisar",
      "Vou seguir", "Dados extraídos", "Preenchimento das seções",
      "Cálculos", "Estratégia:", "Observações importantes", "Análise das etapas",
    ];
    const isThinking = thinkingStarters.some((s) =>
      trim.toLowerCase().startsWith(s.toLowerCase()),
    );
    if (isThinking) continue;

    resultado.push(linha);
  }

  let final = resultado.join("\n").trim();
  final = final.replace(/\n{3,}/g, "\n\n");

  // Fallback de segurança: se a sanitização removeu tudo, use o texto bruto
  if (!final) {
    console.warn("[sanitizarRelatorio] Sanitização removeu todo o conteúdo; usando bruto.");
    return texto.trim();
  }

  return final;
}

/**
 * Calcula o planejado de uma etapa na data-base por interpolação linear.
 * Usa DIAS ÚTEIS quando disponível (via diasTrabalhados configurados ou
 * cálculo automático seg-sex sem feriados), senão usa dias corridos.
 * Se a etapa não tem datas, usa percentualConcluido como fallback.
 */
function calcularPlanejadoEtapa(
  dataBase: string,
  dataInicio: string | null,
  dataFim: string | null,
  percentualConcluido: number,
  diasTrabalhados: string[] = [],
): number {
  if (!dataInicio || !dataFim) {
    return percentualConcluido;
  }
  if (dataBase < dataInicio) return 0;
  if (dataBase >= dataFim) return 100;

  let diasDecorridos: number;
  let totalDiasEtapa: number;

  if (diasTrabalhados.length > 0) {
    // Fonte de verdade: dias trabalhados configurados pelo usuário
    diasDecorridos = contarDiasTrabalhadosNoIntervalo(dataInicio, dataBase, diasTrabalhados);
    totalDiasEtapa = contarDiasTrabalhadosNoIntervalo(dataInicio, dataFim, diasTrabalhados);
  } else {
    // Fallback: dias úteis automáticos (seg-sex, sem feriados nacionais brasileiros)
    diasDecorridos = calculateWorkingDays(dataInicio, dataBase);
    totalDiasEtapa = calculateWorkingDays(dataInicio, dataFim);
  }

  if (totalDiasEtapa <= 0) return 0;

  return Math.min(100, Math.max(0, Math.round((diasDecorridos / totalDiasEtapa) * 1000) / 10));
}

// ============================================================================
// HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth("user");

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // body vazio é aceitável
    }

    const ccParam = toStr(body.centro_custo) || undefined;
    const centrosCusto = resolveCentroCusto(currentUser, ccParam);
    const centroCusto = centrosCusto?.[0] ?? null;

    const supabase = createServerClient();

    // ── Busca dados em paralelo ─────────────────────────────────────────────
    const configQuery = centroCusto
      ? supabase.from("configuracoes").select("*").eq("centro_custo", centroCusto).single()
      : supabase.from("configuracoes").select("*").limit(1).maybeSingle();

    const etapasQuery = centroCusto
      ? supabase.from("etapas").select("*").eq("centro_custo", centroCusto).order("ordem", { ascending: true })
      : supabase.from("etapas").select("*").order("ordem", { ascending: true });

    const progressoQuery = centroCusto
      ? supabase.from("etapas_progresso_diario").select("*").eq("centro_custo", centroCusto).order("data", { ascending: true })
      : supabase.from("etapas_progresso_diario").select("*").order("data", { ascending: true });

    const colabsQuery = centroCusto
      ? supabase.from("colaboradores").select("status, funcao_clt, aso, mob").eq("centro_custo", centroCusto)
      : supabase.from("colaboradores").select("status, funcao_clt, aso, mob");

    const pendenciasQuery = centroCusto
      ? supabase.from("pendencias_manuais").select("*").eq("centro_custo", centroCusto)
      : supabase.from("pendencias_manuais").select("*");

    const ocorrenciasQuery = centroCusto
      ? supabase.from("ocorrencias").select("*").eq("centro_custo", centroCusto).order("data", { ascending: false })
      : supabase.from("ocorrencias").select("*").order("data", { ascending: false });

    const [
      { data: configRow, error: configError },
      { data: etapasRows, error: etapasError },
      { data: progressoRows, error: progressoError },
      { data: colabsRows, error: colabsError },
      { data: pendenciasRows, error: pendenciasError },
      { data: ocorrenciasRows, error: ocorrenciasError },
    ] = await Promise.all([
      configQuery,
      etapasQuery,
      progressoQuery,
      colabsQuery,
      pendenciasQuery,
      ocorrenciasQuery,
    ]);

    if (configError && configError.code !== "PGRST116") {
      throw new Error(`Erro ao buscar configurações: ${configError.message}`);
    }
    if (etapasError) throw new Error(`Erro ao buscar etapas: ${etapasError.message}`);
    if (progressoError) throw new Error(`Erro ao buscar progresso: ${progressoError.message}`);
    if (colabsError) throw new Error(`Erro ao buscar colaboradores: ${colabsError.message}`);
    if (pendenciasError) throw new Error(`Erro ao buscar pendências: ${pendenciasError.message}`);
    if (ocorrenciasError) throw new Error(`Erro ao buscar ocorrências: ${ocorrenciasError.message}`);

    // ── Normaliza etapas ────────────────────────────────────────────────────
    const etapas = (etapasRows ?? []).map((e, idx) => ({
      id: e.id ?? idx + 1,
      nome: e.nome ?? `Etapa ${idx + 1}`,
      duracaoDias: e.dias ?? 7,
      concluida: e.concluida ?? false,
      percentualConcluido: e.percentual_concluido ?? 0,
      dataInicio: e.data_inicio ?? null,
      dataFim: e.data_fim ?? null,
      responsavel: e.responsavel ?? null,
    }));

    // ── Métricas de colaboradores ───────────────────────────────────────────
    const totalColabs = colabsRows?.length ?? 0;
    const statusCount: Record<string, number> = {};
    const funcaoCount: Record<string, number> = {};
    let asoApto = 0;
    let mobOk = 0;

    for (const c of colabsRows ?? []) {
      const s = String(c.status ?? "N/A").trim();
      statusCount[s] = (statusCount[s] || 0) + 1;

      const f = String(c.funcao_clt ?? "N/A").trim();
      if (f && f !== "N/A") funcaoCount[f] = (funcaoCount[f] || 0) + 1;

      const aso = String(c.aso ?? "").trim().toLowerCase();
      if (aso.includes("apto") || aso.includes("valido")) asoApto++;

      const mob = String(c.mob ?? "").trim().toLowerCase();
      if (mob.includes("ok") || mob.includes("apto") || mob.includes("valido")) mobOk++;
    }

    const totalPendencias = pendenciasRows?.length ?? 0;
    const totalOcorrencias = ocorrenciasRows?.length ?? 0;

    // ── Cálculo correto do progresso por etapa ──────────────────────────────
    const hoje = new Date().toISOString().split("T")[0];
    const dataInicioProj = configRow?.data_inicio_projeto ?? null;
    const dataFimProj = configRow?.data_fim_projeto ?? null;
    const diasTrabalhados = (configRow?.dias_trabalhados as string[] | undefined) ?? [];
    const totalDias = etapas.reduce((s, e) => s + e.duracaoDias, 0) || 1;

    let progressoPlanejadoGlobal = 0;
    let progressoRealizadoGlobal = 0;

    const progressoEtapas = etapas.map((e) => {
      // Realizado = SOMA de todos os incrementos diários da etapa
      const realizadoAcumulado = Math.min(
        100,
        Math.round(
          (progressoRows ?? [])
            .filter((r) => Number(r.etapa_id) === e.id)
            .reduce((s, r) => s + (Number(r.percentual) || 0), 0) * 10,
        ) / 10,
      );

      // Planejado = interpolação linear em DIAS ÚTEIS entre dataInicio e dataFim
      const planejadoNaData = calcularPlanejadoEtapa(
        hoje,
        e.dataInicio,
        e.dataFim,
        e.percentualConcluido,
        diasTrabalhados,
      );

      const peso = (e.duracaoDias / totalDias) * 100;
      progressoPlanejadoGlobal += (planejadoNaData / 100) * peso;
      progressoRealizadoGlobal += (realizadoAcumulado / 100) * peso;

      return {
        nome: e.nome,
        planejadoPct: planejadoNaData,
        realizadoPct: realizadoAcumulado,
        dataInicio: e.dataInicio,
        dataFim: e.dataFim,
        responsavel: e.responsavel,
      };
    });

    progressoPlanejadoGlobal = Math.min(100, Math.round(progressoPlanejadoGlobal * 10) / 10);
    progressoRealizadoGlobal = Math.min(100, Math.round(progressoRealizadoGlobal * 10) / 10);

    const desvioGlobal = Math.round((progressoRealizadoGlobal - progressoPlanejadoGlobal) * 10) / 10;
    const spiGlobal = progressoPlanejadoGlobal > 0
      ? Math.round((progressoRealizadoGlobal / progressoPlanejadoGlobal) * 100) / 100
      : 1;

    // ── Monta payload de dados para a IA ────────────────────────────────────
    const dadosIA = {
      projeto: {
        cliente: configRow?.nome_cliente ?? "—",
        gerenteOperacoes: configRow?.gerente_operacoes ?? "—",
        gerenteContrato: configRow?.gerente_contrato ?? "—",
        centroCusto: centroCusto ?? "—",
        dataInicio: fmtDateBR(dataInicioProj),
        dataFim: fmtDateBR(dataFimProj),
        dataBase: fmtDateBR(hoje),
        metaAdmissoes: configRow?.meta_admissoes ?? 0,
        diasTotais: configRow?.dias_totais_projeto ?? 0,
      },
      metricasGlobais: {
        progressoPlanejado: progressoPlanejadoGlobal,
        progressoRealizado: progressoRealizadoGlobal,
        desvioPercentual: desvioGlobal,
        spi: spiGlobal,
      },
      cronograma: {
        totalEtapas: etapas.length,
        etapasConcluidas: etapas.filter((e) => e.concluida).length,
        etapas: progressoEtapas,
      },
      colaboradores: {
        total: totalColabs,
        porStatus: statusCount,
        topFuncoes: Object.entries(funcaoCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10),
        asoAptoCount: asoApto,
        mobOkCount: mobOk,
      },
      operacional: {
        totalPendencias,
        totalOcorrencias,
        ultimasOcorrencias: (ocorrenciasRows ?? []).slice(0, 5).map((o) => ({
          data: fmtDateBR(String(o.data ?? "").split("T")[0]),
          descricao: String(o.descricao ?? "").slice(0, 200),
        })),
      },
    };

    // ── Monta template pré-preenchido no servidor ───────────────────────────
    const cliente = configRow?.nome_cliente ?? centroCusto ?? "—";
    const dataInicioFmt = fmtDateBR(dataInicioProj);
    const dataFimFmt = fmtDateBR(dataFimProj);
    const dataBaseFmt = fmtDateBR(hoje);
    const { progressoPlanejado, progressoRealizado, desvioPercentual, spi } = dadosIA.metricasGlobais;
    const adiantado = desvioPercentual >= 0;
    const adiantadoStr = adiantado ? "adiantado" : "atrasado";
    const positivoStr = adiantado ? "positivo" : "negativo";
    const sinalDesvio = desvioPercentual >= 0 ? `+${desvioPercentual}` : `${desvioPercentual}`;

    // Lista de etapas concluídas/relevantes para o contexto
    const etapasDestaque = progressoEtapas
      .filter((e) => e.realizadoPct > 0)
      .map((e) => `${e.nome}: ${e.planejadoPct}% planejado, ${e.realizadoPct}% realizado`)
      .join("\n");

    const templateBase = `**Relatório Executivo – Curva de Mobilização ${cliente} (CMD)**

**Período:** ${dataInicioFmt} a ${dataFimFmt} | **Data-base:** ${dataBaseFmt}

Este relatório executivo sobre a Curva de Mobilização ${cliente} (CMD) é destinado a gestores de projetos. O conteúdo abrange a análise do progresso do projeto, a leitura de desempenho, a interpretação executiva, cenários de prazo, indicadores-chave, recomendações e conclusão, evitando jargões excessivos e mantendo o foco na relevância dos dados.

**Curva de Avanço**

**Status Geral**

Progresso planejado: ${progressoPlanejado}%

Progresso realizado: ${progressoRealizado}%

Desvio: ${sinalDesvio} p.p. (${adiantadoStr})

SPI: ${spi} (${positivoStr})

O projeto encontra-se ${adiantadoStr} em relação ao cronograma.

**Leitura de Performance**

[COMPLETAR: 4 bullets curtos sobre o desempenho observado nas etapas abaixo]

Etapas com progresso:
${etapasDestaque}

**Interpretação Executiva**

Apesar do desempenho ${positivoStr} atual:

[COMPLETAR: 3 bullets de análise crítica usando os dados acima]

Conclusão: ${adiantadoStr} atual não garante aderência ao prazo final.

**Cenários de Prazo**

| Cenário | Resultado | Risco |
|---------|-----------|-------|
| Otimista | Conclusão antes de ${dataFimFmt} | Baixo |
| Realista | Conclusão em ${dataFimFmt} | Médio |
| Conservador | Conclusão após ${dataFimFmt} | Alto |
| Crítico | Conclusão muito após ${dataFimFmt} | Muito alto |

**Indicadores-Chave**

SPI atual: ${spi} (${positivoStr})

[COMPLETAR: IPN estimado ou outro indicador relevante, se aplicável]

**Recomendação Executiva**

[COMPLETAR: 5 bullets acionáveis para a gestão]

**Conclusão**

[COMPLETAR: 1 a 2 parágrafos sintetizando a situação]`;

    const systemPrompt = `Você é um gerente de projetos sênior especializado em mobilização industrial. Complete o relatório executivo fornecido abaixo, substituindo as marcações [COMPLETAR] por textos redigidos em tom executivo, direto e profissional.

REGRAS ABSOLUTAS:
1. NÃO altere nenhuma seção ou dado já preenchido no template.
2. NÃO calcule, NÃO estime e NÃO invente valores — use apenas os dados já presentes no template.
3. NÃO escreva raciocínio interno, análises preliminares ou processo de pensamento.
4. O output deve conter APENAS o relatório final completo, com todas as marcações [COMPLETAR] substituídas.
5. NÃO use emojis, ícones ou símbolos decorativos. Use apenas texto puro e formatação Markdown.
6. Mantenha os títulos de seção exatamente como estão no template (em negrito com **).
7. Português (Brasil). Markdown puro. Tom direto, executivo, sem floreios.`;

    const userPrompt = `${templateBase}

Complete todas as marcações [COMPLETAR] e devolva o relatório final. Nada mais.`;

    const temperatureEnv = process.env.MOONSHOT_TEMPERATURE;
    const temperature = temperatureEnv ? parseFloat(temperatureEnv) : undefined;

    console.log("[Relatorio/gerar] Prompt size:", userPrompt.length, "chars");
    console.log("[Relatorio/gerar] Model:", process.env.MOONSHOT_MODEL ?? "kimi-k2.5");
    console.log("[Relatorio/gerar] Temperature:", temperature ?? "default");
    console.log("[Relatorio/gerar] Global:", dadosIA.metricasGlobais);

    const relatorioBruto = await chatCompletions({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      maxTokens: 4096,
      temperature,
    });

    const relatorio = sanitizarRelatorio(relatorioBruto);
    console.log("[Relatorio/gerar] Output length:", relatorio.length, "chars");

    return NextResponse.json({ relatorio });
  } catch (err: unknown) {
    console.error("[POST /api/relatorio/gerar]", err);

    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
