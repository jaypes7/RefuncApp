/**
 * ============================================================================
 * API: GET /api/logs
 * ============================================================================
 *
 * Retorna logs de auditoria com filtros e paginação.
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { getSheetData, SHEETS } from "@/lib/sheets";
import { requireAuth } from "@/lib/auth";
import { AcaoLog } from "@/lib/logs";

// ============================================================================
// SCHEMAS
// ============================================================================

const LogsQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
  usuario: z.string().optional(),
  acao: z
    .enum([
      "LOGIN",
      "LOGOUT",
      "ADICIONAR",
      "EDITAR",
      "REMOVER",
      "IMPORTAR",
      "EXPORTAR",
      "CONFIG",
    ])
    .optional(),
  dataInicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dataFim: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

// ============================================================================
// TIPOS
// ============================================================================

interface LogEntry {
  timestamp: string;
  usuario: string;
  acao: AcaoLog;
  detalhes: string;
  cpfColaborador: string | null;
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Converte array de valores para objeto LogEntry
 */
function rowToLog(row: string[]): LogEntry {
  return {
    timestamp: row[0] || "",
    usuario: row[1] || "",
    acao: (row[2] as AcaoLog) || "LOGIN",
    detalhes: row[3] || "",
    cpfColaborador: row[4] || null,
  };
}

/**
 * Filtra logs por data
 */
function filtrarPorData(
  logs: LogEntry[],
  dataInicio?: string,
  dataFim?: string
): LogEntry[] {
  return logs.filter((log) => {
    if (!log.timestamp) return false;

    const dataLog = log.timestamp.split("T")[0]; // Extrai YYYY-MM-DD

    if (dataInicio && dataLog < dataInicio) return false;
    if (dataFim && dataLog > dataFim) return false;

    return true;
  });
}

// ============================================================================
// GET /api/logs
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Verifica autenticação
    await requireAuth();

    // Parse query params
    const { searchParams } = new URL(request.url);
    const queryParams = {
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
      usuario: searchParams.get("usuario") || undefined,
      acao: (searchParams.get("acao") as AcaoLog) || undefined,
      dataInicio: searchParams.get("dataInicio") || undefined,
      dataFim: searchParams.get("dataFim") || undefined,
    };

    const { page, limit, usuario, acao, dataInicio, dataFim } =
      LogsQuerySchema.parse(queryParams);

    // Busca logs da planilha
    const rows = await getSheetData(SHEETS.LOGS);

    // Converte para objetos (ordem decrescente - mais recentes primeiro)
    let logs = rows.reverse().map(rowToLog);

    // Aplica filtros
    if (usuario) {
      logs = logs.filter((l) =>
        l.usuario.toLowerCase().includes(usuario.toLowerCase())
      );
    }

    if (acao) {
      logs = logs.filter((l) => l.acao === acao);
    }

    if (dataInicio || dataFim) {
      logs = filtrarPorData(logs, dataInicio, dataFim);
    }

    // Calcula paginação
    const total = logs.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedData = logs.slice(start, end);

    // Contagem por ação (para dashboard)
    const contagemPorAcao = {
      LOGIN: logs.filter((l) => l.acao === "LOGIN").length,
      LOGOUT: logs.filter((l) => l.acao === "LOGOUT").length,
      ADICIONAR: logs.filter((l) => l.acao === "ADICIONAR").length,
      EDITAR: logs.filter((l) => l.acao === "EDITAR").length,
      REMOVER: logs.filter((l) => l.acao === "REMOVER").length,
      IMPORTAR: logs.filter((l) => l.acao === "IMPORTAR").length,
      EXPORTAR: logs.filter((l) => l.acao === "EXPORTAR").length,
      CONFIG: logs.filter((l) => l.acao === "CONFIG").length,
    };

    return NextResponse.json({
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      resumo: {
        contagemPorAcao,
        totalGeral: total,
      },
    });
  } catch (error) {
    console.error("Erro ao carregar logs:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Parâmetros inválidos", details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
