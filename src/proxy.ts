/**
 * ============================================================================
 * PROXY (Next.js 16) — PASSTHROUGH
 * ============================================================================
 *
 * Temporariamente desabilitado: retorna NextResponse.next() em todas as
 * requisições. Nenhuma rota é bloqueada.
 *
 * RBAC e validação de JWT serão reativados em fase futura.
 */

import { NextResponse } from "next/server";

export default function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
