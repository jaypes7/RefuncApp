/**
 * ============================================================================
 * API: POST /api/auth/logout
 * ============================================================================
 *
 * Remove o cookie de autenticação e registra log de logout.
 */

import { NextResponse } from "next/server";
import { clearAuthCookie, getCurrentUser } from "@/lib/auth";
import { logLogout } from "@/lib/logs";

// ============================================================================
// POST /api/auth/logout
// ============================================================================

export async function POST() {
  try {
    // Obtém usuário atual para log
    const user = await getCurrentUser();

    // Remove o cookie
    await clearAuthCookie();

    // Registra log se tiver usuário
    if (user?.re) {
      await logLogout(user.re);
    }

    return NextResponse.json({
      success: true,
      message: "Logout realizado com sucesso",
    });
  } catch (error) {
    console.error("Erro no logout:", error);

    // Mesmo com erro, tenta limpar o cookie
    try {
      await clearAuthCookie();
    } catch {
      // Ignora erro
    }

    return NextResponse.json(
      { error: "Erro ao realizar logout" },
      { status: 500 }
    );
  }
}
