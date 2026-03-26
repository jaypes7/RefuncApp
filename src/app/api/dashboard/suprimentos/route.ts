/**
 * ============================================================================
 * API: GET /api/dashboard/suprimentos
 * ============================================================================
 *
 * Métricas de suprimentos: ordens de compra, valores e entregas.
 *
 * Fontes:
 *   • suprimentos_ordens → id, ordem_compra, descricao, fornecedor, status,
 *                          status_ordem, valor_oc, valores, entregue_obra,
 *                          total_req_previstas
 *   • configuracoes      → orcado_suprimentos
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

// ============================================================================
// HELPERS
// ============================================================================

function cleanNumeric(val: unknown): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (typeof val === "string") {
    const cleaned = val.replace(/[R$\s.]/g, "").replace(",", ".");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

// ============================================================================
// GET /api/dashboard/suprimentos
// ============================================================================

export async function GET() {
  try {
    await requireAuth();

    const db = createServerClient();

    const [
      { data: ordensData, error: ordensErr },
      { data: configRow, error: configErr },
    ] = await Promise.all([
      db
        .from("suprimentos_ordens")
        .select(
          "id,ordem_compra,descricao,fornecedor,status,status_ordem,valor_oc,valores,entregue_obra,total_req_previstas",
        ),
      db.from("configuracoes").select("orcado_suprimentos").single(),
    ]);

    if (ordensErr) throw new Error(ordensErr.message);
    if (configErr && configErr.code !== "PGRST116") {
      console.error("[Dashboard/Suprimentos] config:", configErr.message);
    }

    const orcado = Number(configRow?.orcado_suprimentos ?? 0);
    const rows = (ordensData ?? []) as Array<Record<string, unknown>>;

    // ── Totalizadores ─────────────────────────────────────────────────────────
    const totalInvestido = rows.reduce((s, r) => s + cleanNumeric(r["valores"]), 0);
    const entregues      = rows.filter((r) => r["entregue_obra"] === true || r["entregue_obra"] === "Sim").length;

    const statusMap: Record<string, number> = {};
    for (const r of rows) {
      const st = String(r["status"] ?? "").trim();
      if (st) statusMap[st] = (statusMap[st] || 0) + 1;
    }
    const distribuicaoStatus = Object.entries(statusMap)
      .map(([status, total]) => ({ status, total }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      suprimentos: {
        totalInvestido: Math.round(totalInvestido * 100) / 100,
        totalOrdens: rows.length,
        entregues,
        percentualEntregue: rows.length > 0 ? Math.round((entregues / rows.length) * 100) : 0,
        orcado,
        distribuicaoStatus,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[GET /api/dashboard/suprimentos]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
