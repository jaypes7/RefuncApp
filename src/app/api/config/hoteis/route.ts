/**
 * ============================================================================
 * API: /api/config/hoteis
 * ============================================================================
 *
 * Planilha: Aba "Hoteis"
 * Layout: A1=ID | B1=NOME | C1=QT_VAGAS
 *
 * GET: Lista hotéis
 * POST: Cria hotel
 * DELETE: Remove hotel
 */

import { NextRequest, NextResponse } from "next/server";
import { getSheetData, appendRow, deleteRow, SHEETS } from "@/lib/sheets";
import { requireAuth } from "@/lib/auth";
import { registrarLog } from "@/lib/logs";

// GET /api/config/hoteis
export async function GET() {
  try {
    await requireAuth();
    const rows = await getSheetData(SHEETS.HOTEIS);

    // Linha 0 = header, dados a partir da linha 1
    const hoteis = rows.slice(1)
      .map((row, index) => ({
        id: index + 1,
        nome: row[1] || row[0] || "",            // Col B = NOME
        vagas_totais: parseInt(row[2] || "0", 10), // Col C = QT_VAGAS
      }))
      .filter((h) => h.nome);

    return NextResponse.json(hoteis);
  } catch (error) {
    console.error("Erro ao carregar hotéis:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST /api/config/hoteis
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { nome, vagas_totais } = body;

    if (!nome?.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    // Gera ID incremental baseado na quantidade de linhas existentes
    const rows = await getSheetData(SHEETS.HOTEIS);
    const nextId = rows.length; // header na linha 0 → rows.length é o próximo ID

    // Garante que vagas_totais é numérico, não boolean
    const vagasNum = typeof vagas_totais === "number"
      ? vagas_totais
      : parseInt(String(vagas_totais || "0"), 10);

    // Col A = ID | Col B = NOME | Col C = QT_VAGAS
    await appendRow(SHEETS.HOTEIS, [
      String(nextId),
      nome.trim(),
      String(isNaN(vagasNum) ? 0 : vagasNum),
    ]);

    await registrarLog(user.re, "ADICIONAR", `Hotel criado: ${nome} (${vagasNum} vagas)`);

    return NextResponse.json({ success: true, message: "Hotel salvo" });
  } catch (error) {
    console.error("Erro ao salvar hotel:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/config/hoteis
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    const rowIndex = parseInt(id) + 1; // +1 porque header na linha 1
    await deleteRow(SHEETS.HOTEIS, rowIndex, 3); // 3 colunas: ID, NOME, QT_VAGAS
    await registrarLog(user.re, "REMOVER", `Hotel removido ID: ${id}`);

    return NextResponse.json({ success: true, message: "Hotel removido" });
  } catch (error) {
    console.error("Erro ao remover hotel:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
