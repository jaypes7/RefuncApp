export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

// ============================================================================
// POST /api/suprimentos/requisicoes/[id]/oc
// Registra OC vinculada à requisição; promove status para em_andamento se aberta
// ============================================================================

interface OCPayload {
  numero_oc: string;
  fornecedor: string;
  valor?: number | null;
  valor_previsto?: number | null;
  previsao_entrega?: string | null;
  item_ids?: string[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = (await request.json()) as OCPayload;

    if (!body.numero_oc || !body.fornecedor) {
      return NextResponse.json({ error: "Número OC e fornecedor são obrigatórios" }, { status: 400 });
    }

    if (!Array.isArray(body.item_ids) || body.item_ids.length === 0) {
      return NextResponse.json({ error: "Selecione ao menos 1 item para a OC" }, { status: 400 });
    }

    const db = createServerClient();

    // Verifica se a requisição existe
    const { data: req, error: reqError } = await db
      .from("suprimentos_requisicoes")
      .select("id, status")
      .eq("id", id)
      .single();

    if (reqError || !req) {
      return NextResponse.json({ error: "Requisição não encontrada" }, { status: 404 });
    }

    // Insere a OC
    const { data: oc, error: ocError } = await db
      .from("suprimentos_ordens_compra")
      .insert({
        requisicao_id:    id,
        numero_oc:        body.numero_oc,
        fornecedor:       body.fornecedor,
        valor:            body.valor ?? null,
        valor_previsto:   body.valor_previsto ?? null,
        previsao_entrega: body.previsao_entrega ?? null,
      })
      .select()
      .single();

    if (ocError) throw new Error(ocError.message);

    const ocItensPayload = Array.from(new Set(body.item_ids)).map((itemId) => ({
      oc_id:   oc.id,
      item_id: itemId,
    }));
    const { error: ocItensError } = await db.from("suprimentos_oc_itens").insert(ocItensPayload);
    if (ocItensError) throw new Error(ocItensError.message);

    // Promove status para em_andamento se estava aberta
    if (req.status === "aberta") {
      await db
        .from("suprimentos_requisicoes")
        .update({ status: "em_andamento", updated_at: new Date().toISOString() })
        .eq("id", id);
    }

    return NextResponse.json(oc, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[POST /api/suprimentos/requisicoes/[id]/oc]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
