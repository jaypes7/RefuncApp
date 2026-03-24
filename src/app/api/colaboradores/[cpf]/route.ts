/**
 * ============================================================================
 * API: /api/colaboradores/[cpf]
 * ============================================================================
 *
 * GET: Busca colaborador por CPF
 * PUT: Atualiza colaborador
 * DELETE: Remove colaborador
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  updateRow,
  deleteRow,
  findRowByColumn,
  SHEETS,
  CPF_COLUMN_INDEX,
} from "@/lib/sheets";
import { ColaboradorUpdateSchema, type Colaborador } from "@/lib/schemas";
import { requireAuth } from "@/lib/auth";
import { logEditar, logRemover } from "@/lib/logs";

// ============================================================================
// ORDEM DAS COLUNAS (SAGRADA - NÃO ALTERAR)
// ============================================================================

const COLUNAS_ORDEM: (keyof Colaborador)[] = [
  "IND",
  "STATUS",
  "ENVIADO_RH",
  "PESSOA",
  "REQ",
  "VINCULADO",
  "CARTA_OFERTA",
  "COLAB_PEND",
  "EXAME",
  "CLINICA",
  "DOCS",
  "ASO",
  "RPV",
  "PRE_ADMISSAO",
  "MOB",
  "OP",
  "DATA_ADMISSAO",
  "CONTRATO",
  "PORTAL",
  "CRACHA",
  "PONTO",
  "TREINAMENTO",
  "REALIZAR_TREINAMENTO",
  "LOCAL_TREINAMENTO",
  "RE",
  "NOME",
  "FUNCAO_CLT",
  "HISTOGRAMA",
  "IDADE",
  "DT_NASCIMENTO",
  "CPF",
  "VR",
  "TERMINO",
  "PRORROGACAO",
  "DEMISSAO",
  "MUNICIPIO",
  "UF",
  "TELEFONE",
];

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Converte array de valores da planilha para objeto Colaborador
 */
function rowToColaborador(row: (string | number)[]): Colaborador {
  const obj: Record<string, string | null> = {};

  COLUNAS_ORDEM.forEach((coluna, index) => {
    const valor = row[index];
    if (coluna === "CPF" && valor) {
      // Garante que CPF tenha 11 dígitos
      obj[coluna] = String(valor).replace(/\D/g, "").padStart(11, "0");
    } else {
      obj[coluna] =
        valor === undefined || valor === null ? null : String(valor);
    }
  });

  return obj as unknown as Colaborador;
}

/**
 * Converte objeto Colaborador para array de valores na ordem correta
 */
function colaboradorToRow(colaborador: Partial<Colaborador>): string[] {
  return COLUNAS_ORDEM.map((coluna) => {
    const valor = colaborador[coluna];
    return valor === null || valor === undefined ? "" : String(valor);
  });
}

/**
 * Remove máscara do CPF
 */
function limparCPF(cpf: string): string {
  // Remove não-dígitos e garante 11 dígitos com zeros à esquerda
  return cpf.replace(/\D/g, "").padStart(11, "0");
}

// ============================================================================
// GET /api/colaboradores/[cpf]
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cpf: string }> },
) {
  try {
    // Verifica autenticação
    await requireAuth();

    // Obtém CPF dos parâmetros (Next.js 15+ - params é async)
    const { cpf } = await params;
    const cpfLimpo = limparCPF(cpf);

    // Busca colaborador
    const result = await findRowByColumn(
      SHEETS.COLABORADORES,
      CPF_COLUMN_INDEX,
      cpfLimpo,
    );

    if (!result) {
      return NextResponse.json(
        { error: "Colaborador não encontrado" },
        { status: 404 },
      );
    }

    const colaborador = rowToColaborador(result.rowData);

    return NextResponse.json({
      data: colaborador,
    });
  } catch (error) {
    console.error("Erro ao buscar colaborador:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// ============================================================================
// PUT /api/colaboradores/[cpf]
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ cpf: string }> },
) {
  try {
    // Verifica autenticação
    const user = await requireAuth();

    // Obtém CPF dos parâmetros
    const { cpf } = await params;
    const cpfLimpo = limparCPF(cpf);

    // Busca colaborador existente
    const existing = await findRowByColumn(
      SHEETS.COLABORADORES,
      CPF_COLUMN_INDEX,
      cpfLimpo,
    );

    if (!existing) {
      return NextResponse.json(
        { error: "Colaborador não encontrado" },
        { status: 404 },
      );
    }

    // Parse e validação do body
    const body = await request.json();
    const updates = ColaboradorUpdateSchema.parse(body);

    // Merge dos dados existentes com atualizações
    const colaboradorAtual = rowToColaborador(existing.rowData);
    const colaboradorAtualizado = {
      ...colaboradorAtual,
      ...updates,
      CPF: cpfLimpo, // Mantém CPF original
    };

    // Prepara dados para atualização
    const rowData = colaboradorToRow(colaboradorAtualizado);

    // Atualiza na planilha
    await updateRow(SHEETS.COLABORADORES, existing.rowIndex, rowData);

    // Identifica campos alterados para log
    const camposAlterados = Object.keys(updates).filter(
      (key) =>
        updates[key as keyof typeof updates] !==
        colaboradorAtual[key as keyof typeof colaboradorAtual],
    );

    // Registra log
    await logEditar(
      user.re,
      cpfLimpo,
      colaboradorAtualizado.NOME || "N/A",
      camposAlterados,
    );

    return NextResponse.json({
      success: true,
      message: "Colaborador atualizado com sucesso",
      data: colaboradorAtualizado,
    });
  } catch (error) {
    console.error("Erro ao atualizar colaborador:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE /api/colaboradores/[cpf]
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cpf: string }> },
) {
  try {
    // Verifica autenticação
    const user = await requireAuth();

    // Obtém CPF dos parâmetros
    const { cpf } = await params;
    const cpfLimpo = limparCPF(cpf);

    // Busca colaborador
    const existing = await findRowByColumn(
      SHEETS.COLABORADORES,
      CPF_COLUMN_INDEX,
      cpfLimpo,
    );

    if (!existing) {
      return NextResponse.json(
        { error: "Colaborador não encontrado" },
        { status: 404 },
      );
    }

    const colaborador = rowToColaborador(existing.rowData);

    // Remove da planilha
    await deleteRow(SHEETS.COLABORADORES, existing.rowIndex);

    // Registra log
    await logRemover(user.re, cpfLimpo, colaborador.NOME || "N/A");

    return NextResponse.json({
      success: true,
      message: "Colaborador removido com sucesso",
    });
  } catch (error) {
    console.error("Erro ao remover colaborador:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
