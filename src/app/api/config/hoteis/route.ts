/**
 * ============================================================================
 * API: /api/config/hoteis
 * ============================================================================
 *
 * CRUD de hotéis na tabela `configuracoes_hoteis`.
 * Cada hotel armazena nome e capacidade total de vagas.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// GET /api/config/hoteis — lista hotéis com ocupação calculada dinamicamente
export async function GET() {
  try {
    await requireAuth();
    const db = createServerClient();

    const [
      { data: hoteis, error: hoteisError },
      { data: logistica, error: logisticaError },
    ] = await Promise.all([
      db.from("configuracoes_hoteis").select("id, nome, qt_vagas").order("nome", { ascending: true }),
      db.from("logistica_controle").select("hotel").not("hotel", "is", null),
    ]);

    if (hoteisError) {
      console.error("[/api/config/hoteis GET] hoteis error:", hoteisError.message);
      return NextResponse.json({ error: hoteisError.message }, { status: 500 });
    }
    if (logisticaError) {
      console.error("[/api/config/hoteis GET] logistica error:", logisticaError.message);
      return NextResponse.json({ error: logisticaError.message }, { status: 500 });
    }

    // Count assignments per hotel name from logistica_controle
    const ocupacaoMap = new Map<string, number>();
    for (const row of logistica ?? []) {
      const nome = (row.hotel as string | null)?.trim();
      if (nome) ocupacaoMap.set(nome, (ocupacaoMap.get(nome) ?? 0) + 1);
    }

    const result = (hoteis ?? []).map((h) => {
      const vagas_ocupadas = ocupacaoMap.get(h.nome?.trim() ?? "") ?? 0;
      return {
        id: h.id,
        nome: h.nome,
        qt_vagas: h.qt_vagas ?? 0,
        vagas_ocupadas,
        vagas_disponiveis: (h.qt_vagas ?? 0) - vagas_ocupadas,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[/api/config/hoteis GET]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST /api/config/hoteis — insere um novo hotel
export async function POST(request: NextRequest) {
  try {
    await requireAuth("admin");

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    const nome = typeof body.nome === "string" ? body.nome.trim() : "";
    const qt_vagas = Number(body.qt_vagas);

    if (!nome) {
      return NextResponse.json({ error: "Campo 'nome' é obrigatório" }, { status: 400 });
    }
    if (!Number.isFinite(qt_vagas) || qt_vagas < 0) {
      return NextResponse.json({ error: "Campo 'qt_vagas' deve ser um número >= 0" }, { status: 400 });
    }

    const db = createServerClient();
    const { data, error } = await db
      .from("configuracoes_hoteis")
      .insert({ nome, qt_vagas })
      .select("id, nome, qt_vagas")
      .single();

    if (error) {
      console.error("[/api/config/hoteis POST] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { ...data, vagas_ocupadas: 0, vagas_disponiveis: data?.qt_vagas ?? 0 },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado: requer privilégios de Administrador" }, { status: 403 });
    }
    console.error("[/api/config/hoteis POST]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PATCH /api/config/hoteis — atualiza qt_vagas de um hotel existente
export async function PATCH(request: NextRequest) {
  try {
    await requireAuth("admin");

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    const id = typeof body.id === "string" ? body.id.trim() : "";
    const qt_vagas = Number(body.qt_vagas);

    if (!id) {
      return NextResponse.json({ error: "Campo 'id' é obrigatório" }, { status: 400 });
    }
    if (!Number.isFinite(qt_vagas) || qt_vagas < 0) {
      return NextResponse.json({ error: "Campo 'qt_vagas' deve ser um número >= 0" }, { status: 400 });
    }

    const db = createServerClient();
    const { data, error } = await db
      .from("configuracoes_hoteis")
      .update({ qt_vagas })
      .eq("id", id)
      .select("id, nome, qt_vagas")
      .single();

    if (error) {
      console.error("[/api/config/hoteis PATCH] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado: requer privilégios de Administrador" }, { status: 403 });
    }
    console.error("[/api/config/hoteis PATCH]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/config/hoteis?id=<uuid> — remove um hotel pelo ID
export async function DELETE(request: NextRequest) {
  try {
    await requireAuth("admin");
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Parâmetro 'id' é obrigatório" }, { status: 400 });
    }

    const db = createServerClient();
    const { error } = await db
      .from("configuracoes_hoteis")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[/api/config/hoteis DELETE] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado: requer privilégios de Administrador" }, { status: 403 });
    }
    console.error("[/api/config/hoteis DELETE]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
