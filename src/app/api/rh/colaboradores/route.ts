/**
 * ============================================================================
 * API: /api/rh/colaboradores
 * ============================================================================
 *
 * Domínio RH — leitura e importação da planilha de RH.
 * Tabela Supabase: `colaboradores`  |  Chave de conflito: `cpf`
 *
 * GET  → Lista paginada com filtros (search, status)
 * POST → Upsert em batch a partir de linhas brutas da planilha (SheetJS)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import {
  buildHeaderMap,
  rowToColaborador,
  sanitizeCPF,
  type RawRow,
  type ImportReport,
  type ImportError,
} from "@/lib/import-utils";

// ── helpers ──────────────────────────────────────────────────────────────────

function toLowerKeys(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]),
  );
}

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}

// ============================================================================
// GET /api/rh/colaboradores
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const page   = Math.max(1, Number(searchParams.get("page")  ?? 1));
    const limit  = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const search = searchParams.get("search")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "";

    const db = createServerClient();
    let query = db
      .from("colaboradores")
      .select("cpf,nome,re,status,funcao_clt,contrato,data_admissao,dt_nascimento,idade,uf,municipio,telefone,enviado_rh,docs,pre_admissao,vr,termino,prorrogacao,demissao", { count: "exact" });

    if (search) {
      query = query.or(`nome.ilike.%${search}%,cpf.ilike.%${search}%,re.ilike.%${search}%`);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1).order("nome", { ascending: true });

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({
      data: data ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[GET /api/rh/colaboradores]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/rh/colaboradores  —  upsert em batch
// ============================================================================

export async function POST(request: NextRequest) {
  const report: ImportReport = {
    inseridos: 0,
    atualizados: 0,
    ignorados: 0,
    erros: [] as ImportError[],
    total: 0,
  };

  try {
    await requireAuth();

    const { rows } = (await request.json()) as { rows: RawRow[] };
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(report);
    }

    report.total = rows.length;

    // FASE 1: mapear cabeçalhos
    const headers    = Object.keys(rows[0] ?? {});
    const headerMap  = buildHeaderMap(headers);

    if (headerMap.size === 0) {
      report.erros.push({ linha: 0, motivo: "Nenhum cabeçalho reconhecido." });
      return NextResponse.json(report);
    }

    // FASE 2: sanitizar + dedup intra-arquivo
    const validRows = new Map<string, Record<string, unknown>>();
    const seenCpfs  = new Set<string>();

    rows.forEach((row, idx) => {
      try {
        const colaborador = rowToColaborador(row, headerMap);

        // Busca a chave CPF de forma case-insensitive (pode vir como "CPF" ou "cpf")
        const cpfKey = Object.keys(colaborador).find((k) => k.toLowerCase() === "cpf");
        const cpf = sanitizeCPF(cpfKey ? colaborador[cpfKey] : "").padStart(11, "0");

        if (!cpf || cpf.replace(/^0+/, "").length === 0 || cpf.length !== 11) {
          report.ignorados++;
          return;
        }

        // Busca a chave NOME de forma case-insensitive
        const nomeKey = Object.keys(colaborador).find((k) => k.toLowerCase() === "nome");
        if (!String(nomeKey ? colaborador[nomeKey] : "").trim()) {
          report.erros.push({ linha: idx + 1, campo: "NOME", motivo: `CPF ${cpf}: NOME ausente.` });
          return;
        }

        if (seenCpfs.has(cpf)) {
          report.erros.push({ linha: idx + 1, campo: "CPF", motivo: `CPF ${cpf}: duplicado no arquivo.` });
          return;
        }

        seenCpfs.add(cpf);
        validRows.set(cpf, { ...toLowerKeys(colaborador), cpf });
      } catch (err) {
        report.erros.push({ linha: idx + 1, motivo: err instanceof Error ? err.message : "Erro desconhecido" });
      }
    });

    if (validRows.size === 0) return NextResponse.json(report);

    // FASE 3: buscar existentes
    const db = createServerClient();
    const { data: existing, error: fetchErr } = await db
      .from("colaboradores")
      .select("*")
      .in("cpf", Array.from(validRows.keys()));

    if (fetchErr) throw new Error(fetchErr.message);

    const existingByCpf = new Map<string, Record<string, unknown>>();
    for (const row of existing ?? []) {
      const cpf = String(row.cpf ?? "").replace(/\D/g, "");
      if (cpf) existingByCpf.set(cpf, row as Record<string, unknown>);
    }

    // FASE 4: merge conservador
    const payload: Record<string, unknown>[] = [];

    for (const [cpf, newData] of validRows.entries()) {
      if (existingByCpf.has(cpf)) {
        const merged = { ...existingByCpf.get(cpf)! };
        for (const [k, v] of Object.entries(newData)) {
          if (isEmpty(merged[k]) && !isEmpty(v)) merged[k] = v;
        }
        merged.cpf = cpf;
        payload.push(merged);
        report.atualizados++;
      } else {
        payload.push({ ...newData, cpf });
        report.inseridos++;
      }
    }

    // FASE 5: upsert único
    const { error: upsertErr } = await db
      .from("colaboradores")
      .upsert(payload, { onConflict: "cpf" });

    if (upsertErr) throw new Error(upsertErr.message);

    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[POST /api/rh/colaboradores]", error);
    return NextResponse.json(
      { error: "Erro interno", details: error instanceof Error ? error.message : "Desconhecido" },
      { status: 500 },
    );
  }
}
