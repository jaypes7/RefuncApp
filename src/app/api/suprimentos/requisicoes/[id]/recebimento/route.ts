export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

// ============================================================================
// POST /api/suprimentos/requisicoes/[id]/recebimento
// Registra recebimento total ou parcial; auto-conclui a req se tudo recebido
// ============================================================================

interface RecebItemPayload {
  item_id: string;
  quantidade_recebida: number;
}

interface RecebPayload {
  tipo: "total" | "parcial";
  data_recebimento: string;
  observacao?: string;
  itens?: RecebItemPayload[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = (await request.json()) as RecebPayload;

    if (!body.tipo || !body.data_recebimento) {
      return NextResponse.json({ error: "Tipo e data são obrigatórios" }, { status: 400 });
    }

    const db = createServerClient();

    // Busca itens da requisição
    const { data: itens, error: itensError } = await db
      .from("suprimentos_requisicao_itens")
      .select("id, quantidade, quantidade_estoque")
      .eq("requisicao_id", id);

    if (itensError) throw new Error(itensError.message);
    const todosItens = itens ?? [];

    // Cria o registro de recebimento
    const { data: receb, error: recebError } = await db
      .from("suprimentos_recebimentos")
      .insert({
        requisicao_id:    id,
        tipo:             body.tipo,
        data_recebimento: body.data_recebimento,
        observacao:       body.observacao ?? null,
      })
      .select()
      .single();

    if (recebError || !receb) throw new Error(recebError?.message ?? "Falha ao criar recebimento");

    // Monta os itens recebidos
    let recebItens: { recebimento_id: string; item_id: string; quantidade_recebida: number }[];

    if (body.tipo === "total") {
      // Total: marca todos os itens com a quantidade a comprar restante
      const { data: recebAntes } = await db
        .from("suprimentos_recebimento_itens")
        .select("item_id, quantidade_recebida")
        .in("item_id", todosItens.map((i) => i.id));

      const jaRecebido = new Map<string, number>();
      for (const r of recebAntes ?? []) {
        jaRecebido.set(r.item_id, (jaRecebido.get(r.item_id) ?? 0) + Number(r.quantidade_recebida));
      }

      recebItens = todosItens.map((item) => {
        const aComprar = Math.max(0, Number(item.quantidade) - Number(item.quantidade_estoque));
        const jaReceb  = jaRecebido.get(item.id) ?? 0;
        const restante = Math.max(0, aComprar - jaReceb);
        return { recebimento_id: receb.id, item_id: item.id, quantidade_recebida: restante };
      }).filter((r) => r.quantidade_recebida > 0);
    } else {
      // Parcial: usa os itens enviados no body
      recebItens = (body.itens ?? [])
        .filter((i) => i.quantidade_recebida > 0)
        .map((i) => ({
          recebimento_id:      receb.id,
          item_id:             i.item_id,
          quantidade_recebida: i.quantidade_recebida,
        }));
    }

    if (recebItens.length > 0) {
      const { error: riError } = await db.from("suprimentos_recebimento_itens").insert(recebItens);
      if (riError) throw new Error(riError.message);
    }

    // Verifica se todos os itens foram 100% recebidos para auto-concluir
    const { data: allReceb } = await db
      .from("suprimentos_recebimento_itens")
      .select("item_id, quantidade_recebida")
      .in("item_id", todosItens.map((i) => i.id));

    const totalRecebidoPorItem = new Map<string, number>();
    for (const r of allReceb ?? []) {
      totalRecebidoPorItem.set(r.item_id, (totalRecebidoPorItem.get(r.item_id) ?? 0) + Number(r.quantidade_recebida));
    }

    const todosCompletos = todosItens.every((item) => {
      const aComprar = Math.max(0, Number(item.quantidade) - Number(item.quantidade_estoque));
      if (aComprar === 0) return true;
      return (totalRecebidoPorItem.get(item.id) ?? 0) >= aComprar;
    });

    if (todosCompletos) {
      await db
        .from("suprimentos_requisicoes")
        .update({ status: "concluida", updated_at: new Date().toISOString() })
        .eq("id", id);
    }

    return NextResponse.json(receb, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[POST /api/suprimentos/requisicoes/[id]/recebimento]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
