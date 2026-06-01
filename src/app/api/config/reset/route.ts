/**
 * ============================================================================
 * API: /api/config/reset
 * ============================================================================
 *
 * POST /api/config/reset — Reseta o projeto deletando os dados operacionais
 * de um centro de custo específico.
 *
 * Mantém: etapas, usuarios_permitidos, logs_auditoria, configuracoes,
 *         configuracoes_hoteis, configuracoes_clinicas.
 *
 * Tabelas que serão limpas (filtradas por centro_custo):
 *   - colaboradores
 *   - logistica_controle
 *   - seguranca_fits
 *   - suprimentos_ordens
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { registrarLog } from "@/lib/logs";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth("admin");

    // ── DEMO MODE: reset destrutivo bloqueado ────────────────────────────────
    if (process.env.DEMO_MODE === "true") {
      const { demoBlocked } = await import("@/lib/demo/handler");
      return demoBlocked("reset de projeto não está disponível no ambiente de demonstração");
    }

    const body = await request.json().catch(() => ({}));
    const centroCusto = body?.centro_custo;

    if (!centroCusto || typeof centroCusto !== "string") {
      return NextResponse.json(
        { error: "centro_custo é obrigatório" },
        { status: 400 },
      );
    }

    const db = createServerClient();

    // Tabelas operacionais a serem limpas apenas para o centro de custo informado
    const tablesToClear = [
      { table: "colaboradores", pk: "id" },
      { table: "logistica_controle", pk: "id" },
      { table: "seguranca_fits", pk: "id" },
      { table: "suprimentos_ordens", pk: "id" },
    ];

    for (const { table, pk } of tablesToClear) {
      const { error } = await db
        .from(table)
        .delete()
        .eq("centro_custo", centroCusto)
        .not(pk, "is", null);

      if (error) {
        console.error(`[/api/config/reset] Erro ao limpar tabela ${table}:`, error);
        throw new Error(`Falha ao limpar tabela ${table}: ${error.message}`);
      }
    }

    // Registra a ação em logs_auditoria
    await registrarLog(
      user.re,
      "CONFIG",
      `Projeto resetado - Dados operacionais do centro de custo ${centroCusto} foram limpos (colaboradores, logística, segurança, suprimentos)`,
    );

    return NextResponse.json({
      success: true,
      message: `Projeto resetado com sucesso para o centro de custo ${centroCusto}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[POST /api/config/reset]", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Acesso negado: requer privilégios de Administrador" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Erro ao resetar projeto: " + (error instanceof Error ? error.message : "Erro desconhecido") },
      { status: 500 },
    );
  }
}
