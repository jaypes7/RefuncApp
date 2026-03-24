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

    return NextResponse.json({
      user: {
        re: user.re,
        nome: user.nome || null,
        perfil: user.perfil || null,
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
