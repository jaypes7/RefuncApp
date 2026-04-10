/**
 * ============================================================================
 * API: POST /api/auth/reset-password
 * ============================================================================
 *
 * Permite ao usuário autenticado redefinir sua própria senha.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { hashPassword } from "@/lib/password";
import { z } from "zod";

const ResetPasswordSchema = z.object({
  novaSenha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { novaSenha } = ResetPasswordSchema.parse(body);

    const db = createServerClient();
    const { error } = await db
      .from("usuarios_permitidos")
      .update({
        senha_hash: await hashPassword(novaSenha),
        precisa_redefinir_senha: false,
      })
      .eq("re", user.re);

    if (error) {
      console.error("[API ResetPassword] Supabase error:", error.message);
      return NextResponse.json(
        { error: "Erro ao atualizar senha" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 },
      );
    }
    console.error("[API ResetPassword]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
