/**
 * ============================================================================
 * API: /api/config/cargos/grupo
 * ============================================================================
 *
 * Operações em lote sobre grupos de cargos.
 * Não existe tabela separada de grupos — o grupo é apenas o campo `grupo`
 * na tabela `configuracoes_cargos`.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { logConfig } from "@/lib/logs";

// POST /api/config/cargos/grupo — aplica um grupo a múltiplos cargos (bulk update)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth("admin");

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    const nome = typeof body.nome === "string" ? body.nome.trim() : "";
    const cargoIds = Array.isArray(body.cargoIds) ? body.cargoIds.filter((id: unknown) => typeof id === "string") : [];

    if (!nome) {
      return NextResponse.json({ error: "Campo 'nome' do grupo é obrigatório" }, { status: 400 });
    }
    if (cargoIds.length === 0) {
      return NextResponse.json({ error: "Selecione pelo menos um cargo" }, { status: 400 });
    }

    const db = createServerClient();
    const { error } = await db
      .from("configuracoes_cargos")
      .update({ grupo: nome })
      .in("id", cargoIds);

    if (error) {
      console.error("[/api/config/cargos/grupo POST] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logConfig(user.re, "Cargo", undefined, `Grupo aplicado: ${nome} (${cargoIds.length} cargo(s))`);

    return NextResponse.json({ success: true, grupo: nome, cargoIds });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado: requer privilégios de Administrador" }, { status: 403 });
    }
    console.error("[/api/config/cargos/grupo POST]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/config/cargos/grupo?nome=GRUPO — remove o grupo de todos os cargos
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth("admin");
    const nome = request.nextUrl.searchParams.get("nome");
    if (!nome) {
      return NextResponse.json({ error: "Parâmetro 'nome' é obrigatório" }, { status: 400 });
    }

    const db = createServerClient();

    // Busca quantos cargos serão afetados para o log
    const { data: afetados } = await db
      .from("configuracoes_cargos")
      .select("id")
      .eq("grupo", nome);

    const { error } = await db
      .from("configuracoes_cargos")
      .update({ grupo: null })
      .eq("grupo", nome);

    if (error) {
      console.error("[/api/config/cargos/grupo DELETE] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logConfig(user.re, "Cargo", undefined, `Grupo removido: ${nome} (${afetados?.length ?? 0} cargo(s) afetado(s))`);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado: requer privilégios de Administrador" }, { status: 403 });
    }
    console.error("[/api/config/cargos/grupo DELETE]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
