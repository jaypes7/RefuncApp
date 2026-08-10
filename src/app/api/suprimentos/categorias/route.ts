export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth();
    const db = createServerClient();
    const { data, error } = await db
      .from("suprimentos_categorias")
      .select("id, nome")
      .order("nome", { ascending: true });
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[/api/suprimentos/categorias GET]", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth("admin");
    const { nome } = await request.json();
    if (!nome?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
    const db = createServerClient();
    const { data, error } = await db
      .from("suprimentos_categorias")
      .insert({ nome: nome.trim().toUpperCase() })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Categoria já existe" }, { status: 409 });
      throw error;
    }
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado: privilégios insuficientes" }, { status: 403 });
    }
    console.error("[/api/suprimentos/categorias POST]", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAuth("admin");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    const db = createServerClient();
    const { error } = await db.from("suprimentos_categorias").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado: privilégios insuficientes" }, { status: 403 });
    }
    console.error("[/api/suprimentos/categorias DELETE]", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
