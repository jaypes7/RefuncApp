/**
 * ============================================================================
 * API: /api/comentarios-cliente
 * ============================================================================
 * GET  → lista todos os comentários do cliente (order: data DESC, created_at DESC)
 * POST → cria um comentário novo (todos os perfis autenticados)
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAuth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

const ComentarioCreateSchema = z.object({
  texto: z.string().trim().min(1, "Texto obrigatório"),
  data: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const db = createServerClient();

    const { searchParams } = new URL(request.url);
    const centroCusto = searchParams.get("centro_custo")?.trim() ?? "";

    let query = db
      .from("comentarios_cliente")
      .select("id, texto, data, created_at")
      .order("data", { ascending: false })
      .order("created_at", { ascending: false });

    if (centroCusto) {
      query = query.eq("centro_custo", centroCusto);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[GET /api/comentarios-cliente]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const { texto, data } = ComentarioCreateSchema.parse(body);

    const centroCusto = (body as { centro_custo?: string }).centro_custo;

    const db = createServerClient();
    const { data: row, error } = await db
      .from("comentarios_cliente")
      .insert({ texto, data, centro_custo: centroCusto || null })
      .select("id, texto, data, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/comentarios-cliente]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
