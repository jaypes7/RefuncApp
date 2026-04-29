import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

/**
 * GET /api/auth/restrito
 *
 * Retorna se o usuário logado possui acesso à área restrita.
 * Consulta a tabela isolada `acessos_restritos_permitidos` em tempo real.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ hasAccess: false }, { status: 401 });
    }

    const db = createServerClient();
    const { data } = await db
      .from("acessos_restritos_permitidos")
      .select("re")
      .eq("re", user.re)
      .single();

    return NextResponse.json({ hasAccess: !!data });
  } catch (error) {
    console.error("[GET /api/auth/restrito]", error);
    return NextResponse.json({ hasAccess: false }, { status: 500 });
  }
}
