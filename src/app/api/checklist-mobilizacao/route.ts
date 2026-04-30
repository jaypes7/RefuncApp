/**
 * ============================================================================
 * API: /api/checklist-mobilizacao
 * ============================================================================
 *
 * GET: Lista etapas do cronograma + subetapas do checklist filtradas por centro de custo.
 * POST: Cria nova subetapa no checklist.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth, resolveCentroCusto } from "@/lib/auth";
import { ChecklistSubetapaSchema } from "@/lib/schemas";
import { ZodError } from "zod";

// ── GET ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth("user");
    const { searchParams } = new URL(request.url);
    const ccParam = searchParams.get("centro_custo") || undefined;
    const centroCusto = resolveCentroCusto(currentUser, ccParam);

    const db = createServerClient();

    let etapasQuery = db.from("etapas").select("id, nome").order("ordem", { ascending: true });
    if (centroCusto?.length) etapasQuery = etapasQuery.in("centro_custo", centroCusto) as typeof etapasQuery;

    let subetapasQuery = db.from("checklist_subetapas").select("*").order("ordem", { ascending: true });
    if (centroCusto?.length) subetapasQuery = subetapasQuery.in("centro_custo", centroCusto) as typeof subetapasQuery;

    const [{ data: etapas, error: etapasError }, { data: subetapas, error: subetapasError }] = await Promise.all([
      etapasQuery,
      subetapasQuery,
    ]);

    if (etapasError) throw new Error(etapasError.message);
    if (subetapasError) throw new Error(subetapasError.message);

    // Deduplica etapas por id — múltiplos centros de custo podem compartilhar
    // os mesmos ids de etapa (1, 2, 3…) quando cadastrados via configuração.
    const uniqueEtapas = Array.from(new Map((etapas ?? []).map((e) => [e.id, e])).values());

    return NextResponse.json({
      etapas: uniqueEtapas,
      subetapas: subetapas ?? [],
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[GET /checklist-mobilizacao]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// ── POST ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth("user");
    const { searchParams } = new URL(request.url);
    const ccParam = searchParams.get("centro_custo") || undefined;
    const centroCusto = resolveCentroCusto(currentUser, ccParam);

    const body = await request.json();
    const parsed = ChecklistSubetapaSchema.parse(body);

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
    const { data, error } = await db
      .from("checklist_subetapas")
      .insert({
        etapa_id: parsed.etapa_id,
        nome: parsed.nome,
        setor: parsed.setor ?? null,
        responsavel: parsed.responsavel ?? null,
        previsto: parsed.previsto ?? null,
        avanco: parsed.avanco ?? null,
        data_inicio: parsed.data_inicio ?? null,
        data_termino: parsed.data_termino ?? null,
        observacao: parsed.observacao ?? null,
        ordem: parsed.ordem ?? 0,
        centro_custo: ccFinal,
        created_by: currentUser.re,
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
    console.error("[POST /checklist-mobilizacao]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
