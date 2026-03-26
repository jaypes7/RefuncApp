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

// GET /api/config/acessos — lista todos os usuários autorizados
export async function GET() {
  try {
    await requireAuth();
    const db = createServerClient();
    const { data, error } = await db
      .from("usuarios_permitidos")
      .select("id, re, nome, perfil, autorizado_em")
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
    // 1. AUTENTICAÇÃO: Pega os dados do usuário logado
    const user = await requireAuth();

    // 2. AUTORIZAÇÃO (RBAC): Apenas 'admin' passa. Fail Fast!
    if (user.perfil !== 'admin') {
      return NextResponse.json(
        { error: "Acesso negado: Requer privilégios de Administrador" }, 
        { status: 403 }
      );
    }

    // 3. SANITIZAÇÃO (Zod): Agora sim lemos e limpamos o body
    const body = await request.json();
    const payload = UsuariosPermitidosCreateSchema.parse(body);

    // 4. PERSISTÊNCIA: Banco de Dados
    const db = createServerClient();
    const { data, error } = await db
      .from("usuarios_permitidos")
      .upsert(payload, { onConflict: "re" })
      .select("id, re, nome, perfil, autorizado_em")
      .single();

    if (error) throw error;
    
    return NextResponse.json(data, { status: 201 });
    
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    }
    console.error("[/api/config/acessos POST]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/config/acessos?id=UUID — remove um usuário pelo ID
export async function DELETE(request: NextRequest) {
  try {
    await requireAuth();

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });
    }

    const db = createServerClient();
    const { error } = await db
      .from("usuarios_permitidos")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[/api/config/acessos DELETE] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[/api/config/acessos DELETE]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
