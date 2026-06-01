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
 *   cargo  – filtro por função CLT individual ou grupo de CARGOS_AGRUPADOS
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createServerClient } from "@/lib/supabase";
import {
  ColaboradoresQuerySchema,
  ColaboradorCreateSchema,
  type Colaborador,
} from "@/lib/schemas";
import { expandirCargos } from "@/lib/cargos";
import { requireAuth, resolveCentroCusto } from "@/lib/auth";
import { logAdicionar } from "@/lib/logs";

// ============================================================================
// MAPEAMENTO Supabase → Colaborador (lowercase → UPPERCASE)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: Record<string, any>): Colaborador {
  return {
    id:                   row.id                ?? undefined,
    IND:                  row.ind               ?? null,
    STATUS:               row.status            ?? null,
    ENVIADO_RH:           row.enviado_rh        ?? null,
    PESSOA:               row.pessoa            ?? null,
    SEXO:                 row.sexo              ?? null,
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
    NOME:                 row.nome              ?? null,
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
    NUMERO_ORACLE:        row.numero_oracle     ?? null,
    turno_trabalho:       row.turno_trabalho    ?? null,
    CENTRO_CUSTO:         row.centro_custo      ?? null,
    ESCOLARIDADE:         row.escolaridade      ?? null,
    EXPERIENCIA_FUNCAO:   row.experiencia_funcao ?? null,
  };
}

// ============================================================================
// MAPEAMENTO Colaborador → Supabase (UPPERCASE → snake_case)
// ============================================================================

