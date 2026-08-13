/**
 * ============================================================================
 * API: GET /api/treinamentos/resumo
 * ============================================================================
 *
 * Agregado de `colaborador_treinamentos` por colaborador, respeitando o centro
 * de custo do usuário. Alimenta o card "Status Geral" (dashboard e RH), que
 * antes lia a coluna legada `colaboradores.treinamento` — quase sempre vazia.
 *
 * Só entram vínculos aplicáveis (`aplicavel = true`). Colaboradores sem nenhum
 * treinamento aplicável simplesmente não aparecem na resposta; o cliente os
 * classifica como "sem cadastro" (ver `derivarStatusTreinamento`).
 *
 * Resposta: { data: ResumoTreinamentos[] }
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, fetchAllRows } from "@/lib/supabase";
import { requireAuth, resolveCentroCusto } from "@/lib/auth";
import type { ResumoTreinamentos } from "@/lib/treinamentos";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();

    const { searchParams } = new URL(request.url);
    const ccParam = searchParams.get("centro_custo") || undefined;
    // Users/guests têm o centro de custo fixado no JWT — ignora o param
    const centroCusto = resolveCentroCusto(currentUser, ccParam);

    const db = createServerClient();

    const rows = (await fetchAllRows((from, to) => {
      let q = db
        .from("colaborador_treinamentos")
        .select("colaborador_id, status, colaboradores!inner ( centro_custo )")
        .eq("aplicavel", true)
        .range(from, to);
      if (centroCusto?.length) q = q.in("colaboradores.centro_custo", centroCusto);
      return q;
    })) as unknown as Array<{ colaborador_id: string; status: string | null }>;

    const porColaborador = new Map<string, ResumoTreinamentos>();
    for (const r of rows) {
      let resumo = porColaborador.get(r.colaborador_id);
      if (!resumo) {
        resumo = {
          colaborador_id: r.colaborador_id,
          total: 0,
          ok: 0,
          aVencer: 0,
          vencido: 0,
          pendente: 0,
        };
        porColaborador.set(r.colaborador_id, resumo);
      }
      resumo.total += 1;
      const status = (r.status ?? "Pendente").trim() || "Pendente";
      if (status === "OK") resumo.ok += 1;
      else if (status === "A Vencer") resumo.aVencer += 1;
      else if (status === "Vencido") resumo.vencido += 1;
      else resumo.pendente += 1;
    }

    return NextResponse.json({ data: Array.from(porColaborador.values()) });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[GET /api/treinamentos/resumo]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
