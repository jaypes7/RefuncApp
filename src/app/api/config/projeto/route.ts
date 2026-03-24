/**
 * ============================================================================
 * API: /api/config/projeto
 * ============================================================================
 *
 * GET: Lista projetos
 * POST: Cria novo projeto
 * DELETE: Remove projeto
 */

import { NextRequest, NextResponse } from "next/server";
import { getSheetData, appendRow, deleteRow, SHEETS } from "@/lib/sheets";
import { requireAuth } from "@/lib/auth";
import { registrarLog } from "@/lib/logs";

// GET /api/config/projeto
export async function GET() {
  try {
    await requireAuth();
    const rows = await getSheetData(SHEETS.PROJETOS);
    
    const projetos = rows.slice(1).map((row, index) => ({
      id: index + 1,
      nome_projeto: row[0] || "",
    })).filter(p => p.nome_projeto);

    return NextResponse.json(projetos);
  } catch (error) {
    console.error("Erro ao carregar projetos:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST /api/config/projeto
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { nome_projeto } = body;

    if (!nome_projeto?.trim()) {
      return NextResponse.json({ error: "Nome do projeto é obrigatório" }, { status: 400 });
    }

    await appendRow(SHEETS.PROJETOS, [nome_projeto.trim()]);
    await registrarLog(user.re, "ADICIONAR", `Projeto criado: ${nome_projeto}`);

    return NextResponse.json({ success: true, message: "Projeto criado" });
  } catch (error) {
    console.error("Erro ao criar projeto:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/config/projeto
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    // +2 porque: slice(1) remove header, e rows são 1-indexed na planilha
    const rowIndex = parseInt(id) + 1;
    await deleteRow(SHEETS.PROJETOS, rowIndex);
    await registrarLog(user.re, "REMOVER", `Projeto removido ID: ${id}`);

    return NextResponse.json({ success: true, message: "Projeto removido" });
  } catch (error) {
    console.error("Erro ao remover projeto:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
