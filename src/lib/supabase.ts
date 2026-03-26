/**
 * ============================================================================
 * SUPABASE CLIENT
 * ============================================================================
 *
 * Dois clientes distintos para contextos diferentes:
 *
 *  1. `supabase`            → cliente universal (anon key).
 *                             Segue as regras de Row Level Security (RLS).
 *                             Seguro para usar em Client Components.
 *
 *  2. `createServerClient()` → factory que retorna um cliente com a
 *                              SERVICE ROLE KEY — contorna o RLS.
 *                              Use SOMENTE em API Routes e Server Actions.
 *                              NUNCA exponha a service-role key no browser.
 *
 * Variáveis de ambiente necessárias (preencher em .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL        → URL do projeto Supabase
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY   → chave pública (anon) do projeto
 *   SUPABASE_SERVICE_ROLE_KEY       → chave de serviço (server-side only)
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ── Validação em tempo de inicialização ──────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "[Supabase] NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY " +
      "devem estar definidas em .env.local",
  );
}

// ── Cliente universal (anon key / RLS ativo) ─────────────────────────────────

/**
 * Use este cliente em Client Components e em qualquer lugar onde as
 * regras de RLS devem ser respeitadas.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
);

// ── Factory de cliente servidor (service role / sem RLS) ─────────────────────

/**
 * Cria um novo cliente Supabase com a SERVICE ROLE KEY.
 *
 * Por segurança, é uma **factory** (não um singleton) para evitar que
 * credenciais de admin vázem entre requisições em ambientes serverless.
 *
 * @example
 * // Dentro de uma API Route (src/app/api/...)
 * const db = createServerClient();
 * const { data } = await db.from("colaboradores").select("*");
 */
export const createServerClient = (): SupabaseClient => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "[Supabase] SUPABASE_SERVICE_ROLE_KEY não está definida. " +
        "Esta chave é obrigatória em API Routes.",
    );
  }

  return createClient(supabaseUrl!, serviceRoleKey, {
    auth: {
      // Desabilita persistência de sessão no servidor — cada request é isolado
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
};

// ── Tipos de banco de dados (Database types) ─────────────────────────────────
// Quando o schema do Supabase estiver gerado via `supabase gen types`,
// importe o tipo Database e tipifique os clientes:
//
//   import { Database } from "@/types/supabase";
//   export const supabase = createClient<Database>(url, anonKey);
//
// Por ora, os clientes são não-tipados para não bloquear o desenvolvimento.

export default supabase;
