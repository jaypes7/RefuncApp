/**
 * ============================================================================
 * API: /api/config/projeto-dados
 * ============================================================================
 *
 * POST: Atualiza apenas dados do projeto (datas, gerentes, cliente, centro de custo,
 *       colaboradores_previstos, orcado_suprimentos) — SEM tocar nas etapas.
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createServerClient } from "@/lib/supabase";
import { ConfigProjetoSchema } from "@/lib/schemas";
import { requireAuth } from "@/lib/auth";
import { logConfig } from "@/lib/logs";
import { calculateWorkingDays } from "@/lib/date-utils";

function fmt(data: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
  const d = new Date(data);
  return isNaN(d.getTime()) ? data : d.toISOString().split("T")[0];
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = createServerClient();

    const body = await request.json();
    const {
      dataInicio,
      dataFim,
      gerenteOperacoes,
      gerenteContrato,
      nomeCliente,
      centroCusto,
      centroCustoOriginal,
      colaboradores_previstos,
      orcado_suprimentos,
      feriados_projeto,
    } = ConfigProjetoSchema.parse(body);

    const dataInicioFmt = fmt(dataInicio);
    const dataFimFmt = fmt(dataFim);
    const diasTotais = calculateWorkingDays(
      dataInicioFmt,
      dataFimFmt,
      feriados_projeto,
    );

    const targetCentroCusto = centroCusto ?? "09.06.0001.171";

    const payload = {
      centro_custo: targetCentroCusto,
      data_inicio_projeto: dataInicioFmt,
      data_fim_projeto: dataFimFmt,
      dias_totais_projeto: diasTotais,
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
    };

    // ── Edição com mudança de centro de custo: usa stored procedure transacional ──
    if (centroCustoOriginal && centroCustoOriginal !== targetCentroCusto) {
      // Verifica duplicidade antes de executar a migração
      const { data: existing } = await supabase
        .from("configuracoes")
        .select("centro_custo")
        .eq("centro_custo", targetCentroCusto)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: "Centro de custo já existe" },
          { status: 409 },
        );
      }

      const { error: rpcError } = await supabase.rpc("migrar_centro_custo", {
        antigo: centroCustoOriginal,
        novo: targetCentroCusto,
      });

      if (rpcError) {
        throw new Error(
          `Falha ao migrar centro de custo: ${rpcError.message}`,
        );
      }
    } else {
      // Criação ou edição sem mudança de CC
      const { error } = await supabase
        .from("configuracoes")
        .upsert(payload, { onConflict: "centro_custo" });

      if (error) {
        if (error.code === "23505") {
          return NextResponse.json(
            { error: "Centro de custo já existe" },
            { status: 409 },
          );
        }
        throw new Error(`Erro ao salvar no Supabase: ${error.message}`);
      }
    }

    await logConfig(
      user.re,
      "Projeto",
      undefined,
      `Dados do projeto atualizados: ${dataInicioFmt} a ${dataFimFmt}`,
    );

    return NextResponse.json({
      success: true,
      message: "Dados do projeto atualizados",
      data: { dataInicio: dataInicioFmt, dataFim: dataFimFmt, diasTotais },
    });
  } catch (error) {
    console.error("[POST /config/projeto-dados]", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
