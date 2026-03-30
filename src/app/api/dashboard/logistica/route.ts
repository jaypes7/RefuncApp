/**
 * ============================================================================
 * API: GET /api/dashboard/logistica
 * ============================================================================
 *
 * Métricas de logística: ocupação de hotéis e distribuição de turnos.
 *
 * Fontes:
 *   • logistica_controle → id, cpf, nome, hotel, turno_trabalho, data_checkin
 *   • hoteis             → id, nome, vagas_totais
 *
 * Regras de cálculo:
 *   Ocupação Total    = COUNT(logistica_controle onde hotel preenchido)
 *                       / SUM(hoteis.vagas_totais) * 100
 *   Vagas Disponíveis = SUM(hoteis.vagas_totais)
 *                       - COUNT(logistica_controle onde hotel preenchido)
 *                       (mínimo 0)
 *
 * Agrupamento por hotel:
 *   - Campo `hotel` de logistica_controle (nunca outro campo)
 *   - Registros com hotel NULL ou "" → "Sem hotel definido"
 *   - Cross com hoteis.vagas_totais pelo nome (case-insensitive)
 *   - Hotel sem cadastro em hoteis → vagasTotais = vagasPreenchidas (sem barra disponível)
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { normalizeTurno } from "@/lib/import-utils";

// ============================================================================
// GET /api/dashboard/logistica
// ============================================================================

export async function GET() {
  try {
    await requireAuth("user");

    const db = createServerClient();

    const [
      { data: logisticaData, error: logErr },
      { data: hoteisData,    error: hoteisErr },
    ] = await Promise.all([
      db.from("logistica_controle").select("hotel,turno_trabalho"),
      db.from("configuracoes_hoteis").select("nome, qt_vagas"),
    ]);

    if (logErr) throw new Error(logErr.message);
    if (hoteisErr) console.error("[Dashboard/Logistica] hoteis:", hoteisErr.message);

    const rows = (logisticaData ?? []) as Array<{ hotel: string | null; turno_trabalho: string | null }>;

    // ── Mapa de vagas totais por hotel (case-insensitive) ─────────────────────
    // Fonte exclusiva: tabela `hoteis`. Chave normalizada = lowercase.
    const hoteisMap = new Map<string, number>();
    for (const h of hoteisData ?? []) {
      const nome = String(h.nome ?? "").trim();
      if (nome) hoteisMap.set(nome.toLowerCase(), Number(h.qt_vagas ?? 0));
    }

    // ── KPIs globais ──────────────────────────────────────────────────────────
    // countComHotel: registros com hotel preenchido (IS NOT NULL AND != "")
    const countComHotel = rows.filter((r) => String(r.hotel ?? "").trim().length > 0).length;

    // sumVagasTotais: soma apenas da tabela hoteis (não de logistica_controle)
    const sumVagasTotais = [...hoteisMap.values()].reduce((s, v) => s + v, 0);

    const ocupacaoTotal   = sumVagasTotais > 0
      ? Math.round((countComHotel / sumVagasTotais) * 100)
      : 0;
    const totalDisponiveis = Math.max(0, sumVagasTotais - countComHotel);

    // ── Agrupamento por hotel ─────────────────────────────────────────────────
    // Todos os registros, incluindo hotel vazio → "Sem hotel definido"
    const ocupacaoMap: Record<string, number> = {};
    for (const r of rows) {
      const h   = String(r.hotel ?? "").trim();
      const key = h || "Sem hotel definido";
      ocupacaoMap[key] = (ocupacaoMap[key] || 0) + 1;
    }

    // Para cada grupo de logistica_controle, cruzar com hoteis (case-insensitive)
    // Hotel sem cadastro em hoteis → vagasTotais = vagasPreenchidas (vagasDisponiveis = 0)
    const vagasHoteis = Object.entries(ocupacaoMap)
      .map(([hotel, vagasPreenchidas]) => {
        const cadastrado  = hoteisMap.get(hotel.toLowerCase());
        const vagasTotais = cadastrado !== undefined ? cadastrado : vagasPreenchidas;
        const percentual  = vagasTotais > 0
          ? Math.round((vagasPreenchidas / vagasTotais) * 100)
          : 0;
        return { hotel, vagasTotais, vagasPreenchidas, percentual };
      })
      .sort((a, b) => b.vagasPreenchidas - a.vagasPreenchidas);

    // ── Distribuição por turno ────────────────────────────────────────────────
    // Nenhum registro é descartado — todos entram em alguma fatia do gráfico.
    //
    // Prioridade de classificação:
    //   1. normalizeTurno reconhece o dígito (1/2/3) → label "Xº TURNO"
    //   2. Valor vazio/null/"N/A"/"NA"               → "Não informado (N/A)"
    //   3. Valor existe mas sem dígito reconhecível   → exibe texto original (auditável)
    //
    // Nota: valores já salvos no banco como "3º TURNO", "3", "TURNO 3", etc.
    // são normalizados para "3º TURNO" via normalizeTurno (busca por includes("3")).
    const turnoMap: Record<string, number> = {};
    for (const r of rows) {
      const rawValue = String(r.turno_trabalho ?? "").trim();
      const t = normalizeTurno(r.turno_trabalho);

      let turnoLabel: string;
      if (t === "N/A") {
        // Apenas registros realmente vazios ou explicitamente "N/A"
        turnoLabel = "Não informado (N/A)";
      } else if (t) {
        // Turno reconhecido: "1º TURNO", "2º TURNO" ou "3º TURNO"
        turnoLabel = t;
      } else {
        // Valor não normalizado: exibe o texto original (ex: "Turno Especial")
        // para que nada fique oculto no gráfico de pizza.
        // rawValue vazio aqui seria caso impossível (normalizeTurno já retorna "N/A"),
        // mas o fallback garante que "Não informado (N/A)" só aparece quando realmente vazio.
        turnoLabel = rawValue || "Não informado (N/A)";
      }

      turnoMap[turnoLabel] = (turnoMap[turnoLabel] || 0) + 1;
    }
    const turnoTrabalho = Object.entries(turnoMap)
      .map(([turno, total]) => ({ turno, total }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      kpis: {
        totalVagas:       sumVagasTotais,
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
