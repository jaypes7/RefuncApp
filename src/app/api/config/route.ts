/**
 * ============================================================================
 * API: /api/config
 * ============================================================================
 *
 * GET: Retorna configurações do projeto
 * POST: Atualiza configurações
 *
 * Estrutura da planilha (HORIZONTAL):
 * Linha 1: DATA_INICIO_PROJETO | DATA_FIM_PROJETO | DIAS_TOTAIS_PROJETO | ...
 * Linha 2: 2024-01-15          | 2024-12-31       | 365                 | ...
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSheetData, updateRow, SHEETS } from "@/lib/sheets";
import { ConfigUpdateSchema, EtapaConfig } from "@/lib/schemas";
import { requireAuth } from "@/lib/auth";
import { logConfig } from "@/lib/logs";
import { calculateWorkingDays } from "@/lib/date-utils";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Converte qualquer representação de data (serial Excel, DD/MM/YYYY, ISO)
 * para o formato YYYY-MM-DD. Retorna null se não for possível.
 */
function parseDate(value: string | number | undefined | null): string | null {
  if (value === undefined || value === null || value === "") return null;
  const str = String(value).trim();
  if (str === "") return null;

  // Já no formato correto
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // Serial numérico do Excel (ex: 46148)
  if (/^\d+$/.test(str)) {
    const serial = parseInt(str, 10);
    const d = new Date(Date.UTC(1899, 11, 30));
    d.setUTCDate(d.getUTCDate() + serial);
    return d.toISOString().split("T")[0];
  }

  // Padrão brasileiro DD/MM/YYYY
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const [, dd, mm, yyyy] = brMatch;
    return `${yyyy}-${mm}-${dd}`;
  }

  // ISO com timestamp — extrai apenas a data
  return str.split("T")[0] || null;
}

// ============================================================================
// TIPOS
// ============================================================================

