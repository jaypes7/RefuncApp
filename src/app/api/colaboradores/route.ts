/**
 * ============================================================================
 * API: /api/colaboradores
 * ============================================================================
 *
 * GET → Lista colaboradores com paginação e filtros (Supabase)
 *
 * Tabela Supabase: colaboradores
 *   - Colunas em snake_case / lowercase
 *   - A resposta é mapeada para UPPERCASE para manter compatibilidade com a UI
 *
 * Query params aceitos:
 *   page   – número da página (default: 1)
 *   limit  – itens por página (default: 20, max: 100)
 *   search – busca parcial em nome ou cpf (.ilike)
 *   status – filtro exato por status (Ativo | Pendente | Inativo | Desligado)
 *   setor  – subconjunto lógico: RH | LOGISTICA | SEGURANCA
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createServerClient } from "@/lib/supabase";
import {
  ColaboradoresQuerySchema,
  type Colaborador,
} from "@/lib/schemas";
import { requireAuth } from "@/lib/auth";

// ============================================================================
// MAPEAMENTO Supabase → Colaborador (lowercase → UPPERCASE)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: Record<string, any>): Colaborador {
  return {
    IND:                  row.ind               ?? null,
    STATUS:               row.status            ?? null,
    ENVIADO_RH:           row.enviado_rh        ?? null,
    PESSOA:               row.pessoa            ?? null,
    REQ:                  row.req               ?? null,
    VINCULADO:            row.vinculado         ?? null,
    CARTA_OFERTA:         row.carta_oferta      ?? null,
    COLAB_PEND:           row.colab_pend        ?? null,
    EXAME:                row.exame             ?? null,
    CLINICA:              row.clinica           ?? null,
    DOCS:                 row.docs              ?? null,
    ASO:                  row.aso               ?? null,
    RPV:                  row.rpv               ?? null,
    PRE_ADMISSAO:         row.pre_admissao      ?? null,
    MOB:                  row.mob               ?? null,
    OP:                   row.op                ?? null,
    DATA_ADMISSAO:        row.data_admissao     ?? null,
    CONTRATO:             row.contrato          ?? null,
    PORTAL:               row.portal            ?? null,
    CRACHA:               row.cracha            ?? null,
    PONTO:                row.ponto             ?? null,
    TREINAMENTO:          row.treinamento       ?? null,
    REALIZAR_TREINAMENTO: row.realizar_treinamento ?? null,
    LOCAL_TREINAMENTO:    row.local_treinamento ?? null,
    RE:                   row.re                ?? null,
    NOME:                 row.nome              ?? "",
    FUNCAO_CLT:           row.funcao_clt        ?? null,
    HISTOGRAMA:           row.histograma        ?? null,
    IDADE:                row.idade             ?? null,
    DT_NASCIMENTO:        row.dt_nascimento     ?? null,
    CPF:                  row.cpf               ?? "",
    VR:                   row.vr                ?? null,
    TERMINO:              row.termino           ?? null,
    PRORROGACAO:          row.prorrogacao       ?? null,
    DEMISSAO:             row.demissao          ?? null,
    MUNICIPIO:            row.municipio         ?? null,
    UF:                   row.uf                ?? null,
    TELEFONE:             row.telefone          ?? null,
    turno_trabalho:       row.turno_trabalho    ?? null,
  };
}

// ============================================================================
// PROGRESSO POR SETOR
// ============================================================================

function calcularProgresso(colaborador: Colaborador) {
  const rhCampos = [
    colaborador.CPF,
    colaborador.NOME,
    colaborador.DT_NASCIMENTO,
    colaborador.STATUS,
  ];
  const rhPreenchidos = rhCampos.filter((v) => v && v !== "Pendente").length;
  const progressoRH = Math.round((rhPreenchidos / rhCampos.length) * 100);

  const logCampos = [colaborador.MOB, colaborador.OP, colaborador.PORTAL];
  const logPreenchidos = logCampos.filter(
    (v) => v && v !== "Pendente" && v !== "Não",
  ).length;
  const progressoLogistica = Math.round(
    (logPreenchidos / logCampos.length) * 100,
  );

  const segCampos = [
    colaborador.EXAME,
    colaborador.ASO,
    colaborador.TREINAMENTO,
  ];
  const segPreenchidos = segCampos.filter(
    (v) => v && v !== "Pendente" && v !== "Inapto",
  ).length;
  const progressoSeguranca = Math.round(
    (segPreenchidos / segCampos.length) * 100,
  );

  return {
    rh: progressoRH,
    logistica: progressoLogistica,
    seguranca: progressoSeguranca,
    geral: Math.round(
      (progressoRH + progressoLogistica + progressoSeguranca) / 3,
    ),
  };
}

// ============================================================================
// GET /api/colaboradores
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const queryParams = {
      page:   searchParams.get("page")   || "1",
      limit:  searchParams.get("limit")  || "20",
      search: searchParams.get("search") || undefined,
      status: searchParams.get("status") || undefined,
      setor:  searchParams.get("setor")  || undefined,
    };

    const { page, limit, search, status, setor } =
      ColaboradoresQuerySchema.parse(queryParams);

    const supabase = createServerClient();

    // ── Monta a query base com contagem exata ─────────────────────────────
    let query = supabase
      .from("colaboradores")
      .select("*", { count: "exact" });

    // ── Filtro de busca (nome ou cpf, case-insensitive) ───────────────────
    if (search) {
      query = query.or(`nome.ilike.%${search}%,cpf.ilike.%${search}%`);
    }

    // ── Filtro por status ─────────────────────────────────────────────────
    if (status) {
      query = query.eq("status", status);
    }

    // ── Filtro por setor (subconjunto lógico) ─────────────────────────────
    if (setor) {
      switch (setor) {
        case "RH":
          // Status preenchido e diferente de "Pendente"
          query = query
            .not("status", "is", null)
            .neq("status", "Pendente");
          break;
        case "LOGISTICA":
          // MOB confirmado ou Portal liberado
          query = query.or("mob.eq.Sim,portal.eq.Liberado");
          break;
        case "SEGURANCA":
          // ASO apto ou treinamento registrado
          query = query.or("aso.eq.Apto,treinamento.not.is.null");
          break;
      }
    }

    // ── Paginação server-side (.range é inclusivo em ambos os extremos) ───
    const from = (page - 1) * limit;
    const to   = from + limit - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar colaboradores: ${error.message}`);
    }

    const total      = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    const resultsWithProgress = (data ?? []).map((row) => {
      const colaborador = mapRow(row);
      return { ...colaborador, progresso: calcularProgresso(colaborador) };
    });

    return NextResponse.json({
      data: resultsWithProgress,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    console.error("[GET /colaboradores]", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Parâmetros inválidos", details: error.issues },
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
