/**
 * ============================================================================
 * API: /api/checklist-mobilizacao/etapas/reordenar
 * ============================================================================
 *
 * PUT: Atualiza a ordem das etapas do checklist em lote.
 *      Body: { etapas: [{ id, ordem }] }
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { ChecklistEtapasReordenarSchema } from "@/lib/schemas";
import { ZodError } from "zod";

export async function PUT(request: NextRequest) {
  try {
    await requireAuth("admin");
    const body = await request.json();
    const parsed = ChecklistEtapasReordenarSchema.parse(body);

    const db = createServerClient();

    // Atualiza cada etapa individualmente (Supabase JS não suporta transaction)
    const updates = parsed.etapas.map((e) =>
      db
        .from("checklist_etapas")
        .update({ ordem: e.ordem })
        .eq("id", e.id),
    );

    const results = await Promise.all(updates);
    const errors = results.filter((r) => r.error);

    if (errors.length > 0) {
      console.error("[PUT /checklist-mobilizacao/etapas/reordenar] erros:", errors.map((e) => e.error?.message));
      return NextResponse.json(
        { error: "Erro ao atualizar ordem de algumas etapas" },
        { status: 500 },
      );
    }

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
    console.error("[PUT /checklist-mobilizacao/etapas/reordenar]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
