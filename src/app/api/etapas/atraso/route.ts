/**
 * ============================================================================
 * API: /api/etapas/atraso
 * ============================================================================
 *
 * GET    → busca registros de atraso das etapas de um projeto
 * POST   → upsert de um registro de atraso (dias_extras, motivo)
 * DELETE → remove o registro de atraso de uma etapa
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
  datas_atraso: z
    .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: YYYY-MM-DD"))
    .optional(),
  data_inicio_atraso: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: YYYY-MM-DD")
    .nullable()
    .optional(),
  dias_extras: z.number().int().min(0).optional(),
  motivo: z.string().max(500).nullable().optional(),
});

const DeleteSchema = z.object({
  centro_custo: z.string().min(1),
  etapa_id: z.number().int().min(1),
});

function addCalendarDays(date: string, days: number): string {
  const next = new Date(date + "T00:00:00Z");
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().split("T")[0];
}

function normalizeDates(dates: string[] | null | undefined): string[] {
  return [...new Set(dates ?? [])].sort();
}

function legacyDates(dataInicio: string | null | undefined, diasExtras: number | null | undefined): string[] {
  if (!dataInicio || !diasExtras || diasExtras <= 0) return [];
  return Array.from({ length: diasExtras }, (_, index) => addCalendarDays(dataInicio, index));
}

// ============================================================================
// GET /api/etapas/atraso?centro_custo=X
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const centroCusto = searchParams.get("centro_custo");

    const supabase = createServerClient();

    let query = supabase
      .from("etapas_atraso")
      .select("etapa_id, data_inicio_atraso, dias_extras, motivo, datas_atraso");

    if (centroCusto) {
      query = query.eq("centro_custo", centroCusto);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    const normalized = (data ?? []).map((row) => {
      const datasAtraso = normalizeDates(row.datas_atraso);
      return {
        ...row,
        datas_atraso: datasAtraso.length > 0
          ? datasAtraso
          : legacyDates(row.data_inicio_atraso, row.dias_extras),
      };
    });

    return NextResponse.json({ data: normalized });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[GET /api/etapas/atraso]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/etapas/atraso
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    await requireAuth("admin");

    const body = await request.json();
    const parsed = UpsertSchema.parse(body);
    const datasAtraso = normalizeDates(
      parsed.datas_atraso ?? legacyDates(parsed.data_inicio_atraso, parsed.dias_extras),
    );

    const supabase = createServerClient();

    const { error } = await supabase.from("etapas_atraso").upsert(
      {
        centro_custo: parsed.centro_custo,
        etapa_id: parsed.etapa_id,
        data_inicio_atraso: datasAtraso[0] ?? null,
        dias_extras: datasAtraso.length,
        datas_atraso: datasAtraso,
        motivo: parsed.motivo ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "centro_custo,etapa_id" },
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
    console.error("[POST /api/etapas/atraso]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// ============================================================================
// DELETE /api/etapas/atraso
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    await requireAuth("admin");

    const body = await request.json();
    const parsed = DeleteSchema.parse(body);

    const supabase = createServerClient();

    const { error } = await supabase.from("etapas_atraso").delete().match({
      centro_custo: parsed.centro_custo,
      etapa_id: parsed.etapa_id,
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    console.error("[DELETE /api/etapas/atraso]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
