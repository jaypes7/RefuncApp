/**
 * ============================================================================
 * API: GET /api/export
 * ============================================================================
 *
 * Exporta todos os colaboradores sem paginação para geração de planilha XLSX.
 * Dados lidos do Supabase (Fase 4+). Suporta filtros: search, status, cargo.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth, resolveCentroCusto } from "@/lib/auth";
import { logExport } from "@/lib/logs";
import { expandirCargos } from "@/lib/cargos";

// ============================================================================
// TIPOS
// ============================================================================

interface ColaboradorExport {
  IND: string | null;
  STATUS: string | null;
  ENVIADO_RH: string | null;
  PESSOA: string | null;
  SEXO: string | null;
  REQ: string | null;
  VINCULADO: string | null;
  CARTA_OFERTA: string | null;
  COLAB_PEND: string | null;
  EXAME: string | null;
  CLINICA: string | null;
  DOCS: string | null;
  ASO: string | null;
  RPV: string | null;
  PRE_ADMISSAO: string | null;
  MOB: string | null;
  OP: string | null;
  DATA_ADMISSAO: string | null;
  CONTRATO: string | null;
  TIPO_CONTRATO: string | null;
  PORTAL: string | null;
  CRACHA: string | null;
  PONTO: string | null;
  TREINAMENTO: string | null;
  REALIZAR_TREINAMENTO: string | null;
  LOCAL_TREINAMENTO: string | null;
  RE: string | null;
  NOME: string;
  FUNCAO_CLT: string | null;
  HISTOGRAMA: string | null;
  IDADE: number | null;
  DT_NASCIMENTO: string | null;
  ESCOLARIDADE: string | null;
  EXPERIENCIA_FUNCAO: string | null;
  CPF: string;
  VR: string | null;
  TERMINO: string | null;
  PRORROGACAO: string | null;
  DEMISSAO: string | null;
  MUNICIPIO: string | null;
  UF: string | null;
  TELEFONE: string | null;
  TURNO_TRABALHO: string | null;
  FRETADO: string | null;
  CHECK_IN: string | null;
  HOTEL: string | null;
  DATA_VIAGEM: string | null;
  NUMERO_ORACLE: string | null;
  CENTRO_CUSTO: string | null;
  CREATED_AT: string | null;
  progresso: {
    rh: number;
    logistica: number;
    seguranca: number;
    geral: number;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function toStr(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v);
}

function mapRow(row: Record<string, unknown>): ColaboradorExport {
  return {
    IND: toStr(row["ind"]),
    STATUS: toStr(row["status"]),
    ENVIADO_RH: toStr(row["enviado_rh"]),
    PESSOA: toStr(row["pessoa"]),
    SEXO: toStr(row["sexo"]),
    REQ: toStr(row["req"]),
    VINCULADO: toStr(row["vinculado"]),
    CARTA_OFERTA: toStr(row["carta_oferta"]),
    COLAB_PEND: toStr(row["colab_pend"]),
    EXAME: toStr(row["exame"]),
    CLINICA: toStr(row["clinica"]),
    DOCS: toStr(row["docs"]),
    ASO: toStr(row["aso"]),
    RPV: toStr(row["rpv"]),
    PRE_ADMISSAO: toStr(row["pre_admissao"]),
    MOB: toStr(row["mob"]),
    OP: toStr(row["op"]),
    DATA_ADMISSAO: toStr(row["data_admissao"]),
    CONTRATO: toStr(row["contrato"]),
    TIPO_CONTRATO: toStr(row["tipo_contrato"]),
    PORTAL: toStr(row["portal"]),
    CRACHA: toStr(row["cracha"]),
    PONTO: toStr(row["ponto"]),
    TREINAMENTO: toStr(row["treinamento"]),
    REALIZAR_TREINAMENTO: toStr(row["realizar_treinamento"]),
    LOCAL_TREINAMENTO: toStr(row["local_treinamento"]),
    RE: toStr(row["re"]),
    NOME: toStr(row["nome"]) ?? "",
    FUNCAO_CLT: toStr(row["funcao_clt"]),
    HISTOGRAMA: toStr(row["histograma"]),
    IDADE: row["idade"] != null ? Number(row["idade"]) || null : null,
    DT_NASCIMENTO: toStr(row["dt_nascimento"]),
    ESCOLARIDADE: toStr(row["escolaridade"]),
    EXPERIENCIA_FUNCAO: toStr(row["experiencia_funcao"]),
    CPF: row["cpf"]
      ? String(row["cpf"]).replace(/\D/g, "").padStart(11, "0")
      : "",
    VR: toStr(row["vr"]),
    TERMINO: toStr(row["termino"]),
    PRORROGACAO: toStr(row["prorrogacao"]),
    DEMISSAO: toStr(row["demissao"]),
    MUNICIPIO: toStr(row["municipio"]),
    UF: toStr(row["uf"]),
    TELEFONE: toStr(row["telefone"]),
    TURNO_TRABALHO: toStr(row["turno_trabalho"]),
    FRETADO: toStr(row["fretado"]),
    CHECK_IN: toStr(row["check_in"]),
    HOTEL: toStr(row["hotel"]),
    DATA_VIAGEM: toStr(row["data_viagem"]),
    NUMERO_ORACLE: toStr(row["numero_oracle"]),
    CENTRO_CUSTO: toStr(row["centro_custo"]),
    CREATED_AT: toStr(row["created_at"]),
    progresso: calcularProgresso(row),
  };
}

function calcularProgresso(row: Record<string, unknown>) {
  const etapas = [
    row["status"],
    row["exame"],
    row["aso"],
    row["contrato"],
    row["portal"],
    row["treinamento"],
  ];
  const completas = etapas.filter(
    (e) => e && e !== "Pendente" && e !== "Incompleto",
  ).length;
  return {
    rh: completas >= 2 ? 100 : completas * 50,
    logistica: row["mob"] === "Sim" ? 100 : 50,
    seguranca: row["aso"] === "Apto" ? 100 : 0,
    geral: Math.round((completas / etapas.length) * 100),
  };
}

// ============================================================================
// GET /api/export
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth("user");
    const supabase = createServerClient();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const cargo = searchParams.get("cargo") ?? undefined;
    const ccParam = searchParams.get("centro_custo") ?? undefined;
    const centroCusto = resolveCentroCusto(user, ccParam);

    // Monta a query base
    let query = supabase.from("colaboradores").select("*");

    if (centroCusto?.length) {
      query = query.in("centro_custo", centroCusto);
    }

    const { data: rows, error } = await query;

    if (error) {
      throw new Error(`Falha ao buscar colaboradores: ${error.message}`);
    }

    // Mapeia lowercase → UPPERCASE e filtra inválidos
    let colaboradores = (rows ?? [])
      .map((row) => mapRow(row as Record<string, unknown>))
      .filter((c) => c.CPF && c.NOME);

    // Filtros opcionais
    if (search) {
      const lower = search.toLowerCase();
      colaboradores = colaboradores.filter(
        (c) =>
          c.NOME.toLowerCase().includes(lower) || c.CPF.includes(search),
      );
    }

    if (status) {
      colaboradores = colaboradores.filter((c) => c.STATUS === status);
    }

    if (cargo) {
      const cargosFiltro = await expandirCargos([cargo]);
      colaboradores = colaboradores.filter((c) =>
        cargosFiltro.includes(c.FUNCAO_CLT ?? ""),
      );
    }

    try {
      await logExport(user.re, `${colaboradores.length} colaboradores`);
    } catch (logErr) {
      console.error("[Export API] Erro ao registrar log:", logErr);
    }

    return NextResponse.json({
      data: colaboradores,
      total: colaboradores.length,
    });
  } catch (error) {
    console.error("[Export API]", error);

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
