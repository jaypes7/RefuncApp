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
// POST — vincula um treinamento do catálogo ao colaborador
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth("user");
    const { id } = await params;
    const supabase = createServerClient();
    const body = await request.json();

    if (!body.treinamento_id) {
      return NextResponse.json({ error: "treinamento_id é obrigatório" }, { status: 400 });
    }

    // Upsert: se já existe vínculo (criado pelo trigger), marca como aplicável;
    // se não existe (ex.: treinamento recém-criado em "Outros"), cria.
    const { data, error } = await supabase
      .from("colaborador_treinamentos")
      .upsert(
        {
          colaborador_id: id,
          treinamento_id: body.treinamento_id,
          aplicavel: true,
          ...(body.data_realizacao !== undefined ? { data_realizacao: body.data_realizacao } : {}),
          ...(body.data_validade !== undefined ? { data_validade: body.data_validade } : {}),
        },
        { onConflict: "colaborador_id,treinamento_id" },
      )
      .select(`
        *,
        treinamento:treinamentos(id, nome, descricao, obrigatorio, prazo_validade_meses)
      `)
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("[POST /colaboradores/[id]/treinamentos]", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

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
