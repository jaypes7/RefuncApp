/**
 * ============================================================================
 * PASSWORD HELPERS
 * ============================================================================
 *
 * Utilitários para hash e comparação de senhas usando bcryptjs.
 */

import bcrypt from "bcryptjs";
import { randomInt } from "crypto";

const SALT_ROUNDS = 12;

// Hash válido (custo 12) usado apenas para uniformizar o tempo de resposta
// quando o usuário não existe — nenhuma senha real corresponde a ele.
const DUMMY_HASH = "$2b$12$jsbWNSzIDwTRxbQ44nb2GuD.F8tOwtaBvmS/kR5STE0OQ/kt.JO9G";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Executa uma comparação bcrypt contra um hash fixo e descarta o resultado.
 * Usado para manter o tempo de resposta constante quando o RE não existe
 * (mitigação de enumeração de usuários por timing).
 */
export async function dummyCompare(password: string): Promise<void> {
  await bcrypt.compare(password, DUMMY_HASH);
}

/**
 * Gera uma senha temporária aleatória (10 caracteres alfanuméricos, sem
 * caracteres ambíguos). Deve ser exibida uma única vez ao administrador e
 * entregue ao usuário fora de banda, junto com a flag de redefinição.
 */
export function generateTemporaryPassword(length = 10): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[randomInt(alphabet.length)];
  }
  return out;
}
