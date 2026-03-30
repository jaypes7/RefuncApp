/**
 * ============================================================================
 * API: /api/suprimentos/ordens
 * ============================================================================
 *
 * Domínio Suprimentos — ordens de compra.
 * Tabela Supabase: `suprimentos_ordens`
 * Chave de unicidade: `ordem_compra` + `descricao` (evita duplicidade)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import type { ImportReport, ImportError } from "@/lib/import-utils";

// ============================================================================
// MAPEAMENTO DE CABEÇALHOS — Suprimentos
// ============================================================================

const SUPRIMENTOS_ALIASES: Record<string, string[]> = {
  item:                ["ITEM", "N ITEM", "Nº ITEM"],
  requisicao:          ["REQUISIÇÃO", "REQUISICAO", "REQ", "N REQUISIÇÃO"],
  prioridade:          ["PRIORIDADE"],
  descricao:           ["DESCRIÇÃO", "DESCRICAO", "DESCR", "MATERIAL", "SERVIÇO", "SERVICO"],
  fornecedores:        ["FORNECEDORES", "FORNECEDOR"],
  cotacoes:            ["COTAÇÕES", "COTACOES", "COTAÇÃO"],
  requisitante:        ["REQUISITANTE", "SOLICITANTE"],
  data_criacao:        ["DATA DA CRIAÇÃO", "DATA CRIAÇÃO", "DATA CRIACAO", "DATA DA CRIACAO"],
  status:              ["STATUS"],
  ordem_compra:        ["ORDEM", "ORDEM DE COMPRA", "ORDEM COMPRA", "ORDEM_COMPRA", "OC"],
  valores:             ["VALOR OC", "VALORES", "VALOR", "VALOR R$", "VALOR (R$)"],
  informado_por:       ["INFORMADO POR", "INFORMADO"],
  status_ordem:        ["STATUS DA ORDEM", "STATUS ORDEM"],
};

function buildSuprimentosHeaderMap(headers: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const header of headers) {
    const norm = header.trim().toUpperCase().replace(/\s+/g, " ");
    let resolved = false;
    for (const [field, aliases] of Object.entries(SUPRIMENTOS_ALIASES)) {
      if (aliases.some((a) => norm === a.toUpperCase())) {
        map.set(header, field);
        resolved = true;
        break;
      }
    }
    if (resolved) continue;
    for (const [field, aliases] of Object.entries(SUPRIMENTOS_ALIASES)) {
      if (aliases.some((a) => {
        const au = a.toUpperCase();
        if (au.length <= 3) return false;
        return norm.includes(au);
      })) {
        map.set(header, field);
        break;
      }
    }
  }
  return map;
}

// ============================================================================
// SANITIZAÇÃO (Vacinas)
// ============================================================================

function toNumber(val: unknown): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (typeof val === "string") {
    const cleaned = val.replace(/[R$\s.]/g, "").replace(",", ".");
    const parsed  = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function toStr(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

// 🛡️ A VACINA CONTRA O EXCEL (Injetada localmente para segurança)
function parseDateSafely(val: unknown): string | undefined {
  if (!val && val !== 0) return undefined;
  
  const numVal = Number(val);
  if (!isNaN(numVal) && numVal > 30000 && numVal < 80000) {
    const date = new Date((numVal - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) return date.toISOString().split("T")[0];
  }
  
  const str = String(val).trim();
  if (!str) return undefined;
  
  const brMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) return str;
  
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) return new Date(parsed).toISOString().split("T")[0];
  
  return undefined;
}

const VALID_STATUS = ["Aprovada", "Cancelada", "Em Aprovação", "Pendente", "Em cotação", "Entregue"] as const;

function normalizeStatus(raw: string): string | undefined {
  if (!raw) return undefined;
  const v = raw.trim().toUpperCase();
  if (!v) return undefined;
  if (v === "APROVADA" || v === "APROVADO") return "Aprovada";
  if (v === "CANCELADA" || v === "CANCELADO") return "Cancelada";
  if (v === "PENDENTE") return "Pendente";
  if (v === "ENTREGUE") return "Entregue";
  if (v === "EM COTAÇÃO" || v === "EM COTACAO" || v.includes("COTA")) return "Em cotação";
  if (v.includes("APROV")) return "Em Aprovação";
  const found = VALID_STATUS.find((s) => s.toUpperCase() === v);
  return found ?? raw.trim();
}

function rowToSuprimento(
  row: Record<string, unknown>,
  headerMap: Map<string, string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [rawHeader, field] of headerMap.entries()) {
    const val = row[rawHeader];
    switch (field) {
      case "item": result.item = toStr(val) || undefined; break;
      case "requisicao": result.requisicao = toStr(val) || undefined; break;
      case "prioridade": result.prioridade = toStr(val) || undefined; break;
      case "descricao": result.descricao = toStr(val) || undefined; break;
      case "fornecedores": result.fornecedores = toStr(val) || undefined; break;
      case "cotacoes": result.cotacoes = toStr(val) || undefined; break;
      case "requisitante": result.requisitante = toStr(val) || undefined; break;
      
      // 👇 APLICAÇÃO DA VACINA NA DATA DE CRIAÇÃO
      case "data_criacao": result.data_criacao = parseDateSafely(val); break;
      
      case "status": result.status = normalizeStatus(toStr(val)); break;
      case "ordem_compra": result.ordem_compra = toStr(val) || undefined; break;
      case "valores": result.valores = toNumber(val); break;
      case "informado_por": result.informado_por = toStr(val) || undefined; break;
      case "status_ordem": result.status_ordem = normalizeStatus(toStr(val)); break;
    }
  }
  return result;
}

// ============================================================================
// GET /api/suprimentos/ordens
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const page   = Math.max(1, Number(searchParams.get("page")  ?? 1));
    const limit  = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 50)));
    const search = searchParams.get("search")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "";

    const db = createServerClient();
    let query = db
      .from("suprimentos_ordens")
      .select("*", { count: "exact" });

    if (search) {
      query = query.or(`ordem_compra.ilike.%${search}%,descricao.ilike.%${search}%`);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1).order("created_at", { ascending: false });

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    const normalized = (data ?? []).map((row) => ({
      ...row,
      entregue_obra:
        row.entregue_obra === true ||
        row.entregue_obra === "Sim" ||
        String(row.entregue_obra).toLowerCase() === "true",
    }));

    return NextResponse.json({
      data: normalized,
      pagination: { page, limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit) },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[GET /api/suprimentos/ordens]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/suprimentos/ordens  —  upsert em batch
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
    const headerMap = buildSuprimentosHeaderMap(headers);

    if (headerMap.size === 0) {
      report.erros.push({ linha: 0, motivo: "Nenhum cabeçalho reconhecido para Suprimentos." });
      return NextResponse.json(report);
    }

    const validRows = new Map<string, Record<string, unknown>>();
    const seenKeys  = new Set<string>();

    rows.forEach((row, idx) => {
      try {
        const parsed      = rowToSuprimento(row, headerMap);
        const ordemCompra = toStr(parsed.ordem_compra);
        const descricao   = toStr(parsed.descricao);

        const key = ordemCompra || descricao;
        if (!key) { report.ignorados++; return; }

        if (seenKeys.has(key)) {
          report.erros.push({
            linha: idx + 1,
            motivo: `Item "${key}": duplicado no arquivo.`,
          });
          return;
        }

        seenKeys.add(key);
        validRows.set(key, parsed);
      } catch (err) {
        report.erros.push({ linha: idx + 1, motivo: err instanceof Error ? err.message : "Erro" });
      }
    });

    if (validRows.size === 0) return NextResponse.json(report);

    // 1. Prepara a lista de Ordens e Descrições que vieram na planilha
    const ordemList = Array.from(new Set(Array.from(validRows.values()).map((r) => toStr(r.ordem_compra)).filter(Boolean)));
    const descList = Array.from(new Set(Array.from(validRows.values()).map((r) => toStr(r.descricao)).filter(Boolean)));

    const db = createServerClient();
    
    // 2. Busca no banco se já existe alguma dessas Ordens OU Descrições
    const { data: existingOrdens } = ordemList.length 
      ? await db.from("suprimentos_ordens").select("*").in("ordem_compra", ordemList) 
      : { data: [] };
      
    const { data: existingDescs } = descList.length 
      ? await db.from("suprimentos_ordens").select("*").in("descricao", descList) 
      : { data: [] };

    // 3. Junta tudo o que achou no banco, removendo duplicidades internas
    const todosExistentes = [...(existingOrdens ?? []), ...(existingDescs ?? [])];
    const mapUnicos = new Map(todosExistentes.map(item => [item.id, item]));
    const existing = Array.from(mapUnicos.values());

    // 4. Indexa os existentes com a mesma chave (Ordem ou Descrição) para o cruzamento
    const existMap = new Map<string, Record<string, unknown>>();
    for (const row of existing) {
      const k = toStr(row.ordem_compra) || toStr(row.descricao);
      if (k) existMap.set(k, row as Record<string, unknown>);
    }

    const toInsert: Record<string, unknown>[] = [];
    const toUpdate: Record<string, unknown>[] = [];

    for (const [key, newData] of validRows.entries()) {
      if (existMap.has(key)) {
        const existing = existMap.get(key)!;
        // Filtra células vazias para não apagar dados do banco (Overwrite apenas se não-vazio)
        const nonEmptyNewData = Object.fromEntries(
          Object.entries(newData).filter(([, v]) => v != null && v !== "")
        );
        toUpdate.push({
          ...existing,
          ...nonEmptyNewData,
          entregue_obra: existing.entregue_obra,
        });
        report.atualizados++;
      } else {
        toInsert.push({ ...newData, entregue_obra: false });
        report.inseridos++;
      }
    }

    if (toInsert.length > 0) {
      const { error } = await db.from("suprimentos_ordens").insert(toInsert);
      if (error) throw new Error(`Insert: ${error.message}`);
    }

    if (toUpdate.length > 0) {
      const { error } = await db.from("suprimentos_ordens").upsert(toUpdate, { onConflict: "id" });
      if (error) throw new Error(`Upsert: ${error.message}`);
    }

    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[POST /api/suprimentos/ordens]", error);
    return NextResponse.json(
      { error: "Erro interno", details: error instanceof Error ? error.message : "Desconhecido" },
      { status: 500 },
    );
  }
}