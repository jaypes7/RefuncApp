/**
 * ============================================================================
 * GOOGLE SHEETS API - Cliente de Autenticação e Operações
 * ============================================================================
 *
 * Configuração do cliente Google Sheets API v4 via Service Account.
 * Todas as operações de leitura/escrita na planilha passam por aqui.
 */

import { google, sheets_v4 } from "googleapis";

// ============================================================================
// CONFIGURAÇÃO DE AUTENTICAÇÃO
// ============================================================================

/**
 * Cria e retorna o cliente de autenticação Google Auth
 * usando Service Account com variáveis de ambiente.
 */
export function getAuthClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Variáveis de ambiente GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY são obrigatórias"
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return auth;
}

/**
 * Retorna o cliente da API do Google Sheets (v4)
 */
export function getSheetsClient(): sheets_v4.Sheets {
  const auth = getAuthClient();
  return google.sheets({ version: "v4", auth });
}

/**
 * Retorna o ID da planilha configurada
 */
export function getSpreadsheetId(): string {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) {
    throw new Error("Variável de ambiente GOOGLE_SHEETS_ID é obrigatória");
  }
  return spreadsheetId;
}

// ============================================================================
// OPERAÇÕES DE LEITURA
// ============================================================================

/**
 * Obtém dados de uma aba específica da planilha
 *
 * @param sheetName - Nome da aba (ex: "Colaboradores", "Config", "Logs")
 * @param range - Range opcional (ex: "A2:AL", "A1:C10"). Se não informado, lê toda a aba.
 * @returns Array de arrays com os valores (string[][])
 */
export async function getSheetData(
  sheetName: string,
  range?: string
): Promise<string[][]> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const fullRange = range ? `${sheetName}!${range}` : sheetName;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: fullRange,
      valueRenderOption: "UNFORMATTED_VALUE",
    });

    return response.data.values || [];
  } catch (error) {
    console.error(`Erro ao ler dados da aba ${sheetName}:`, error);
    throw new Error(`Falha ao ler dados da aba ${sheetName}`);
  }
}

/**
 * Busca uma linha específica pelo valor de uma coluna
 *
 * @param sheetName - Nome da aba
 * @param colIndex - Índice da coluna (0-based)
 * @param value - Valor a buscar
 * @returns Objeto com rowIndex (1-based, incluindo header) e rowData, ou null se não encontrado
 */
export async function findRowByColumn(
  sheetName: string,
  colIndex: number,
  value: string
): Promise<{ rowIndex: number; rowData: string[] } | null> {
  const data = await getSheetData(sheetName);

  // Procura a partir da linha 2 (índice 1) - assume linha 1 como header
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const cellValue = row[colIndex];
    
    // Para CPF (coluna 30), normaliza a comparação garantindo 11 dígitos
    if (colIndex === CPF_COLUMN_INDEX) {
      const normalizedCell = cellValue 
        ? String(cellValue).replace(/\D/g, "").padStart(11, "0")
        : "";
      const normalizedValue = value.replace(/\D/g, "").padStart(11, "0");
      if (normalizedCell === normalizedValue) {
        return { rowIndex: i + 1, rowData: row }; // +1 porque sheets é 1-based
      }
    } else {
      if (cellValue === value) {
        return { rowIndex: i + 1, rowData: row }; // +1 porque sheets é 1-based
      }
    }
  }

  return null;
}

// ============================================================================
// OPERAÇÕES DE ESCRITA
// ============================================================================

/**
 * Adiciona uma nova linha ao final da aba
 *
 * @param sheetName - Nome da aba
 * @param values - Array de valores a serem inseridos
 */
export async function appendRow(
  sheetName: string,
  values: (string | number | boolean | Date | null | undefined)[]
): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  // Converte valores para string
  const stringValues = values.map((v) => {
    if (v === null || v === undefined) return "";
    if (v instanceof Date) return v.toISOString().split("T")[0]; // YYYY-MM-DD
    return String(v);
  });

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: sheetName,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [stringValues],
      },
    });
  } catch (error) {
    console.error(`Erro ao adicionar linha na aba ${sheetName}:`, error);
    throw new Error(`Falha ao adicionar linha na aba ${sheetName}`);
  }
}

/**
 * Atualiza uma linha específica
 *
 * @param sheetName - Nome da aba
 * @param rowIndex - Índice da linha (1-based, incluindo header)
 * @param values - Array de valores a serem atualizados
 * @param startCol - Coluna inicial (padrão: "A")
 */
export async function updateRow(
  sheetName: string,
  rowIndex: number,
  values: (string | number | boolean | Date | null | undefined)[],
  startCol: string = "A"
): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  // Converte valores para string
  const stringValues = values.map((v) => {
    if (v === null || v === undefined) return "";
    if (v instanceof Date) return v.toISOString().split("T")[0]; // YYYY-MM-DD
    return String(v);
  });

  // Calcula a coluna final
  const endCol = columnIndexToLetter(stringValues.length - 1);
  const range = `${sheetName}!${startCol}${rowIndex}:${endCol}${rowIndex}`;

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [stringValues],
      },
    });
  } catch (error) {
    console.error(`Erro ao atualizar linha ${rowIndex} na aba ${sheetName}:`, error);
    throw new Error(`Falha ao atualizar linha na aba ${sheetName}`);
  }
}

/**
 * Atualiza células específicas de uma linha (não toda a linha)
 *
 * @param sheetName - Nome da aba
 * @param rowIndex - Índice da linha (1-based)
 * @param updates - Mapa de coluna -> valor (ex: { "C": "Novo Valor", "E": "Outro" })
 */
