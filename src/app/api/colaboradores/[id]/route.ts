/**
 * ============================================================================
 * API: /api/colaboradores/[id]
 * ============================================================================
 *
 * GET    → Busca colaborador por id
 * PUT    → Atualização parcial (merge com registro existente)
 * DELETE → Remove colaborador (com registro de auditoria)
 *
 * Tabela Supabase: colaboradores
 *   - Colunas em snake_case / lowercase
 *   - A resposta é mapeada para UPPERCASE para manter compatibilidade com a UI
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createServerClient } from "@/lib/supabase";
import { ColaboradorUpdateSchema, type Colaborador } from "@/lib/schemas";
import { requireAuth } from "@/lib/auth";
import { logEditar, logRemover } from "@/lib/logs";

// ============================================================================
// MAPEAMENTO Supabase → Colaborador (lowercase → UPPERCASE)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: Record<string, any>): Colaborador {
  return {
    id:                   row.id                ?? undefined,
    IND:                  row.ind               ?? null,
    STATUS:               row.status            ?? null,
    ENVIADO_RH:           row.enviado_rh        ?? null,
    PESSOA:               row.pessoa            ?? null,
    SEXO:                 row.sexo              ?? null,
    REQ:                  row.req               ?? null,
    VINCULADO:            row.vinculado         ?? null,
    CARTA_OFERTA:         row.carta_oferta      ?? null,
    COLAB_PEND:           row.colab_pend        ?? null,
    EXAME:                row.exame             ?? null,
    CLINICA:              row.clinica           ?? null,
    DOCS:                 row.docs              ?? null,
    ASO:                  row.aso               ?? null,
    RPV:                  row.rpv               ?? null,
    PRE_ADMISSAO:         row.pre_admissao      ?? null,
    MOB:                  row.mob               ?? null,
    OP:                   row.op                ?? null,
    DATA_ADMISSAO:        row.data_admissao     ?? null,
    TIPO_CONTRATO:        row.tipo_contrato     ?? null,
    CONTRATO:             row.contrato          ?? null,
    PORTAL:               row.portal            ?? null,
    CRACHA:               row.cracha            ?? null,
    PONTO:                row.ponto             ?? null,
    TREINAMENTO:          row.treinamento       ?? null,
    REALIZAR_TREINAMENTO: row.realizar_treinamento ?? null,
    LOCAL_TREINAMENTO:    row.local_treinamento ?? null,
    RE:                   row.re                ?? null,
    NOME:                 row.nome              ?? "",
    FUNCAO_CLT:           row.funcao_clt        ?? null,
    HISTOGRAMA:           row.histograma        ?? null,
    IDADE:                row.idade             ?? null,
    DT_NASCIMENTO:        row.dt_nascimento     ?? null,
    CPF:                  row.cpf               ?? "",
    VR:                   row.vr                ?? null,
    FRETADO:              row.fretado           ?? null,
    TERMINO:              row.termino           ?? null,
    PRORROGACAO:          row.prorrogacao       ?? null,
    DEMISSAO:             row.demissao          ?? null,
    MUNICIPIO:            row.municipio         ?? null,
    UF:                   row.uf                ?? null,
    TELEFONE:             row.telefone          ?? null,
    NUMERO_ORACLE:        row.numero_oracle     ?? null,
    turno_trabalho:       row.turno_trabalho    ?? null,
    CENTRO_CUSTO:         row.centro_custo      ?? null,
    ESCOLARIDADE:         row.escolaridade      ?? null,
    EXPERIENCIA_FUNCAO:   row.experiencia_funcao ?? null,
  };
}

// ============================================================================
// MAPEAMENTO Colaborador → Supabase (UPPERCASE → snake_case)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDbRow(data: Record<string, any>): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if (data.IND               !== undefined) row.ind                = data.IND;
  if (data.STATUS            !== undefined) row.status             = data.STATUS;
  if (data.ENVIADO_RH        !== undefined) row.enviado_rh         = data.ENVIADO_RH;
  if (data.PESSOA            !== undefined) row.pessoa             = data.PESSOA;
  if (data.SEXO              !== undefined) row.sexo               = data.SEXO;
  if (data.REQ               !== undefined) row.req                = data.REQ;
  if (data.VINCULADO         !== undefined) row.vinculado          = data.VINCULADO;
  if (data.CARTA_OFERTA      !== undefined) row.carta_oferta       = data.CARTA_OFERTA;
  if (data.COLAB_PEND        !== undefined) row.colab_pend         = data.COLAB_PEND;
  if (data.EXAME             !== undefined) row.exame              = data.EXAME;
  if (data.CLINICA           !== undefined) row.clinica            = data.CLINICA;
  if (data.DOCS              !== undefined) row.docs               = data.DOCS;
  if (data.ASO               !== undefined) row.aso                = data.ASO;
  if (data.RPV               !== undefined) row.rpv                = data.RPV;
  if (data.PRE_ADMISSAO      !== undefined) row.pre_admissao       = data.PRE_ADMISSAO;
  if (data.MOB               !== undefined) row.mob                = data.MOB;
  if (data.OP                !== undefined) row.op                 = data.OP;
  if (data.DATA_ADMISSAO     !== undefined) row.data_admissao      = data.DATA_ADMISSAO;
  if (data.TIPO_CONTRATO     !== undefined) row.tipo_contrato      = data.TIPO_CONTRATO;
  if (data.CONTRATO          !== undefined) row.contrato           = data.CONTRATO;
  if (data.PORTAL            !== undefined) row.portal             = data.PORTAL;
  if (data.CRACHA            !== undefined) row.cracha             = data.CRACHA;
  if (data.PONTO             !== undefined) row.ponto              = data.PONTO;
  if (data.TREINAMENTO       !== undefined) row.treinamento        = data.TREINAMENTO;
  if (data.REALIZAR_TREINAMENTO !== undefined) row.realizar_treinamento = data.REALIZAR_TREINAMENTO;
  if (data.LOCAL_TREINAMENTO !== undefined) row.local_treinamento  = data.LOCAL_TREINAMENTO;
  if (data.RE                !== undefined) row.re                 = data.RE;
  if (data.NOME              !== undefined) row.nome               = data.NOME;
  if (data.FUNCAO_CLT        !== undefined) row.funcao_clt         = data.FUNCAO_CLT;
  if (data.HISTOGRAMA        !== undefined) row.histograma         = data.HISTOGRAMA;
  if (data.IDADE             !== undefined) row.idade              = data.IDADE;
  if (data.DT_NASCIMENTO     !== undefined) row.dt_nascimento      = data.DT_NASCIMENTO;
  if (data.VR                !== undefined) row.vr                 = data.VR;
  if (data.FRETADO           !== undefined) row.fretado            = data.FRETADO;
  if (data.TERMINO           !== undefined) row.termino            = data.TERMINO;
  if (data.PRORROGACAO       !== undefined) row.prorrogacao        = data.PRORROGACAO;
  if (data.DEMISSAO          !== undefined) row.demissao           = data.DEMISSAO;
  if (data.MUNICIPIO         !== undefined) row.municipio          = data.MUNICIPIO;
  if (data.UF                !== undefined) row.uf                 = data.UF;
  if (data.TELEFONE          !== undefined) row.telefone           = data.TELEFONE;
  if (data.NUMERO_ORACLE     !== undefined) row.numero_oracle      = data.NUMERO_ORACLE;
  if (data.turno_trabalho    !== undefined) row.turno_trabalho     = data.turno_trabalho;
  if (data.CENTRO_CUSTO      !== undefined) row.centro_custo       = data.CENTRO_CUSTO;
  if (data.ESCOLARIDADE      !== undefined) row.escolaridade       = data.ESCOLARIDADE;
  if (data.EXPERIENCIA_FUNCAO !== undefined) row.experiencia_funcao = data.EXPERIENCIA_FUNCAO;

  return row;
}

// ============================================================================
// HELPER: busca colaborador por CPF
// ============================================================================

async function findById(id: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("colaboradores")
    .select("*")
    .eq("id", id)
    .single();

  return { data, error };
}

// ============================================================================
// GET /api/colaboradores/[id]
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth("user");

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const withRelations = searchParams.get("with_relations") === "true";

    const supabase = createServerClient();

    // Busca colaborador principal
    const { data, error } = await supabase
      .from("colaboradores")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Colaborador não encontrado" },
        { status: 404 },
      );
    }

    const colaborador = mapRow(data);

    // Se solicitado, busca relações
    if (withRelations) {
      const [
        { data: passagens },
        { data: hospedagens },
        { data: alimentacao },
        { data: treinamentos },
      ] = await Promise.all([
        supabase.from("colaborador_passagens").select(`*, trechos:passagem_trechos(*)`).eq("colaborador_id", id).order("created_at", { ascending: false }),
        supabase.from("colaborador_hospedagens").select("*").eq("colaborador_id", id).order("created_at", { ascending: false }),
        supabase.from("colaborador_alimentacao").select("*").eq("colaborador_id", id).maybeSingle(),
        supabase.from("colaborador_treinamentos").select(`*, treinamento:treinamentos(*)`).eq("colaborador_id", id).order("status", { ascending: false }),
      ]);

      return NextResponse.json({
        data: {
          ...colaborador,
          passagens: passagens ?? [],
          hospedagens: hospedagens ?? [],
          alimentacao: alimentacao ?? null,
          treinamentos: treinamentos ?? [],
        },
      });
    }

    return NextResponse.json({ data: colaborador });
  } catch (error) {
    console.error("[GET /colaboradores/[id]]", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado: privilégios insuficientes" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// ============================================================================
// PUT /api/colaboradores/[id]
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth("user");
    const { id } = await params;

    // 1. Verifica existência
    const { data: existing, error: fetchError } = await findById(id);
    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Colaborador não encontrado" },
        { status: 404 },
      );
    }

    // 2. Valida body (partial)
    const body = await request.json();
    const validated = ColaboradorUpdateSchema.parse(body);

    // id e CPF não podem ser alterados via PUT
    delete (validated as Record<string, unknown>).id;
    delete (validated as Record<string, unknown>).CPF;

    // 3. Determina campos alterados para auditoria
    const existingMapped = mapRow(existing);
    const changedFields = (Object.keys(validated) as (keyof typeof validated)[]).filter(
      (key) => validated[key] !== undefined && validated[key] !== existingMapped[key],
    );

    if (changedFields.length === 0) {
      return NextResponse.json({ data: existingMapped, message: "Nenhuma alteração detectada" });
    }

    // 4. Persiste apenas os campos fornecidos
    const supabase = createServerClient();
    const { data: updated, error: updateError } = await supabase
      .from("colaboradores")
      .update(toDbRow(validated))
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Erro ao atualizar colaborador: ${updateError.message}`);
    }

    // 5. Auditoria
    await logEditar(user.re, existing.cpf ?? id, existing.nome ?? id, changedFields);

    return NextResponse.json({ data: mapRow(updated) });
  } catch (error) {
    console.error("[PUT /colaboradores/[id]]", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado: privilégios insuficientes" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE /api/colaboradores/[id]
// ============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth("user");
    const { id } = await params;

    // 1. Verifica existência (precisa do nome para o log)
    const { data: existing, error: fetchError } = await findById(id);
    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Colaborador não encontrado" },
        { status: 404 },
      );
    }

    // 2. Remove
    const supabase = createServerClient();
    const { error: deleteError } = await supabase
      .from("colaboradores")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw new Error(`Erro ao remover colaborador: ${deleteError.message}`);
    }

    // 3. Auditoria
    await logRemover(user.re, existing.cpf ?? id, existing.nome ?? id);

    return NextResponse.json({ message: "Colaborador removido com sucesso" });
  } catch (error) {
    console.error("[DELETE /colaboradores/[id]]", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado: privilégios insuficientes" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
