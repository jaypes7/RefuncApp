/**
 * ============================================================================
 * API: /api/checklist-mobilizacao/etapas
 * ============================================================================
 *
 * POST: Cria uma nova etapa no checklist (independente do cronograma).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth, resolveCentroCusto } from "@/lib/auth";
import { ChecklistEtapaSchema } from "@/lib/schemas";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth("admin");
    const { searchParams } = new URL(request.url);
    const ccParam = searchParams.get("centro_custo") || undefined;
    const centroCusto = resolveCentroCusto(currentUser, ccParam);

    const body = await request.json();
    const parsed = ChecklistEtapaSchema.parse(body);

    // O filtro da sidebar é a verdade absoluta: query param tem prioridade máxima
    const autorizados = resolveCentroCusto(currentUser, undefined) ?? [];
    const ccBody = parsed.centro_custo;

    // 1. Query param (filtro ativo na sidebar)
    // 2. Body (fallback se query param ausente)
    // 3. Primeiro centro autorizado do usuário (último recurso)
    let ccFinal: string | null = null;
    if (centroCusto?.length) {
      ccFinal = centroCusto[0];
    } else if (ccBody && autorizados.includes(ccBody)) {
      ccFinal = ccBody;
    } else if (autorizados.length > 0) {
      ccFinal = autorizados[0];
    }

    if (!ccFinal) {
      return NextResponse.json({ error: "Centro de custo não informado" }, { status: 400 });
    }

    const db = createServerClient();

    // Busca a maior ordem para colocar no final
    const { data: maxOrdem } = await db
      .from("checklist_etapas")
      .select("ordem")
      .eq("centro_custo", ccFinal)
      .order("ordem", { ascending: false })
      .limit(1)
      .maybeSingle();

    const ordem = (maxOrdem?.ordem ?? 0) + 1;

    const { data, error } = await db
      .from("checklist_etapas")
      .insert({
        centro_custo: ccFinal,
        nome: parsed.nome,
        ordem,
        etapa_origem_id: null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ id: data.id }, { status: 201 });
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
    console.error("[POST /checklist-mobilizacao/etapas]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
