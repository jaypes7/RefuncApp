/**
 * ============================================================================
 * API: /api/colaboradores/[id]/hospedagens
 * ============================================================================
 *
 * GET  → Lista hospedagens do colaborador
 * POST → Cria nova hospedagem
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { ColaboradorHospedagemCreateSchema } from "@/lib/schemas";

// ============================================================================
// GET /api/colaboradores/[id]/hospedagens
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
      .from("colaborador_hospedagens")
      .select("*")
      .eq("colaborador_id", id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error("[GET /colaboradores/[id]/hospedagens]", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/colaboradores/[id]/hospedagens
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth("user");
    const { id } = await params;

    const supabase = createServerClient();
    const { data: colab, error: colabErr } = await supabase
      .from("colaboradores")
      .select("id")
      .eq("id", id)
      .single();
    if (colabErr || !colab) {
      return NextResponse.json({ error: "Colaborador não encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const validated = ColaboradorHospedagemCreateSchema.parse(body);

    const { data, error } = await supabase
      .from("colaborador_hospedagens")
      .insert({ ...validated, colaborador_id: id })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("[POST /colaboradores/[id]/hospedagens]", error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
