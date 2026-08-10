/**
 * ============================================================================
 * TENANT — Autorização por centro de custo em rotas por ID
 * ============================================================================
 *
 * Helpers para validar que o recurso acessado pertence a um centro de custo
 * autorizado do usuário (mitigação de IDOR cross-tenant — SEG-02).
 */

import { createServerClient } from "@/lib/supabase";
import { isCentroCustoAutorizado, type JWTPayload } from "@/lib/auth";

type Supabase = ReturnType<typeof createServerClient>;

export interface ColaboradorRef {
  id: string;
  cpf: string | null;
  nome: string | null;
  centro_custo: string | null;
}

/**
 * Busca o colaborador e valida se pertence aos centros de custo do usuário.
 * Retorna null tanto para inexistente quanto para não autorizado (404 em
 * ambos os casos, para não vazar a existência do registro).
 */
export async function findColaboradorAutorizado(
  supabase: Supabase,
  user: JWTPayload,
  colaboradorId: string,
): Promise<ColaboradorRef | null> {
  const { data } = await supabase
    .from("colaboradores")
    .select("id, cpf, nome, centro_custo")
    .eq("id", colaboradorId)
    .single();

  if (!data || !isCentroCustoAutorizado(user, data.centro_custo)) {
    return null;
  }

  return data as ColaboradorRef;
}
