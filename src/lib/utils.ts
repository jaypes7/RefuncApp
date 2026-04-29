import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Mascara um CPF para exibição, ocultando todos os dígitos exceto os 2 últimos.
 * Exemplo: "12345678901" → "***.***.***-01"
 */
export function maskCPF(cpf: string | number | null | undefined): string {
  if (!cpf) return ""
  const clean = String(cpf).replace(/\D/g, "")
  if (clean.length !== 11) return String(cpf)
  return `***.***.***-${clean.slice(9, 11)}`
}

/**
 * Remove tudo que não é dígito de um telefone.
 * Exemplo: "(11) 91234-5678" → "11912345678"
 */
export function sanitizeTelefone(telefone: string | null | undefined): string {
  if (!telefone) return ""
  return String(telefone).replace(/\D/g, "")
}

/**
 * Formata um telefone para exibição no padrão brasileiro.
 * Aceita com ou sem máscara. Retorna string vazia se inválido.
 * Exemplos:
 *   "11912345678" → "(11) 91234-5678"
 *   "1132345678"  → "(11) 3234-5678"
 *   "(11) 91234-5678" → "(11) 91234-5678"
 */
export function formatTelefone(telefone: string | null | undefined): string {
  if (!telefone) return ""
  const clean = String(telefone).replace(/\D/g, "")
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6, 10)}`
  }
  return String(telefone)
}
