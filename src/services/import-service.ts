/**
 * ============================================================================
 * IMPORT SERVICE — Cliente para a rota de importação em batch
 * ============================================================================
 *
 * Responsabilidade única:
 *   Enviar todas as linhas da planilha para POST /api/colaboradores/import
 *   e retornar o ImportReport produzido pelo servidor.
 *
 * A lógica pesada (sanitização, deduplicação, gravação em batch) foi movida
 * para o backend — consulte src/app/api/colaboradores/import/route.ts.
 *
 * Uso:
 *   ```ts
 *   import { processImport } from "@/services/import-service";
 *   const report = await processImport(rows);
 *   // { inseridos: 12, atualizados: 5, erros: [...] }
 *   ```
 */

import { api } from "@/lib/axios";
import type { RawRow, ImportReport } from "@/lib/import-utils";

// Re-exporta os tipos para compatibilidade com ImportModal.tsx e outros consumers
export type { RawRow, ImportError, ImportReport } from "@/lib/import-utils";

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

/**
 * Envia as linhas brutas da planilha para o backend processar em batch.
 *
 * O backend realiza, em uma única requisição:
 *   1. getSheetData()          → 1 leitura total da aba
 *   2. Sanitização em memória  → nenhuma chamada ao Google Sheets
 *   3. appendRowsBatch()       → 1 escrita para todos os novos
 *   4. updateRowsBatch()       → 1 escrita para todos os existentes
 *   5. logImport()             → 1 entrada de log
 *
 * @param rows        Linhas brutas do Excel (chaves = headers originais)
 * @param onProgress  Callback opcional de progresso (chamado no início e fim)
 */
export async function processImport(
  rows: RawRow[],
  onProgress?: (done: number, total: number) => void
): Promise<ImportReport> {
  onProgress?.(0, rows.length);

  const response = await api.post<ImportReport>(
    "/api/colaboradores/import",
    { rows }
  );

  onProgress?.(rows.length, rows.length);
  return response.data;
}
