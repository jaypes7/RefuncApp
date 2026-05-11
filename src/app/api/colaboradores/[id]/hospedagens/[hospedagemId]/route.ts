/**
 * ============================================================================
 * API: /api/colaboradores/[id]/hospedagens/[hospedagemId]
 * ============================================================================
 *
 * PUT    → Atualiza hospedagem
 * DELETE → Remove hospedagem
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { ColaboradorHospedagemUpdateSchema } from "@/lib/schemas";

// ============================================================================
// PUT
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; hospedagemId: string }> },
) {
  try {
    await requireAuth("user");
    const { id, hospedagemId } = await params;

    const supabase = createServerClient();
    const { data: existing } = await supabase
      .from("colaborador_hospedagens")
      .select("id")
      .eq("id", hospedagemId)
      .eq("colaborador_id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Hospedagem não encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const validated = ColaboradorHospedagemUpdateSchema.parse(body);

    const { data, error } = await supabase
      .from("colaborador_hospedagens")
      .update(validated)
      .eq("id", hospedagemId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[PUT /colaboradores/[id]/hospedagens/[hospedagemId]]", error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// ============================================================================
// DELETE
// ============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; hospedagemId: string }> },
) {
  try {
    await requireAuth("user");
    const { id, hospedagemId } = await params;

    const supabase = createServerClient();
    const { error } = await supabase
      .from("colaborador_hospedagens")
      .delete()
      .eq("id", hospedagemId)
      .eq("colaborador_id", id);

    if (error) throw new Error(error.message);
    return NextResponse.json({ message: "Hospedagem removida com sucesso" });
  } catch (error) {
    console.error("[DELETE /colaboradores/[id]/hospedagens/[hospedagemId]]", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
