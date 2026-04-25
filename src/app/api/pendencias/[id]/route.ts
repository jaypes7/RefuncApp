/**
 * ============================================================================
 * API: /api/pendencias/[id]
 * ============================================================================
 * PUT    → atualiza uma pendência manual pelo ID numérico
 * DELETE → remove uma pendência manual pelo ID numérico
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth("user");

    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const { texto } = body;

    if (!texto || !texto.trim()) {
      return NextResponse.json({ error: "Texto é obrigatório" }, { status: 400 });
    }

    const db = createServerClient();
    const { data: updated, error } = await db
      .from("pendencias_manuais")
      .update({ texto: texto.trim() })
      .eq("id", numId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[PUT /api/pendencias/[id]]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth("user");

    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const db = createServerClient();
    const { error } = await db.from("pendencias_manuais").delete().eq("id", numId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[DELETE /api/pendencias/[id]]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
