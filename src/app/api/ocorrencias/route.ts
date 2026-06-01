/**
 * ============================================================================
 * API: /api/ocorrencias
 * ============================================================================
 * GET  → lista todas as ocorrências (order: data DESC, created_at DESC)
 * POST → cria uma ocorrência nova
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireAuth, resolveCentroCusto } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

const OcorrenciaCreateSchema = z.object({
  texto: z.string().trim().min(1, "Texto obrigatório"),
  data: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
});

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();

    if (process.env.DEMO_MODE === "true") {
      const { DEMO_OCORRENCIAS } = await import("@/lib/demo/repository");
      return NextResponse.json(DEMO_OCORRENCIAS);
    }

    const db = createServerClient();

    const { searchParams } = new URL(request.url);
    const ccParam = searchParams.get("centro_custo")?.trim() || undefined;
    const centroCusto = resolveCentroCusto(currentUser, ccParam);

    let query = db
      .from("ocorrencias")
      .select("id, texto, data, created_at, centro_custo")
      .order("data", { ascending: false })
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
    console.error("[GET /api/ocorrencias]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth("user");
    const body = await request.json();

    if (process.env.DEMO_MODE === "true") {
      const { demoWrite } = await import("@/lib/demo/handler");
      return demoWrite(body);
    }

    const { texto, data } = OcorrenciaCreateSchema.parse(body);

    // Extrai centro_custo do body e normaliza para string única
    const ccBody = (body as { centro_custo?: string | string[] }).centro_custo;
    const ccAtivo = Array.isArray(ccBody) && ccBody.length > 0
      ? ccBody[0]
      : (typeof ccBody === "string" ? ccBody : null);

    const db = createServerClient();
    const { data: row, error } = await db
      .from("ocorrencias")
      .insert({ texto, data, centro_custo: ccAtivo || null })
      .select("id, texto, data, created_at")
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
    console.error("[POST /api/ocorrencias]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
