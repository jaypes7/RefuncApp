/**
 * ============================================================================
 * API: /api/config/clinicas
 * ============================================================================
 *
 * Planilha: Aba "Clinicas"
 * Layout: A1=ID | B1=NOME
 *
 * GET: Lista clínicas
 * POST: Cria clínica
 * DELETE: Remove clínica
 */

import { NextRequest, NextResponse } from "next/server";
import { getSheetData, appendRow, deleteRow, SHEETS } from "@/lib/sheets";
import { requireAuth } from "@/lib/auth";
import { registrarLog } from "@/lib/logs";

// GET /api/config/clinicas
export async function GET() {
  try {
    await requireAuth();
    const rows = await getSheetData(SHEETS.CLINICAS);

    // Linha 0 = header, dados a partir da linha 1
    const clinicas = rows.slice(1)
      .map((row, index) => ({
        id: index + 1, // rowIndex 1-based (excluindo header) para delete
        nome: row[1] || row[0] || "", // Col B = NOME; fallback Col A para retrocompatibilidade
      }))
      .filter((c) => c.nome);

    return NextResponse.json(clinicas);
  } catch (error) {
    console.error("Erro ao carregar clínicas:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST /api/config/clinicas
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { nome } = body;

    if (!nome?.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    // Gera ID incremental baseado na quantidade de linhas existentes
    const rows = await getSheetData(SHEETS.CLINICAS);
    const nextId = rows.length; // linha 0 = header, então rows.length já é o próximo

    // Col A = ID, Col B = NOME
    await appendRow(SHEETS.CLINICAS, [String(nextId), nome.trim()]);

    await registrarLog(user.re, "ADICIONAR", `Clínica criada: ${nome}`);

    return NextResponse.json({ success: true, message: "Clínica salva" });
  } catch (error) {
    console.error("Erro ao salvar clínica:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/config/clinicas
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    const rowIndex = parseInt(id) + 1; // +1 porque header está na linha 1
    await deleteRow(SHEETS.CLINICAS, rowIndex, 2); // 2 colunas: ID, NOME
    await registrarLog(user.re, "REMOVER", `Clínica removida ID: ${id}`);

    return NextResponse.json({ success: true, message: "Clínica removida" });
  } catch (error) {
    console.error("Erro ao remover clínica:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
