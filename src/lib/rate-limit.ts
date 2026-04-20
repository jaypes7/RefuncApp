/**
 * ============================================================================
 * RATE LIMITING — @vercel/firewall SDK
 * ============================================================================
 *
 * Este módulo encapsula o SDK experimental `@vercel/firewall` para aplicar
 * rate limits programaticamente nas API Routes.
 *
 * Requer 1 regra no Vercel Dashboard com condição `@vercel/firewall` e o
 * Rate limit ID configurado em RATE_LIMIT_ID.
 *
 * Em ambiente de desenvolvimento (localhost) o SDK não funciona — o helper
 * retorna `rateLimited: false` automaticamente para não bloquear o dev.
 */

import { NextRequest, NextResponse } from "next/server";
import { unstable_checkRateLimit as vercelCheckRateLimit } from "@vercel/firewall";

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const RATE_LIMIT_ID = "refunc-api-gateway";

const IS_DEV = process.env.NODE_ENV !== "production";

export type RateLimitConfigKey =
  | "auth-login"
  | "auth-reset-pass"
  | "api-general-read"
  | "api-general-write";

interface RateLimitConfig {
  /** Identificador descritivo para logs */
  label: string;
  /** Janela de tempo em segundos (apenas para referência/documentação) */
  window: number;
  /** Limite de requests (apenas para referência/documentação) */
  limit: number;
}

const RATE_LIMIT_CONFIG: Record<RateLimitConfigKey, RateLimitConfig> = {
  "auth-login": {
    label: "Auth / Login",
    window: 60,
    limit: 10,
  },
  "auth-reset-pass": {
    label: "Auth / Reset Password",
    window: 60,
    limit: 5,
  },
  "api-general-read": {
    label: "API Geral / Leitura",
    window: 60,
    limit: 100,
  },
  "api-general-write": {
    label: "API Geral / Escrita",
    window: 60,
    limit: 30,
  },
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extrai o IP do cliente a partir do objeto NextRequest.
 * Tenta `x-forwarded-for` primeiro, depois `x-real-ip`, e por último
 * o `ip` interno do NextRequest (quando disponível).
 */
function getClientIP(request: NextRequest): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  // NextRequest pode ter `ip` em runtime Vercel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (request as any).ip || undefined;
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

export interface RateLimitResult {
  rateLimited: boolean;
  error?: "not-found" | "blocked";
}

/**
 * Verifica se a requisição está dentro do rate limit configurado.
 *
 * @param request    — NextRequest da API Route
 * @param configKey  — Chave da configuração (ex: 'auth-login')
 * @returns Objeto indicando se foi rate-limited
 */
export async function checkRateLimit(
  request: NextRequest,
  configKey: RateLimitConfigKey,
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIG[configKey];

  // Fallback em desenvolvimento: o SDK @vercel/firewall não funciona fora da
  // infraestrutura Vercel (localhost). Apenas logamos e deixamos passar.
  if (IS_DEV) {
    console.log(
      `[RateLimit][DEV] Skipped check for "${configKey}" (${config.label})`,
    );
    return { rateLimited: false };
  }

  try {
    const result = await vercelCheckRateLimit(RATE_LIMIT_ID, { request });

    if (result.rateLimited) {
      const ip = getClientIP(request);
      console.warn(
        `[RateLimit] Bloqueado: config="${configKey}" label="${config.label}" ip="${ip ?? "unknown"}"`,
      );
    }

    return result;
  } catch (err) {
    // Se o SDK falhar (ex: regra não encontrada no dashboard), não quebramos
    // a aplicação — logamos o erro e deixamos a request passar.
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[RateLimit] Erro ao verificar rate limit (${configKey}):`, msg);
    return { rateLimited: false };
  }
}

/**
 * Retorna uma resposta padronizada HTTP 429 (Too Many Requests).
 *
 * @param configKey — Chave da configuração para incluir na mensagem
 */
export function rateLimitResponse(configKey: RateLimitConfigKey): NextResponse {
  const config = RATE_LIMIT_CONFIG[configKey];
  return NextResponse.json(
    {
      error: "Muitas requisições. Tente novamente mais tarde.",
      retryAfter: config.window,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(config.window),
      },
    },
  );
}
