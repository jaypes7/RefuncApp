/**
 * ============================================================================
 * API: /api/logistica/controle
 * ============================================================================
 *
 * Domínio Logística — leitura e importação do controle logístico.
 * Tabela Supabase: `logistica_controle`
 * Chave de conflito: `cpf` — linhas sem CPF são ignoradas
 *
 * GET  → Lista todos os registros com filtros opcionais
 * POST → Upsert em batch a partir de linhas brutas da planilha
 *
 * Campos esperados na planilha (aliases flexíveis):
 *   CPF, RE, NOME, FUNÇÃO CLT, MOB, PORTAL, CRACHÁ, PONTO, TURNO
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import type { ImportReport, ImportError } from "@/lib/import-utils";
import { sanitizeCPF, sanitizeDate, sanitizeText, mapStrictEnums } from "@/lib/import-utils";

// ============================================================================
// MAPEAMENTO DE CABEÇALHOS — Logística
// ============================================================================

/** Aliases flexíveis para headers da planilha de logística */
const LOGISTICA_ALIASES: Record<string, string[]> = {
  cpf:            ["CPF", "C.P.F.", "CPF DO COLABORADOR", "CPF FUNCIONARIO"],
  re:             ["RE", "REGISTRO", "N PESSOA", "N_PESSOA", "COD FUNCIONARIO", "N. PESSOA"],
  nome:           ["NOME", "NOME COMPLETO", "NOME DO COLABORADOR"],
  funcao_clt:     ["FUNÇÃO CLT", "FUNCAO CLT", "FUNÇÃO", "FUNCAO", "CARGO"],
  status:         ["STATUS", "STATUS ADM"],
  situacao:       ["SITUAÇÃO", "SITUACAO"],
  fase:           ["FASE"],
  sexo:           ["SEXO", "GÊNERO", "GENERO"],
  data_admissao:  ["ADMISSÃO", "ADMISSAO", "DATA ADMISSÃO", "DATA ADMISSAO", "DT ADMISSAO"],
  cracha:         ["CRACHA", "CRACHÁ", "STATUS CRACHÁ"],
  // Turno de semana — captura variações com travessões, acentos e espaços extras
  turno_trabalho: [
    "TURNO", "TURNO SEMANA", "TURNO TRABALHO", "JORNADA",
    "TURNO - (2ª A 6ª)", "TURNO - (2A A 6A)", "TURNO (2ª A 6ª)",
    "TURNO 2A 6A", "TURNO SEG SEX",
  ],
  turno_sabado:   ["TURNO SÁBADO", "TURNO SABADO", "TURNO SAB", "TURNO SÁB"],
  turno_domingo:  ["TURNO DOMINGO", "TURNO DOM"],
  coordenador:    ["COORDEN.", "COORDENADOR", "COORDENADOR RESP"],
  supervisor:     ["SUPERV.", "SUPERVISOR", "SUPERVISOR RESP"],
  encarregado:    ["ENCARREG.", "ENCARREGADO", "ENCARREGADO RESP"],
  // ATENÇÃO: campo "hotel" usa apenas match exato (sem substring) para evitar
  // que colunas como "C. CUSTOS HOSPEDAGEM" sejam mapeadas incorretamente.
  // Prioridade: "HOTEL" (exato) → fallbacks abaixo, também exatos.
  // NOTA: registros já importados com valor incorreto NÃO são corrigidos
  // automaticamente por esta mudança — apenas novas importações usam este mapeamento.
  hotel:          ["HOTEL", "NOME HOTEL", "HOTEL/POUSADA", "HOSPEDAGEM"],
  data_checkin:   ["DATA CHECK-IN", "CHECK-IN", "CHECKIN", "DATA CHECKIN", "DATA DE CHECK-IN"],
  rota_transporte:  ["ROTA TRANSPORTE", "ROTA DE TRANSPORTE", "ROTA"],
  tipo_transporte:  ["TIPO TRANSPORTE", "TIPO DE VEÍCULO", "TIPO VEICULO"],
  tipo_apto:        ["TIPO APTO", "TIPO DE ACOMODAÇÃO", "TIPO ACOMODACAO"],
  num_apto:         ["Nº APTO.", "N APTO", "APTO", "APARTAMENTO", "QUARTO"],
  local_trabalho:   ["LOCAL TRAB.", "LOCAL TRABALHO", "FRENTE DE TRABALHO"],
  setor_trabalho:   ["SETOR TRABALHO", "SETOR DE ATUAÇÃO", "SETOR"],
  demissao:         ["DEMISSÃO", "DEMISSAO", "DATA DEMISSÃO"],
  data_nascimento:  ["DATA NASC.", "DATA NASCIMENTO", "DT NASC"],
  telefone:         ["TELEFONE", "FONE", "CELULAR"],
  uf:               ["UF", "ESTADO"],
};

