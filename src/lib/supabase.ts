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

// ── Modo demonstração: sem Supabase ─────────────────────────────────────────
// Usa NEXT_PUBLIC_DEMO_MODE (e não DEMO_MODE) porque este módulo é importado
// tanto em Server Components/API Routes quanto em Client Components.
// Variáveis sem NEXT_PUBLIC_ são undefined no bundle do browser.

const DEMO_MODE =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
  process.env.DEMO_MODE === "true";

const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder-anon-key";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  (DEMO_MODE ? PLACEHOLDER_URL : "");

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  (DEMO_MODE ? PLACEHOLDER_KEY : "");

if (!DEMO_MODE && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    "[Supabase] NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY " +
      "devem estar definidas em .env.local",
  );
}

// ── Cliente universal (anon key / RLS ativo) ─────────────────────────────────

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
);

// ── Factory de cliente servidor (service role / sem RLS) ─────────────────────

export const createServerClient = (): SupabaseClient => {
  if (DEMO_MODE) {
    // Em modo demo nenhuma rota deve chegar aqui —
    // o bloco demo no topo de cada route.ts retorna antes.
    throw new Error(
      "[Demo] createServerClient chamado em DEMO_MODE. " +
        "A rota não implementou o bloco demo corretamente.",
    );
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "[Supabase] SUPABASE_SERVICE_ROLE_KEY não está definida. " +
        "Esta chave é obrigatória em API Routes.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
};

export default supabase;
