/**
 * ============================================================================
 * API: /api/colaboradores
 * ============================================================================
 *
 * GET: Lista colaboradores com paginação, busca e filtros
 * POST: Cria novo colaborador
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  getSheetData,
  appendRow,
  findRowByColumn,
  SHEETS,
  COLABORADORES_RANGE,
  CPF_COLUMN_INDEX,
} from "@/lib/sheets";
import {
  ColaboradorSchema,
  ColaboradoresQuerySchema,
  type Colaborador,
} from "@/lib/schemas";
import { requireAuth } from "@/lib/auth";
import { logAdicionar } from "@/lib/logs";

// ============================================================================
// ORDEM DAS COLUNAS (SAGRADA - NÃO ALTERAR)
// ============================================================================

const COLUNAS_ORDEM: (keyof Colaborador)[] = [
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

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Converte array de valores da planilha para objeto Colaborador
 */
function rowToColaborador(row: (string | number)[]): Colaborador {
  const obj: Record<string, string | null> = {};

  COLUNAS_ORDEM.forEach((coluna, index) => {
    const valor = row[index];
    if (coluna === "CPF" && valor) {
      // Garante que CPF seja string com 11 dígitos
      obj[coluna] = String(valor).replace(/\D/g, "").padStart(11, "0");
    } else {
      obj[coluna] = valor === undefined || valor === null ? null : String(valor);
    }
  });

  return obj as unknown as Colaborador;
}

/**
 * Converte objeto Colaborador para array de valores na ordem correta
 */
function colaboradorToRow(colaborador: Partial<Colaborador>): string[] {
  return COLUNAS_ORDEM.map((coluna) => {
    const valor = colaborador[coluna];
    return valor === null || valor === undefined ? "" : String(valor);
  });
}

/**
 * Remove máscara do CPF
 */
function limparCPF(cpf: string | number): string {
  // Converte para string, remove não-dígitos e garante 11 dígitos com zeros à esquerda
  return String(cpf).replace(/\D/g, "").padStart(11, "0");
}

/**
 * Calcula progresso do colaborador por setor (para resposta)
 */
function calcularProgresso(colaborador: Colaborador) {
  // Setor RH: Etapas 1-3
  const rhCampos = [
    colaborador.CPF,
    colaborador.NOME,
    colaborador.DT_NASCIMENTO,
    colaborador.STATUS,
  ];
  const rhPreenchidos = rhCampos.filter((v) => v && v !== "Pendente").length;
  const progressoRH = Math.round((rhPreenchidos / rhCampos.length) * 100);

  // Setor Logística: Etapas 4-6
  const logCampos = [colaborador.MOB, colaborador.OP, colaborador.PORTAL];
  const logPreenchidos = logCampos.filter(
    (v) => v && v !== "Pendente" && v !== "Não"
  ).length;
  const progressoLogistica = Math.round((logPreenchidos / logCampos.length) * 100);

  // Setor Segurança: Etapas 7-8
  const segCampos = [colaborador.EXAME, colaborador.ASO, colaborador.TREINAMENTO];
  const segPreenchidos = segCampos.filter(
    (v) => v && v !== "Pendente" && v !== "Inapto"
  ).length;
  const progressoSeguranca = Math.round((segPreenchidos / segCampos.length) * 100);

  return {
    rh: progressoRH,
    logistica: progressoLogistica,
    seguranca: progressoSeguranca,
    geral: Math.round((progressoRH + progressoLogistica + progressoSeguranca) / 3),
  };
}

// ============================================================================
// GET /api/colaboradores
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
      search: searchParams.get("search") || undefined,
      status: searchParams.get("status") || undefined,
      setor: searchParams.get("setor") || undefined,
    };

    const { page, limit, search, status, setor } =
      ColaboradoresQuerySchema.parse(queryParams);

    // Busca dados da planilha
    const rows = await getSheetData(SHEETS.COLABORADORES, COLABORADORES_RANGE);

    // Converte para objetos (ignora linhas sem CPF ou sem NOME - linhas vazias)
    let colaboradores = rows
      .map((row, index) => ({
        ...rowToColaborador(row),
        _rowIndex: index + 2, // Guarda índice para referência (1-based + header)
      }))
      .filter((c) => c.CPF && c.NOME); // Só inclui colaboradores válidos

    // Aplica filtros
    if (search) {
      const searchLower = search.toLowerCase();
      colaboradores = colaboradores.filter(
        (c) =>
          c.NOME?.toLowerCase().includes(searchLower) ||
          c.CPF?.includes(search)
      );
    }

    if (status) {
      colaboradores = colaboradores.filter((c) => c.STATUS === status);
    }

    // Filtro por setor (baseado em campos preenchidos)
    if (setor) {
      switch (setor) {
        case "RH":
          colaboradores = colaboradores.filter(
            (c) => c.STATUS && c.STATUS !== "Pendente"
          );
          break;
        case "LOGISTICA":
          colaboradores = colaboradores.filter(
            (c) => c.MOB === "Sim" || c.PORTAL === "Liberado"
          );
          break;
        case "SEGURANCA":
          colaboradores = colaboradores.filter(
            (c) => c.ASO === "Apto" || c.TREINAMENTO
          );
          break;
      }
    }

    // Calcula paginação
    const total = colaboradores.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedData = colaboradores.slice(start, end);

    // Adiciona progresso aos resultados
    const resultsWithProgress = paginatedData.map((c) => ({
      ...c,
      progresso: calcularProgresso(c),
    }));

    return NextResponse.json({
      data: resultsWithProgress,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Erro ao listar colaboradores:", error);

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

// ============================================================================
// POST /api/colaboradores
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Verifica autenticação
    const user = await requireAuth();

    // Parse e validação do body
    const body = await request.json();
    const colaborador = ColaboradorSchema.parse(body);

    // Limpa CPF para busca
    const cpfLimpo = limparCPF(colaborador.CPF!);

    // Verifica duplicidade
    const existing = await findRowByColumn(
      SHEETS.COLABORADORES,
      CPF_COLUMN_INDEX,
      cpfLimpo
    );

    if (existing) {
      return NextResponse.json(
        { error: "CPF já cadastrado", cpf: cpfLimpo },
        { status: 409 }
      );
    }

    // Prepara dados para inserção (ordem sagrada das 38 colunas)
    const rowData = colaboradorToRow({
      ...colaborador,
      CPF: cpfLimpo, // Salva CPF sem máscara
    });

    // Insere na planilha
    await appendRow(SHEETS.COLABORADORES, rowData);

    // Registra log
    await logAdicionar(user.re, cpfLimpo, colaborador.NOME || "N/A");

    return NextResponse.json(
      {
        success: true,
        message: "Colaborador cadastrado com sucesso",
        data: {
          ...colaborador,
          CPF: cpfLimpo,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar colaborador:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
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
