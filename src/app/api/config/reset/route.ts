/**
 * ============================================================================
 * API: /api/config/reset
 * ============================================================================
 *
 * POST /api/config/reset — Reseta o projeto deletando todos os dados
 * operacionais (mantém: etapas, usuarios_permitidos, logs_auditoria, configuracoes)
 *
 * Tabelas que serão limpas:
 *   - colaboradores
 *   - logistica_controle
 *   - seguranca_fits
 *   - suprimentos_ordens
 *   - configuracoes_hoteis
 *   - configuracoes_clinicas
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { registrarLog } from "@/lib/logs";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth("admin");

    const db = createServerClient();

    // Tabelas a serem limpas
    const tablesToClear = [
      "colaboradores",
      "logistica_controle",
      "seguranca_fits",
      "suprimentos_ordens",
      "configuracoes_hoteis",
      "configuracoes_clinicas",
    ];

    // Executa DELETE para cada tabela
    for (const table of tablesToClear) {
      const { error } = await db.from(table).delete().neq("id", "non-existent-value");

      if (error) {
        console.error(`[/api/config/reset] Erro ao limpar tabela ${table}:`, error);
        throw new Error(`Falha ao limpar tabela ${table}: ${error.message}`);
      }
    }

    // Registra a ação em logs_auditoria
    await registrarLog(
      user.re,
      "CONFIG",
      `Projeto resetado - Todas as tabelas operacionais foram limpas (colaboradores, logística, segurança, suprimentos, hotéis, clínicas)`,
    );

    return NextResponse.json({
      success: true,
      message: "Projeto resetado com sucesso",
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
