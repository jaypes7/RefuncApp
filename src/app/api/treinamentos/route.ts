/**
 * ============================================================================
 * API: /api/treinamentos
 * ============================================================================
 *
 * GET → Lista o catálogo completo de treinamentos (público, sem auth)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await requireAuth("user");
    const supabase = createServerClient();
    const body = await request.json();

    const nome = body.nome?.trim();
    if (!nome) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    // Deduplicação: se já existe um treinamento com o mesmo nome (case-insensitive),
    // reaproveita o existente em vez de criar duplicata no catálogo.
    const padrao = nome.replace(/[%_\\]/g, (c: string) => `\\${c}`);
    const { data: existente, error: buscaError } = await supabase
      .from("treinamentos")
      .select("*")
      .ilike("nome", padrao)
      .limit(1)
      .maybeSingle();

    if (buscaError) throw new Error(buscaError.message);
    if (existente) {
      return NextResponse.json({ data: existente }, { status: 200 });
    }

    const { data, error } = await supabase
      .from("treinamentos")
      .insert({ nome, obrigatorio: false })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("[POST /treinamentos]", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await requireAuth("user");
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("treinamentos")
      .select("*")
      .order("nome", { ascending: true });

    if (error) throw new Error(error.message);
    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error("[GET /treinamentos]", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
