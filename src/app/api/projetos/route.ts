/**
 * ============================================================================
 * API: /api/projetos
 * ============================================================================
 *
 * GET  → lista todos os projetos (catálogo baseado em configuracoes)
 * POST → cria um novo projeto (registro em configuracoes)
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { ZodError, z } from "zod";

const ProjetoCreateSchema = z.object({
  centro_custo: z.string().trim().min(1, "Centro de custo é obrigatório"),
  nome_cliente: z.string().trim().optional(),
});

// ============================================================================
// GET /api/projetos
// ============================================================================

export async function GET() {
  try {
    const currentUser = await requireAuth();
    const db = createServerClient();

    let query = db
      .from("configuracoes")
      .select("centro_custo, nome_cliente, data_inicio_projeto, data_fim_projeto")
      .order("centro_custo", { ascending: true });

    // Users e guests só veem o projeto do seu centro de custo vinculado
    if (currentUser.perfil !== "admin" && currentUser.centro_custo) {
      query = query.eq("centro_custo", currentUser.centro_custo);
    } else if (currentUser.perfil !== "admin") {
      // user/guest sem centro_custo vinculado → lista vazia
      return NextResponse.json({ data: [] });
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[GET /api/projetos]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/projetos
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    await requireAuth("admin");
    const body = await request.json();
    const { centro_custo, nome_cliente } = ProjetoCreateSchema.parse(body);

    const db = createServerClient();

    const { error } = await db.from("configuracoes").insert({
      centro_custo,
      nome_cliente: nome_cliente || null,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Centro de custo já existe" },
          { status: 409 },
        );
      }
      console.error("[POST /api/projetos] Supabase error:", error);
      return NextResponse.json(
        { error: "Erro ao salvar projeto", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, centro_custo }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[POST /api/projetos]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
