/**
 * ============================================================================
 * API: /api/colaboradores/[id]/passagens/[passagemId]
 * ============================================================================
 *
 * PUT    → Atualiza passagem e/ou trechos
 * DELETE → Remove passagem e seus trechos (cascade)
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { ColaboradorPassagemUpdateSchema } from "@/lib/schemas";

// ============================================================================
// PUT /api/colaboradores/[id]/passagens/[passagemId]
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; passagemId: string }> },
) {
  try {
    await requireAuth("user");
    const { id, passagemId } = await params;

    const supabase = createServerClient();

    // Verifica se a passagem pertence ao colaborador
    const { data: existing, error: findErr } = await supabase
      .from("colaborador_passagens")
      .select("id")
      .eq("id", passagemId)
      .eq("colaborador_id", id)
      .single();

    if (findErr || !existing) {
      return NextResponse.json({ error: "Passagem não encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const validated = ColaboradorPassagemUpdateSchema.parse(body);

    // Atualiza passagem
    const { trechos, ...passagemData } = validated;

    if (Object.keys(passagemData).length > 0) {
      const { error: updErr } = await supabase
        .from("colaborador_passagens")
        .update(passagemData)
        .eq("id", passagemId);
      if (updErr) throw new Error(updErr.message);
    }

    // Atualiza/insere trechos se fornecidos
    if (trechos && trechos.length > 0) {
      for (const trecho of trechos) {
        const { id: trechoId, ...trechoData } = trecho;
        if (trechoId) {
          await supabase.from("passagem_trechos").update(trechoData).eq("id", trechoId);
        } else {
          await supabase.from("passagem_trechos").insert({ ...trechoData, passagem_id: passagemId });
        }
      }
    }

    // Retorna atualizada
    const { data, error } = await supabase
      .from("colaborador_passagens")
      .select(`*, trechos:passagem_trechos(*)`)
      .eq("id", passagemId)
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[PUT /colaboradores/[id]/passagens/[passagemId]]", error);
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
// DELETE /api/colaboradores/[id]/passagens/[passagemId]
// ============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; passagemId: string }> },
) {
  try {
    await requireAuth("user");
    const { id, passagemId } = await params;

    const supabase = createServerClient();

    const { error } = await supabase
      .from("colaborador_passagens")
      .delete()
      .eq("id", passagemId)
      .eq("colaborador_id", id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ message: "Passagem removida com sucesso" });
  } catch (error) {
    console.error("[DELETE /colaboradores/[id]/passagens/[passagemId]]", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
