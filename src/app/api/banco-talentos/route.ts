import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

const CreateSchema = z.object({
  pessoa: z.string().max(50).optional().nullable(),
  nome: z.string().min(1, "Nome é obrigatório").max(255),
  idade: z.number().int().min(0).max(120).optional().nullable(),
  dt_nasc: z.string().optional().nullable(),
  cpf: z.string().max(14).optional().nullable(),
  municipio: z.string().max(255).optional().nullable(),
  uf: z.string().max(2).optional().nullable(),
  telefone: z.string().max(100).optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth("admin");

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
    const search = searchParams.get("search") ?? "";
    const offset = (page - 1) * limit;

    const supabase = createServerClient();

    let query = supabase
      .from("banco_talentos")
      .select("*", { count: "exact" })
      .order("nome", { ascending: true })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`nome.ilike.%${search}%,cpf.ilike.%${search}%,pessoa.ilike.%${search}%`);
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
    console.error("[GET /banco-talentos]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth("admin");

    const body = await request.json();
    const validated = CreateSchema.parse(body);

    const supabase = createServerClient();

    if (validated.cpf) {
      const { data: existing } = await supabase
        .from("banco_talentos")
        .select("id")
        .eq("cpf", validated.cpf)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: "CPF já cadastrado no banco de talentos." },
          { status: 409 },
        );
      }
    }

    const { data, error } = await supabase
      .from("banco_talentos")
      .insert(validated)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (error instanceof Error && error.message === "FORBIDDEN")
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    console.error("[POST /banco-talentos]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
