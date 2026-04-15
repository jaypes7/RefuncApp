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

interface ProcessImportOptions {
  defaultCentroCusto?: string;
  onProgress?: (done: number, total: number) => void;
}

/**
 * Envia as linhas brutas da planilha para o backend processar em batch.
 *
 * O backend realiza, em uma única requisição:
 *   1. Leitura dos registros existentes via Supabase
 *   2. Sanitização em memória
 *   3. Upsert dos registros no banco
 *   4. Registro de log da importação
 *
 * @param rows        Linhas brutas do Excel (chaves = headers originais)
 * @param options     Opções opcionais: defaultCentroCusto e callback de progresso
 */
export async function processImport(
  rows: RawRow[],
  options: ProcessImportOptions = {}
): Promise<ImportReport> {
  const { defaultCentroCusto, onProgress } = options;
  onProgress?.(0, rows.length);

  const response = await api.post<ImportReport>(
    "/colaboradores/import",
    { rows, default_centro_custo: defaultCentroCusto }
  );

  onProgress?.(rows.length, rows.length);
  return response.data;
}
