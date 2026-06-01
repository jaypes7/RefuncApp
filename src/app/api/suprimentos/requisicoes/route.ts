export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

// ============================================================================
// GET /api/suprimentos/requisicoes
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    if (process.env.DEMO_MODE === "true") {
      const { DEMO_REQUISICOES } = await import("@/lib/demo/repository");
      const { searchParams } = new URL(request.url);
      const page  = Math.max(1, Number(searchParams.get("page") ?? 1));
      const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));
      const status = searchParams.get("status")?.trim() ?? "";
      const search = searchParams.get("search")?.trim().toLowerCase() ?? "";

      let filtered = [...DEMO_REQUISICOES];
      if (status) filtered = filtered.filter((r) => r.status === status);
      if (search) filtered = filtered.filter((r) => r.titulo.toLowerCase().includes(search) || r.coordenador.toLowerCase().includes(search));

      const total      = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const data       = filtered.slice((page - 1) * limit, page * limit);

      return NextResponse.json({
        data,
        pagination: { page, limit, total, totalPages },
      });
    }

    const { searchParams } = new URL(request.url);
    const page   = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit  = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));
    const status = searchParams.get("status")?.trim() ?? "";
    const search = searchParams.get("search")?.trim() ?? "";

    const db = createServerClient();
    let query = db
      .from("suprimentos_requisicoes")
      .select("*, suprimentos_requisicao_itens(count)", { count: "exact" });

    if (status) query = query.eq("status", status);
    if (search) query = query.ilike("titulo", `%${search}%`);

    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1).order("created_at", { ascending: false });

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({
      data: data ?? [],
      pagination: { page, limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit) },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[GET /api/suprimentos/requisicoes]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ============================================================================
// DELETE /api/suprimentos/requisicoes  (body: { ids: string[] })
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    await requireAuth();

    const body = (await request.json()) as { ids?: string[] };
    const ids = body?.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Nenhum ID informado" }, { status: 400 });
    }

    const db = createServerClient();

    const { data: recebimentos } = await db
      .from("suprimentos_recebimentos")
      .select("id")
      .in("requisicao_id", ids);
    const recebimentoIds = (recebimentos ?? []).map((r) => r.id);
    if (recebimentoIds.length > 0) {
      await db.from("suprimentos_recebimento_itens").delete().in("recebimento_id", recebimentoIds);
    }
    await db.from("suprimentos_recebimentos").delete().in("requisicao_id", ids);

    const { data: ocs } = await db
      .from("suprimentos_ordens_compra")
      .select("id")
      .in("requisicao_id", ids);
    const ocIds = (ocs ?? []).map((o) => o.id);
    if (ocIds.length > 0) {
      await db.from("suprimentos_oc_itens").delete().in("oc_id", ocIds);
    }
    await db.from("suprimentos_ordens_compra").delete().in("requisicao_id", ids);

    await db.from("suprimentos_requisicao_itens").delete().in("requisicao_id", ids);

    const { error } = await db.from("suprimentos_requisicoes").delete().in("id", ids);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[DELETE /api/suprimentos/requisicoes]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/suprimentos/requisicoes
// ============================================================================

interface ItemPayload {
  nome_item: string;
  categoria: string;
  unidade: string;
  quantidade: number;
  valor_item?: number | null;
  data_necessidade?: string | null;
  criticidade: string;
  tipo: string;
}

interface CreatePayload {
  titulo: string;
  coordenador: string;
  data_abertura: string;
  status?: string;
  itens: ItemPayload[];
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    if (process.env.DEMO_MODE === "true") {
      const body = await request.json();
      const { demoWrite } = await import("@/lib/demo/handler");
      return demoWrite(body);
    }

    const body = (await request.json()) as CreatePayload;
    const { titulo, coordenador, data_abertura, status = "rascunho", itens } = body;

    if (!titulo || !coordenador || !data_abertura) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
    }
    if (!Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json({ error: "A requisição deve ter ao menos 1 item" }, { status: 400 });
    }

    const db = createServerClient();

    const { data: req, error: reqError } = await db
      .from("suprimentos_requisicoes")
      .insert({ titulo, coordenador, data_abertura, status })
      .select()
      .single();

    if (reqError || !req) throw new Error(reqError?.message ?? "Falha ao criar requisição");

    const itensPayload = itens.map((item) => ({
      requisicao_id:      req.id,
      nome_item:          item.nome_item,
      categoria:          item.categoria,
      unidade:            item.unidade,
      quantidade:         Number(item.quantidade) || 0,
      valor_item:         item.valor_item ?? null,
      data_necessidade:   item.data_necessidade || null,
      quantidade_estoque: 0,
      criticidade:        item.criticidade,
      tipo:               item.tipo,
    }));

    const { error: itensError } = await db.from("suprimentos_requisicao_itens").insert(itensPayload);
    if (itensError) throw new Error(itensError.message);

    return NextResponse.json(req, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[POST /api/suprimentos/requisicoes]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
