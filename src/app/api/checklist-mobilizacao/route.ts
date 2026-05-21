/**
 * ============================================================================
 * API: /api/checklist-mobilizacao
 * ============================================================================
 *
 * GET: Lista etapas do checklist (checklist_etapas) + subetapas filtradas por
 *      centro de custo. Se não houver etapas no checklist, clona automaticamente
 *      do cronograma (etapas) — lazy sync.
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
    const currentUser = await requireAuth("admin");
    const { searchParams } = new URL(request.url);
    const ccParam = searchParams.get("centro_custo") || undefined;
    const centroCusto = resolveCentroCusto(currentUser, ccParam);

    const db = createServerClient();

    // 1. Busca etapas do checklist
    let etapasQuery = db
      .from("checklist_etapas")
      .select("id, nome, centro_custo, etapa_origem_id, grupo_id, ordem")
      .order("ordem", { ascending: true });
    if (centroCusto?.length) etapasQuery = etapasQuery.in("centro_custo", centroCusto) as typeof etapasQuery;

    let { data: etapasChecklist, error: etapasError } = await etapasQuery;

    if (etapasError) throw new Error(etapasError.message);

    // 2. Lazy sync: se não há etapas no checklist, clona do cronograma
    const precisaSync = (!etapasChecklist || etapasChecklist.length === 0) && centroCusto?.length;
    if (precisaSync) {
      const { data: etapasCronograma, error: cronogramaError } = await db
        .from("etapas")
        .select("id, nome, centro_custo, ordem, grupo_id")
        .in("centro_custo", centroCusto)
        .order("ordem", { ascending: true });

      if (cronogramaError) throw new Error(cronogramaError.message);

      if (etapasCronograma && etapasCronograma.length > 0) {
        const payload = etapasCronograma.map((e) => ({
          centro_custo: e.centro_custo,
          etapa_origem_id: e.id,
          grupo_id: e.grupo_id ?? null,
          nome: e.nome,
          ordem: e.ordem ?? 0,
        }));

        const { data: inseridas, error: insertError } = await db
          .from("checklist_etapas")
          .insert(payload)
          .select("id, nome, centro_custo, etapa_origem_id, grupo_id, ordem");

        if (insertError) throw new Error(insertError.message);
        etapasChecklist = inseridas ?? [];
      }
    }

    // 3. Busca subetapas
    let subetapasQuery = db.from("checklist_subetapas").select("*").order("ordem", { ascending: true });
    if (centroCusto?.length) subetapasQuery = subetapasQuery.in("centro_custo", centroCusto) as typeof subetapasQuery;

    const { data: subetapas, error: subetapasError } = await subetapasQuery;

    if (subetapasError) throw new Error(subetapasError.message);

    return NextResponse.json({
      etapas: etapasChecklist ?? [],
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
    const currentUser = await requireAuth("admin");
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
