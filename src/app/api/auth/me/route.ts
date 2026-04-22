/**
 * ============================================================================
 * API: GET /api/auth/me
 * ============================================================================
 *
 * Retorna os dados do usuário atual baseado no cookie JWT.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // Busca flag atualizada no banco
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
        centro_custo: dbUser?.centro_custo ?? user.centro_custo ?? null,
        precisaRedefinirSenha: dbUser?.precisa_redefinir_senha ?? false,
      },
    });
  } catch (error) {
    console.error("[API Me] Erro:", error);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
