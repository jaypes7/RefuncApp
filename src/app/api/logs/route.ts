/**
 * ============================================================================
 * API: GET /api/logs
 * ============================================================================
 *
 * Retorna registros de auditoria da tabela `logs_auditoria`.
 * O campo `created_at` é mapeado para `timestamp` na resposta.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  try {
    await requireAuth();
    const db = createServerClient();
    const { data, error } = await db
      .from("logs_auditoria")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const mapped = (data ?? []).map((row: Record<string, unknown>) => ({
      ...row,
      timestamp: row.created_at,
    }));

    return NextResponse.json({ data: mapped });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[/api/logs GET]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
