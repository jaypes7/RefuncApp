/**
 * ============================================================================
 * API: /api/colaboradores/import
 * ============================================================================
 *
 * POST: Importação em batch de colaboradores via planilha (Supabase)
 *
 * Fluxo (5 fases):
 *   1. Parse dos headers com HEADER_ALIASES  →  buildHeaderMap()
 *   2. Sanitização linha a linha              →  rowToColaborador()
 *      Deduplicação intra-arquivo em memória  →  Set<cpf>
 *   3. SELECT único no Supabase               →  .in("cpf", cpfArray)
 *   4. Merge em memória:
 *      • CPF existente → dados da planilha sobrescrevem o banco, exceto se a
 *                        célula estiver vazia/nula (preserva dados existentes)
 *      • CPF novo      → insere o objeto completo
 *   5. UPSERT único                            →  .upsert(payload, { onConflict: "cpf,centro_custo" })
 *      Log único                               →  logImport()
 *
 * Retorna: ImportReport { inseridos, atualizados, ignorados, erros, total }
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createServerClient } from "@/lib/supabase";
import {
  buildHeaderMap,
  rowToColaborador,
  sanitizeCPF,
  type RawRow,
  type ImportReport,
  type ImportError,
} from "@/lib/import-utils";
import { requireAuth } from "@/lib/auth";
import { logImport } from "@/lib/logs";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Converte todas as chaves de um Record para lowercase/snake_case,
 * alinhando com a convenção de colunas do Supabase (PostgreSQL).
 *
 * Exemplos:
 *   CPF           → cpf
 *   NOME          → nome
 *   DATA_ADMISSAO → data_admissao
 *   FUNCAO_CLT    → funcao_clt
 */
function toLowerKeys(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]),
  );
}

/**
 * Extrai e normaliza o CPF de um record independente do case das chaves.
 * Retorna string com apenas dígitos (sem máscara).
 */
function extractCpf(record: Record<string, unknown>): string {
  const raw = record["cpf"] ?? record["CPF"] ?? "";
  return sanitizeCPF(raw);
}

/**
 * Avalia se um valor de banco deve ser considerado "vazio" para fins do merge.
 * Considera vazio: null, undefined e string em branco.
 */
function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

