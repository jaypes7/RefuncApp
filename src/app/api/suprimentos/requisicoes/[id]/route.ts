export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

// ============================================================================
// GET /api/suprimentos/requisicoes/[id]
// Retorna requisição completa com itens, OCs, recebimentos e itens recebidos
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth();
    const { id } = await params;

    const db = createServerClient();

    const [reqRes, itensRes, ocsRes, recebRes] = await Promise.all([
      db.from("suprimentos_requisicoes").select("*").eq("id", id).single(),
      db.from("suprimentos_requisicao_itens").select("*").eq("requisicao_id", id).order("created_at"),
      db.from("suprimentos_ordens_compra").select("*").eq("requisicao_id", id).order("created_at"),
      db.from("suprimentos_recebimentos")
        .select("*, suprimentos_recebimento_itens(*)")
        .eq("requisicao_id", id)
        .order("created_at"),
    ]);

    if (reqRes.error || !reqRes.data) {
      return NextResponse.json({ error: "Requisição não encontrada" }, { status: 404 });
    }

    return NextResponse.json({
      ...reqRes.data,
      itens:        itensRes.data ?? [],
      ocs:          ocsRes.data ?? [],
      recebimentos: recebRes.data ?? [],
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[GET /api/suprimentos/requisicoes/[id]]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ============================================================================
// PATCH /api/suprimentos/requisicoes/[id]
// Atualiza status e/ou edita itens (revisão / salvar rascunho / promover para aberta)
// ============================================================================

interface ItemUpdate {
  id: string;
  quantidade?: number;
  quantidade_estoque?: number;
  criticidade?: string;
}

interface PatchPayload {
  status?: string;
  itens?: ItemUpdate[];
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = (await request.json()) as PatchPayload;

    const db = createServerClient();

    // Atualiza dados da requisição
    const reqUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status) reqUpdate.status = body.status;

    const { error: reqError } = await db
      .from("suprimentos_requisicoes")
      .update(reqUpdate)
      .eq("id", id);
    if (reqError) throw new Error(reqError.message);

    // Atualiza itens individualmente (só campos enviados)
    if (Array.isArray(body.itens) && body.itens.length > 0) {
      for (const item of body.itens) {
        const itemUpdate: Record<string, unknown> = {};
        if (item.quantidade !== undefined)         itemUpdate.quantidade = item.quantidade;
        if (item.quantidade_estoque !== undefined) itemUpdate.quantidade_estoque = item.quantidade_estoque;
        if (item.criticidade !== undefined)        itemUpdate.criticidade = item.criticidade;

        if (Object.keys(itemUpdate).length > 0) {
          const { error } = await db
            .from("suprimentos_requisicao_itens")
            .update(itemUpdate)
            .eq("id", item.id)
            .eq("requisicao_id", id);
          if (error) throw new Error(error.message);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[PATCH /api/suprimentos/requisicoes/[id]]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
