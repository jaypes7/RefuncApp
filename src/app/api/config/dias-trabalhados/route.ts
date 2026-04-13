/**
 * ============================================================================
 * API: /api/config/dias-trabalhados
 * ============================================================================
 * GET  → retorna os dias trabalhados do projeto
 * POST → atualiza os dias trabalhados do projeto
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const centroCusto = searchParams.get("centro_custo") || "09.06.0001.171";

    const db = createServerClient();
    const { data, error } = await db
      .from("configuracoes")
      .select("dias_trabalhados")
      .eq("centro_custo", centroCusto)
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      dias_trabalhados: data?.dias_trabalhados || [] 
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[GET /api/config/dias-trabalhados]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { dias_trabalhados, centro_custo } = body;
    const targetCentroCusto = centro_custo || "09.06.0001.171";

    if (!Array.isArray(dias_trabalhados)) {
      return NextResponse.json(
        { error: "dias_trabalhados deve ser um array" },
        { status: 400 }
      );
    }

    // Valida formato das datas (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const invalidDates = dias_trabalhados.filter((d) => !dateRegex.test(d));
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
        dias_trabalhados: dias_trabalhados.sort(),
        updated_at: new Date().toISOString(),
      })
      .eq("centro_custo", targetCentroCusto);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[POST /api/config/dias-trabalhados]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
