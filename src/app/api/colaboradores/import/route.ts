/**
 * ============================================================================
 * API: /api/colaboradores/import
 * ============================================================================
 *
 * POST: Importação em batch de colaboradores via planilha (Opção 3)
 *
 * Arquitetura Prepare + Commit:
 *   ─ FASE 1: getSheetData()     → 1 única leitura de toda a aba
 *   ─ FASE 2: Processamento      → sanitização + dedup em memória (0 chamadas)
 *   ─ FASE 3: appendRowsBatch()  → 1 única escrita para todos os inserts
 *   ─ FASE 4: updateRowsBatch()  → 1 única escrita para todos os updates
 *   ─ FASE 5: logImport()        → 1 entrada de log
 *
 * Resultado: ~500 linhas = 3 chamadas ao Google Sheets (antes: 1500+)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getSheetData,
  appendRowsBatch,
  updateRowsBatch,
  SHEETS,
  CPF_COLUMN_INDEX,
} from "@/lib/sheets";
import {
  buildHeaderMap,
  rowToColaborador,
  sanitizeCPF,
  type RawRow,
  type ImportReport,
  type ImportError,
} from "@/lib/import-utils";
import { requireAuth } from "@/lib/auth";
import { logImport } from "@/lib/logs";

// ============================================================================
// ORDEM DAS COLUNAS (SAGRADA - NÃO ALTERAR)
// ============================================================================

const COLUNAS_ORDEM = [
  "IND", "STATUS", "ENVIADO_RH", "PESSOA", "REQ", "VINCULADO",
  "CARTA_OFERTA", "COLAB_PEND", "EXAME", "CLINICA", "DOCS", "ASO",
  "RPV", "PRE_ADMISSAO", "MOB", "OP", "DATA_ADMISSAO", "CONTRATO",
  "PORTAL", "CRACHA", "PONTO", "TREINAMENTO", "REALIZAR_TREINAMENTO",
  "LOCAL_TREINAMENTO", "RE", "NOME", "FUNCAO_CLT", "HISTOGRAMA",
  "IDADE", "DT_NASCIMENTO", "CPF", "VR", "TERMINO", "PRORROGACAO",
  "DEMISSAO", "MUNICIPIO", "UF", "TELEFONE",
] as const;

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Converte um Record de campos do colaborador para um array
 * ordenado de 38 strings, pronto para gravar no Google Sheets.
 */
function colaboradorToRow(obj: Record<string, unknown>): string[] {
  return COLUNAS_ORDEM.map((col) => {
    const v = obj[col];
    if (v === null || v === undefined) return "";
    return String(v);
  });
}

/**
 * Converte um array de strings da planilha (38 posições) de volta
 * para um Record com as chaves correspondentes às colunas.
 */
