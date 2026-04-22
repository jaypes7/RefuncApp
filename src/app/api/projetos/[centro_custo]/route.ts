/**
 * ============================================================================
 * API: DELETE /api/projetos/:centro_custo
 * ============================================================================
 *
 * Remove um projeto e seus dados associados (etapas).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ centro_custo: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth("admin");
    const { centro_custo } = await params;
    const cc = decodeURIComponent(centro_custo);

    const db = createServerClient();

    // Remove etapas associadas
    const { error: etapasError } = await db
      .from("etapas")
      .delete()
      .eq("centro_custo", cc);

    if (etapasError) {
      throw new Error(`Erro ao remover etapas: ${etapasError.message}`);
    }

    // Remove o projeto (configuracoes)
    const { error: configError } = await db
      .from("configuracoes")
      .delete()
      .eq("centro_custo", cc);

    if (configError) {
      throw new Error(`Erro ao remover projeto: ${configError.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[DELETE /api/projetos/centro_custo]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
