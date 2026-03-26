/**
 * ============================================================================
 * API: /api/config/etapas
 * ============================================================================
 *
 * POST: Substitui todas as etapas do cronograma (delete + insert).
 *       Preserva os dados do projeto (configuracoes) intocados.
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createServerClient } from "@/lib/supabase";
import { ConfigEtapasSchema } from "@/lib/schemas";
import { requireAuth } from "@/lib/auth";
import { logConfig } from "@/lib/logs";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = createServerClient();

    const body = await request.json();
    const { etapas } = ConfigEtapasSchema.parse(body);

    // Remove todas as etapas atuais e insere a nova lista
    const { error: delError } = await supabase
      .from("etapas")
      .delete()
      .gte("id", 0);

    if (delError) {
      throw new Error(`Erro ao remover etapas: ${delError.message}`);
    }

    if (etapas.length > 0) {
      const payload = etapas.map((e, idx) => ({
        id: e.id,
        nome: e.nome,
        dias: e.duracaoDias,
        ordem: idx + 1,
        concluida: e.concluida ?? false,
        percentual_concluido: e.percentualConcluido ?? 0,
      }));

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

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
