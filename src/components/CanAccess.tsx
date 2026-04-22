/**
 * ============================================================================
 * CanAccess — Wrapper de controle de acesso baseado em roles (Frontend)
 * ============================================================================
 *
 * Renderiza `children` apenas quando o perfil do usuário autenticado atende
 * ao nível mínimo exigido pela prop `role`.
 *
 * Hierarquia de níveis (espelha src/lib/auth.ts):
 *   admin: 3  >  user: 2  >  guest: 1
 *
 * Comportamento seguro:
 *   • Enquanto o contexto de auth ainda estiver carregando → retorna null
 *   • Se não houver sessão → retorna null
 *   • Se o nível do usuário for inferior ao exigido → retorna null
 *
 * Uso:
 *   <CanAccess role="admin">
 *     <BotaoExcluir />
 *   </CanAccess>
 */

"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";

// ── Tipos ────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "user" | "guest";

/** Espelha exatamente a hierarquia definida no back-end (src/lib/auth.ts). */
const ROLE_LEVEL: Record<UserRole, number> = {
  guest: 1,
  user:  2,
  admin: 3,
};

interface CanAccessProps {
  /** Nível mínimo de acesso necessário para renderizar os filhos. */
  role: UserRole;
  children: React.ReactNode;
}

// ── Componente ───────────────────────────────────────────────────────────────

export function CanAccess({ role, children }: CanAccessProps) {
  const { user, isLoading } = useAuth();

  // Enquanto auth ainda está resolvendo, não renderiza nada para evitar flash.
  if (isLoading || !user) return null;

  const userLevel     = ROLE_LEVEL[(user.perfil as UserRole) ?? "guest"] ?? ROLE_LEVEL.guest;
  const requiredLevel = ROLE_LEVEL[role];

  if (userLevel < requiredLevel) return null;

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{children}</>;
}
