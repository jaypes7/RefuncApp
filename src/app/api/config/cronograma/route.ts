/**
 * ============================================================================
 * API: /api/config/cronograma
 * ============================================================================
 *
 * GET: Retorna configurações de cronograma
 * POST: Atualiza configurações de cronograma
 */

import { NextRequest, NextResponse } from "next/server";
import { getSheetData, updateRow, SHEETS } from "@/lib/sheets";
import { requireAuth } from "@/lib/auth";
import { logConfig } from "@/lib/logs";

interface CronogramaConfig {
  dias_padrao_cancelamento: number;
  dias_padrao_reagendamento: number;
}

// GET /api/config/cronograma
export async function GET() {
  try {
    await requireAuth();
    const rows = await getSheetData(SHEETS.CRONOGRAMA);

    // Assume estrutura: linha 1 = headers, linha 2 = valores
    const config: CronogramaConfig = {
      dias_padrao_cancelamento: 2,
      dias_padrao_reagendamento: 1,
    };

    if (rows.length >= 2) {
      const headers = rows[0];
      const values = rows[1];

      headers.forEach((header, index) => {
        if (header === "DIAS_CANCELAMENTO" && values[index]) {
          config.dias_padrao_cancelamento = parseInt(values[index], 10) || 2;
        }
        if (header === "DIAS_REAGENDAMENTO" && values[index]) {
          config.dias_padrao_reagendamento = parseInt(values[index], 10) || 1;
        }
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("Erro ao carregar cronograma:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST /api/config/cronograma
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { dias_padrao_cancelamento, dias_padrao_reagendamento } = body;

    const values = [
      String(dias_padrao_cancelamento || 2),
      String(dias_padrao_reagendamento || 1),
    ];

    await updateRow(SHEETS.CRONOGRAMA, 1, [
      "DIAS_CANCELAMENTO",
      "DIAS_REAGENDAMENTO",
    ]);
    await updateRow(SHEETS.CRONOGRAMA, 2, values);

    await logConfig(
      "CONFIG",
      user.re,
      "Cronograma",
      `Cancelamento: ${dias_padrao_cancelamento}d, Reagendamento: ${dias_padrao_reagendamento}d`,
    );

    return NextResponse.json({
      success: true,
      message: "Cronograma atualizado",
    });
  } catch (error) {
    console.error("Erro ao atualizar cronograma:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
