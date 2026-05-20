/**
 * ============================================================================
 * API: /api/config/etapas-grupos
 * ============================================================================
 *
 * GET  ?centro_custo=X  → lista grupos ordenados por `ordem`
 * POST               → cria novo grupo { nome, centroCusto }
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

const CriarGrupoSchema = z.object({
  nome: z.string().min(1),
  centroCusto: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const centroCusto = searchParams.get("centro_custo");

    const db = createServerClient();
    const query = db
      .from("etapas_grupos")
      .select("id, nome, ordem, centro_custo")
      .order("ordem", { ascending: true });

    if (centroCusto) query.eq("centro_custo", centroCusto);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[GET /config/etapas-grupos]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth("admin");
    const body = await request.json();
    const { nome, centroCusto } = CriarGrupoSchema.parse(body);

    const db = createServerClient();

    // Próxima ordem = max + 1
    const { data: maxRow } = await db
      .from("etapas_grupos")
      .select("ordem")
      .eq("centro_custo", centroCusto)
      .order("ordem", { ascending: false })
      .limit(1)
      .maybeSingle();

    const ordem = (maxRow?.ordem ?? 0) + 1;

    const { data, error } = await db
      .from("etapas_grupos")
      .insert({ nome, ordem, centro_custo: centroCusto })
      .select("id, nome, ordem")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, data });
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
    console.error("[POST /config/etapas-grupos]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
