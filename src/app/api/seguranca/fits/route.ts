/**
 * ============================================================================
 * API: /api/seguranca/fits
 * ============================================================================
 *
 * Domínio Segurança — FITs (Fichas Individuais de Treinamento/Inspeção).
 * Tabela Supabase: `seguranca_fits`  |  Chave de conflito: `re`
 *
 * GET  → Lista todos os registros com filtros opcionais
 * POST → Upsert em batch a partir de linhas brutas da planilha
 *
 * Campos esperados na planilha (aliases flexíveis):
 *   RE, CPF, NOME, FUNÇÃO CLT, ASO, EXAME, CLÍNICA, DOCS,
 *   TREINAMENTO, REALIZAR TREINAMENTO, LOCAL TREINAMENTO, STATUS, DATA ADMISSÃO
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import type { ImportReport, ImportError } from "@/lib/import-utils";
import { sanitizeCPF, sanitizeDate, sanitizeText, mapStrictEnums } from "@/lib/import-utils";

// ============================================================================
// MAPEAMENTO DE CABEÇALHOS — Segurança
// ============================================================================

const SEGURANCA_ALIASES: Record<string, string[]> = {
  re:                   ["RE", "REGISTRO", "N PESSOA", "N_PESSOA", "COD FUNCIONARIO"],
  cpf:                  ["CPF", "C.P.F.", "CPF DO COLABORADOR"],
  nome:                 ["NOME", "NOME COMPLETO", "NOME DO COLABORADOR", "FUNCIONARIO"],
  funcao_clt:           ["FUNÇÃO CLT", "FUNCAO CLT", "FUNÇÃO", "FUNCAO", "FUNÇAO", "CARGO"],
  mob:                  ["MOB", "MOBILIZAÇÃO", "MOBILIZACAO"],
  data_admissao:        ["DATA ADMISSÃO", "DATA ADMISSAO", "DT ADMISSAO", "ADMISSÃO", "ADMISSAO"],
  municipio:            ["MUNICÍPIO", "MUNICIPIO", "CIDADE"],
  uf:                   ["UF", "ESTADO"],
  num_fit:              ["N° FIT", "Nº FIT", "N FIT", "NUM FIT", "NUMERO FIT"],
  aso:                  ["ASO", "STATUS ASO", "APTIDÃO", "RESULTADO ASO"],
  rpv:                  ["RPV"],
  status_portal:        ["STATUS PORTAL", "PORTAL"],
  data_cracha_retirado: ["DATA DO CRACHÁ RETIRADO MOSAIC", "DATA CRACHÁ RETIRADO", "DATA CRACHA RETIRADO"],
};

function buildSegurancaHeaderMap(headers: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const header of headers) {
    const norm = header.trim().toUpperCase().replace(/\s+/g, " ");
    for (const [field, aliases] of Object.entries(SEGURANCA_ALIASES)) {
      if (aliases.some((a) => {
        const au = a.toUpperCase();
        if (au.length <= 3) return norm === au;
        return norm === au || norm.includes(au);
      })) {
        map.set(header, field);
        break;
      }
    }
  }
  return map;
}

function rowToSeguranca(
  row: Record<string, unknown>,
  headerMap: Map<string, string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [rawHeader, field] of headerMap.entries()) {
    const val = row[rawHeader];
    switch (field) {
      case "re":
        result.re = sanitizeText(val) || undefined;
        break;
      case "cpf":
        result.cpf = sanitizeCPF(val) || undefined;
        break;
      case "nome":
        result.nome = sanitizeText(val, { upper: true }) ?? undefined;
        break;
      case "funcao_clt":
        result.funcao_clt = sanitizeText(val, { upper: true }) ?? undefined;
        break;
      case "mob":
        result.mob = mapStrictEnums("mob", sanitizeText(val)) ?? undefined;
        break;
      case "data_admissao":
        result.data_admissao = sanitizeDate(val) ?? undefined;
        break;
      case "municipio":
        result.municipio = sanitizeText(val) ?? undefined;
        break;
      case "uf":
        result.uf = sanitizeText(val, { upper: true }) ?? undefined;
        break;
      case "num_fit":
        result.num_fit = sanitizeText(val) ?? undefined;
        break;
      case "aso":
        result.aso = mapStrictEnums("aso_status", sanitizeText(val)) ?? undefined;
        break;
      case "rpv":
        result.rpv = sanitizeText(val) ?? undefined;
        break;
      case "status_portal":
        result.status_portal = sanitizeText(val) ?? undefined;
        break;
      case "data_cracha_retirado":
        result.data_cracha_retirado = sanitizeDate(val) ?? undefined;
        break;
        case "mob":
        // Como o seu MOB na planilha de Segurança vem como "MOB 01", "MOB 02", etc, 
        // usamos sanitizeText normal em vez do mapStrictEnums.
        result.mob = sanitizeText(val, { upper: true }) ?? undefined;
        break;
      case "municipio":
        result.municipio = sanitizeText(val) ?? undefined;
        break;
      case "uf":
        result.uf = sanitizeText(val, { upper: true }) ?? undefined;
        break;
      case "rpv":
        result.rpv = sanitizeText(val) ?? undefined;
        break;
    }
  }
  return result;
}

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}

// ============================================================================
// GET /api/seguranca/fits
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const page   = Math.max(1, Number(searchParams.get("page")  ?? 1));
    const limit  = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const search = searchParams.get("search")?.trim() ?? "";

    const db = createServerClient();
    let query = db
      .from("seguranca_fits")
      .select("*", { count: "exact" });

    if (search) {
      query = query.or(`nome.ilike.%${search}%,re.ilike.%${search}%,cpf.ilike.%${search}%`);
    }

    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1).order("nome", { ascending: true });

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({
      data: data ?? [],
      pagination: { page, limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit) },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[GET /api/seguranca/fits]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/seguranca/fits  —  upsert em batch
// ============================================================================

export async function POST(request: NextRequest) {
  const report: ImportReport = {
    inseridos: 0, atualizados: 0, ignorados: 0,
    erros: [] as ImportError[], total: 0,
  };

  try {
    await requireAuth();

    const { rows } = (await request.json()) as { rows: Record<string, unknown>[] };
    if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json(report);

    report.total = rows.length;

    const headers   = Object.keys(rows[0] ?? {});
    const headerMap = buildSegurancaHeaderMap(headers);

    if (headerMap.size === 0) {
      report.erros.push({ linha: 0, motivo: "Nenhum cabeçalho reconhecido para Segurança/FITs." });
      return NextResponse.json(report);
    }

    const validRows = new Map<string, Record<string, unknown>>();
    const seenRe    = new Set<string>();

    rows.forEach((row, idx) => {
      try {
        const parsed = rowToSeguranca(row, headerMap);
        const re = String(parsed.re ?? "").trim();

        if (!re) { report.ignorados++; return; }
        if (!String(parsed.nome ?? "").trim()) {
          report.erros.push({ linha: idx + 1, campo: "NOME", motivo: `RE ${re}: NOME ausente.` });
          return;
        }
        if (seenRe.has(re)) {
          report.erros.push({ linha: idx + 1, campo: "RE", motivo: `RE ${re}: duplicado no arquivo.` });
          return;
        }

        seenRe.add(re);
        validRows.set(re, { ...parsed, re });
      } catch (err) {
        report.erros.push({ linha: idx + 1, motivo: err instanceof Error ? err.message : "Erro" });
      }
    });

    if (validRows.size === 0) return NextResponse.json(report);

    const db = createServerClient();

    // Buscar existentes
    const { data: existing } = await db
      .from("seguranca_fits")
      .select("*")
      .in("re", Array.from(validRows.keys()));

    const existMap = new Map(
      (existing ?? []).map((r) => [String(r.re ?? ""), r as Record<string, unknown>])
    );

    const payload: Record<string, unknown>[] = [];

    for (const [re, newData] of validRows.entries()) {
      if (existMap.has(re)) {
        const merged = { ...existMap.get(re)! };
        for (const [k, v] of Object.entries(newData)) {
          if (isEmpty(merged[k]) && !isEmpty(v)) merged[k] = v;
        }
        merged.re = re;
        payload.push(merged);
        report.atualizados++;
      } else {
        payload.push(newData);
        report.inseridos++;
      }
    }

    const { error } = await db
      .from("seguranca_fits")
      .upsert(payload, { onConflict: "re" });

    if (error) throw new Error(error.message);

    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[POST /api/seguranca/fits]", error);
    return NextResponse.json(
      { error: "Erro interno", details: error instanceof Error ? error.message : "Desconhecido" },
      { status: 500 },
    );
  }
}
