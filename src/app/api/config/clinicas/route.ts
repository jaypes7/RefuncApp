/**
 * ============================================================================
 * API: /api/config/clinicas
 * ============================================================================
 *
 * CRUD de clínicas na tabela `configuracoes_clinicas`.
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAuth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { ClinicaSchema } from "@/lib/schemas";

// GET /api/config/clinicas — lista todas as clínicas cadastradas
export async function GET() {
  try {
    await requireAuth();
    const db = createServerClient();
    const { data, error } = await db
      .from("configuracoes_clinicas")
      .select("id, nome, endereco, cidade, ativo")
      .order("nome", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[/api/config/clinicas GET]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST /api/config/clinicas — cria ou atualiza uma clínica (upsert por nome)
export async function POST(request: NextRequest) {
  try {
    await requireAuth("admin");
    const body = await request.json();
    const payload = ClinicaSchema.parse(body);

    const db = createServerClient();
    const { data, error } = await db
      .from("configuracoes_clinicas")
      .upsert(payload, { onConflict: "nome" })
      .select("id, nome, endereco, cidade, ativo")
      .single();

    if (error) throw error;
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
    console.error("[/api/config/clinicas POST]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/config/clinicas?id=<uuid> — remove uma clínica pelo ID
export async function DELETE(request: NextRequest) {
  try {
    await requireAuth("admin");
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Parâmetro 'id' é obrigatório" }, { status: 400 });
    }

    const db = createServerClient();
    const { error } = await db
      .from("configuracoes_clinicas")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado: requer privilégios de Administrador" }, { status: 403 });
    }
    console.error("[/api/config/clinicas DELETE]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
