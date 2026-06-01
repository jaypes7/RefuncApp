/**
 * ============================================================================
 * API: GET /api/seguranca/dashboard
 * ============================================================================
 *
 * Retorna métricas agregadas dos campos de Segurança da tabela `colaboradores`
 * para o Dashboard de Segurança.
 *
 * Resposta:
 *   total                    → contagem total de colaboradores
 *   distribuicaoStatusPortal → distribuição do campo `portal`
 *   distribuicaoRpv          → distribuição do campo `rpv`
 *   distribuicaoTreinamento  → distribuição do campo `treinamento`
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth, resolveCentroCusto } from "@/lib/auth";

// ── Tipos de resposta ─────────────────────────────────────────────────────────

interface DistRow { label: string; value: number; }

interface SegurancaDashboard {
  total: number;
  distribuicaoStatusPortal: DistRow[];
  distribuicaoRpv: DistRow[];
  distribuicaoTreinamento: DistRow[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function contagem(
  rows: Record<string, unknown>[],
  field: string,
  fallback = "Pendente",
): DistRow[] {
  const map: Record<string, number> = {};
  for (const row of rows) {
    const val = String(row[field] ?? fallback).trim() || fallback;
    map[val] = (map[val] ?? 0) + 1;
  }
  return Object.entries(map)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

// ============================================================================
// GET /api/seguranca/dashboard
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();

    // ── DEMO MODE ────────────────────────────────────────────────────────────
    if (process.env.DEMO_MODE === "true") {
      const { getDashboardSeguranca } = await import("@/lib/demo/repository");
      return NextResponse.json(getDashboardSeguranca());
    }

    const { searchParams } = new URL(request.url);
    const ccParam = searchParams.get("centro_custo") || undefined;
    const centroCusto = resolveCentroCusto(currentUser, ccParam);

    const db = createServerClient();

    let query = db
      .from("colaboradores")
      .select("portal, rpv, treinamento");

    if (centroCusto?.length) {
      query = query.in("centro_custo", centroCusto);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Record<string, unknown>[];
    const total = rows.length;

    const distribuicaoStatusPortal = contagem(rows, "portal", "Pendente");
    const distribuicaoRpv = contagem(rows, "rpv", "Pendente");
    const distribuicaoTreinamento = contagem(rows, "treinamento", "Pendente");

    const response: SegurancaDashboard = {
      total,
      distribuicaoStatusPortal,
      distribuicaoRpv,
      distribuicaoTreinamento,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[GET /api/seguranca/dashboard]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
