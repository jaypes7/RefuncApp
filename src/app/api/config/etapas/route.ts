/**
 * ============================================================================
 * API: /api/config/etapas
 * ============================================================================
 *
 * POST: Substitui todas as etapas do cronograma (delete + insert).
 *       Preserva os dados do projeto (configuracoes) intocados.
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { createServerClient } from "@/lib/supabase";
import { ConfigEtapasSchema, DateSchema } from "@/lib/schemas";
import { requireAuth } from "@/lib/auth";
import { logConfig } from "@/lib/logs";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth("admin");
    const supabase = createServerClient();

    const body = await request.json();
    const { etapas } = ConfigEtapasSchema.parse(body);
    const centroCusto = body.centroCusto ?? "09.06.0001.171";

    // Busca as datas do projeto para validar as datas das etapas
    const { data: configData, error: configError } = await supabase
      .from("configuracoes")
      .select("data_inicio_projeto, data_fim_projeto")
      .eq("centro_custo", centroCusto)
      .single();

    if (configError) {
      throw new Error(`Erro ao buscar datas do projeto: ${configError.message}`);
    }

    const projectStartDate = configData?.data_inicio_projeto;
    const projectEndDate = configData?.data_fim_projeto;

    // Validar que as datas das etapas estão dentro do intervalo do projeto
    if (projectStartDate && projectEndDate) {
      for (const etapa of etapas) {
        const dataInicio = (body.etapas?.find((e: any) => e.id === etapa.id)?.dataInicio as string | undefined) || null;
        const dataFim = (body.etapas?.find((e: any) => e.id === etapa.id)?.dataFim as string | undefined) || null;

        if (dataInicio) {
          if (dataInicio < projectStartDate || dataInicio > projectEndDate) {
            return NextResponse.json(
              {
                error: `Data de início da etapa "${etapa.nome}" está fora do intervalo do projeto`,
              },
              { status: 400 },
            );
          }
        }

        if (dataFim) {
          if (dataFim < projectStartDate || dataFim > projectEndDate) {
            return NextResponse.json(
              {
                error: `Data de fim da etapa "${etapa.nome}" está fora do intervalo do projeto`,
              },
              { status: 400 },
            );
          }
        }

        if (dataInicio && dataFim && dataInicio > dataFim) {
          return NextResponse.json(
            {
              error: `Data de início não pode ser maior que data de fim para a etapa "${etapa.nome}"`,
            },
            { status: 400 },
          );
        }
      }
    }

    // Remove apenas as etapas do centro de custo e insere a nova lista
    const { error: delError } = await supabase
      .from("etapas")
      .delete()
      .eq("centro_custo", centroCusto);

    if (delError) {
      throw new Error(`Erro ao remover etapas: ${delError.message}`);
    }

    if (etapas.length > 0) {
      const payload = etapas.map((e, idx) => {
        const rawEtapa = body.etapas?.find((raw: any) => raw.id === e.id);
        return {
          id: e.id ?? idx + 1,
          nome: e.nome,
          dias: e.duracaoDias,
          ordem: idx + 1,
          concluida: e.concluida ?? false,
          percentual_concluido: e.percentualConcluido ?? 0,
          data_inicio: rawEtapa?.dataInicio || null,
          data_fim: rawEtapa?.dataFim || null,
          centro_custo: centroCusto,
        };
      });

      const { error: insError } = await supabase
        .from("etapas")
        .insert(payload);

      if (insError) {
        throw new Error(`Erro ao inserir etapas: ${insError.message}`);
      }
    }

    await logConfig(
      user.re,
      "Cronograma",
      undefined,
      `Etapas atualizadas: ${etapas.length} etapa(s)`,
    );

    return NextResponse.json({
      success: true,
      message: "Etapas do cronograma atualizadas",
      data: { etapas },
    });
  } catch (error) {
    console.error("[POST /config/etapas]", error);

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