function toDbRow(data: Partial<Colaborador>): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if (data.IND               !== undefined) row.ind                = data.IND;
  if (data.STATUS            !== undefined) row.status             = data.STATUS;
  if (data.ENVIADO_RH        !== undefined) row.enviado_rh         = data.ENVIADO_RH;
  if (data.PESSOA            !== undefined) row.pessoa             = data.PESSOA;
  if (data.SEXO              !== undefined) row.sexo               = data.SEXO;
  if (data.REQ               !== undefined) row.req                = data.REQ;
  if (data.VINCULADO         !== undefined) row.vinculado          = data.VINCULADO;
  if (data.CARTA_OFERTA      !== undefined) row.carta_oferta       = data.CARTA_OFERTA;
  if (data.COLAB_PEND        !== undefined) row.colab_pend         = data.COLAB_PEND;
  if (data.EXAME             !== undefined) row.exame              = data.EXAME;
  if (data.CLINICA           !== undefined) row.clinica            = data.CLINICA;
  if (data.DOCS              !== undefined) row.docs               = data.DOCS;
  if (data.ASO               !== undefined) row.aso                = data.ASO;
  if (data.RPV               !== undefined) row.rpv                = data.RPV;
  if (data.PRE_ADMISSAO      !== undefined) row.pre_admissao       = data.PRE_ADMISSAO;
  if (data.MOB               !== undefined) row.mob                = data.MOB;
  if (data.OP                !== undefined) row.op                 = data.OP;
  if (data.DATA_ADMISSAO     !== undefined) row.data_admissao      = data.DATA_ADMISSAO;
  if (data.TIPO_CONTRATO     !== undefined) row.tipo_contrato      = data.TIPO_CONTRATO;
  if (data.CONTRATO          !== undefined) row.contrato           = data.CONTRATO;
  if (data.PORTAL            !== undefined) row.portal             = data.PORTAL;
  if (data.CRACHA            !== undefined) row.cracha             = data.CRACHA;
  if (data.PONTO             !== undefined) row.ponto              = data.PONTO;
  if (data.TREINAMENTO       !== undefined) row.treinamento        = data.TREINAMENTO;
  if (data.REALIZAR_TREINAMENTO !== undefined) row.realizar_treinamento = data.REALIZAR_TREINAMENTO;
  if (data.LOCAL_TREINAMENTO !== undefined) row.local_treinamento  = data.LOCAL_TREINAMENTO;
  if (data.RE                !== undefined) row.re                 = data.RE;
  if (data.NOME              !== undefined) row.nome               = data.NOME;
  if (data.FUNCAO_CLT        !== undefined) row.funcao_clt         = data.FUNCAO_CLT;
  if (data.HISTOGRAMA        !== undefined) row.histograma         = data.HISTOGRAMA;
  if (data.IDADE             !== undefined) row.idade              = data.IDADE;
  if (data.DT_NASCIMENTO     !== undefined) row.dt_nascimento      = data.DT_NASCIMENTO;
  // CPF é obrigatório - sempre incluir
  row.cpf = data.CPF;
  if (data.id                !== undefined) row.id                 = data.id;
  if (data.VR                !== undefined) row.vr                 = data.VR;
  if (data.TERMINO           !== undefined) row.termino            = data.TERMINO;
  if (data.PRORROGACAO       !== undefined) row.prorrogacao        = data.PRORROGACAO;
  if (data.DEMISSAO          !== undefined) row.demissao           = data.DEMISSAO;
  if (data.MUNICIPIO         !== undefined) row.municipio          = data.MUNICIPIO;
  if (data.UF                !== undefined) row.uf                 = data.UF;
  if (data.TELEFONE          !== undefined) row.telefone           = data.TELEFONE;
  if (data.NUMERO_ORACLE     !== undefined) row.numero_oracle      = data.NUMERO_ORACLE;
  if (data.turno_trabalho    !== undefined) row.turno_trabalho     = data.turno_trabalho;
  if (data.CENTRO_CUSTO      !== undefined) row.centro_custo       = data.CENTRO_CUSTO;
  if (data.ESCOLARIDADE      !== undefined) row.escolaridade       = data.ESCOLARIDADE;
  if (data.EXPERIENCIA_FUNCAO !== undefined) row.experiencia_funcao = data.EXPERIENCIA_FUNCAO;

  return row;
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
    const currentUser = await requireAuth("user");

    // ── DEMO MODE ────────────────────────────────────────────────────────────
    if (process.env.DEMO_MODE === "true") {
      const { searchParams } = new URL(request.url);
      const page  = Math.max(1, Number(searchParams.get("page")  ?? 1));
      const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));

      const { DEMO_COLABORADORES } = await import("@/lib/demo/repository");
      let filtered = [...DEMO_COLABORADORES];
      const statusFilter = searchParams.get("status");
      const searchFilter = searchParams.get("search")?.toLowerCase();
      if (statusFilter) filtered = filtered.filter((c) => c.status === statusFilter);
      if (searchFilter) filtered = filtered.filter((c) =>
        c.nome.toLowerCase().includes(searchFilter) || c.cpf.includes(searchFilter),
      );

      const total      = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const paged      = filtered.slice((page - 1) * limit, page * limit);

      const data = paged.map((c) => ({
        id:                 c.id,
        RE:                 c.re,
        NOME:               c.nome,
        CPF:                c.cpf,
        STATUS:             c.status,
        FUNCAO_CLT:         c.funcao,
        SEXO:               c.sexo === "M" ? "Masculino" : "Feminino",
        IDADE:              c.idade,
        DT_NASCIMENTO:      c.dt_nasc,
        UF:                 c.uf,
        MUNICIPIO:          c.municipio,
        TELEFONE:           c.telefone,
        ASO:                c.aso_status,
        CLINICA:            c.clinica,
        EXAME:              c.exame,
        DOCS:               c.docs,
        // PORTAL nos colaboradores: "Liberado"/"Bloqueado"/"Pendente"
        PORTAL:             c.portal === "Aprovado" ? "Liberado"
                          : c.portal === "Aprovado - DEMITIDO" ? "Bloqueado"
                          : "Pendente",
        TREINAMENTO:        c.treinamento,
        CRACHA:             c.cracha,
        PONTO:              c.ponto,
        MOB:                c.mob,
        DATA_ADMISSAO:      c.data_admissao,
        HOTEL:              c.hotel,
        TERMINO:            c.termino,
        ESCOLARIDADE:       c.escolaridade,
        EXPERIENCIA_FUNCAO: c.experiencia_funcao,
        turno_trabalho:     c.turno_trabalho,
        CENTRO_CUSTO:       c.centro_custo,
        CREATED_AT:         c.created_at,
      }));

      return NextResponse.json({
        data,
        pagination: { page, limit, total, totalPages },
      });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      page:         searchParams.get("page")         || "1",
      limit:        searchParams.get("limit")        || "20",
      search:       searchParams.get("search")       || undefined,
      status:       searchParams.get("status")       || undefined,
      cargo:        searchParams.get("cargo")        || undefined,
      centro_custo: searchParams.get("centro_custo") || undefined,
    };

    const { page, limit, search, status, cargo, centro_custo: ccParam } =
      ColaboradoresQuerySchema.parse(queryParams);

    // Users/guests têm o centro_custo fixado no JWT — ignora o param do cliente
    const centroCusto = resolveCentroCusto(currentUser, ccParam);

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
    const statuses = status?.split(",").filter(Boolean);
    if (statuses?.length) {
      query = query.in("status", statuses);
    }

    // ── Filtro por cargo (individual ou grupo) ────────────────────────────
    const cargosSelecionados = cargo?.split(",").filter(Boolean);
    if (cargosSelecionados?.length) {
      const funcoesFinais = await expandirCargos(cargosSelecionados);
      query = query.in("funcao_clt", funcoesFinais);
    }

    // ── Filtro por centro de custo ────────────────────────────────────────
    if (centroCusto?.length) {
      query = query.in("centro_custo", centroCusto);
    }

    // ── Ordenação alfabética por nome ─────────────────────────────────────
    query = query.order("nome", { ascending: true });

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
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado: privilégios insuficientes" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/colaboradores - Criar novo colaborador
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth("user");
    const body = await request.json();

    if (process.env.DEMO_MODE === "true") {
      const { demoWrite } = await import("@/lib/demo/handler");
      return demoWrite(body);
    }

    // Valida o body usando o schema de criação
    const validated = ColaboradorCreateSchema.parse(body);

    const supabase = createServerClient();

    // Verifica se o par (CPF, centro_custo) já existe
    let existingQuery = supabase
      .from("colaboradores")
      .select("cpf, nome, centro_custo")
      .eq("cpf", validated.CPF);

    if (validated.CENTRO_CUSTO) {
      existingQuery = existingQuery.eq("centro_custo", validated.CENTRO_CUSTO);
    } else {
      existingQuery = existingQuery.is("centro_custo", null);
    }

    const { data: existing } = await existingQuery.maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `CPF já cadastrado neste centro de custo: ${existing.nome || existing.cpf}` },
        { status: 409 },
      );
    }

    // Converte para formato do banco
    const dbRow = toDbRow(validated);

    // Insere no banco
    const { data: inserted, error: insertError } = await supabase
      .from("colaboradores")
      .insert(dbRow)
      .select()
      .single();

    if (insertError) {
      throw new Error(`Erro ao inserir colaborador: ${insertError.message}`);
    }

    // Log de auditoria
    await logAdicionar(user.re, validated.CPF, validated.NOME || validated.CPF);

    return NextResponse.json({ data: mapRow(inserted) }, { status: 201 });
  } catch (error) {
    console.error("[POST /colaboradores]", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado: privilégios insuficientes" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
