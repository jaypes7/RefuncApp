/**
 * ============================================================================
 * API: GET /api/seguranca/dashboard
 * ============================================================================
 *
 * Retorna métricas agregadas dos campos de Segurança da tabela `colaboradores`
 * para o Dashboard de Segurança.
 *
 * Resposta:
 *   total                    → contagem total de colaboradores
 *   distribuicaoStatusPortal → distribuição do campo `portal`
 *   distribuicaoRpv          → distribuição do campo `rpv`
 *   distribuicaoTreinamento  → distribuição do campo `treinamento`
 *   treinamentosPorCurso     → status por treinamento do catálogo (OK / A Vencer /
 *                              Vencido / Pendente), com a lista de colaboradores
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth, resolveCentroCusto } from "@/lib/auth";

// ── Tipos de resposta ─────────────────────────────────────────────────────────

interface DistRow { label: string; value: number; }

interface TreinamentoMembro {
  nome: string;
  status: string;
  data_realizacao: string | null;
  data_validade: string | null;
}

interface TreinamentoStatusRow {
  nome: string;
  total: number;
  ok: number;
  aVencer: number;
  vencido: number;
  pendente: number;
  realizados: number;     // possui data_realizacao
  naoRealizados: number;  // sem data_realizacao
  membros: TreinamentoMembro[];
}

interface KpiCatalogo {
  totalVinculos: number;
  ok: number;
  aVencer: number;
  vencido: number;
  pendente: number;
  realizados: number;
  naoRealizados: number;
}

interface SegurancaDashboard {
  total: number;
  distribuicaoStatusPortal: DistRow[];
  distribuicaoRpv: DistRow[];
  distribuicaoTreinamento: DistRow[];
  treinamentosPorCurso: TreinamentoStatusRow[];
  kpiTreinamentoCatalogo: KpiCatalogo;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Busca todas as linhas paginando em blocos de 1000 (limite padrão do PostgREST).
 * Evita que o dashboard subconte silenciosamente quando o volume cresce.
 */
async function fetchAllRows(
  makeQuery: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
): Promise<unknown[]> {
  const pageSize = 1000;
  const all: unknown[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await makeQuery(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    all.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function contagem(
  rows: Record<string, unknown>[],
  field: string,
  fallback = "Pendente",
): DistRow[] {
  const map: Record<string, number> = {};
  for (const row of rows) {
    const val = String(row[field] ?? fallback).trim() || fallback;
    map[val] = (map[val] ?? 0) + 1;
  }
  return Object.entries(map)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

// ============================================================================
// GET /api/seguranca/dashboard
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();

    const { searchParams } = new URL(request.url);
    const ccParam = searchParams.get("centro_custo") || undefined;
    const centroCusto = resolveCentroCusto(currentUser, ccParam);

    const db = createServerClient();

    const rows = (await fetchAllRows((from, to) => {
      let q = db.from("colaboradores").select("portal, rpv, treinamento").range(from, to);
      if (centroCusto?.length) q = q.in("centro_custo", centroCusto);
      return q;
    })) as Record<string, unknown>[];
    const total = rows.length;

    const distribuicaoStatusPortal = contagem(rows, "portal", "Pendente");
    const distribuicaoRpv = contagem(rows, "rpv", "Pendente");
    const distribuicaoTreinamento = contagem(rows, "treinamento", "Pendente");

    // ── Status por treinamento do catálogo ───────────────────────────────────
    // Junta colaborador_treinamentos → treinamentos (nome) e → colaboradores
    // (nome + centro_custo, para respeitar o filtro). Só considera vínculos
    // aplicáveis a cada colaborador.
    const treinoRows = (await fetchAllRows((from, to) => {
      let q = db
        .from("colaborador_treinamentos")
        .select(`
          status,
          data_realizacao,
          data_validade,
          treinamentos!inner ( nome ),
          colaboradores!inner ( nome, centro_custo )
        `)
        .eq("aplicavel", true)
        .range(from, to);
      if (centroCusto?.length) q = q.in("colaboradores.centro_custo", centroCusto);
      return q;
    })) as unknown as Array<{
      status: string | null;
      data_realizacao: string | null;
      data_validade: string | null;
      treinamentos: { nome: string } | null;
      colaboradores: { nome: string | null } | null;
    }>;

    const treinoMap = new Map<string, TreinamentoStatusRow>();
    for (const r of treinoRows) {
      const nome = r.treinamentos?.nome?.trim() || "Sem nome";
      let entry = treinoMap.get(nome);
      if (!entry) {
        entry = { nome, total: 0, ok: 0, aVencer: 0, vencido: 0, pendente: 0, realizados: 0, naoRealizados: 0, membros: [] };
        treinoMap.set(nome, entry);
      }
      const status = (r.status ?? "Pendente").trim() || "Pendente";
      entry.total += 1;
      if (status === "OK") entry.ok += 1;
      else if (status === "A Vencer") entry.aVencer += 1;
      else if (status === "Vencido") entry.vencido += 1;
      else entry.pendente += 1;
      // Realizado = tem data_realizacao; senão, pendente de realização.
      if (r.data_realizacao) entry.realizados += 1;
      else entry.naoRealizados += 1;
      entry.membros.push({
        nome: r.colaboradores?.nome?.trim() || "—",
        status,
        data_realizacao: r.data_realizacao ?? null,
        data_validade: r.data_validade ?? null,
      });
    }

    const treinamentosPorCurso = Array.from(treinoMap.values())
      .map((t) => ({
        ...t,
        membros: t.membros.sort((a, b) => a.nome.localeCompare(b.nome)),
      }))
      .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome));

    const kpiTreinamentoCatalogo = treinamentosPorCurso.reduce(
      (acc, t) => {
        acc.totalVinculos  += t.total;
        acc.ok             += t.ok;
        acc.aVencer        += t.aVencer;
        acc.vencido        += t.vencido;
        acc.pendente       += t.pendente;
        acc.realizados     += t.realizados;
        acc.naoRealizados  += t.naoRealizados;
        return acc;
      },
      { totalVinculos: 0, ok: 0, aVencer: 0, vencido: 0, pendente: 0, realizados: 0, naoRealizados: 0 },
    );

    const response: SegurancaDashboard = {
      total,
      distribuicaoStatusPortal,
      distribuicaoRpv,
      distribuicaoTreinamento,
      treinamentosPorCurso,
      kpiTreinamentoCatalogo,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[GET /api/seguranca/dashboard]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
