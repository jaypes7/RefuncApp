/**
 * ============================================================================
 * API: /api/colaboradores/[id]/treinamentos/[treinamentoId]
 * ============================================================================
 *
 * PUT → Atualiza data de validade e observações de um treinamento do colaborador
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { ColaboradorTreinamentoUpdateSchema } from "@/lib/schemas";

// ============================================================================
// PUT
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; treinamentoId: string }> },
) {
  try {
    await requireAuth("user");
    const { id, treinamentoId } = await params;

    const supabase = createServerClient();
    const body = await request.json();
    const validated = ColaboradorTreinamentoUpdateSchema.parse(body);

    const { data, error } = await supabase
      .from("colaborador_treinamentos")
      .update(validated)
      .eq("id", treinamentoId)
      .eq("colaborador_id", id)
      .select(`
        *,
        treinamento:treinamentos(id, nome, descricao, obrigatorio, prazo_validade_meses)
      `)
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[PUT /colaboradores/[id]/treinamentos/[treinamentoId]]", error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
