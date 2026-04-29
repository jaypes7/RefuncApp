/**
 * ============================================================================
 * API: /api/config/cargos
 * ============================================================================
 *
 * CRUD de cargos na tabela `configuracoes_cargos`.
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAuth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { CargoSchema } from "@/lib/schemas";
import { logConfig } from "@/lib/logs";

// GET /api/config/cargos — lista todos os cargos ordenados por nome
export async function GET() {
  try {
    await requireAuth();
    const db = createServerClient();

    const { data, error } = await db
      .from("configuracoes_cargos")
      .select("id, nome, grupo, ativo")
      .order("nome", { ascending: true });

    if (error) {
      console.error("[/api/config/cargos GET] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[/api/config/cargos GET]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST /api/config/cargos — cria um novo cargo
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth("admin");
    const body = await request.json();
    const payload = CargoSchema.parse(body);

    const db = createServerClient();

    const { data, error } = await db
      .from("configuracoes_cargos")
      .insert({ nome: payload.nome, grupo: payload.grupo, ativo: payload.ativo })
      .select("id, nome, grupo, ativo")
      .single();

    if (error) {
      console.error("[/api/config/cargos POST] Supabase error:", error.message);
      if (error.message.includes("duplicate key")) {
        return NextResponse.json({ error: "Já existe um cargo com este nome" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await logConfig(user.re, "Cargo", undefined, `Adicionado: ${payload.nome}`);

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado: requer privilégios de Administrador" }, { status: 403 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    }
    console.error("[/api/config/cargos POST]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PATCH /api/config/cargos — atualiza nome e/ou grupo de um cargo existente
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth("admin");

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    const id = typeof body.id === "string" ? body.id.trim() : "";
    const nome = typeof body.nome === "string" ? body.nome.trim() : undefined;
    const grupo = typeof body.grupo === "string" ? body.grupo.trim() || null : undefined;

    if (!id) {
      return NextResponse.json({ error: "Campo 'id' é obrigatório" }, { status: 400 });
    }
    if (nome !== undefined && nome === "") {
      return NextResponse.json({ error: "Campo 'nome' não pode ser vazio" }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {};
    if (nome !== undefined) updatePayload.nome = nome;
    if (grupo !== undefined) updatePayload.grupo = grupo;

    const db = createServerClient();
    const { data, error } = await db
      .from("configuracoes_cargos")
      .update(updatePayload)
      .eq("id", id)
      .select("id, nome, grupo, ativo")
      .single();

    if (error) {
      console.error("[/api/config/cargos PATCH] Supabase error:", error.message);
      if (error.message.includes("duplicate key")) {
        return NextResponse.json({ error: "Já existe um cargo com este nome" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await logConfig(user.re, "Cargo", undefined, `Atualizado: ${data?.nome ?? id}`);

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado: requer privilégios de Administrador" }, { status: 403 });
    }
    console.error("[/api/config/cargos PATCH]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/config/cargos?id=<uuid> — remove um cargo pelo ID
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth("admin");
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Parâmetro 'id' é obrigatório" }, { status: 400 });
    }

    const db = createServerClient();

    // Busca nome para o log antes de deletar
    const { data: cargo } = await db
      .from("configuracoes_cargos")
      .select("nome")
      .eq("id", id)
      .single();

    const { error } = await db.from("configuracoes_cargos").delete().eq("id", id);

    if (error) {
      console.error("[/api/config/cargos DELETE] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logConfig(user.re, "Cargo", undefined, `Removido: ${cargo?.nome ?? id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado: requer privilégios de Administrador" }, { status: 403 });
    }
    console.error("[/api/config/cargos DELETE]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
