/**
 * ============================================================================
 * API: GET /api/dashboard/rh
 * ============================================================================
 *
 * Métricas de RH: perfil demográfico e funcional dos colaboradores.
 *
 * Fonte: colaboradores
 * SELECT: cpf, nome, funcao_clt, idade, status, data_admissao, termino, aso
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth, resolveCentroCusto } from "@/lib/auth";

// ============================================================================
// GET /api/dashboard/rh
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth("user");

    const { searchParams } = new URL(request.url);
    const ccParam = searchParams.get("centro_custo") || undefined;
    const centroCusto = resolveCentroCusto(currentUser, ccParam);

    const db = createServerClient();
    let query = db
      .from("colaboradores")
      .select("cpf,nome,funcao_clt,idade,status,data_admissao,termino,aso,uf");
    if (centroCusto?.length) query = query.in("centro_custo", centroCusto);
    const { data, error } = await query;

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<Record<string, unknown>>;

    // ── Métricas básicas ─────────────────────────────────────────────────────
    const comId = rows.filter((r) => r["cpf"] && r["nome"]);
    const totalCadastrados = comId.length;
    const totalAdmitidos = comId.filter(
      (r) => r["data_admissao"] || (r["status"] && r["status"] !== "Pendente"),
    ).length;
    const aptoCount = comId.filter((r) => r["aso"] === "Apto").length;
    const percentualASO =
      totalCadastrados > 0 ? Math.round((aptoCount / totalCadastrados) * 10000) / 100 : 0;

    // ── Distribuição por faixa etária ────────────────────────────────────────
    const faixas: Record<string, number> = { "18-25": 0, "26-35": 0, "36-45": 0, "46+": 0 };
    for (const r of comId) {
      const idade = parseInt(String(r["idade"] ?? ""), 10);
      if (isNaN(idade) || idade < 18) continue;
      if (idade <= 25) faixas["18-25"]++;
      else if (idade <= 35) faixas["26-35"]++;
      else if (idade <= 45) faixas["36-45"]++;
      else faixas["46+"]++;
    }
    const distribuicaoIdades = Object.entries(faixas).map(([faixa, total]) => ({ faixa, total }));

    // ── Distribuição por função CLT ──────────────────────────────────────────
    const funcaoMap: Record<string, number> = {};
    for (const r of comId) {
      const fn = String(r["funcao_clt"] ?? "").trim();
      if (fn) funcaoMap[fn] = (funcaoMap[fn] || 0) + 1;
    }
    const distribuicaoFuncoes = Object.entries(funcaoMap)
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total);

    // ── Término detalhado — linhas brutas para tabela agrupada ───────────────
    // SELECT nome, funcao_clt, termino WHERE termino IS NOT NULL
    // ORDER BY funcao_clt ASC, termino ASC
    const terminoDetalhado = comId
      .filter((r) => r["termino"] && String(r["termino"]).trim() !== "")
      .map((r) => ({
        nome:       String(r["nome"] ?? "").trim(),
        funcao_clt: r["funcao_clt"] ? String(r["funcao_clt"]).trim() : null,
        termino:    String(r["termino"]).split("T")[0], // normaliza para YYYY-MM-DD
        status:     r["status"] ? String(r["status"]).trim() : null,
        uf:         r["uf"]     ? String(r["uf"]).trim().toUpperCase() : null,
      }))
      .sort((a, b) => {
        const fnCmp = (a.funcao_clt ?? "").localeCompare(b.funcao_clt ?? "", "pt-BR");
        if (fnCmp !== 0) return fnCmp;
        return a.termino.localeCompare(b.termino);
      });

    return NextResponse.json({
      metricas: { totalCadastrados, totalAdmitidos, percentualASO },
      agregacoes: { distribuicaoIdades, distribuicaoFuncoes, terminoDetalhado },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado: privilégios insuficientes" }, { status: 403 });
    }
    console.error("[GET /api/dashboard/rh]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
