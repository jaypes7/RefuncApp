/**
 * ============================================================================
 * AUTENTICAÇÃO JWT - Gerenciamento de Tokens
 * ============================================================================
 *
 * Funções para geração e validação de tokens JWT usando jose.
 * O token é armazenado em cookie httpOnly para segurança.
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "token";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 horas

if (!JWT_SECRET) {
  throw new Error("Variável de ambiente JWT_SECRET é obrigatória");
}

// Converte a secret para Uint8Array (requerido pelo jose)
const secretKey = new TextEncoder().encode(JWT_SECRET);

// ============================================================================
// TIPOS
// ============================================================================

export interface JWTPayload {
  re: string;
  nome?: string;
  perfil?: string;
  iat?: number;
  exp?: number;
}

// ============================================================================
// GERAÇÃO DE TOKEN
// ============================================================================

/**
 * Gera um token JWT assinado
 *
 * @param payload - Dados a serem incluídos no token
 * @returns Token JWT string
 */
export async function generateToken(payload: Omit<JWTPayload, "iat" | "exp">): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secretKey);

  return token;
}

// ============================================================================
// VALIDAÇÃO DE TOKEN
// ============================================================================

/**
 * Verifica e decodifica um token JWT
 *
 * @param token - Token JWT a ser verificado
 * @returns Payload decodificado ou null se inválido
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    return payload as unknown as JWTPayload;
  } catch (error) {
    console.error("Erro ao verificar token:", error);
    return null;
  }
}

// ============================================================================
// COOKIES
// ============================================================================

/**
 * Define o cookie de autenticação com o token JWT
 *
 * @param token - Token JWT
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

/**
 * Remove o cookie de autenticação (logout)
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Obtém o token do cookie
 *
 * @returns Token JWT ou null
 */
export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME);
  return token?.value || null;
}

/**
 * Verifica se o usuário está autenticado e retorna o payload
 *
 * @returns Payload do JWT ou null se não autenticado
 */
export async function getCurrentUser(): Promise<JWTPayload | null> {
  const token = await getAuthToken();
  if (!token) return null;

  return verifyToken(token);
}

/**
 * Middleware de autenticação para rotas de API
 * Retorna o usuário autenticado ou lança erro
 */
export async function requireAuth(): Promise<JWTPayload> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}
