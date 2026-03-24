/**
 * ============================================================================
 * API: GET /api/clinicas
 * ============================================================================
 *
 * Retorna lista de clínicas cadastradas.
 */

import { NextResponse } from "next/server";
import { getSheetData, SHEETS } from "@/lib/sheets";
import { requireAuth } from "@/lib/auth";

// ============================================================================
// TIPOS
// ============================================================================

interface Clinica {
  id: number;
  nome: string;
}

// ============================================================================
// GET /api/clinicas
// ============================================================================

export async function GET() {
  try {
    // Verifica autenticação
    await requireAuth();

    // Busca clínicas da planilha
    const rows = await getSheetData(SHEETS.CLINICAS);

    // Converte para objetos (assume: ID na coluna 0, Nome na coluna 1)
    const clinicas: Clinica[] = rows
      .filter((row) => row[0] && row[1]) // Remove linhas vazias
      .map((row) => ({
        id: parseInt(row[0], 10) || 0,
        nome: row[1],
      }));

    return NextResponse.json({
      data: clinicas,
    });
  } catch (error) {
    console.error("Erro ao carregar clínicas:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
