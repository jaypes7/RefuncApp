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
// POST /api/suprimentos/requisicoes
// ============================================================================

interface ItemPayload {
  nome_item: string;
  categoria: string;
  unidade: string;
  quantidade: number;
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
