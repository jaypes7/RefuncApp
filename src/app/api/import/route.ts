/**
 * ============================================================================
 * API: POST /api/import
 * ============================================================================
 *
 * Importa colaboradores via planilha XLSX com lógica de UPSERT:
 * - CPFs existentes: atualiza a linha correspondente
 * - CPFs novos: adiciona no final da planilha
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getSheetData,
  updateRow,
  appendRow,
  SHEETS,
  COLABORADORES_RANGE,
} from "@/lib/sheets";
import { requireAuth } from "@/lib/auth";
import { logImport } from "@/lib/logs";

// ============================================================================
// TIPOS
// ============================================================================

interface ColaboradorImport {
  IND?: string | null;
  STATUS?: string | null;
  ENVIADO_RH?: string | null;
  PESSOA?: string | null;
  REQ?: string | null;
  VINCULADO?: string | null;
  CARTA_OFERTA?: string | null;
  COLAB_PEND?: string | null;
  EXAME?: string | null;
  CLINICA?: string | null;
  DOCS?: string | null;
  ASO?: string | null;
  RPV?: string | null;
  PRE_ADMISSAO?: string | null;
  MOB?: string | null;
  OP?: string | null;
  DATA_ADMISSAO?: string | null;
  CONTRATO?: string | null;
  PORTAL?: string | null;
  CRACHA?: string | null;
  PONTO?: string | null;
  TREINAMENTO?: string | null;
  REALIZAR_TREINAMENTO?: string | null;
  LOCAL_TREINAMENTO?: string | null;
  RE?: string | null;
  NOME: string;
  FUNCAO_CLT?: string | null;
  HISTOGRAMA?: string | null;
  IDADE?: number | null;
  DT_NASCIMENTO?: string | null;
  CPF: string;
  VR?: string | null;
  TERMINO?: string | null;
  PRORROGACAO?: string | null;
  DEMISSAO?: string | null;
  MUNICIPIO?: string | null;
  UF?: string | null;
  TELEFONE?: string | null;
}

interface ImportResult {
  inserted: number;
  updated: number;
  total: number;
  errors: string[];
}

// ============================================================================
// ORDEM DAS COLUNAS (SAGRADA - NÃO ALTERAR)
// ============================================================================

const COLUNAS_ORDEM: (keyof ColaboradorImport)[] = [
  "IND",
  "STATUS",
  "ENVIADO_RH",
  "PESSOA",
  "REQ",
  "VINCULADO",
  "CARTA_OFERTA",
  "COLAB_PEND",
  "EXAME",
  "CLINICA",
  "DOCS",
  "ASO",
  "RPV",
  "PRE_ADMISSAO",
  "MOB",
  "OP",
  "DATA_ADMISSAO",
  "CONTRATO",
  "PORTAL",
  "CRACHA",
  "PONTO",
  "TREINAMENTO",
  "REALIZAR_TREINAMENTO",
  "LOCAL_TREINAMENTO",
  "RE",
  "NOME",
  "FUNCAO_CLT",
  "HISTOGRAMA",
  "IDADE",
  "DT_NASCIMENTO",
  "CPF",
  "VR",
  "TERMINO",
  "PRORROGACAO",
  "DEMISSAO",
  "MUNICIPIO",
  "UF",
  "TELEFONE",
];

// Índice da coluna CPF (0-based)
const CPF_COLUMN_INDEX = 30;

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Converte objeto Colaborador para array de valores na ordem correta
 */
function colaboradorToRow(colaborador: ColaboradorImport): string[] {
  return COLUNAS_ORDEM.map((coluna) => {
    const valor = colaborador[coluna];
    return valor === null || valor === undefined ? "" : String(valor);
  });
}

/**
 * Busca todos os CPFs existentes na planilha e mapeia para o número da linha
 * Retorna: Map<CPF, rowIndex> (rowIndex é 1-based)
 */
