/**
 * ============================================================================
 * API: GET /api/colaboradores/centros-custo
 * ============================================================================
 *
 * Retorna a lista de centros de custo distintos cadastrados nos colaboradores.
 * Usado para popular o dropdown de filtro na Central de Colaboradores.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth();

    const db = createServerClient();
    const { data, error } = await db
      .from("colaboradores")
      .select("centro_custo")
      .not("centro_custo", "is", null)
      .neq("centro_custo", "");

    if (error) throw new Error(error.message);

    const centros = [...new Set((data ?? []).map((r) => r.centro_custo as string))]
      .filter(Boolean)
      .sort();

    return NextResponse.json(centros);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[GET /api/colaboradores/centros-custo]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
