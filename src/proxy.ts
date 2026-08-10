/**
 * ============================================================================
 * PROXY (Next.js 16) — Validação de JWT no edge
 * ============================================================================
 *
 * Valida o cookie JWT antes de servir qualquer página: usuário sem sessão é
 * redirecionado para /login (preservando a rota em ?redirect=) sem baixar o
 * JS do app. Rotas /api continuam validando via requireAuth (retornam 401
 * JSON em vez de redirect). O ProtectedRoute client-side vira segunda camada.
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "token";

// Rotas de página acessíveis sem sessão
const PUBLIC_PATHS = ["/login"];

const secret = process.env.JWT_SECRET;
const secretKey = secret ? new TextEncoder().encode(secret) : null;

async function temSessaoValida(req: NextRequest): Promise<boolean> {
  // Sem secret configurada não dá para validar — deixa passar e as rotas de
  // API (que exigem JWT_SECRET) barram o acesso.
  if (!secretKey) return true;

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;

  try {
    await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export default async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  const autenticado = await temSessaoValida(req);

  if (!autenticado && !isPublic) {
    const loginUrl = new URL("/login", req.url);
    // "/" já é um redirect para /login; não vale a pena preservar
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Quem já tem sessão não precisa ver o login de novo
  if (autenticado && pathname === "/login") {
    const redirect = req.nextUrl.searchParams.get("redirect");
    const destino =
      redirect && redirect.startsWith("/") && !redirect.startsWith("//")
        ? redirect
        : "/central";
    return NextResponse.redirect(new URL(destino, req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Páginas apenas: exclui /api, internos do Next (/_next inclui static, image
  // e o websocket do HMR) e arquivos estáticos (com extensão)
  matcher: ["/((?!api|_next|favicon\\.ico|.*\\..*).*)"],
};
