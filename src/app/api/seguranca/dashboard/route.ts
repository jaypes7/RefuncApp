/**
 * ============================================================================
 * API: GET /api/seguranca/dashboard
 * ============================================================================
 *
 * Retorna métricas agregadas da tabela `seguranca_fits` para o
 * Dashboard de Segurança.
 *
 * Resposta:
 *   total          → contagem total de FITs
 *   distribuicaoAso        → { Apto, Inapto, Pendente }
 *   distribuicaoTreinamento → { Concluído, Em Andamento, Pendente }
 *   distribuicaoStatusPortal → { "Aprovado", "Pendente", "Aprovado - DEMITIDO" }
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

// ── Tipos de resposta ─────────────────────────────────────────────────────────

interface DistRow { label: string; value: number; }

interface SegurancaDashboard {
  total:                    number;
  distribuicaoRpv:          DistRow[];
  distribuicaoTreinamento:  DistRow[];
  distribuicaoStatusPortal: DistRow[];
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

export async function GET() {
  try {
    await requireAuth();

    const db = createServerClient();
    const { data, error, count } = await db
      .from("seguranca_fits")
      .select("rpv,treinamento,status_portal", { count: "exact" });

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Record<string, unknown>[];
    const total = count ?? rows.length;

    const response: SegurancaDashboard = {
      total,
      distribuicaoRpv:          contagem(rows, "rpv"),
      distribuicaoTreinamento:  contagem(rows, "treinamento"),
      distribuicaoStatusPortal: contagem(rows, "status_portal"),
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
