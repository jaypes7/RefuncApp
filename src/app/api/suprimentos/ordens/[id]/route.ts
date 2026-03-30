/**
 * ============================================================================
 * API: /api/suprimentos/ordens/[id]
 * ============================================================================
 *
 * PATCH → Atualiza `entregue_obra` (boolean) de uma ordem específica.
 *          Chamado silenciosamente pelo Switch no Dashboard de Suprimentos.
 *
 * Body: { entregue_obra: boolean }
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const PatchSchema = z.object({
  entregue_obra: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth("user");

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido", details: parsed.error.flatten() },
        { status: 422 },
      );
    }

    const db = createServerClient();
    const { error } = await db
      .from("suprimentos_ordens")
      .update({ entregue_obra: parsed.data.entregue_obra })
      .eq("id", id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado: privilégios insuficientes" }, { status: 403 });
    }
    console.error("[PATCH /api/suprimentos/ordens/[id]]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
