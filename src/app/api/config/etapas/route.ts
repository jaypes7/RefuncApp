/**
 * ============================================================================
 * API: /api/config/etapas
 * ============================================================================
 *
 * POST: Atualiza apenas as etapas do cronograma
 *       SEM tocar nos dados do projeto (datas, gerentes, etc).
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSheetData, updateRow, SHEETS } from "@/lib/sheets";
import { ConfigEtapasSchema } from "@/lib/schemas";
import { requireAuth } from "@/lib/auth";
import { logConfig } from "@/lib/logs";

// Ordem das colunas na Config Sheet (deve coincidir com CONFIG_KEYS em /api/config)
const CONFIG_KEYS = [
  "DATA_INICIO_PROJETO",  // 0
  "DATA_FIM_PROJETO",     // 1
  "DIAS_TOTAIS_PROJETO",  // 2
  "ETAPAS_PROJETO",       // 3
  "DURACAO_ETAPAS",       // 4
  "META_ADMISSOES",       // 5
  "ETAPA_ATUAL",          // 6
  "GERENTE_OPERACOES",    // 7
  "GERENTE_CONTRATO",     // 8
  "NOME_CLIENTE",         // 9
  "CENTRO_CUSTO",         // 10
];

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const { etapas } = ConfigEtapasSchema.parse(body);

    // Lê os valores atuais para preservar dados do projeto
    const configRows = await getSheetData(SHEETS.CONFIG);
    const currentValues: string[] = CONFIG_KEYS.map(() => "");

    if (configRows.length >= 2) {
      const headers = configRows[0];
      const values = configRows[1];
      headers.forEach((header, index) => {
        const keyIndex = CONFIG_KEYS.indexOf(header);
        if (keyIndex !== -1 && values[index] !== undefined) {
          currentValues[keyIndex] = values[index] ?? "";
        }
      });
    }

    const nomesEtapas = JSON.stringify(etapas.map((e) => e.nome));
    const duracoesEtapas = JSON.stringify(etapas.map((e) => e.duracaoDias));

    // Monta os valores atualizando apenas os campos de etapas
    const newValues = [...currentValues];
    // [0] DATA_INICIO_PROJETO — preservado
    // [1] DATA_FIM_PROJETO — preservado
    // [2] DIAS_TOTAIS_PROJETO — preservado
    newValues[3] = nomesEtapas;   // ETAPAS_PROJETO
    newValues[4] = duracoesEtapas; // DURACAO_ETAPAS
    // [5] META_ADMISSOES — preservado
    // [6] ETAPA_ATUAL — preservado
    // [7-10] campos do projeto — preservados

    await updateRow(SHEETS.CONFIG, 1, CONFIG_KEYS);
    await updateRow(SHEETS.CONFIG, 2, newValues);

    await logConfig(
      user.re,
      "Cronograma",
      undefined,
      `Etapas atualizadas: ${etapas.length} etapas`,
    );

    return NextResponse.json({
      success: true,
      message: "Etapas do cronograma atualizadas",
      data: { etapas },
    });
  } catch (error) {
    console.error("Erro ao atualizar etapas:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
