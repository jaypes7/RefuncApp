/**
 * ============================================================================
 * PASSWORD HELPERS
 * ============================================================================
 *
 * Utilitários para hash e comparação de senhas usando bcryptjs.
 */

import bcrypt from "bcryptjs";

export const DEFAULT_PASSWORD = "manserv@2026";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
