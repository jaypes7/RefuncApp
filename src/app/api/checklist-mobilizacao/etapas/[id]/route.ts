/**
 * ============================================================================
 * API: /api/checklist-mobilizacao/etapas/[id]
 * ============================================================================
 *
 * PATCH:  Atualiza nome/ordem de uma etapa do checklist.
 * DELETE: Remove a etapa do checklist e todas as subetapas associadas.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { ChecklistEtapaSchema } from "@/lib/schemas";
import { ZodError } from "zod";

// ── PUT ─────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth("admin");
    const { id } = await params;
    const etapaId = Number(id);
    if (!etapaId || isNaN(etapaId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = ChecklistEtapaSchema.partial().parse(body);

    const db = createServerClient();
    const updatePayload: Record<string, unknown> = {};
    if (parsed.nome !== undefined) updatePayload.nome = parsed.nome;
    if (parsed.ordem !== undefined) updatePayload.ordem = parsed.ordem;
    if ("grupo_id" in parsed) updatePayload.grupo_id = parsed.grupo_id ?? null;

    const { error } = await db
      .from("checklist_etapas")
      .update(updatePayload)
      .eq("id", etapaId);

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
    console.error("[PATCH /checklist-mobilizacao/etapas/[id]]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// ── DELETE ──────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth("admin");
    const { id } = await params;
    const etapaId = Number(id);
    if (!etapaId || isNaN(etapaId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const db = createServerClient();

    // Remove subetapas associadas primeiro
    const { error: delSubError } = await db
      .from("checklist_subetapas")
      .delete()
      .eq("etapa_id", etapaId);

    if (delSubError) throw new Error(delSubError.message);

    // Remove a etapa
    const { error: delError } = await db
      .from("checklist_etapas")
      .delete()
      .eq("id", etapaId);

    if (delError) throw new Error(delError.message);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[DELETE /checklist-mobilizacao/etapas/[id]]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
