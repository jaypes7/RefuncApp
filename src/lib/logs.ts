/**
 * ============================================================================
 * SISTEMA DE LOGS - Registro de Auditoria
 * ============================================================================
 *
 * Persiste todas as operações de escrita na tabela `logs_auditoria` do Supabase.
 *
 * Estrutura esperada da tabela:
 *   id             uuid PRIMARY KEY DEFAULT gen_random_uuid()
 *   created_at     timestamptz DEFAULT now()
 *   usuario        text NOT NULL          -- RE do usuário
 *   acao           text NOT NULL          -- tipo da ação (LOGIN, EDITAR, …)
 *   detalhes       text                   -- descrição livre
 *   cpf_colaborador text                  -- CPF afetado (opcional)
 */

import { createServerClient } from "@/lib/supabase";

// ============================================================================
// TIPOS
// ============================================================================

export type AcaoLog =
  | "LOGIN"
  | "LOGOUT"
  | "ADICIONAR"
  | "EDITAR"
  | "REMOVER"
  | "IMPORTAR"
  | "EXPORTAR"
  | "CONFIG";

export interface LogEntry {
  timestamp: string;
  usuario: string;
  acao: AcaoLog;
  detalhes: string;
  cpfColaborador?: string;
}

// ============================================================================
// FUNÇÕES DE LOG
// ============================================================================

/**
 * Registra uma ação de auditoria.
 *
 * @param usuario - RE do usuário que executou a ação
 * @param acao - Tipo da ação
 * @param detalhes - Descrição detalhada
 * @param cpfColaborador - CPF do colaborador afetado (opcional)
 */
export async function registrarLog(
  usuario: string,
  acao: AcaoLog,
  detalhes: string,
  cpfColaborador?: string,
): Promise<void> {
  const now = new Date();
  const timestamp =
    now
      .toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" })
      .replace(" ", "T") + "-03:00";

  try {
    const db = createServerClient();
    const { error } = await db.from("logs_auditoria").insert({
      created_at:      timestamp,
      usuario,
      acao,
      detalhes,
      ...(cpfColaborador ? { cpf_colaborador: cpfColaborador } : {}),
    });
    if (error) {
      console.error("[logs] Falha ao persistir log:", error.message, { usuario, acao });
    }
  } catch (err) {
    // Nunca deixar o log quebrar o fluxo principal
    console.error("[logs] Exceção ao persistir log:", err);
  }
}

// ============================================================================
// ATALHOS SEMÂNTICOS
// ============================================================================

export async function logLogin(usuario: string): Promise<void> {
  await registrarLog(usuario, "LOGIN", "Usuário realizou login no sistema");
}

export async function logLogout(usuario: string): Promise<void> {
  await registrarLog(usuario, "LOGOUT", "Usuário realizou logout");
}

export async function logAdicionar(
  usuario: string,
  cpf: string,
  nome: string,
): Promise<void> {
  await registrarLog(
    usuario,
    "ADICIONAR",
    `Colaborador cadastrado: ${nome}`,
    cpf,
  );
}

export async function logEditar(
  usuario: string,
  cpf: string,
  nome: string,
  camposAlterados: string[],
): Promise<void> {
  await registrarLog(
    usuario,
    "EDITAR",
    `Colaborador ${nome} - Campos alterados: ${camposAlterados.join(", ")}`,
    cpf,
  );
}

export async function logRemover(
  usuario: string,
  cpf: string,
  nome: string,
): Promise<void> {
  await registrarLog(
    usuario,
    "REMOVER",
    `Colaborador removido: ${nome}`,
    cpf,
  );
}

export async function logImportar(
  usuario: string,
  quantidade: number,
): Promise<void> {
  await registrarLog(
    usuario,
    "IMPORTAR",
    `Importação de ${quantidade} colaboradores`,
  );
}

export async function logImport(
  usuario: string,
  resumo: string,
  total: string,
): Promise<void> {
  await registrarLog(
    usuario,
    "IMPORTAR",
    `Importação concluída: ${resumo} (total: ${total})`,
  );
}

export async function logExportar(
  usuario: string,
  tipo: string,
): Promise<void> {
  await registrarLog(usuario, "EXPORTAR", `Exportação ${tipo} realizada`);
}

export async function logExport(
  usuario: string,
  detalhes: string,
): Promise<void> {
  await registrarLog(usuario, "EXPORTAR", `Exportação realizada: ${detalhes}`);
}

export async function logConfig(
  usuario: string,
  configuracao: string,
  valorAnterior?: string,
  valorNovo?: string,
): Promise<void> {
  const detalhes = valorAnterior
    ? `Configuração ${configuracao} alterada de "${valorAnterior}" para "${valorNovo}"`
    : `Configuração ${configuracao} atualizada`;
  await registrarLog(usuario, "CONFIG", detalhes);
}