// ============================================================================
// POST /api/colaboradores/import
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
    // ── Auth ─────────────────────────────────────────────────────────────────
    const user = await requireAuth("user");

    // ── Payload ──────────────────────────────────────────────────────────────
    const body = await request.json();
    const { rows, default_centro_custo: defaultCentroCusto } = body as {
      rows: RawRow[];
      default_centro_custo?: string;
    };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(report);
    }

    report.total = rows.length;

    // ── FASE 1: Mapear cabeçalhos UMA VEZ ────────────────────────────────────
    const headers = Object.keys(rows[0] ?? {});
    const headerMap = buildHeaderMap(headers);

    if (headerMap.size === 0) {
      report.erros.push({
        linha: 0,
        motivo:
          "Nenhum cabeçalho reconhecido. Verifique se o arquivo segue o " +
          "padrão REFUNC ou Controle Geral.",
      });
      return NextResponse.json(report);
    }

    // ── Localiza o header bruto do turno UMA VEZ (antes do forEach) ──────────
    // turno_semana tem SCHEMA_TO_API = null, então não aparece no colaborador
    // processado — precisamos ler o valor diretamente da linha bruta.
    let turnoRawHeader: string | null = null;
    for (const [rawH, schemaId] of headerMap.entries()) {
      if (schemaId === "turno_semana") { turnoRawHeader = rawH; break; }
    }

    // ── FASE 2: Sanitizar linhas em memória ──────────────────────────────────
    // Produz: Map<cpf::centro_custo, record_em_lowercase> — chaves prontas para o Supabase
    const validRows = new Map<string, Record<string, unknown>>();
    const seenKeys = new Set<string>(); // dedup intra-arquivo por cpf+centro_custo

    rows.forEach((row, idx) => {
      const lineNumber = idx + 1;
      try {
        // rowToColaborador devolve UPPERCASE keys (CPF, NOME, STATUS, …)
        const colaborador = rowToColaborador(row, headerMap);

        // ── Proteção contra linhas de rodapé/totalizador ────────────────────────
        const nome = String(colaborador["NOME"] ?? "").trim();
        const nomeUpper = nome.toUpperCase();

        // Detecta linhas de rodapé: nome vazio ou contendo "TOTAL", "SOMA", "GERAL"
        if (!nome || nomeUpper.includes("TOTAL") || nomeUpper.includes("SOMA") || nomeUpper.includes("GERAL")) {
          report.ignorados++;
          return;
        }

        // Turno bruto da linha original (SCHEMA_TO_API é null, não chega no colaborador)
        const rawTurno = turnoRawHeader
          ? String(row[turnoRawHeader] ?? "").trim()
          : "";

        // Rodapé por CPF inválido + turno numérico puro:
        // ex. linha de totalização onde CPF = "" e coluna turno = "134"
        const cpfRaw = extractCpf(colaborador);
        if ((!cpfRaw || cpfRaw.length !== 11) && /^\d+$/.test(rawTurno)) {
          report.ignorados++;
          return;
        }

        // CPF obrigatório para qualquer operação de upsert
        const cpf = cpfRaw;
        if (!cpf || cpf.length !== 11) {
          report.ignorados++;
          return;
        }

        // CPF válido + turno "N/A" → importa normalmente como colaborador
        // pendente de turno (rawTurno vazio/"N/A"/"NA" é aceito — não descartado)

        // Converte chaves para lowercase e garante o CPF limpo
        const dbRow: Record<string, unknown> = { ...toLowerKeys(colaborador), cpf };
        if (!dbRow.centro_custo && defaultCentroCusto) {
          dbRow.centro_custo = defaultCentroCusto;
        }

        // Duplicata dentro do mesmo arquivo (mesmo CPF + mesmo centro de custo)
        const cc = String(dbRow.centro_custo ?? "").trim();
        const compositeKey = `${cpf}::${cc}`;
        if (seenKeys.has(compositeKey)) {
          report.erros.push({
            linha: lineNumber,
            campo: "CPF",
            motivo: `CPF ${cpf} (CC ${cc || "sem CC"}): duplicado neste arquivo (linha ignorada).`,
          });
          return;
        }

        seenKeys.add(compositeKey);
        validRows.set(compositeKey, dbRow);
      } catch (err) {
        report.erros.push({
          linha: lineNumber,
          motivo:
            err instanceof Error
              ? err.message
              : "Erro desconhecido ao processar linha",
        });
      }
    });

    if (validRows.size === 0) {
      return NextResponse.json(report);
    }

    // ── FASE 3: Buscar registros existentes — 1 SELECT ───────────────────────
    const cpfArray = Array.from(new Set(Array.from(validRows.values()).map((r) => String(r.cpf))));
    const supabase = createServerClient();

    const { data: existingRows, error: fetchError } = await supabase
      .from("colaboradores")
      .select("*")
      .in("cpf", cpfArray);

    if (fetchError) {
      throw new Error(
        `Falha ao buscar registros existentes: ${fetchError.message}`,
      );
    }

    // Indexa existentes por (cpf, centro_custo) para lookup O(1)
    const existingKey = (cpf: string, cc: unknown) =>
      `${cpf}::${String(cc ?? "").trim()}`;

    const existingByKey = new Map<string, Record<string, unknown>>();
    for (const row of existingRows ?? []) {
      const cpf = String(row.cpf ?? "").replace(/\D/g, "");
      if (cpf) existingByKey.set(existingKey(cpf, row.centro_custo), row as Record<string, unknown>);
    }

    // ── FASE 4: Aplicar regra de MERGE (Overwrite) ───────────────────────────
    //
    // Colaborador existente  →  dados da planilha sobrescrevem o banco;
    //                           células vazias/nulas são ignoradas (não apagam
    //                           dados já preenchidos no banco).
    //
    // Colaborador novo       →  insere o objeto completo da planilha.
    //
    const upsertPayload: Record<string, unknown>[] = [];

    for (const [, newData] of validRows.entries()) {
      const cpf = String(newData.cpf);
      const cc = newData.centro_custo ?? "";
      const key = existingKey(cpf, cc);

      if (existingByKey.has(key)) {
        // ── UPDATE com merge Overwrite ────────────────────────────────────────
        const merged = { ...existingByKey.get(key)! };

        for (const [keyName, incomingValue] of Object.entries(newData)) {
          // Sobrescreve o banco se a célula da planilha não estiver vazia
          if (!isEmpty(incomingValue)) {
            merged[keyName] = incomingValue;
          }
        }

        merged.cpf = cpf; // garante a chave de conflito intacta
        upsertPayload.push(merged);
        report.atualizados++;
      } else {
        // ── INSERT completo ───────────────────────────────────────────────────
        upsertPayload.push({ ...newData, cpf, id: randomUUID() });
        report.inseridos++;
      }
    }

    // ── FASE 5: Upsert único — 1 chamada ao Supabase ─────────────────────────
    const { error: upsertError } = await supabase
      .from("colaboradores")
      .upsert(upsertPayload, { onConflict: "cpf,centro_custo" });

    if (upsertError) {
      throw new Error(`Falha no upsert: ${upsertError.message}`);
    }

    // ── Log único para todo o import ─────────────────────────────────────────
    await logImport(
      user.re,
      `${report.inseridos} inseridos, ${report.atualizados} atualizados, ` +
        `${report.ignorados} ignorados, ${report.erros.length} erro(s)`,
      String(report.total),
    );

    return NextResponse.json(report);
  } catch (error) {
    console.error("[POST /colaboradores/import]", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado: privilégios insuficientes" }, { status: 403 });
    }

    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details:
          error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    );
  }
}