/**
 * Campos que requerem match exato do header (sem substring matching).
 * Usar substring em "HOSPEDAGEM" causaria match falso em "C. CUSTOS HOSPEDAGEM".
 */
const EXACT_MATCH_ONLY_FIELDS = new Set(["hotel"]);

function buildLogisticaHeaderMap(headers: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const header of headers) {
    // Normaliza: trim + colapsa espaços múltiplos + uppercase
    const norm = header.trim().toUpperCase().replace(/\s+/g, " ");
    for (const [field, aliases] of Object.entries(LOGISTICA_ALIASES)) {
      // Guarda de segurança para 'hotel': colunas financeiras (CUSTO, C.C., CC)
      // nunca devem mapear para hotel, independentemente do alias encontrado.
      if (field === "hotel" && /\bCUSTO|C\.C\.|C\. C\.\b/.test(norm)) continue;

      const exactOnly = EXACT_MATCH_ONLY_FIELDS.has(field);
      const matched = aliases.some((a) => {
        const aliasNorm = a.toUpperCase().replace(/\s+/g, " ");
        // Aliases curtos (≤3 chars, ex: "RE") exigem match exato para evitar
        // falsos positivos como "DATA DO CRACHÁ RETIRADO".includes("RE") = true.
        // Campo "hotel" também exige match exato (via EXACT_MATCH_ONLY_FIELDS).
        if (exactOnly || aliasNorm.length <= 3) return norm === aliasNorm;
        return norm === aliasNorm || norm.includes(aliasNorm);
      });
      if (matched) {
        map.set(header, field);
        break;
      }
    }
  }
  return map;
}

function rowToLogistica(
  row: Record<string, unknown>,
  headerMap: Map<string, string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [rawHeader, field] of headerMap.entries()) {
    const val = row[rawHeader];
    switch (field) {
      case "cpf":
        result.cpf = sanitizeCPF(val) || undefined;
        break;
      case "re":
        result.re = sanitizeText(val) || undefined;
        break;
      case "nome":
        result.nome = sanitizeText(val, { upper: true }) ?? undefined;
        break;
      case "funcao_clt":
        result.funcao_clt = sanitizeText(val, { upper: true }) ?? undefined;
        break;
      case "status":
        result.status = mapStrictEnums("status_adm", sanitizeText(val)) ?? undefined;
        break;
      case "situacao":
        result.situacao = sanitizeText(val) ?? undefined;
        break;
      case "fase":
        result.fase = sanitizeText(val) ?? undefined;
        break;
      case "sexo":
        result.sexo = sanitizeText(val) ?? undefined;
        break;
      case "data_admissao":
        result.data_admissao = sanitizeDate(val) ?? undefined;
        break;
      case "cracha":
        result.cracha = mapStrictEnums("cracha", sanitizeText(val)) ?? undefined;
        break;
      case "turno_trabalho":
        result.turno_trabalho = sanitizeText(val) ?? undefined;
        break;
      case "turno_sabado":
        result.turno_sabado = sanitizeText(val) ?? undefined;
        break;
      case "turno_domingo":
        result.turno_domingo = sanitizeText(val) ?? undefined;
        break;
      case "coordenador":
        result.coordenador = sanitizeText(val, { upper: true }) ?? undefined;
        break;
      case "supervisor":
        result.supervisor = sanitizeText(val, { upper: true }) ?? undefined;
        break;
      case "encarregado":
        result.encarregado = sanitizeText(val, { upper: true }) ?? undefined;
        break;
      case "hotel":
        result.hotel = sanitizeText(val) ?? undefined;
        break;
      case "data_checkin":
        result.data_checkin = sanitizeDate(val) ?? undefined;
        break;
      case "rota_transporte":
        result.rota_transporte = sanitizeText(val) ?? undefined;
        break;
      case "tipo_transporte":
        result.tipo_transporte = sanitizeText(val) ?? undefined;
        break;
      case "tipo_apto":
        result.tipo_apto = sanitizeText(val) ?? undefined;
        break;
      case "num_apto":
        result.num_apto = sanitizeText(val) ?? undefined;
        break;
      case "local_trabalho":
        result.local_trabalho = sanitizeText(val) ?? undefined;
        break;
      case "setor_trabalho":
        result.setor_trabalho = sanitizeText(val) ?? undefined;
        break;
      case "demissao":
        result.demissao = sanitizeDate(val) ?? undefined;
        break;
      case "data_nascimento":
        result.data_nascimento = sanitizeDate(val) ?? undefined;
        break;
      case "telefone":
        result.telefone = sanitizeText(val) ?? undefined;
        break;
      case "uf":
        result.uf = sanitizeText(val, { upper: true }) ?? undefined;
        break;
    }
  }
  return result;
}

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}

