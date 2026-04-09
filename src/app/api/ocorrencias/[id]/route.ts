/**
 * ============================================================================
 * API: /api/ocorrencias/[id]
 * ============================================================================
 * DELETE → remove uma ocorrência pelo ID numérico
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth();

    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const db = createServerClient();
    const { error } = await db.from("ocorrencias").delete().eq("id", numId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[DELETE /api/ocorrencias/[id]]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
