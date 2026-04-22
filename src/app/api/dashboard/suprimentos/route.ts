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

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth, resolveCentroCusto } from "@/lib/auth";

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

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth("user");

    const { searchParams } = new URL(request.url);
    const ccParam = searchParams.get("centro_custo") || undefined;
    const centroCusto = resolveCentroCusto(currentUser, ccParam);

    const db = createServerClient();

    let ordensQuery = db
      .from("suprimentos_ordens")
      .select(
        "id,ordem_compra,descricao,fornecedor,status,status_ordem,valor_oc,valores,entregue_obra,total_req_previstas",
      );
    if (centroCusto?.length) {
      ordensQuery = ordensQuery.in("centro_custo", centroCusto);
    }

    let configQuery = db.from("configuracoes").select("orcado_suprimentos");
    if (centroCusto?.length) configQuery = configQuery.in("centro_custo", centroCusto) as typeof configQuery;

    const [
      { data: ordensData, error: ordensErr },
      { data: configRows, error: configError },
    ] = await Promise.all([ordensQuery, configQuery]);

    if (ordensErr) throw new Error(ordensErr.message);

    if (configError) {
      console.error("[Dashboard/Suprimentos] config:", configError.message);
    }

    const orcado = ((configRows ?? []) as Array<{ orcado_suprimentos?: number }>).reduce(
      (s, c) => s + Number(c.orcado_suprimentos ?? 0),
      0,
    );

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
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado: privilégios insuficientes" }, { status: 403 });
    }
    console.error("[GET /api/dashboard/suprimentos]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
