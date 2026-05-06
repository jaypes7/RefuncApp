/**
 * ============================================================================
 * API: /api/relatorio/salvar
 * ============================================================================
 *
 * POST → salva (upsert) um relatório executivo vinculado a uma data de referência
 * GET  → lista relatórios salvos por centro de custo (opcionalmente filtrado por data)
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase";
import { requireAuth, resolveCentroCusto } from "@/lib/auth";
import { registrarLog } from "@/lib/logs";

const SalvarSchema = z.object({
  centro_custo: z.string().min(1),
  data_referencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: YYYY-MM-DD"),
  conteudo_html: z.string().min(1, "Conteúdo do relatório não pode estar vazio"),
});

// ============================================================================
// POST /api/relatorio/salvar
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth("user");

    const body = await request.json();
    const parsed = SalvarSchema.parse(body);

    const centrosCusto = resolveCentroCusto(currentUser, parsed.centro_custo);
    if (!centrosCusto || !centrosCusto.includes(parsed.centro_custo)) {
      return NextResponse.json({ error: "Centro de custo não permitido" }, { status: 403 });
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("relatorios_executivos")
      .upsert(
        {
          centro_custo: parsed.centro_custo,
          data_referencia: parsed.data_referencia,
          conteudo_html: parsed.conteudo_html,
          updated_at: new Date().toISOString(),
          created_by: currentUser.re,
        },
        { onConflict: "centro_custo,data_referencia" },
      )
      .select("id, data_referencia")
      .single();

    if (error) {
      console.error("[POST /api/relatorio/salvar]", error);
      throw new Error(error.message);
    }

    await registrarLog(
      currentUser.re,
      "EDITAR",
      `Relatório executivo salvo: ${parsed.centro_custo} - ${parsed.data_referencia}`,
    );

    return NextResponse.json({ id: data.id, data_referencia: data.data_referencia });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    console.error("[POST /api/relatorio/salvar]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// ============================================================================
// GET /api/relatorio/salvar?centro_custo=X&data_referencia=YYYY-MM-DD
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();

    const { searchParams } = new URL(request.url);
    const ccParam = searchParams.get("centro_custo") || undefined;
    const dataReferencia = searchParams.get("data_referencia");

    const centrosCusto = resolveCentroCusto(currentUser, ccParam);
    const centroCusto = Array.isArray(centrosCusto) ? centrosCusto[0] : centrosCusto;

    const supabase = createServerClient();

    let query = supabase
      .from("relatorios_executivos")
      .select("id, centro_custo, data_referencia, conteudo_html, created_at, updated_at")
      .order("data_referencia", { ascending: false });

    if (centroCusto) {
      query = query.eq("centro_custo", centroCusto);
    }

    if (dataReferencia) {
      query = query.eq("data_referencia", dataReferencia);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/relatorio/salvar]", error);
      throw new Error(error.message);
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[GET /api/relatorio/salvar]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// ============================================================================
// DELETE /api/relatorio/salvar?id=NUMERO
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await requireAuth("user");

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const id = idParam ? Number(idParam) : NaN;
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Busca o registro para verificar permissão e logar
    const { data: registro, error: findError } = await supabase
      .from("relatorios_executivos")
      .select("id, centro_custo, data_referencia")
      .eq("id", id)
      .single();

    if (findError || !registro) {
      return NextResponse.json({ error: "Relatório não encontrado" }, { status: 404 });
    }

    const centrosCusto = resolveCentroCusto(currentUser, registro.centro_custo);
    if (!centrosCusto || !centrosCusto.includes(registro.centro_custo)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { error } = await supabase.from("relatorios_executivos").delete().eq("id", id);

    if (error) {
      console.error("[DELETE /api/relatorio/salvar]", error);
      throw new Error(error.message);
    }

    await registrarLog(
      currentUser.re,
      "REMOVER",
      `Relatório executivo removido: ${registro.centro_custo} - ${registro.data_referencia}`,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    console.error("[DELETE /api/relatorio/salvar]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
