/**
 * ============================================================================
 * API: /api/colaboradores/[id]/alimentacao
 * ============================================================================
 *
 * GET → Busca configuração de alimentação do colaborador
 * PUT → Atualiza configuração de alimentação
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { ColaboradorAlimentacaoUpdateSchema } from "@/lib/schemas";

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
      .from("colaborador_alimentacao")
      .select("*")
      .eq("colaborador_id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);

    // Se não existir, retorna objeto vazio (o trigger deveria ter criado)
    if (!data) {
      return NextResponse.json({
        data: { colaborador_id: id, credito_vr_almoco: false, credito_vr_janta: false },
      });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /colaboradores/[id]/alimentacao]", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// ============================================================================
// PUT
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth("user");
    const { id } = await params;

    const supabase = createServerClient();
    const body = await request.json();
    const validated = ColaboradorAlimentacaoUpdateSchema.parse(body);

    // Upsert: insere se não existir, atualiza se existir
    const { data, error } = await supabase
      .from("colaborador_alimentacao")
      .upsert({ ...validated, colaborador_id: id }, { onConflict: "colaborador_id" })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[PUT /colaboradores/[id]/alimentacao]", error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
