/**
 * ============================================================================
 * API: /api/colaboradores/[id]/treinamentos
 * ============================================================================
 *
 * GET → Lista todos os treinamentos do colaborador (com dados do catálogo)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

// ============================================================================
// GET
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth("user");
    const { id } = await params;

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("colaborador_treinamentos")
      .select(`
        *,
        treinamento:treinamentos(id, nome, descricao, obrigatorio, prazo_validade_meses)
      `)
      .eq("colaborador_id", id)
      .order("status", { ascending: false });

    if (error) throw new Error(error.message);
    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error("[GET /colaboradores/[id]/treinamentos]", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
