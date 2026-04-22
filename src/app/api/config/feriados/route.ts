/**
 * ============================================================================
 * API: /api/config/feriados
 * ============================================================================
 * GET  → retorna os feriados manuais do projeto
 * POST → atualiza os feriados manuais do projeto
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth, resolveCentroCusto } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();

    const { searchParams } = new URL(request.url);
    const ccParam = searchParams.get("centro_custo") || undefined;
    const centroCusto = resolveCentroCusto(currentUser, ccParam)?.[0] || "09.06.0001.171";

    const db = createServerClient();
    const { data, error } = await db
      .from("configuracoes")
      .select("feriados_projeto")
      .eq("centro_custo", centroCusto)
      .single();

    if (error) throw error;

    return NextResponse.json({
      feriados: (data?.feriados_projeto as string[]) || [],
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[GET /api/config/feriados]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth();

    const body = await request.json();
    const { feriados, centro_custo } = body;
    const targetCentroCusto = resolveCentroCusto(currentUser, centro_custo)?.[0] || "09.06.0001.171";

    if (!Array.isArray(feriados)) {
      return NextResponse.json(
        { error: "feriados deve ser um array" },
        { status: 400 }
      );
    }

    // Valida formato das datas (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const invalidDates = feriados.filter((d) => !dateRegex.test(d));
    if (invalidDates.length > 0) {
      return NextResponse.json(
        { error: "Datas devem estar no formato YYYY-MM-DD", invalidDates },
        { status: 400 }
      );
    }

    const db = createServerClient();
    const { error } = await db
      .from("configuracoes")
      .update({
        feriados_projeto: feriados.length > 0 ? feriados.sort() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("centro_custo", targetCentroCusto);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[POST /api/config/feriados]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
