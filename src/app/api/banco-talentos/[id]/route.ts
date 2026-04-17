import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

const UpdateSchema = z.object({
  pessoa: z.string().max(50).optional().nullable(),
  nome: z.string().min(1).max(255).optional(),
  idade: z.number().int().min(0).max(120).optional().nullable(),
  dt_nasc: z.string().optional().nullable(),
  cpf: z.string().max(14).optional().nullable(),
  municipio: z.string().max(255).optional().nullable(),
  uf: z.string().max(2).optional().nullable(),
  telefone: z.string().max(100).optional().nullable(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth("admin");

    const { id } = await params;
    const body = await request.json();
    const validated = UpdateSchema.parse(body);
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("banco_talentos")
      .update({ ...validated, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116")
        return NextResponse.json({ error: "Talento não encontrado" }, { status: 404 });
      throw new Error(error.message);
    }

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (error instanceof Error && error.message === "FORBIDDEN")
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    console.error("[PUT /banco-talentos/:id]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth("admin");

    const { id } = await params;
    const supabase = createServerClient();

    const { error } = await supabase
      .from("banco_talentos")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (error instanceof Error && error.message === "FORBIDDEN")
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    console.error("[DELETE /banco-talentos/:id]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