interface ConfigResponse {
  DIAS_TOTAIS_PROJETO: number;
  DATA_INICIO_PROJETO: string | null;
  DATA_FIM_PROJETO: string | null;
  ETAPA_ATUAL: number;
  META_ADMISSOES: number;
  ETAPAS_PROJETO: EtapaConfig[];
  GERENTE_OPERACOES: string | null;
  GERENTE_CONTRATO: string | null;
  NOME_CLIENTE: string | null;
  CENTRO_CUSTO: string | null;
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

// Lista de todas as chaves esperadas na ordem correta
const CONFIG_KEYS = [
  "DATA_INICIO_PROJETO",
  "DATA_FIM_PROJETO",
  "DIAS_TOTAIS_PROJETO",
  "ETAPAS_PROJETO",
  "DURACAO_ETAPAS",
  "META_ADMISSOES",
  "ETAPA_ATUAL",
  "GERENTE_OPERACOES",
  "GERENTE_CONTRATO",
  "NOME_CLIENTE",
  "CENTRO_CUSTO",
];

/**
 * Busca configurações da planilha (estrutura horizontal)
 * Linha 1 = Headers (chaves), Linha 2 = Valores
 */
async function getConfigData(): Promise<ConfigResponse> {
  const configRows = await getSheetData(SHEETS.CONFIG);

  const config: Record<string, string> = {};

  if (configRows.length >= 2) {
    // Linha 1 = headers (chaves)
    const headers = configRows[0];
    // Linha 2 = valores
    const values = configRows[1];

    // Mapeia cada header para seu valor correspondente
    headers.forEach((header, index) => {
      if (header && values[index]) {
        config[header] = values[index];
      }
    });
  }

  // Parse das etapas
  let etapas: EtapaConfig[] = [];
  if (config.ETAPAS_PROJETO && config.DURACAO_ETAPAS) {
    try {
      const nomes = JSON.parse(config.ETAPAS_PROJETO);
      const duracoes = JSON.parse(config.DURACAO_ETAPAS);
      etapas = nomes.map((nome: string, index: number) => ({
        id: index + 1,
        nome,
        duracaoDias: duracoes[index] || 1,
      }));
    } catch {
      etapas = [];
    }
  }

  return {
    DIAS_TOTAIS_PROJETO: parseInt(config.DIAS_TOTAIS_PROJETO || "0", 10),
    DATA_INICIO_PROJETO: parseDate(config.DATA_INICIO_PROJETO),
    DATA_FIM_PROJETO: parseDate(config.DATA_FIM_PROJETO),
    ETAPA_ATUAL: parseInt(config.ETAPA_ATUAL || "1", 10),
    META_ADMISSOES: parseInt(config.META_ADMISSOES || "0", 10),
    ETAPAS_PROJETO: etapas,
    GERENTE_OPERACOES: config.GERENTE_OPERACOES || null,
    GERENTE_CONTRATO: config.GERENTE_CONTRATO || null,
    NOME_CLIENTE: config.NOME_CLIENTE || null,
    CENTRO_CUSTO: config.CENTRO_CUSTO || null,
  };
}

// ============================================================================
// GET /api/config
// ============================================================================

export async function GET() {
  try {
    // Verifica autenticação
    await requireAuth();

    const config = await getConfigData();

    return NextResponse.json({
      data: config,
    });
  } catch (error) {
    console.error("Erro ao carregar configurações:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/config
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Verifica autenticação
    const user = await requireAuth();

    // Parse e validação do body
    const body = await request.json();
    const {
      dataInicio,
      dataFim,
      etapas,
      gerenteOperacoes,
      gerenteContrato,
      nomeCliente,
      centroCusto,
    } = ConfigUpdateSchema.parse(body);

    // Garante que as datas estejam no formato YYYY-MM-DD (como string)
    const formatarData = (data: string): string => {
      // Se já está no formato correto, retorna
      if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
      // Tenta converter
      const d = new Date(data);
      if (isNaN(d.getTime())) return data;
      return d.toISOString().split("T")[0];
    };

    const dataInicioFmt = formatarData(dataInicio);
    const dataFimFmt = formatarData(dataFim);

    // Calcula dias ÚTEIS (excluindo sábados e domingos) — mesma função do frontend
    const diasTotais = calculateWorkingDays(dataInicioFmt, dataFimFmt);

    // Prepara valores
    const nomesEtapas = JSON.stringify(etapas.map((e) => e.nome));
    const duracoesEtapas = JSON.stringify(etapas.map((e) => e.duracaoDias));

    // Prepara os valores na ordem correta das chaves
    const values = [
      dataInicioFmt, // DATA_INICIO_PROJETO (como string)
      dataFimFmt, // DATA_FIM_PROJETO (como string)
      String(diasTotais), // DIAS_TOTAIS_PROJETO (diferença em dias)
      nomesEtapas, // ETAPAS_PROJETO
      duracoesEtapas, // DURACAO_ETAPAS
      "100", // META_ADMISSOES (default)
      "1", // ETAPA_ATUAL (default)
      gerenteOperacoes || "", // GERENTE_OPERACOES
      gerenteContrato || "", // GERENTE_CONTRATO
      nomeCliente || "", // NOME_CLIENTE
      centroCusto || "", // CENTRO_CUSTO
    ];

    // Atualiza ou cria as linhas
    // Linha 1: Headers
    await updateRow(SHEETS.CONFIG, 1, CONFIG_KEYS);
    // Linha 2: Valores
    await updateRow(SHEETS.CONFIG, 2, values);

    // Registra log
    await logConfig(
      user.re,
      "Projeto",
      undefined,
      `${dataInicio} a ${dataFim}`,
    );

    return NextResponse.json({
      success: true,
      message: "Configurações atualizadas com sucesso",
      data: {
        dataInicio,
        dataFim,
        diasTotais,
        etapas,
      },
    });
  } catch (error) {
    console.error("Erro ao atualizar configurações:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
