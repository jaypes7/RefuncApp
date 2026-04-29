/**
 * ============================================================================
 * API: GET /api/export/banco-talentos
 * ============================================================================
 *
 * Exporta todos os talentos do banco de talentos sem paginação.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { logExport } from "@/lib/logs";

export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuth("admin");
    const supabase = createServerClient();

    const { data: rows, error } = await supabase
      .from("banco_talentos")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      throw new Error(`Falha ao buscar banco de talentos: ${error.message}`);
    }

    const talentos = rows ?? [];

    try {
      await logExport(user.re, `${talentos.length} talentos`);
    } catch (logErr) {
      console.error("[Export Banco Talentos API] Erro ao registrar log:", logErr);
    }

    return NextResponse.json({
      data: talentos,
      total: talentos.length,
    });
  } catch (error) {
    console.error("[Export Banco Talentos API]", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Acesso negado: privilégios insuficientes" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
