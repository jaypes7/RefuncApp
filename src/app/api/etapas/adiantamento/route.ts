/**
 * ============================================================================
 * API: /api/etapas/adiantamento
 * ============================================================================
 *
 * GET    -> busca registros de adiantamento das etapas de um projeto
 * POST   -> upsert de um registro de adiantamento (datas_adiantamento, motivo)
 * DELETE -> remove o registro de adiantamento de uma etapa
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: YYYY-MM-DD");

const UpsertSchema = z.object({
  centro_custo: z.string().min(1),
  etapa_id: z.number().int().min(1),
  datas_adiantamento: z.array(DateSchema).optional(),
  data_inicio_adiantamento: DateSchema.nullable().optional(),
  dias_adiantados: z.number().int().min(0).optional(),
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

function legacyDates(dataInicio: string | null | undefined, diasAdiantados: number | null | undefined): string[] {
  if (!dataInicio || !diasAdiantados || diasAdiantados <= 0) return [];
  return Array.from({ length: diasAdiantados }, (_, index) => addCalendarDays(dataInicio, index));
}

// ============================================================================
// GET /api/etapas/adiantamento?centro_custo=X
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const centroCusto = searchParams.get("centro_custo");

    const supabase = createServerClient();

    let query = supabase
      .from("etapas_adiantamento")
      .select("etapa_id, data_inicio_adiantamento, dias_adiantados, motivo, datas_adiantamento");

    if (centroCusto) {
      query = query.eq("centro_custo", centroCusto);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    const normalized = (data ?? []).map((row) => {
      const datasAdiantamento = normalizeDates(row.datas_adiantamento);
      return {
        ...row,
        datas_adiantamento: datasAdiantamento.length > 0
          ? datasAdiantamento
          : legacyDates(row.data_inicio_adiantamento, row.dias_adiantados),
      };
    });

    return NextResponse.json({ data: normalized });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    console.error("[GET /api/etapas/adiantamento]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/etapas/adiantamento
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    await requireAuth("admin");

    const body = await request.json();
    const parsed = UpsertSchema.parse(body);
    const datasAdiantamento = normalizeDates(
      parsed.datas_adiantamento ?? legacyDates(parsed.data_inicio_adiantamento, parsed.dias_adiantados),
    );

    const supabase = createServerClient();

    const { error } = await supabase.from("etapas_adiantamento").upsert(
      {
        centro_custo: parsed.centro_custo,
        etapa_id: parsed.etapa_id,
        data_inicio_adiantamento: datasAdiantamento[0] ?? null,
        dias_adiantados: datasAdiantamento.length,
        datas_adiantamento: datasAdiantamento,
        motivo: parsed.motivo ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "centro_custo,etapa_id" },
    );

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados invalidos" }, { status: 400 });
    }
    console.error("[POST /api/etapas/adiantamento]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// ============================================================================
// DELETE /api/etapas/adiantamento
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    await requireAuth("admin");

    const body = await request.json();
    const parsed = DeleteSchema.parse(body);

    const supabase = createServerClient();

    const { error } = await supabase.from("etapas_adiantamento").delete().match({
      centro_custo: parsed.centro_custo,
      etapa_id: parsed.etapa_id,
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados invalidos" }, { status: 400 });
    }
    console.error("[DELETE /api/etapas/adiantamento]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
