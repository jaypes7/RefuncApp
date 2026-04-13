/**
 * ============================================================================
 * API: /api/config
 * ============================================================================
 *
 * GET:  Retorna configurações do projeto (Supabase)
 * POST: Atualiza configurações (Supabase)
 *
 * Tabelas Supabase:
 *   • configuracoes  — único registro (id = 1) com dados do projeto
 *   • etapas         — múltiplas linhas: id, nome, dias, ordem, concluida
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createServerClient } from "@/lib/supabase";
import { ConfigUpdateSchema, type EtapaConfig } from "@/lib/schemas";
import { requireAuth, resolveCentroCusto } from "@/lib/auth";
import { logConfig } from "@/lib/logs";
import { calculateWorkingDays } from "@/lib/date-utils";

// ============================================================================
// TIPOS
// ============================================================================

interface ConfigResponse {
  DIAS_TOTAIS_PROJETO: number;
  DATA_INICIO_PROJETO: string | null;
  DATA_FIM_PROJETO: string | null;
  ETAPA_ATUAL: number;
  META_ADMISSOES: number;
  ETAPAS_PROJETO: EtapaConfig[];
  GERENTE_OPERACOES: string | null;
  GERENTE_CONTRATO: string | null;
  NOME_CLIENTE: string | null;
  CENTRO_CUSTO: string | null;
  COLABORADORES_PREVISTOS: number;
  ORCADO_SUPRIMENTOS: number;
  FERIADOS_PROJETO: string[];
}

// ============================================================================
// GET /api/config
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();

    const { searchParams } = new URL(request.url);
    const ccParam = searchParams.get("centro_custo") || undefined;
    const centroCustoParam = resolveCentroCusto(currentUser, ccParam);

    const supabase = createServerClient();

    // Busca configurações e etapas em paralelo, filtradas por centro de custo
    const configQuery = centroCustoParam
      ? supabase.from("configuracoes").select("*").eq("centro_custo", centroCustoParam).single()
      : supabase.from("configuracoes").select("*").limit(1).maybeSingle();

    const etapasQuery = centroCustoParam
      ? supabase.from("etapas").select("*").eq("centro_custo", centroCustoParam).order("ordem", { ascending: true })
      : supabase.from("etapas").select("*").order("ordem", { ascending: true });

    const [
      { data: configRow, error: configError },
      { data: etapasRows, error: etapasError },
    ] = await Promise.all([configQuery, etapasQuery]);

    // PGRST116 = row not found — aceita, usa defaults
    if (configError && configError.code !== "PGRST116") {
      throw new Error(`Erro ao buscar configurações: ${configError.message}`);
    }
    if (etapasError) {
      throw new Error(`Erro ao buscar etapas: ${etapasError.message}`);
    }

    const etapas: EtapaConfig[] = (etapasRows ?? []).map((e, idx) => ({
      id: e.id ?? idx + 1,
      nome: e.nome ?? `Etapa ${idx + 1}`,
      duracaoDias: e.dias ?? 7,
      concluida: e.concluida ?? false,
      percentualConcluido: e.percentual_concluido ?? 0,
      dataInicio: e.data_inicio ?? undefined,
      dataFim: e.data_fim ?? undefined,
    }));

    const config: ConfigResponse = {
      DIAS_TOTAIS_PROJETO: configRow?.dias_totais_projeto ?? 0,
      DATA_INICIO_PROJETO: configRow?.data_inicio_projeto ?? null,
      DATA_FIM_PROJETO: configRow?.data_fim_projeto ?? null,
      ETAPA_ATUAL: configRow?.etapa_atual ?? 1,
      META_ADMISSOES: configRow?.meta_admissoes ?? 0,
      ETAPAS_PROJETO: etapas,
      GERENTE_OPERACOES: configRow?.gerente_operacoes ?? null,
      GERENTE_CONTRATO: configRow?.gerente_contrato ?? null,
      NOME_CLIENTE: configRow?.nome_cliente ?? null,
      CENTRO_CUSTO: configRow?.centro_custo ?? null,
      COLABORADORES_PREVISTOS: configRow?.colaboradores_previstos ?? 0,
      ORCADO_SUPRIMENTOS: configRow?.orcado_suprimentos ?? 0,
      FERIADOS_PROJETO: (configRow?.feriados_projeto as string[]) || [],
    };

    return NextResponse.json({ data: config });
  } catch (error) {
    console.error("[GET /config]", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/config
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth("admin");
    const supabase = createServerClient();

    const body = await request.json();
    const {
      dataInicio,
      dataFim,
      etapas,
      gerenteOperacoes,
      gerenteContrato,
      nomeCliente,
      centroCusto,
      colaboradores_previstos,
      orcado_suprimentos,
      feriados_projeto,
    } = ConfigUpdateSchema.parse(body);

    // Garante YYYY-MM-DD
    const fmt = (data: string): string => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
      const d = new Date(data);
      return isNaN(d.getTime()) ? data : d.toISOString().split("T")[0];
    };

    const dataInicioFmt = fmt(dataInicio);
    const dataFimFmt = fmt(dataFim);

    // Dias úteis — exclui fins de semana e feriados do projeto
    const diasTotais = calculateWorkingDays(
      dataInicioFmt,
      dataFimFmt,
      feriados_projeto,
    );

    // ── Upsert configuracoes por centro de custo ────────────────────────────
    const targetCentroCusto = centroCusto ?? "09.06.0001.171";
    const { error: configError } = await supabase
      .from("configuracoes")
      .upsert(
        {
          centro_custo: targetCentroCusto,
          data_inicio_projeto: dataInicioFmt,
          data_fim_projeto: dataFimFmt,
          dias_totais_projeto: diasTotais,
          meta_admissoes: 100,
          etapa_atual: 1,
          gerente_operacoes: gerenteOperacoes ?? null,
          gerente_contrato: gerenteContrato ?? null,
          nome_cliente: nomeCliente ?? null,
          colaboradores_previstos: colaboradores_previstos ?? null,
          orcado_suprimentos: orcado_suprimentos ?? null,
          feriados_projeto:
            feriados_projeto && feriados_projeto.length > 0
              ? feriados_projeto.map((d) =>
                  d instanceof Date ? d.toISOString().split("T")[0] : String(d),
                )
              : null,
        },
        { onConflict: "centro_custo" },
      );

    if (configError) {
      throw new Error(`Erro ao salvar configurações: ${configError.message}`);
    }

    // ── Etapas: substitui toda a lista do centro de custo ────────────────────
    if (etapas.length > 0) {
      // Remove apenas as etapas do centro de custo alvo
      await supabase.from("etapas").delete().eq("centro_custo", targetCentroCusto);

      const etapasPayload = etapas.map((e, idx) => ({
        id: e.id ?? idx + 1,
        nome: e.nome,
        dias: e.duracaoDias,
        ordem: idx + 1,
        concluida: false,
        centro_custo: targetCentroCusto,
      }));

      const { error: etapasError } = await supabase
        .from("etapas")
        .insert(etapasPayload);

      if (etapasError) {
        throw new Error(`Erro ao salvar etapas: ${etapasError.message}`);
      }
    }

    await logConfig(
      user.re,
      "Projeto",
      undefined,
      `${dataInicio} a ${dataFim}`,
    );

    return NextResponse.json({
      success: true,
      message: "Configurações atualizadas com sucesso",
      data: { dataInicio, dataFim, diasTotais, etapas },
    });
  } catch (error) {
    console.error("[POST /config]", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado: requer privilégios de Administrador" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