function rowArrayToRecord(arr: string[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  COLUNAS_ORDEM.forEach((col, idx) => {
    obj[col] = arr[idx] !== undefined ? arr[idx] : null;
  });
  return obj;
}

// ============================================================================
// POST /api/colaboradores/import
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Verifica autenticação
    const user = await requireAuth();

    // Parse do body
    const body = await request.json();
    const { rows } = body as { rows: RawRow[] };

    const report: ImportReport = {
      inseridos: 0,
      atualizados: 0,
      ignorados: 0,
      erros: [] as ImportError[],
      total: Array.isArray(rows) ? rows.length : 0,
    };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(report);
    }

    // ── FASE 1: Uma única leitura de toda a aba ──────────────────────────────
    const sheetData = await getSheetData(SHEETS.COLABORADORES);

    // Constrói mapa CPF → { rowIndex, rowData } em memória O(n)
    const cpfMap = new Map<string, { rowIndex: number; rowData: string[] }>();
    for (let i = 1; i < sheetData.length; i++) {
      const row = sheetData[i];
      const cpfRaw = row[CPF_COLUMN_INDEX];
      if (cpfRaw) {
        const cpfNorm = String(cpfRaw).replace(/\D/g, "").padStart(11, "0");
        if (cpfNorm.length === 11) {
          cpfMap.set(cpfNorm, { rowIndex: i + 1, rowData: row }); // rowIndex é 1-based
        }
      }
    }

    // ── Constrói mapa de headers UMA VEZ ────────────────────────────────────
    const headers = Object.keys(rows[0] ?? {});
    const headerMap = buildHeaderMap(headers);

    if (headerMap.size === 0) {
      report.erros.push({
        linha: 0,
        motivo:
          "Nenhum cabeçalho reconhecido. Verifique se o arquivo segue o padrão REFUNC ou Controle Geral.",
      });
      return NextResponse.json(report);
    }

    // ── FASE 2: Processa todas as linhas em memória ──────────────────────────
    const toInsert: string[][] = [];
    const toUpdate: { rowIndex: number; values: string[] }[] = [];
    const seenCPFs = new Set<string>(); // detecta duplicatas dentro do mesmo arquivo

    rows.forEach((row, idx) => {
      const lineNumber = idx + 1;
      try {
        const colaborador = rowToColaborador(row, headerMap);

        // CPF é obrigatório — sem ele não há upsert possível
        const cpfRaw = colaborador["CPF"] ?? row["CPF"] ?? "";
        const cpf = sanitizeCPF(cpfRaw);

        if (!cpf || cpf.length !== 11) {
          report.ignorados++;
          return;
        }
        colaborador["CPF"] = cpf;

        // NOME é obrigatório para criação
        if (!String(colaborador["NOME"] ?? "").trim()) {
          report.erros.push({
            linha: lineNumber,
            campo: "NOME",
            motivo: `CPF ${cpf}: campo NOME ausente ou vazio.`,
          });
          return;
        }

        // Detecta CPF duplicado dentro do mesmo arquivo de importação
        if (seenCPFs.has(cpf)) {
          report.erros.push({
            linha: lineNumber,
            campo: "CPF",
            motivo: `CPF ${cpf}: duplicado neste arquivo de importação (linha ignorada).`,
          });
          return;
        }
        seenCPFs.add(cpf);

        if (cpfMap.has(cpf)) {
          // ── ATUALIZAR: merge patch (preserva campos existentes, sobrescreve apenas os não-nulos) ──
          const existing = cpfMap.get(cpf)!;
          const existingRecord = rowArrayToRecord(existing.rowData);

          for (const [key, value] of Object.entries(colaborador)) {
            if (value !== null && value !== undefined && value !== "") {
              existingRecord[key] = value;
            }
          }
          existingRecord["CPF"] = cpf; // garante CPF intacto

          toUpdate.push({
            rowIndex: existing.rowIndex,
            values: colaboradorToRow(existingRecord),
          });
          report.atualizados++;
        } else {
          // ── INSERIR ──────────────────────────────────────────────────────────
          toInsert.push(colaboradorToRow(colaborador));
          // Registra no mapa para evitar duplicata posterior no mesmo import
          cpfMap.set(cpf, { rowIndex: -1, rowData: [] });
          report.inseridos++;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido ao processar linha";
        report.erros.push({ linha: lineNumber, motivo: msg });
      }
    });

    // ── FASE 3 & 4: Escrita em batch (inserts + updates em paralelo) ─────────
    const writePromises: Promise<void>[] = [];

    if (toInsert.length > 0) {
      writePromises.push(appendRowsBatch(SHEETS.COLABORADORES, toInsert));
    }

    if (toUpdate.length > 0) {
      writePromises.push(updateRowsBatch(SHEETS.COLABORADORES, toUpdate));
    }

    if (writePromises.length > 0) {
      await Promise.all(writePromises);
    }

    // ── FASE 5: Um único log para todo o import ──────────────────────────────
    await logImport(
      user.re,
      `${report.inseridos} inseridos, ${report.atualizados} atualizados, ${report.erros.length} erro(s)`,
      String(report.total)
    );

    return NextResponse.json(report);
  } catch (error) {
    console.error("Erro na importação em batch:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