// ============================================================================
// GET /api/logistica/controle
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
      .from("logistica_controle")
      .select("*", { count: "exact" });

    if (search) {
      query = query.or(`nome.ilike.%${search}%,cpf.ilike.%${search}%,re.ilike.%${search}%`);
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
    console.error("[GET /api/logistica/controle]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/logistica/controle  —  upsert em batch
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
    const headerMap = buildLogisticaHeaderMap(headers);

    if (headerMap.size === 0) {
      report.erros.push({ linha: 0, motivo: "Nenhum cabeçalho reconhecido para Logística." });
      return NextResponse.json(report);
    }

    // Registros indexados por CPF (única chave de conflito aceita)
    const byCpf = new Map<string, Record<string, unknown>>();
    const seenCpfs = new Set<string>();

    rows.forEach((row, idx) => {
      try {
        const parsed = rowToLogistica(row, headerMap);
        const nome = String(parsed.nome ?? "").trim();

        if (!nome) {
          report.erros.push({ linha: idx + 1, campo: "NOME", motivo: "NOME ausente." });
          return;
        }

        const cpf = parsed.cpf ? String(parsed.cpf).replace(/\D/g, "").padStart(11, "0") : "";

        if (!cpf) { report.ignorados++; return; }

        if (seenCpfs.has(cpf)) {
          report.erros.push({ linha: idx + 1, motivo: `CPF ${cpf}: duplicado no arquivo.` });
          return;
        }
        seenCpfs.add(cpf);

        byCpf.set(cpf, { ...parsed, cpf });
      } catch (err) {
        report.erros.push({ linha: idx + 1, motivo: err instanceof Error ? err.message : "Erro" });
      }
    });

    if (byCpf.size === 0) return NextResponse.json(report);

    const db = createServerClient();

    // ── Upsert por CPF ──────────────────────────────────────────────────────
    if (byCpf.size > 0) {
      const { data: existByCpf } = await db
        .from("logistica_controle")
        .select("*")
        .in("cpf", Array.from(byCpf.keys()));

      const existMap = new Map((existByCpf ?? []).map((r) => [String(r.cpf ?? ""), r as Record<string, unknown>]));
      const payload: Record<string, unknown>[] = [];

      for (const [cpf, newData] of byCpf.entries()) {
        if (existMap.has(cpf)) {
          const merged = { ...existMap.get(cpf)! };
          for (const [k, v] of Object.entries(newData)) {
            if (isEmpty(merged[k]) && !isEmpty(v)) merged[k] = v;
          }
          merged.cpf = cpf;
          payload.push(merged);
          report.atualizados++;
        } else {
          payload.push(newData);
          report.inseridos++;
        }
      }

      const { error } = await db.from("logistica_controle").upsert(payload, { onConflict: "cpf" });
      if (error) throw new Error(`Upsert CPF: ${error.message}`);
    }

    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[POST /api/logistica/controle]", error);
    return NextResponse.json(
      { error: "Erro interno", details: error instanceof Error ? error.message : "Desconhecido" },
      { status: 500 },
    );
  }
}
