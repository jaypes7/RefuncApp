/**
 * ============================================================================
 * API: /api/config/acessos
 * ============================================================================
 *
 * Planilha: Aba "USERS_PERMITIDOS"
 * Layout: A=RE | B=NOME | C=ROLE
 *
 * GET: Lista usuários permitidos
 * POST: Adiciona um novo acesso
 * DELETE: Remove um acesso
 */

import { NextRequest, NextResponse } from "next/server";
import { getSheetData, appendRow, deleteRow, SHEETS } from "@/lib/sheets";
import { requireAuth } from "@/lib/auth";
import { registrarLog } from "@/lib/logs";

// GET /api/config/acessos
export async function GET() {
  try {
    await requireAuth();
    const rows = await getSheetData(SHEETS.USERS_PERMITIDOS);

    // Linha 0 = header (ou primeira entrada), dados a partir da linha 1
    const acessos = rows.slice(1)
      .map((row, index) => ({
        id: index + 1,
        re: row[0] || "",
        nome: row[1] || "",
        role: row[2] || "user",
      }))
      .filter((a) => a.re);

    return NextResponse.json(acessos);
  } catch (error) {
    console.error("Erro ao carregar acessos:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST /api/config/acessos
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { re, nome, role } = body;

    if (!re?.trim() || !nome?.trim()) {
      return NextResponse.json(
        { error: "RE e Nome são obrigatórios" },
        { status: 400 }
      );
    }

    const validRole = role || "user";

    // Col A = RE | Col B = NOME | Col C = ROLE
    await appendRow(SHEETS.USERS_PERMITIDOS, [
      re.trim(),
      nome.trim(),
      validRole,
    ]);

    await registrarLog(
      user.re,
      "CONFIG",
      `Acesso criado: ${nome} (RE: ${re}, role: ${validRole})`
    );

    return NextResponse.json({
      success: true,
      message: "Acesso configurado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao configurar acesso:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/config/acessos
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    const rowIndex = parseInt(id) + 1; // +1 pelo header
    await deleteRow(SHEETS.USERS_PERMITIDOS, rowIndex, 3); // 3 colunas: RE, NOME, ROLE
    await registrarLog(user.re, "CONFIG", `Acesso removido ID: ${id}`);

    return NextResponse.json({ success: true, message: "Acesso removido" });
  } catch (error) {
    console.error("Erro ao remover acesso:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