async function mapearCPFsExistentes(): Promise<Map<string, number>> {
  console.log("[Import API] Mapeando CPFs existentes...");

  const data = await getSheetData(SHEETS.COLABORADORES, COLABORADORES_RANGE);
  const cpfMap = new Map<string, number>();

  // Começa da linha 2 (índice 1) - assume linha 1 como header
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const cpf = row[CPF_COLUMN_INDEX];

    if (cpf && String(cpf).trim()) {
      // Limpa o CPF para comparação
      const cpfLimpo = String(cpf).replace(/\D/g, "").padStart(11, "0");
      // +2 porque: +1 para converter de 0-based para 1-based, +1 para pular header
      cpfMap.set(cpfLimpo, i + 2);
    }
  }

  console.log(`[Import API] ${cpfMap.size} CPFs mapeados`);
  // Log dos primeiros 5 CPFs mapeados para debug
  const cpfSamples = Array.from(cpfMap.entries()).slice(0, 5);
  console.log("[Import API] Amostra de CPFs mapeados:", cpfSamples);

  return cpfMap;
}

/**
 * Formata data para o padrão ISO YYYY-MM-DD
 * Aceita: string ISO, Excel serial, DD/MM/YYYY
 */
function formatarDataISO(
  data: string | number | null | undefined,
): string | null {
  if (!data) return null;

  // Se já é string no formato ISO
  if (typeof data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return data;
  }

  // Se é número (Excel serial)
  if (typeof data === "number" || /^\d+$/.test(String(data))) {
    const excelSerial = Number(data);
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(
      excelEpoch.getTime() + excelSerial * 24 * 60 * 60 * 1000,
    );
    return date.toISOString().split("T")[0];
  }

  // Tenta parse como string
  const d = new Date(String(data));
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }

  return null;
}

/**
 * Normaliza os dados do colaborador antes de salvar
 */
type RawColaboradorData = Record<string, unknown>;

function normalizarColaborador(data: RawColaboradorData): ColaboradorImport {
  // Converte qualquer valor para string ou null (lida com números do Excel)
  const str = (v: unknown): string | null => {
    if (v == null) return null;
    const s = String(v);
    return s || null;
  };

  // Garante que CPF tenha 11 dígitos
  const cpf = String(data.CPF || "")
    .replace(/\D/g, "")
    .padStart(11, "0");

  return {
    IND: str(data.IND),
    STATUS: str(data.STATUS),
    ENVIADO_RH: str(data.ENVIADO_RH),
    PESSOA: str(data.PESSOA),
    REQ: str(data.REQ),
    VINCULADO: str(data.VINCULADO),
    CARTA_OFERTA: str(data.CARTA_OFERTA),
    COLAB_PEND: str(data.COLAB_PEND),
    EXAME: str(data.EXAME),
    CLINICA: str(data.CLINICA),
    DOCS: str(data.DOCS),
    ASO: str(data.ASO),
    RPV: str(data.RPV),
    PRE_ADMISSAO: str(data.PRE_ADMISSAO),
    MOB: str(data.MOB),
    OP: str(data.OP),
    DATA_ADMISSAO: formatarDataISO(
      data.DATA_ADMISSAO as string | number | null | undefined,
    ),
    CONTRATO: str(data.CONTRATO),
    PORTAL: str(data.PORTAL),
    CRACHA: str(data.CRACHA),
    PONTO: str(data.PONTO),
    TREINAMENTO: str(data.TREINAMENTO),
    REALIZAR_TREINAMENTO: str(data.REALIZAR_TREINAMENTO),
    LOCAL_TREINAMENTO: str(data.LOCAL_TREINAMENTO),
    RE: str(data.RE),
    NOME: str(data.NOME) || "",
    FUNCAO_CLT: str(data.FUNCAO_CLT),
    HISTOGRAMA: str(data.HISTOGRAMA),
    IDADE: data.IDADE ? parseInt(String(data.IDADE), 10) : null,
    DT_NASCIMENTO: formatarDataISO(
      data.DT_NASCIMENTO as string | number | null | undefined,
    ),
    CPF: cpf,
    VR: str(data.VR),
    TERMINO: formatarDataISO(
      data.TERMINO as string | number | null | undefined,
    ),
    PRORROGACAO: formatarDataISO(
      data.PRORROGACAO as string | number | null | undefined,
    ),
    DEMISSAO: formatarDataISO(
      data.DEMISSAO as string | number | null | undefined,
    ),
    MUNICIPIO: str(data.MUNICIPIO),
    UF: str(data.UF),
    TELEFONE: str(data.TELEFONE),
  };
}

