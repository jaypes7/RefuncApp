/**
 * ============================================================================
 * API: /api/config/etapas-grupos/[id]
 * ============================================================================
 *
 * PATCH  → renomeia o grupo
 * DELETE → remove o grupo (etapas ficam com grupo_id = NULL via ON DELETE SET NULL)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

const RenomearGrupoSchema = z.object({
  nome: z.string().min(1),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth("admin");
    const { id } = await params;
    const grupoId = Number(id);
    if (!grupoId || isNaN(grupoId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const { nome } = RenomearGrupoSchema.parse(body);

    const db = createServerClient();
    const { error } = await db
      .from("etapas_grupos")
      .update({ nome })
      .eq("id", grupoId);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[PATCH /config/etapas-grupos/[id]]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth("admin");
    const { id } = await params;
    const grupoId = Number(id);
    if (!grupoId || isNaN(grupoId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const db = createServerClient();
    const { error } = await db.from("etapas_grupos").delete().eq("id", grupoId);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[DELETE /config/etapas-grupos/[id]]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
