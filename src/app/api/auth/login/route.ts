/**
 * ============================================================================
 * API: POST /api/auth/login
 * ============================================================================
 *
 * Autentica um usuário buscando o RE na tabela `usuarios_permitidos` do Supabase.
 * Retorna 401 se o RE não estiver cadastrado.
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { LoginSchema } from "@/lib/schemas";
import { createServerClient } from "@/lib/supabase";
import { generateToken, setAuthCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.JWT_SECRET) {
      console.error("[API Login] JWT_SECRET não configurado");
      return NextResponse.json(
        { error: "Erro de configuração do servidor" },
        { status: 500 },
      );
    }

    const body = await request.json();
    const { re } = LoginSchema.parse(body);

    const db = createServerClient();
    const { data: usuario, error } = await db
      .from("usuarios_permitidos")
      .select("re, nome, perfil")
      .eq("re", re)
      .single();

    if (error || !usuario) {
      return NextResponse.json(
        { error: "Acesso não autorizado" },
        { status: 401 },
      );
    }

    const token = await generateToken({
      re: usuario.re,
      nome: usuario.nome ?? undefined,
      perfil: usuario.perfil ?? undefined,
    });

    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        re: usuario.re,
        nome: usuario.nome ?? null,
        perfil: usuario.perfil ?? null,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 },
      );
    }

    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[API Login]", msg);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
