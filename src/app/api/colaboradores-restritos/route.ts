import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createServerClient } from "@/lib/supabase";
import { requireAcessoRestrito } from "@/lib/auth";
import { registrarLog } from "@/lib/logs";

// ============================================================================
// SCHEMAS
// ============================================================================

const CreateSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(255),
  cpf: z.string().max(14).optional().nullable(),
  tipo_demissao: z.string().optional().nullable(),
  motivo_demissao: z.string().optional().nullable(),
});

// ============================================================================
// GET — Listar colaboradores restritos (paginado + busca)
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    await requireAcessoRestrito();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const search = searchParams.get("search") ?? "";
    const offset = (page - 1) * limit;

    const db = createServerClient();

    let query = db
      .from("colaboradores_restritos")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`nome.ilike.%${search}%,cpf.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw new Error(error.message);

    return NextResponse.json({
      data: data ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (error instanceof Error && error.message === "FORBIDDEN")
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    console.error("[GET /colaboradores-restritos]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ============================================================================
// POST — Criar colaborador restrito
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requireAcessoRestrito();

    const body = await request.json();
    const validated = CreateSchema.parse(body);

    const db = createServerClient();

    const { data, error } = await db
      .from("colaboradores_restritos")
      .insert(validated)
      .select()
      .single();

    if (error) throw new Error(error.message);

    await registrarLog(
      user.re,
      "ADICIONAR",
      `Colaborador restrito cadastrado: ${validated.nome}`,
      validated.cpf ?? undefined,
    );

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (error instanceof Error && error.message === "FORBIDDEN")
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    console.error("[POST /colaboradores-restritos]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