export async function updateCells(
  sheetName: string,
  rowIndex: number,
  updates: Record<string, string | number | boolean | Date | null | undefined>
): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const data: sheets_v4.Schema$ValueRange[] = [];

  for (const [col, value] of Object.entries(updates)) {
    const stringValue =
      value === null || value === undefined
        ? ""
        : value instanceof Date
        ? value.toISOString().split("T")[0]
        : String(value);

    data.push({
      range: `${sheetName}!${col}${rowIndex}`,
      values: [[stringValue]],
    });
  }

  try {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data,
      },
    });
  } catch (error) {
    console.error(`Erro ao atualizar células na linha ${rowIndex}:`, error);
    throw new Error(`Falha ao atualizar células`);
  }
}

/**
 * Remove uma linha da planilha (limpa o conteúdo)
 * Nota: Google Sheets API não suporta deleteRow diretamente, então limpamos os valores
 *
 * @param sheetName - Nome da aba
 * @param rowIndex - Índice da linha (1-based)
 * @param numCols - Número de colunas a limpar (padrão: 38 para Colaboradores)
 */
export async function deleteRow(
  sheetName: string,
  rowIndex: number,
  numCols: number = 38
): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const endCol = columnIndexToLetter(numCols - 1);
  const range = `${sheetName}!A${rowIndex}:${endCol}${rowIndex}`;

  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range,
    });
  } catch (error) {
    console.error(`Erro ao remover linha ${rowIndex} da aba ${sheetName}:`, error);
    throw new Error(`Falha ao remover linha da aba ${sheetName}`);
  }
}

/**
 * Adiciona múltiplas linhas em batch (para importações)
 *
 * @param sheetName - Nome da aba
 * @param rows - Array de arrays de valores
 */
export async function appendRowsBatch(
  sheetName: string,
  rows: (string | number | boolean | Date | null | undefined)[][]
): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  // Converte valores para string
  const stringRows = rows.map((row) =>
    row.map((v) => {
      if (v === null || v === undefined) return "";
      if (v instanceof Date) return v.toISOString().split("T")[0];
      return String(v);
    })
  );

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: sheetName,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: stringRows,
      },
    });
  } catch (error) {
    console.error(`Erro ao adicionar múltiplas linhas na aba ${sheetName}:`, error);
    throw new Error(`Falha ao adicionar linhas em batch`);
  }
}

/**
 * Atualiza múltiplas linhas em batch (para importações com upsert)
 *
 * Usa a API batchUpdate do Google Sheets para gravar todas as atualizações
 * em uma única requisição HTTP — muito mais eficiente do que N chamadas
 * individuais que causariam rate limit.
 *
 * Chunk interno de 100 ranges por chamada para respeitar limites da API.
 *
 * @param sheetName - Nome da aba
 * @param updates - Array de { rowIndex (1-based), values }
 */
export async function updateRowsBatch(
  sheetName: string,
  updates: { rowIndex: number; values: (string | number | boolean | Date | null | undefined)[] }[]
): Promise<void> {
  if (updates.length === 0) return;

  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  // Chunka em grupos de 100 para respeitar limites da API do Google Sheets
  const MAX_RANGES = 100;
  for (let i = 0; i < updates.length; i += MAX_RANGES) {
    const chunkUpdates = updates.slice(i, i + MAX_RANGES);

    const data: sheets_v4.Schema$ValueRange[] = chunkUpdates.map(({ rowIndex, values }) => {
      const stringValues = values.map((v) => {
        if (v === null || v === undefined) return "";
        if (v instanceof Date) return v.toISOString().split("T")[0];
        return String(v);
      });
      const endCol = columnIndexToLetter(stringValues.length - 1);
      return {
        range: `${sheetName}!A${rowIndex}:${endCol}${rowIndex}`,
        values: [stringValues],
      };
    });

    try {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data,
        },
      });
    } catch (error) {
      console.error(`Erro ao atualizar linhas em batch na aba ${sheetName}:`, error);
      throw new Error(`Falha ao atualizar linhas em batch`);
    }
  }
}


// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Converte índice de coluna (0-based) para letra (A, B, C... AL, etc.)
 */
function columnIndexToLetter(index: number): string {
  let result = "";
  let n = index;

  do {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);

  return result;
}

/**
 * Converte letra de coluna para índice (0-based)
 */
export function columnLetterToIndex(letter: string): number {
  let result = 0;
  for (let i = 0; i < letter.length; i++) {
    result = result * 26 + (letter.charCodeAt(i) - 64);
  }
  return result - 1;
}

// ============================================================================
// CONSTANTES DAS ABAS
// ============================================================================

export const SHEETS = {
  COLABORADORES: "Colaboradores",
  CONFIG: "Config",
  LOGS: "Logs",
  CLINICAS: "Clinicas",
  PROJETOS: "Projetos",
  CRONOGRAMA: "Cronograma",
  HOTEIS: "Hoteis",
  USUARIOS_PERMITIDOS: "USERS_PERMITIDOS",
  USERS_PERMITIDOS: "USERS_PERMITIDOS",
  SUPRIMENTOS: "SUPRIMENTOS",
} as const;

// Range completo das 38 colunas (A até AL)
export const COLABORADORES_RANGE = "A2:AL";

// Índice da coluna CPF (0-based) - coluna 31 (AE) na planilha
export const CPF_COLUMN_INDEX = 30;
