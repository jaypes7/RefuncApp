/**
 * ============================================================================
 * API: GET /api/dashboard/suprimentos
 * ============================================================================
 *
 * Fontes reais (schema Supabase):
 *   • suprimentos_ordens_compra      → valor, valor_previsto, requisicao_id, previsao_entrega, numero_oc
 *   • suprimentos_recebimentos       → requisicao_id, tipo ('total'|'parcial'), id
 *   • suprimentos_recebimento_itens  → recebimento_id, item_id, quantidade_recebida
 *   • suprimentos_requisicoes        → id, status
 *   • suprimentos_requisicao_itens   → requisicao_id, categoria, tipo, nome_item, quantidade
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

    const [
      { data: ocsData,   error: ocsErr   },
      { data: recebData },
      { data: recebItensData },
      { data: reqData   },
      { data: itensData },
    ] = await Promise.all([
      db.from("suprimentos_ordens_compra")
        .select("id, requisicao_id, numero_oc, fornecedor, valor, valor_previsto, previsao_entrega"),
      db.from("suprimentos_recebimentos")
        .select("id, requisicao_id, tipo, data_recebimento"),
      db.from("suprimentos_recebimento_itens")
        .select("recebimento_id, item_id, quantidade_recebida"),
      db.from("suprimentos_requisicoes").select("id, status"),
      db.from("suprimentos_requisicao_itens")
        .select("id, requisicao_id, nome_item, categoria, tipo, quantidade"),
    ]);

    if (ocsErr) throw new Error(ocsErr.message);

    type OcRow   = {
      id: string; requisicao_id: string; numero_oc: string;
      fornecedor: string; valor: number | null; valor_previsto: number | null;
      previsao_entrega: string | null;
    };
    type RecRow  = { id: string; requisicao_id: string; tipo: string; data_recebimento: string };
    type RecItemRow = { recebimento_id: string; item_id: string; quantidade_recebida: number };
    type ReqRow  = { id: string; status: string };
    type ItemRow = { id: string; requisicao_id: string; nome_item: string; categoria: string; tipo: string; quantidade: number };

    const ocs          = (ocsData       ?? []) as OcRow[];
    const recebimentos = (recebData     ?? []) as RecRow[];
    const recebItens   = (recebItensData ?? []) as RecItemRow[];
    const requisicoes  = (reqData       ?? []) as ReqRow[];
    const itens        = (itensData     ?? []) as ItemRow[];

    // ── Conjuntos de requisições por estado de entrega ────────────────────────
    const reqsComRecebimentoTotal = new Set(
      recebimentos.filter((r) => r.tipo === "total").map((r) => r.requisicao_id),
    );
    const reqsComRecebimentoParcial = new Set(
      recebimentos.filter((r) => r.tipo === "parcial").map((r) => r.requisicao_id),
    );

    // ── Mapa de recebimento por item: soma de quantidade_recebida ────────────
    const recebimentosPorReq: Record<string, string[]> = {};
    for (const rec of recebimentos) {
      (recebimentosPorReq[rec.requisicao_id] ??= []).push(rec.id);
    }

    const qtdRecebidaPorItem: Record<string, number> = {};
    for (const ri of recebItens) {
      qtdRecebidaPorItem[ri.item_id] = (qtdRecebidaPorItem[ri.item_id] ?? 0) + Number(ri.quantidade_recebida);
    }

    // ── KPI 1: Total Investido (todas as OCs) ────────────────────────────────
    const totalInvestido = ocs.reduce((s, oc) => s + Number(oc.valor ?? 0), 0);

    // ── KPI 2: Total a Pagar (OCs não entregues totalmente) ──────────────────
    const totalAPagar = ocs
      .filter((oc) => !reqsComRecebimentoTotal.has(oc.requisicao_id))
      .reduce((s, oc) => s + Number(oc.valor ?? 0), 0);

    // ── Orçado vs Investido (nova lógica) ────────────────────────────────────
    // Orçado = soma de valor_previsto das OCs não recebidas (abertas)
    const orcado = ocs
      .filter((oc) => !reqsComRecebimentoTotal.has(oc.requisicao_id))
      .reduce((s, oc) => s + Number(oc.valor_previsto ?? 0), 0);

    // Investido = soma de valor das OCs com recebimento total
    const investido = ocs
      .filter((oc) => reqsComRecebimentoTotal.has(oc.requisicao_id))
      .reduce((s, oc) => s + Number(oc.valor ?? 0), 0);

    // ── Relatório ────────────────────────────────────────────────────────────
    const ocAbertas = ocs.filter((oc) => !reqsComRecebimentoTotal.has(oc.requisicao_id)).length;
    const qtRecebimentos = recebimentos.length;

    // Itens pendentes em recebimentos parciais
    const itensPendentes: Array<{
      requisicao_id: string;
      numero_oc: string;
      item_id: string;
      nome_item: string;
      quantidade: number;
      quantidade_recebida: number;
      faltam: number;
    }> = [];

    const reqsParciais = new Set(
      [...reqsComRecebimentoParcial].filter((rid) => !reqsComRecebimentoTotal.has(rid)),
    );

    const ocPorReq: Record<string, OcRow[]> = {};
    for (const oc of ocs) {
      (ocPorReq[oc.requisicao_id] ??= []).push(oc);
    }

    for (const reqId of reqsParciais) {
      const reqItens = itens.filter((it) => it.requisicao_id === reqId);
      const ocsReq = ocPorReq[reqId] ?? [];
      const numeroOc = ocsReq[0]?.numero_oc ?? "—";

      for (const item of reqItens) {
        const recebido = qtdRecebidaPorItem[item.id] ?? 0;
        const faltam = Number(item.quantidade) - recebido;
        if (faltam > 0) {
          itensPendentes.push({
            requisicao_id: reqId,
            numero_oc: numeroOc,
            item_id: item.id,
            nome_item: item.nome_item,
            quantidade: Number(item.quantidade),
            quantidade_recebida: recebido,
            faltam,
          });
        }
      }
    }

    // ── Alertas: OCs atrasadas ───────────────────────────────────────────────
    const hoje = new Date().toISOString().split("T")[0];
    const ocAtrasadas: Array<{
      numero_oc: string;
      fornecedor: string;
      previsao_entrega: string;
      itens_pendentes: Array<{ nome_item: string; quantidade: number; recebido: number; faltam: number }>;
    }> = [];

    for (const oc of ocs) {
      if (reqsComRecebimentoTotal.has(oc.requisicao_id)) continue;
      if (!oc.previsao_entrega || oc.previsao_entrega >= hoje) continue;

      const reqItens = itens.filter((it) => it.requisicao_id === oc.requisicao_id);
      const itensPendentesOc = reqItens
        .map((item) => {
          const recebido = qtdRecebidaPorItem[item.id] ?? 0;
          const faltam = Number(item.quantidade) - recebido;
          return { nome_item: item.nome_item, quantidade: Number(item.quantidade), recebido, faltam };
        })
        .filter((it) => it.faltam > 0);

      ocAtrasadas.push({
        numero_oc: oc.numero_oc,
        fornecedor: oc.fornecedor,
        previsao_entrega: oc.previsao_entrega,
        itens_pendentes: itensPendentesOc,
      });
    }

    // ── Distribuição por status (das requisições) ────────────────────────────
    const statusMap: Record<string, number> = {};
    for (const req of requisicoes) {
      const st = req.status ?? "";
      if (st) statusMap[st] = (statusMap[st] || 0) + 1;
    }
    const distribuicaoStatus = Object.entries(statusMap)
      .map(([status, total]) => ({ status, total }))
      .sort((a, b) => b.total - a.total);

    // ── Categoria e tipo via join OC + itens ─────────────────────────────────
    const ocsPorReqValor: Record<string, number> = {};
    for (const oc of ocs) {
      ocsPorReqValor[oc.requisicao_id] = (ocsPorReqValor[oc.requisicao_id] ?? 0) + Number(oc.valor ?? 0);
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

    for (const [reqId, ocValor] of Object.entries(ocsPorReqValor)) {
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
        totalInvestido:     Math.round(totalInvestido * 100) / 100,
        totalOrdens:        ocs.length,
        totalAPagar:        Math.round(totalAPagar * 100) / 100,
        orcado:             Math.round(orcado * 100) / 100,
        investido:          Math.round(investido * 100) / 100,
        distribuicaoStatus,
        porCategoria,
        sgpPorTipo,
        // Relatório
        ocAbertas,
        qtRecebimentos,
        itensPendentes,
        // Alertas
        ocAtrasadas,
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
