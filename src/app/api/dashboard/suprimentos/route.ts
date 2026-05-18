/**
 * ============================================================================
 * API: GET /api/dashboard/suprimentos
 * ============================================================================
 *
 * Fontes reais (schema Supabase):
 *   • suprimentos_ordens_compra    → valor, valor_previsto, requisicao_id
 *   • suprimentos_recebimentos     → requisicao_id, tipo ('total'|'parcial')
 *   • suprimentos_requisicoes      → id, status
 *   • suprimentos_requisicao_itens → requisicao_id, categoria, tipo
 *   • configuracoes                → orcado_suprimentos
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth, resolveCentroCusto } from "@/lib/auth";

// ============================================================================
// GET /api/dashboard/suprimentos
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth("user");

    const { searchParams } = new URL(request.url);
    const ccParam     = searchParams.get("centro_custo") || undefined;
    const centroCusto = resolveCentroCusto(currentUser, ccParam);

    const db = createServerClient();

    // Config filtrada por centro_custo
    let configQuery = db.from("configuracoes").select("orcado_suprimentos");
    if (centroCusto?.length) {
      configQuery = configQuery.in("centro_custo", centroCusto) as typeof configQuery;
    }

    const [
      { data: ocsData,   error: ocsErr   },
      { data: recebData },
      { data: reqData   },
      { data: itensData },
      { data: configRows },
    ] = await Promise.all([
      db.from("suprimentos_ordens_compra").select("id, requisicao_id, valor, valor_previsto"),
      db.from("suprimentos_recebimentos").select("requisicao_id, tipo"),
      db.from("suprimentos_requisicoes").select("id, status"),
      db.from("suprimentos_requisicao_itens").select("requisicao_id, categoria, tipo"),
      configQuery,
    ]);

    if (ocsErr) throw new Error(ocsErr.message);

    // ── Orçado ────────────────────────────────────────────────────────────────
    const orcado = ((configRows ?? []) as Array<{ orcado_suprimentos?: number }>).reduce(
      (s, c) => s + Number(c.orcado_suprimentos ?? 0),
      0,
    );

    type OcRow   = { id: string; requisicao_id: string; valor: number | null; valor_previsto: number | null };
    type RecRow  = { requisicao_id: string; tipo: string };
    type ReqRow  = { id: string; status: string };
    type ItemRow = { requisicao_id: string; categoria: string; tipo: string };

    const ocs         = (ocsData   ?? []) as OcRow[];
    const recebimentos = (recebData ?? []) as RecRow[];
    const requisicoes  = (reqData   ?? []) as ReqRow[];
    const itens        = (itensData ?? []) as ItemRow[];

    // ── KPIs ──────────────────────────────────────────────────────────────────
    const totalInvestido = ocs.reduce((s, oc) => s + Number(oc.valor ?? 0), 0);
    const totalOrdens    = ocs.length;

    // Requisições com recebimento tipo 'total' = entregues
    const reqsEntregues = new Set(
      recebimentos.filter((r) => r.tipo === "total").map((r) => r.requisicao_id),
    );
    const entregues  = ocs.filter((oc) => reqsEntregues.has(oc.requisicao_id)).length;
    const totalAPagar = ocs
      .filter((oc) => !reqsEntregues.has(oc.requisicao_id))
      .reduce((s, oc) => s + Number(oc.valor ?? 0), 0);

    // ── Distribuição por status (das requisições) ──────────────────────────────
    const statusMap: Record<string, number> = {};
    for (const req of requisicoes) {
      const st = req.status ?? "";
      if (st) statusMap[st] = (statusMap[st] || 0) + 1;
    }
    const distribuicaoStatus = Object.entries(statusMap)
      .map(([status, total]) => ({ status, total }))
      .sort((a, b) => b.total - a.total);

    // ── Categoria e tipo via join OC + itens ──────────────────────────────────
    const ocsPorReq: Record<string, number> = {};
    for (const oc of ocs) {
      ocsPorReq[oc.requisicao_id] = (ocsPorReq[oc.requisicao_id] ?? 0) + Number(oc.valor ?? 0);
    }

    const itensPorReq: Record<string, { categoria: string; tipo: string }[]> = {};
    for (const item of itens) {
      if (!item.requisicao_id) continue;
      (itensPorReq[item.requisicao_id] ??= []).push({
        categoria: item.categoria ?? "Sem categoria",
        tipo:      item.tipo      ?? "item",
      });
    }

    const categoriaMap: Record<string, number> = {};
    const tipoMap:      Record<string, number> = {};

    for (const [reqId, ocValor] of Object.entries(ocsPorReq)) {
      const itensList = itensPorReq[reqId] ?? [];
      if (!itensList.length) continue;
      const share = ocValor / itensList.length;
      for (const item of itensList) {
        categoriaMap[item.categoria] = (categoriaMap[item.categoria] ?? 0) + share;
        tipoMap[item.tipo]           = (tipoMap[item.tipo]           ?? 0) + share;
      }
    }

    const porCategoria = Object.entries(categoriaMap)
      .map(([categoria, valor]) => ({ categoria, valor: Math.round(valor * 100) / 100 }))
      .sort((a, b) => b.valor - a.valor);

    const sgpPorTipo = Object.entries(tipoMap)
      .map(([tipo, valor]) => ({ tipo, valor: Math.round(valor * 100) / 100 }));

    return NextResponse.json({
      suprimentos: {
        totalInvestido:     Math.round(totalInvestido  * 100) / 100,
        totalOrdens,
        entregues,
        percentualEntregue: totalOrdens > 0 ? Math.round((entregues / totalOrdens) * 100) : 0,
        orcado,
        distribuicaoStatus,
        totalAPagar:  Math.round(totalAPagar * 100) / 100,
        porCategoria,
        sgpPorTipo,
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