// ============================================================================
// POST /api/import
// ============================================================================

export async function POST(request: NextRequest) {
  console.log("[Import API] Iniciando importação...");

  try {
    // Verifica autenticação
    const user = await requireAuth();
    console.log(`[Import API] Usuário autenticado: ${user.re}`);

    // Parse do body
    const body = await request.json();
    const { data: importData } = body;

    if (!Array.isArray(importData) || importData.length === 0) {
      return NextResponse.json(
        { error: "Dados de importação inválidos ou vazios" },
        { status: 400 },
      );
    }

    console.log(`[Import API] ${importData.length} registros recebidos`);

    // Mapeia CPFs existentes (otimização: uma única leitura)
    const cpfsExistentes = await mapearCPFsExistentes();

    // Separa em arrays de update e insert
    const itemsToUpdate: {
      colaborador: ColaboradorImport;
      rowIndex: number;
    }[] = [];
    const itemsToInsert: ColaboradorImport[] = [];
    const errors: string[] = [];

    for (let i = 0; i < importData.length; i++) {
      const item = importData[i];

      // Validação básica
      if (!item.CPF) {
        errors.push(`Linha ${i + 1}: CPF é obrigatório`);
        continue;
      }

      if (!item.NOME) {
        errors.push(`Linha ${i + 1}: NOME é obrigatório`);
        continue;
      }

      // Normaliza o colaborador
      const colaborador = normalizarColaborador(item);
      const cpfLimpo = colaborador.CPF;

      // Log para debug do CPF
      if (i < 3) {
        console.log(`[Import API] Processando linha ${i + 1}:`, {
          cpfOriginal: item.CPF,
          cpfNormalizado: cpfLimpo,
          nome: item.NOME,
        });
      }

      // Verifica se existe
      if (cpfsExistentes.has(cpfLimpo)) {
        const rowIndex = cpfsExistentes.get(cpfLimpo)!;
        itemsToUpdate.push({ colaborador, rowIndex });
        console.log(
          `[Import API] CPF ${cpfLimpo} encontrado na linha ${rowIndex} - será atualizado`,
        );
      } else {
        itemsToInsert.push(colaborador);
        console.log(
          `[Import API] CPF ${cpfLimpo} não encontrado - será inserido`,
        );
      }
    }

    console.log(
      `[Import API] ${itemsToUpdate.length} para atualizar, ${itemsToInsert.length} para inserir`,
    );

    // Executa updates em batch
    let updatedCount = 0;
    if (itemsToUpdate.length > 0) {
      console.log(
        `[Import API] Executando ${itemsToUpdate.length} atualizações...`,
      );

      for (const { colaborador, rowIndex } of itemsToUpdate) {
        try {
          const rowData = colaboradorToRow(colaborador);
          await updateRow(SHEETS.COLABORADORES, rowIndex, rowData);
          updatedCount++;
        } catch (err) {
          console.error(
            `[Import API] Erro ao atualizar CPF ${colaborador.CPF}:`,
            err,
          );
          errors.push(`Erro ao atualizar CPF ${colaborador.CPF}`);
        }
      }
    }

    // Executa inserts em batch
    let insertedCount = 0;
    if (itemsToInsert.length > 0) {
      console.log(
        `[Import API] Executando ${itemsToInsert.length} inserções...`,
      );

      for (const colaborador of itemsToInsert) {
        try {
          const rowData = colaboradorToRow(colaborador);
          await appendRow(SHEETS.COLABORADORES, rowData);
          insertedCount++;
        } catch (err) {
          console.error(
            `[Import API] Erro ao inserir CPF ${colaborador.CPF}:`,
            err,
          );
          errors.push(`Erro ao inserir CPF ${colaborador.CPF}`);
        }
      }
    }

    // Registra log da importação
    try {
      await logImport(
        user.re,
        `${insertedCount} inseridos, ${updatedCount} atualizados`,
        importData.length.toString(),
      );
    } catch (logErr) {
      console.error("[Import API] Erro ao registrar log:", logErr);
      // Não falha a importação por erro no log
    }

    const result: ImportResult = {
      inserted: insertedCount,
      updated: updatedCount,
      total: importData.length,
      errors,
    };

    console.log("[Import API] Importação concluída:", result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Import API] Erro na importação:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
