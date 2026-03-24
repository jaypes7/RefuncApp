/**
 * ============================================================================
 * API: /api/config/projeto-dados
 * ============================================================================
 *
 * POST: Atualiza apenas dados do projeto (datas, gerentes, cliente, centro de custo)
 *       SEM tocar nas etapas do cronograma.
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSheetData, updateRow, SHEETS } from "@/lib/sheets";
import { ConfigProjetoSchema } from "@/lib/schemas";
import { requireAuth } from "@/lib/auth";
import { logConfig } from "@/lib/logs";
import { calculateWorkingDays } from "@/lib/date-utils";

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

function formatarData(data: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
  const d = new Date(data);
  if (isNaN(d.getTime())) return data;
  return d.toISOString().split("T")[0];
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const {
      dataInicio,
      dataFim,
      gerenteOperacoes,
      gerenteContrato,
      nomeCliente,
      centroCusto,
    } = ConfigProjetoSchema.parse(body);

    const dataInicioFmt = formatarData(dataInicio);
    const dataFimFmt = formatarData(dataFim);
    const diasTotais = calculateWorkingDays(dataInicioFmt, dataFimFmt);

    // Lê os valores atuais para preservar etapas e outros campos
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

    // Monta os valores atualizando apenas os campos do projeto
    const newValues = [...currentValues];
    newValues[0] = dataInicioFmt;
    newValues[1] = dataFimFmt;
    newValues[2] = String(diasTotais);
    // [3] ETAPAS_PROJETO — preservado
    // [4] DURACAO_ETAPAS — preservado
    // [5] META_ADMISSOES — preservado
    // [6] ETAPA_ATUAL — preservado
    newValues[7] = gerenteOperacoes ?? currentValues[7];
    newValues[8] = gerenteContrato ?? currentValues[8];
    newValues[9] = nomeCliente ?? currentValues[9];
    newValues[10] = centroCusto ?? currentValues[10];

    await updateRow(SHEETS.CONFIG, 1, CONFIG_KEYS);
    await updateRow(SHEETS.CONFIG, 2, newValues);

    await logConfig(
      user.re,
      "Projeto",
      undefined,
      `Dados do projeto atualizados: ${dataInicioFmt} a ${dataFimFmt}`,
    );

    return NextResponse.json({
      success: true,
      message: "Dados do projeto atualizados",
      data: { dataInicio: dataInicioFmt, dataFim: dataFimFmt, diasTotais },
    });
  } catch (error) {
    console.error("Erro ao atualizar dados do projeto:", error);

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
