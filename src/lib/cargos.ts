/**
 * ============================================================================
 * HELPERS DE CARGOS (Server-side)
 * ============================================================================
 *
 * Funções auxiliares para resolver grupos de cargos dinamicamente
 * a partir da tabela `configuracoes_cargos` no Supabase.
 *
 * Substitui o uso do arquivo legado `src/constants/cargos.ts` no backend.
 */

import { createServerClient } from "@/lib/supabase";

/**
 * Busca todos os cargos do banco e retorna um mapa de grupo -> array de cargos.
 * Cache em memória por requisição (não persiste entre requests).
 */
export async function getCargosAgrupados(): Promise<Record<string, string[]>> {
  const db = createServerClient();
  const { data, error } = await db
    .from("configuracoes_cargos")
    .select("nome, grupo")
    .order("nome", { ascending: true });

  if (error) {
    console.error("[getCargosAgrupados] Supabase error:", error.message);
    throw new Error("Falha ao buscar cargos do banco");
  }

  const map: Record<string, string[]> = {};
  for (const row of data ?? []) {
    if (row.grupo) {
      if (!map[row.grupo]) {
        map[row.grupo] = [];
      }
      map[row.grupo].push(row.nome);
    }
  }

  return map;
}

/**
 * Expande uma lista de cargos/grupos em todos os cargos individuais.
 * Se o item for um grupo, retorna todos os cargos do grupo.
 * Se não for grupo, retorna o próprio item.
 */
export async function expandirCargos(
  itens: string[],
): Promise<string[]> {
  const agrupados = await getCargosAgrupados();
  const resultado = new Set<string>();

  for (const item of itens) {
    const grupo = agrupados[item];
    if (grupo && grupo.length > 0) {
      grupo.forEach((c) => resultado.add(c));
    } else {
      resultado.add(item);
    }
  }

  return [...resultado];
}
