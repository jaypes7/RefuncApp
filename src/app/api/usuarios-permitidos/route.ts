import { NextRequest, NextResponse } from "next/server";
import { getSheetData, appendRow, SHEETS } from "@/lib/sheets";
import { requireAuth } from "@/lib/auth";

// GET - Listar todos os usuários permitidos
export async function GET() {
  try {
    await requireAuth();

    const rows = await getSheetData(SHEETS.USERS_PERMITIDOS);

    // Pular cabeçalho
    const usuarios = rows.slice(1).map((row, index) => ({
      id: String(index + 2), // linha na planilha (para deleção)
      re: row[0] || "",
      nome: row[1] || "",
      perfil: row[2] || "operador",
      autorizadoEm: row[3] || new Date().toISOString().split("T")[0],
    }));

    return NextResponse.json({ usuarios });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    console.error("Erro ao buscar usuários permitidos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar usuários permitidos" },
      { status: 500 },
    );
  }
}

// POST - Adicionar novo usuário permitido
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { re, nome, perfil = "operador" } = body;

    if (!re || !nome) {
      return NextResponse.json(
        { error: "RE e nome são obrigatórios" },
        { status: 400 },
      );
    }

    // Verificar se já existe
    const existing = await getSheetData(SHEETS.USERS_PERMITIDOS);
    const exists = existing.slice(1).some((row) => row[0] === re);

    if (exists) {
      return NextResponse.json(
        { error: "Usuário já cadastrado" },
        { status: 400 },
      );
    }

    const dataAtual = new Date().toISOString().split("T")[0];
    await appendRow(SHEETS.USERS_PERMITIDOS, [re, nome, perfil, dataAtual]);

    return NextResponse.json({
      success: true,
      message: "Usuário autorizado com sucesso",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    console.error("Erro ao adicionar usuário:", error);
    return NextResponse.json(
      { error: "Erro ao adicionar usuário" },
      { status: 500 },
    );
  }
}
