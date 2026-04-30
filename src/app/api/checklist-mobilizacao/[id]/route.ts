/**
 * ============================================================================
 * API: /api/checklist-mobilizacao/[id]
 * ============================================================================
 *
 * PATCH: Atualiza uma subetapa existente.
 * DELETE: Remove uma subetapa.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { ChecklistSubetapaSchema } from "@/lib/schemas";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ── PATCH ───────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth("user");
    const { id } = await params;

    const body = await request.json();
    const parsed = ChecklistSubetapaSchema.partial().parse(body);

    const db = createServerClient();
    const { error } = await db
      .from("checklist_subetapas")
      .update({
        etapa_id: parsed.etapa_id,
        nome: parsed.nome,
        setor: parsed.setor,
        responsavel: parsed.responsavel,
        previsto: parsed.previsto,
        avanco: parsed.avanco,
        data_inicio: parsed.data_inicio,
        data_termino: parsed.data_termino,
        observacao: parsed.observacao,
        ordem: parsed.ordem,
      })
      .eq("id", id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[PATCH /checklist-mobilizacao/[id]]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// ── DELETE ──────────────────────────────────────────────────────────────────

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth("user");
    const { id } = await params;

    const db = createServerClient();
    const { error } = await db.from("checklist_subetapas").delete().eq("id", id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[DELETE /checklist-mobilizacao/[id]]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
