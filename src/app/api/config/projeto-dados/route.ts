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

    const targetCentroCusto = centroCusto ?? "09.06.0001.171";
    const shouldUpdateFeriados = Object.prototype.hasOwnProperty.call(
      body,
      "feriados_projeto",
    );
    let feriadosProjetoAtualizados =
      feriados_projeto?.map((d) =>
        d instanceof Date ? d.toISOString().split("T")[0] : String(d),
      ) ?? null;

    if (!shouldUpdateFeriados) {
      const { data: configAtual, error: configAtualError } = await supabase
        .from("configuracoes")
        .select("feriados_projeto")
        .eq("centro_custo", centroCustoOriginal ?? targetCentroCusto)
        .maybeSingle();

      if (configAtualError) {
        throw new Error(
          `Erro ao buscar feriados atuais: ${configAtualError.message}`,
        );
      }

      feriadosProjetoAtualizados =
        (configAtual?.feriados_projeto as string[] | null) ?? null;
    }

    const targetCentroCusto = centroCusto ?? "09.06.0001.171";
    const shouldUpdateFeriados = Object.prototype.hasOwnProperty.call(
      body,
      "feriados_projeto",
    );
    let feriadosProjetoAtualizados =
      feriados_projeto?.map((d) =>
        d instanceof Date ? d.toISOString().split("T")[0] : String(d),
      ) ?? null;

    if (!shouldUpdateFeriados) {
      const { data: configAtual, error: configAtualError } = await supabase
        .from("configuracoes")
        .select("feriados_projeto")
        .eq("centro_custo", centroCustoOriginal ?? targetCentroCusto)
        .maybeSingle();

      if (configAtualError) {
        throw new Error(
          `Erro ao buscar feriados atuais: ${configAtualError.message}`,
        );
      }

      feriadosProjetoAtualizados =
        (configAtual?.feriados_projeto as string[] | null) ?? null;
    }

    const dataInicioFmt = fmt(dataInicio);
    const dataFimFmt = fmt(dataFim);
    const diasTotais = calculateWorkingDays(
      dataInicioFmt,
      dataFimFmt,
      feriadosProjetoAtualizados ?? undefined,
      feriadosProjetoAtualizados ?? undefined,
    );

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
        feriadosProjetoAtualizados && feriadosProjetoAtualizados.length > 0
          ? feriadosProjetoAtualizados
          : null,
    };

    // ── Edição com mudança de centro de custo: atualiza todas as tabelas ──
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

      // 1. Inserir novo registro em configuracoes com o novo CC (satisfaz FK dos filhos)
      const { error: insertErr } = await supabase
        .from("configuracoes")
        .insert({ ...payload, centro_custo: targetCentroCusto });

      if (insertErr) {
        throw new Error(`Erro ao criar novo centro de custo: ${insertErr.message}`);
      }

      // 2. Migrar todas as tabelas filhas do CC antigo para o novo
      const tabelasFilhas = [
        "colaboradores",
        "etapas",
        "etapas_grupos",
        "checklist_etapas",
        "checklist_subetapas",
        "etapas_progresso_diario",
        "registros_fotograficos",
        "relatorios_executivos",
        "logistica_controle",
        "seguranca_fits",
        "pendencias_manuais",
        "ocorrencias",
      ] as const;

      for (const tabela of tabelasFilhas) {
        const { error } = await supabase
          .from(tabela)
          .update({ centro_custo: targetCentroCusto })
          .eq("centro_custo", centroCustoOriginal);
        if (error) {
          throw new Error(`Erro ao migrar tabela ${tabela}: ${error.message}`);
        }
      }

      // usuarios_permitidos armazena centro_custo como array — substitui o valor no array
      const { data: usersComCC } = await supabase
        .from("usuarios_permitidos")
        .select("id, centro_custo")
        .contains("centro_custo", [centroCustoOriginal]);

      if (usersComCC && usersComCC.length > 0) {
        for (const user of usersComCC) {
          const novoArray = (user.centro_custo as string[]).map((cc: string) =>
            cc === centroCustoOriginal ? targetCentroCusto : cc,
          );
          await supabase
            .from("usuarios_permitidos")
            .update({ centro_custo: novoArray })
            .eq("id", user.id);
        }
      }

      // 3. Remover o registro antigo em configuracoes (agora sem filhos referenciando-o)
      const { error: deleteErr } = await supabase
        .from("configuracoes")
        .delete()
        .eq("centro_custo", centroCustoOriginal);

      if (deleteErr) {
        throw new Error(`Erro ao remover centro de custo antigo: ${deleteErr.message}`);
      }
    } else {
      // Criação ou edição sem mudança de CC
      const { error } = await supabase
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
