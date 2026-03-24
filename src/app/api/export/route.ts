/**
 * ============================================================================
 * API: GET /api/export
 * ============================================================================
 *
 * Exporta todos os colaboradores sem paginação para geração de planilha XLSX.
 * Suporta filtros opcionais: search, status, setor
 */

import { NextRequest, NextResponse } from "next/server";
import { getSheetData, SHEETS, COLABORADORES_RANGE } from "@/lib/sheets";
import { requireAuth } from "@/lib/auth";
import { logExport } from "@/lib/logs";

// ============================================================================
// TIPOS
// ============================================================================

interface Colaborador {
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

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Converte array de valores da planilha para objeto Colaborador
 */
function rowToColaborador(row: (string | number)[]): Colaborador {
  const toStr = (val: string | number | undefined): string | null => {
    if (val === undefined || val === null) return null;
    return String(val);
  };

  return {
    IND: toStr(row[0]),
    STATUS: toStr(row[1]),
    ENVIADO_RH: toStr(row[2]),
    PESSOA: toStr(row[3]),
    REQ: toStr(row[4]),
    VINCULADO: toStr(row[5]),
    CARTA_OFERTA: toStr(row[6]),
    COLAB_PEND: toStr(row[7]),
    EXAME: toStr(row[8]),
    CLINICA: toStr(row[9]),
    DOCS: toStr(row[10]),
    ASO: toStr(row[11]),
    RPV: toStr(row[12]),
    PRE_ADMISSAO: toStr(row[13]),
    MOB: toStr(row[14]),
    OP: toStr(row[15]),
    DATA_ADMISSAO: toStr(row[16]),
    CONTRATO: toStr(row[17]),
    PORTAL: toStr(row[18]),
    CRACHA: toStr(row[19]),
    PONTO: toStr(row[20]),
    TREINAMENTO: toStr(row[21]),
    REALIZAR_TREINAMENTO: toStr(row[22]),
    LOCAL_TREINAMENTO: toStr(row[23]),
    RE: toStr(row[24]),
    NOME: toStr(row[25]) || "",
    FUNCAO_CLT: toStr(row[26]),
    HISTOGRAMA: toStr(row[27]),
    IDADE: row[28] ? parseInt(String(row[28]), 10) : null,
    DT_NASCIMENTO: toStr(row[29]),
    CPF: toStr(row[30]) || "",
    VR: toStr(row[31]),
    TERMINO: toStr(row[32]),
    PRORROGACAO: toStr(row[33]),
    DEMISSAO: toStr(row[34]),
    MUNICIPIO: toStr(row[35]),
    UF: toStr(row[36]),
    TELEFONE: toStr(row[37]),
  };
}

/**
 * Calcula progresso do colaborador (simplificado para export)
 */
function calcularProgresso(colab: Colaborador) {
  const etapas = [
    colab.STATUS,
    colab.EXAME,
    colab.ASO,
    colab.CONTRATO,
    colab.PORTAL,
    colab.TREINAMENTO,
  ];

  const completas = etapas.filter(
    (e) => e && e !== "Pendente" && e !== "Incompleto",
  ).length;

  return {
    rh: completas >= 2 ? 100 : completas * 50,
    logistica: colab.MOB === "Sim" ? 100 : 50,
    seguranca: colab.ASO === "Apto" ? 100 : 0,
    geral: Math.round((completas / etapas.length) * 100),
  };
}

// ============================================================================
// GET /api/export
// ============================================================================

export async function GET(request: NextRequest) {
  console.log("[Export API] Iniciando exportação...");

  try {
    // Verifica autenticação
    const user = await requireAuth();
    console.log(`[Export API] Usuário autenticado: ${user.re}`);

    // Parse query params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const setor = searchParams.get("setor") || undefined;

    // Busca dados da planilha
    const rows = await getSheetData(SHEETS.COLABORADORES, COLABORADORES_RANGE);

    // Converte para objetos (ignora linhas sem CPF ou sem NOME)
    let colaboradores = rows
      .map((row) => rowToColaborador(row))
      .filter((c) => c.CPF && c.NOME);

    // Aplica filtros
    if (search) {
      const searchLower = search.toLowerCase();
      colaboradores = colaboradores.filter(
        (c) =>
          c.NOME?.toLowerCase().includes(searchLower) ||
          c.CPF?.includes(search),
      );
    }

    if (status) {
      colaboradores = colaboradores.filter((c) => c.STATUS === status);
    }

    // Filtro por setor
    if (setor) {
      switch (setor.toUpperCase()) {
        case "RH":
          colaboradores = colaboradores.filter(
            (c) => c.STATUS && c.STATUS !== "Pendente",
          );
          break;
        case "LOGISTICA":
          colaboradores = colaboradores.filter(
            (c) => c.MOB === "Sim" || c.PORTAL === "Liberado",
          );
          break;
        case "SEGURANCA":
          colaboradores = colaboradores.filter(
            (c) => c.ASO === "Apto" || c.TREINAMENTO,
          );
          break;
      }
    }

    // Adiciona progresso aos resultados
    const resultsWithProgress = colaboradores.map((c) => ({
      ...c,
      progresso: calcularProgresso(c),
    }));

    // Registra log da exportação
    try {
      await logExport(user.re, `${resultsWithProgress.length} colaboradores`);
    } catch (logErr) {
      console.error("[Export API] Erro ao registrar log:", logErr);
    }

    console.log(
      `[Export API] ${resultsWithProgress.length} colaboradores exportados`,
    );

    return NextResponse.json({
      data: resultsWithProgress,
      total: resultsWithProgress.length,
    });
  } catch (error) {
    console.error("[Export API] Erro na exportação:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
