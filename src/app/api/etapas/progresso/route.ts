/**
 * ============================================================================
 * API: /api/etapas/progresso
 * ============================================================================
 *
 * GET  → busca todos os registros de progresso diário de um projeto
 * POST → upsert de um registro de progresso diário (centro_custo, etapa_id, data, percentual)
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

const UpsertSchema = z.object({
  centro_custo: z.string().min(1),
  etapa_id: z.number().int().min(1),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: YYYY-MM-DD"),
  percentual: z.number().min(0).max(100).nullable().optional(),
});

// ============================================================================
// GET /api/etapas/progresso?centro_custo=X
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const centroCusto = searchParams.get("centro_custo");

    const supabase = createServerClient();

    let query = supabase
      .from("etapas_progresso_diario")
      .select("etapa_id, data, percentual")
      .order("data", { ascending: true });

    if (centroCusto) {
      query = query.eq("centro_custo", centroCusto);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[GET /api/etapas/progresso]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/etapas/progresso
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    await requireAuth("admin");

    const body = await request.json();
    const parsed = UpsertSchema.parse(body);

    const supabase = createServerClient();

    if (parsed.percentual == null) {
      const { error } = await supabase
        .from("etapas_progresso_diario")
        .delete()
        .match({
          centro_custo: parsed.centro_custo,
          etapa_id: parsed.etapa_id,
          data: parsed.data,
        });

      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, deleted: true });
    }

    const { error } = await supabase
      .from("etapas_progresso_diario")
      .upsert(
        {
          centro_custo: parsed.centro_custo,
          etapa_id: parsed.etapa_id,
          data: parsed.data,
          percentual: parsed.percentual,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "centro_custo,etapa_id,data" },
      );

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    console.error("[POST /api/etapas/progresso]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
