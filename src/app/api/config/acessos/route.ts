/**
 * ============================================================================
 * API: /api/config/acessos
 * ============================================================================
 *
 * CRUD de usuários autorizados na tabela `usuarios_permitidos`.
 * Campo `re` é UNIQUE — usado como chave de lookup e conflito no upsert.
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAuth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { UsuariosPermitidosCreateSchema } from "@/lib/schemas";
import { hashPassword, DEFAULT_PASSWORD } from "@/lib/password";

// GET /api/config/acessos — lista todos os usuários autorizados
export async function GET() {
  try {
    await requireAuth();
    const db = createServerClient();
    const { data, error } = await db
      .from("usuarios_permitidos")
      .select("id, re, nome, perfil, centro_custo, autorizado_em, precisa_redefinir_senha")
      .order("nome", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[/api/config/acessos GET]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST /api/config/acessos — cria ou atualiza um usuário (upsert por re)
export async function POST(request: NextRequest) {
  try {
    // 1. AUTENTICAÇÃO + AUTORIZAÇÃO: apenas admins
    const user = await requireAuth("admin");

    // 2. SANITIZAÇÃO (Zod): lê e limpa o body
    const body = await request.json();
    const payload = UsuariosPermitidosCreateSchema.parse(body);

    // 3. PERSISTÊNCIA: Banco de Dados (sempre com senha padrão e flag de redefinição)
    const db = createServerClient();
    const { data, error } = await db
      .from("usuarios_permitidos")
      .upsert(
        {
          ...payload,
          senha_hash: await hashPassword(DEFAULT_PASSWORD),
          precisa_redefinir_senha: true,
        },
        { onConflict: "re" },
      )
      .select("id, re, nome, perfil, centro_custo, autorizado_em, precisa_redefinir_senha")
      .single();

    if (error) throw error;

    // Suprime aviso de variável não utilizada (user é capturado para auditoria futura)
    void user;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Acesso negado: requer privilégios de Administrador" },
        { status: 403 },
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 },
      );
    }
    console.error("[/api/config/acessos POST]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PATCH /api/config/acessos?id=UUID — atualiza um usuário pelo ID
// Também suporta ?id=UUID&resetPassword=true para resetar a senha ao padrão
export async function PATCH(request: NextRequest) {
  try {
    await requireAuth("admin");

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });
    }

    const isResetPassword =
      request.nextUrl.searchParams.get("resetPassword") === "true";

    const db = createServerClient();

    if (isResetPassword) {
      const { data, error } = await db
        .from("usuarios_permitidos")
        .update({
          senha_hash: await hashPassword(DEFAULT_PASSWORD),
          precisa_redefinir_senha: true,
        })
        .eq("id", id)
        .select("id, re, nome, perfil, centro_custo, autorizado_em, precisa_redefinir_senha")
        .single();

      if (error) {
        console.error(
          "[/api/config/acessos PATCH] Supabase error:",
          error.message,
        );
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    }

    const body = await request.json();
    const payload = UsuariosPermitidosCreateSchema.parse(body);

    const { data, error } = await db
      .from("usuarios_permitidos")
      .update(payload)
      .eq("id", id)
      .select("id, re, nome, perfil, centro_custo, autorizado_em, precisa_redefinir_senha")
      .single();

    if (error) {
      console.error(
        "[/api/config/acessos PATCH] Supabase error:",
        error.message,
      );
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Acesso negado: requer privilégios de Administrador" },
        { status: 403 },
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 },
      );
    }
    console.error("[/api/config/acessos PATCH]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/config/acessos?id=UUID — remove um usuário pelo ID
export async function DELETE(request: NextRequest) {
  try {
    await requireAuth("admin");

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });
    }

    const db = createServerClient();
    const { error } = await db.from("usuarios_permitidos").delete().eq("id", id);

    if (error) {
      console.error(
        "[/api/config/acessos DELETE] Supabase error:",
        error.message,
      );
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Acesso negado: requer privilégios de Administrador" },
        { status: 403 },
      );
    }
    console.error("[/api/config/acessos DELETE]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
