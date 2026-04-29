import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createServerClient } from "@/lib/supabase";
import { requireAcessoRestrito } from "@/lib/auth";
import { registrarLog } from "@/lib/logs";

// ============================================================================
// SCHEMAS
// ============================================================================

const UpdateSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(255).optional(),
  cpf: z.string().max(14).optional().nullable(),
  tipo_demissao: z.string().optional().nullable(),
  motivo_demissao: z.string().optional().nullable(),
});

// ============================================================================
// PUT — Atualizar colaborador restrito
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAcessoRestrito();
    const { id } = await params;

    const body = await request.json();
    const validated = UpdateSchema.parse(body);

    const db = createServerClient();

    const { data: updated, error } = await db
      .from("colaboradores_restritos")
      .update(validated)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116")
        return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 });
      throw new Error(error.message);
    }

    await registrarLog(
      user.re,
      "EDITAR",
      `Colaborador restrito atualizado: ${updated.nome}`,
      updated.cpf ?? undefined,
    );

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (error instanceof Error && error.message === "FORBIDDEN")
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    console.error("[PUT /colaboradores-restritos]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ============================================================================
// DELETE — Remover colaborador restrito
// ============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAcessoRestrito();
    const { id } = await params;

    const db = createServerClient();

    // Busca o registro antes de deletar para o log
    const { data: existing } = await db
      .from("colaboradores_restritos")
      .select("nome, cpf")
      .eq("id", id)
      .single();

    const { error } = await db
      .from("colaboradores_restritos")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);

    await registrarLog(
      user.re,
      "REMOVER",
      `Colaborador restrito removido: ${existing?.nome ?? id}`,
      existing?.cpf ?? undefined,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (error instanceof Error && error.message === "FORBIDDEN")
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    console.error("[DELETE /colaboradores-restritos]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
