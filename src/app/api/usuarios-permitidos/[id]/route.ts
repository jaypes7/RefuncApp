import { NextRequest, NextResponse } from "next/server";
import { getSheetData, deleteRow, SHEETS } from "@/lib/sheets";
import { requireAuth } from "@/lib/auth";

// DELETE - Remover usuário permitido
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    
    const { id } = await params;
    const rowIndex = parseInt(id);

    // Buscar usuário antes de deletar (para log)
    const rows = await getSheetData(SHEETS.USERS_PERMITIDOS);
    const usuario = rows[rowIndex - 1];

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    await deleteRow(SHEETS.USERS_PERMITIDOS, rowIndex);

    return NextResponse.json({
      success: true,
      message: `Usuário ${usuario[1]} removido com sucesso`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    console.error("Erro ao remover usuário:", error);
    return NextResponse.json(
      { error: "Erro ao remover usuário" },
      { status: 500 }
    );
  }
}
