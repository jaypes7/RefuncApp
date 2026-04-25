/**
 * ============================================================================
 * API: /api/pendencias
 * ============================================================================
 * GET  → lista todas as pendências manuais (order: created_at DESC)
 * POST → cria uma pendência manual nova
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAuth, resolveCentroCusto } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

const PendenciaCreateSchema = z.object({
  texto: z.string().trim().min(1, "Texto obrigatório"),
});

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const db = createServerClient();

    const { searchParams } = new URL(request.url);
    const ccParam = searchParams.get("centro_custo")?.trim() || undefined;
    const centroCusto = resolveCentroCusto(currentUser, ccParam);

    let query = db
      .from("pendencias_manuais")
      .select("id, texto, created_at, centro_custo")
      .order("created_at", { ascending: false });

    if (centroCusto?.length) {
      query = query.in("centro_custo", centroCusto);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[GET /api/pendencias]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth("user");
    const body = await request.json();
    const { texto } = PendenciaCreateSchema.parse(body);

    const ccBody = (body as { centro_custo?: string | string[] }).centro_custo;
    const ccAtivo = Array.isArray(ccBody) && ccBody.length > 0
      ? ccBody[0]
      : (typeof ccBody === "string" ? ccBody : null);

    const db = createServerClient();
    const { data: row, error } = await db
      .from("pendencias_manuais")
      .insert({ texto, centro_custo: ccAtivo || null })
      .select("id, texto, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/pendencias]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
