/**
 * ============================================================================
 * API: GET /api/auth/me
 * ============================================================================
 *
 * Retorna os dados do usuário atual baseado no cookie JWT.
 */

import { NextResponse } from "next/server";
import { getCurrentUser, normalizeCentroCusto } from "@/lib/auth";

const DEMO_MODE = process.env.DEMO_MODE === "true";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // ── DEMO MODE: dados vêm do JWT (sem consulta ao banco) ─────────────────
    if (DEMO_MODE) {
      return NextResponse.json({
        user: {
          re: user.re,
          nome: user.nome || null,
          perfil: user.perfil || null,
          centro_custo: normalizeCentroCusto(user.centro_custo),
          precisaRedefinirSenha: false,
        },
      });
    }

    // ── PRODUÇÃO: busca flag atualizada no banco ─────────────────────────────
    const { createServerClient } = await import("@/lib/supabase");
    const db = createServerClient();
    const { data: dbUser } = await db
      .from("usuarios_permitidos")
      .select("precisa_redefinir_senha, centro_custo")
      .eq("re", user.re)
      .single();

    return NextResponse.json({
      user: {
        re: user.re,
        nome: user.nome || null,
        perfil: user.perfil || null,
        centro_custo: normalizeCentroCusto(dbUser?.centro_custo ?? user.centro_custo),
        precisaRedefinirSenha: dbUser?.precisa_redefinir_senha ?? false,
      },
    });
  } catch (error) {
    console.error("[API Me] Erro:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
