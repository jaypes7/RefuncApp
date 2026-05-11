/**
 * ============================================================================
 * API: GET /api/dashboard/logistica
 * ============================================================================
 *
 * Métricas de logística: ocupação de hotéis e distribuição de turnos.
 *
 * Fontes (novo modelo relacional):
 *   • colaborador_hospedagens → hotel_nome, data_checkin
 *   • colaboradores           → turno_trabalho
 *   • configuracoes_hoteis    → nome, qt_vagas
 *
 * Regras de cálculo:
 *   Ocupação Total    = COUNT(hospedagens onde hotel_nome preenchido)
 *                       / SUM(hoteis.qt_vagas) * 100
 *   Vagas Disponíveis = SUM(hoteis.qt_vagas) - COUNT(hospedagens com hotel)
 *                       (mínimo 0)
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth, resolveCentroCusto } from "@/lib/auth";
import { normalizeTurno } from "@/lib/import-utils";

// ============================================================================
// GET /api/dashboard/logistica
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth("user");

    const { searchParams } = new URL(request.url);
    const ccParam = searchParams.get("centro_custo") || undefined;
    const centroCusto = resolveCentroCusto(currentUser, ccParam);

    const db = createServerClient();

    // Se há filtro de centro de custo, busca os IDs dos colaboradores vinculados
    let colabIds: string[] | null = null;
    if (centroCusto?.length) {
      const { data: colabRows } = await db
        .from("colaboradores")
        .select("id")
        .in("centro_custo", centroCusto);
      colabIds = (colabRows ?? []).map((r) => r.id as string).filter(Boolean);
    }

    // Query de hospedagens (novo modelo)
    let hospedagemQuery = db
      .from("colaborador_hospedagens")
      .select("hotel_nome, colaborador_id");

    if (colabIds !== null) {
      if (colabIds.length === 0) {
        hospedagemQuery = hospedagemQuery.in("colaborador_id", ["__no_match__"]);
      } else {
        hospedagemQuery = hospedagemQuery.in("colaborador_id", colabIds);
      }
    }

    // Query de turnos (da tabela colaboradores)
    let turnoQuery = db.from("colaboradores").select("turno_trabalho, id");
    if (colabIds !== null) {
      if (colabIds.length === 0) {
        turnoQuery = turnoQuery.in("id", ["__no_match__"]);
      } else {
        turnoQuery = turnoQuery.in("id", colabIds);
      }
    }

    const [
      { data: hospedagemData, error: hospErr },
      { data: hoteisData,    error: hoteisErr },
      { data: turnoData,     error: turnoErr },
    ] = await Promise.all([
      hospedagemQuery,
      db.from("configuracoes_hoteis").select("nome, qt_vagas"),
      turnoQuery,
    ]);

    if (hospErr) throw new Error(hospErr.message);
    if (hoteisErr) console.error("[Dashboard/Logistica] hoteis:", hoteisErr.message);
    if (turnoErr) console.error("[Dashboard/Logistica] turnos:", turnoErr.message);

    const rows = (hospedagemData ?? []) as Array<{ hotel_nome: string | null; colaborador_id: string }>;

    // ── Mapa de vagas totais por hotel (case-insensitive) ─────────────────────
    const hoteisMap = new Map<string, number>();
    for (const h of hoteisData ?? []) {
      const nome = String(h.nome ?? "").trim();
      if (nome) hoteisMap.set(nome.toLowerCase(), Number(h.qt_vagas ?? 0));
    }

    // ── KPIs globais ──────────────────────────────────────────────────────────
    const countComHotel = rows.filter((r) => String(r.hotel_nome ?? "").trim().length > 0).length;
    const sumVagasTotais = [...hoteisMap.values()].reduce((s, v) => s + v, 0);
    const ocupacaoTotal = sumVagasTotais > 0 ? Math.round((countComHotel / sumVagasTotais) * 100) : 0;
    const totalDisponiveis = Math.max(0, sumVagasTotais - countComHotel);

    // ── Agrupamento por hotel ─────────────────────────────────────────────────
    const ocupacaoMap: Record<string, number> = {};
    for (const r of rows) {
      const h = String(r.hotel_nome ?? "").trim();
      const key = h || "Sem hotel definido";
      ocupacaoMap[key] = (ocupacaoMap[key] || 0) + 1;
    }

    const vagasHoteis = Object.entries(ocupacaoMap)
      .map(([hotel, vagasPreenchidas]) => {
        const cadastrado = hoteisMap.get(hotel.toLowerCase());
        const vagasTotais = cadastrado !== undefined ? cadastrado : vagasPreenchidas;
        const percentual = vagasTotais > 0 ? Math.round((vagasPreenchidas / vagasTotais) * 100) : 0;
        return { hotel, vagasTotais, vagasPreenchidas, percentual };
      })
      .sort((a, b) => b.vagasPreenchidas - a.vagasPreenchidas);

    // ── Distribuição por turno ────────────────────────────────────────────────
    const turnoRows = (turnoData ?? []) as Array<{ turno_trabalho: string | null }>;
    const turnoMap: Record<string, number> = {};
    for (const r of turnoRows) {
      const rawValue = String(r.turno_trabalho ?? "").trim();
      const t = normalizeTurno(r.turno_trabalho);
      let turnoLabel: string;
      if (t === "N/A") {
        turnoLabel = "Não informado (N/A)";
      } else if (t) {
        turnoLabel = t;
      } else {
        turnoLabel = rawValue || "Não informado (N/A)";
      }
      turnoMap[turnoLabel] = (turnoMap[turnoLabel] || 0) + 1;
    }
    const turnoTrabalho = Object.entries(turnoMap)
      .map(([turno, total]) => ({ turno, total }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      kpis: {
        totalVagas: sumVagasTotais,
        totalPreenchidas: countComHotel,
        totalDisponiveis,
        ocupacaoTotal,
      },
      vagasHoteis,
      turnoTrabalho,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado: privilégios insuficientes" }, { status: 403 });
    }
    console.error("[GET /api/dashboard/logistica]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
