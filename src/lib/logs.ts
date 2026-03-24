/**
 * ============================================================================
 * SISTEMA DE LOGS - Registro de Auditoria
 * ============================================================================
 *
 * Funções para registrar todas as operações de escrita no sistema.
 * Toda ação (POST, PUT, DELETE) deve ser logada na aba "Logs".
 */

import { appendRow, SHEETS } from "./sheets";

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
  timestamp: string; // ISO string
  usuario: string; // RE do usuário
  acao: AcaoLog;
  detalhes: string;
  cpfColaborador?: string;
}

// ============================================================================
// FUNÇÕES DE LOG
// ============================================================================

/**
 * Registra uma ação na aba de Logs
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
  cpfColaborador?: string
): Promise<void> {
  // Usa fuso horário de São Paulo (UTC-3) para garantir horário correto nos logs
  const now = new Date();
  const timestamp = now.toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).replace(" ", "T") + "-03:00";

  try {
    await appendRow(SHEETS.LOGS, [
      timestamp,
      usuario,
      acao,
      detalhes,
      cpfColaborador || "",
    ]);
  } catch (error) {
    // Não deve quebrar a operação principal se o log falhar
    console.error("Erro ao registrar log:", error);
  }
}

/**
 * Registra log de login bem-sucedido
 */
export async function logLogin(usuario: string): Promise<void> {
  await registrarLog(usuario, "LOGIN", "Usuário realizou login no sistema");
}

/**
 * Registra log de logout
 */
export async function logLogout(usuario: string): Promise<void> {
  await registrarLog(usuario, "LOGOUT", "Usuário realizou logout");
}

/**
 * Registra criação de colaborador
 */
export async function logAdicionar(
  usuario: string,
  cpf: string,
  nome: string
): Promise<void> {
  await registrarLog(
    usuario,
    "ADICIONAR",
    `Colaborador cadastrado: ${nome}`,
    cpf
  );
}

/**
 * Registra edição de colaborador
 */
export async function logEditar(
  usuario: string,
  cpf: string,
  nome: string,
  camposAlterados: string[]
): Promise<void> {
  await registrarLog(
    usuario,
    "EDITAR",
    `Colaborador ${nome} - Campos alterados: ${camposAlterados.join(", ")}`,
    cpf
  );
}

/**
 * Registra remoção de colaborador
 */
export async function logRemover(
  usuario: string,
  cpf: string,
  nome: string
): Promise<void> {
  await registrarLog(
    usuario,
    "REMOVER",
    `Colaborador removido: ${nome}`,
    cpf
  );
}

/**
 * Registra importação em massa
 */
export async function logImportar(
  usuario: string,
  quantidade: number
): Promise<void> {
  await registrarLog(
    usuario,
    "IMPORTAR",
    `Importação de ${quantidade} colaboradores`
  );
}

/**
 * Registra importação com resumo de upsert (novo)
 */
export async function logImport(
  usuario: string,
  resumo: string,
  total: string
): Promise<void> {
  await registrarLog(
    usuario,
    "IMPORTAR",
    `Importação concluída: ${resumo} (total: ${total})`
  );
}

/**
 * Registra exportação
 */
export async function logExportar(usuario: string, tipo: string): Promise<void> {
  await registrarLog(usuario, "EXPORTAR", `Exportação ${tipo} realizada`);
}

/**
 * Registra exportação com detalhes
 */
export async function logExport(usuario: string, detalhes: string): Promise<void> {
  await registrarLog(usuario, "EXPORTAR", `Exportação realizada: ${detalhes}`);
}

/**
 * Registra alteração de configuração
 */
export async function logConfig(
  usuario: string,
  configuracao: string,
  valorAnterior?: string,
  valorNovo?: string
): Promise<void> {
  const detalhes = valorAnterior
    ? `Configuração ${configuracao} alterada de "${valorAnterior}" para "${valorNovo}"`
    : `Configuração ${configuracao} atualizada`;

  await registrarLog(usuario, "CONFIG", detalhes);
}
