/**
 * ============================================================================
 * API: /api/colaboradores/[id]/passagens
 * ============================================================================
 *
 * GET  → Lista passagens do colaborador com seus trechos
 * POST → Cria nova passagem (com trechos opcionais)
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { ColaboradorPassagemCreateSchema } from "@/lib/schemas";

async function findColaborador(supabase: ReturnType<typeof createServerClient>, id: string) {
  const { data, error } = await supabase.from("colaboradores").select("id, cpf, nome").eq("id", id).single();
  return { data, error };
}

// ============================================================================
// GET /api/colaboradores/[id]/passagens
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth("user");
    const { id } = await params;

    const supabase = createServerClient();
    const { data: colab, error: colabErr } = await findColaborador(supabase, id);
    if (colabErr || !colab) {
      return NextResponse.json({ error: "Colaborador não encontrado" }, { status: 404 });
    }

    const { data: passagens, error } = await supabase
      .from("colaborador_passagens")
      .select(`
        *,
        trechos:passagem_trechos(*)
      `)
      .eq("colaborador_id", id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ data: passagens ?? [] });
  } catch (error) {
    console.error("[GET /colaboradores/[id]/passagens]", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/colaboradores/[id]/passagens
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth("user");
    const { id } = await params;

    const supabase = createServerClient();
    const { data: colab, error: colabErr } = await findColaborador(supabase, id);
    if (colabErr || !colab) {
      return NextResponse.json({ error: "Colaborador não encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const validated = ColaboradorPassagemCreateSchema.parse(body);

    // 1. Insere a passagem
    const { data: passagem, error: passagemErr } = await supabase
      .from("colaborador_passagens")
      .insert({ ...validated, colaborador_id: id })
      .select()
      .single();

    if (passagemErr) throw new Error(`Erro ao criar passagem: ${passagemErr.message}`);

    // 2. Insere os trechos se houver
    const trechos = validated.trechos ?? [];
    if (trechos.length > 0) {
      const trechosComPassagemId = trechos.map((t, idx) => ({
        ...t,
        passagem_id: passagem.id,
        ordem: t.ordem ?? idx + 1,
      }));

      const { error: trechosErr } = await supabase.from("passagem_trechos").insert(trechosComPassagemId);
      if (trechosErr) throw new Error(`Erro ao criar trechos: ${trechosErr.message}`);
    }

    // 3. Retorna a passagem completa
    const { data: passagemCompleta, error: fetchErr } = await supabase
      .from("colaborador_passagens")
      .select(`*, trechos:passagem_trechos(*)`)
      .eq("id", passagem.id)
      .single();

    if (fetchErr) throw new Error(fetchErr.message);

    return NextResponse.json({ data: passagemCompleta }, { status: 201 });
  } catch (error) {
    console.error("[POST /colaboradores/[id]/passagens]", error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
