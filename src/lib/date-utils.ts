/**
 * ============================================================================
 * DATE UTILS - Utilitários de data para o cronograma de RH
 * ============================================================================
 *
 * Este módulo contém funções para manipulação de datas com foco em
 * cálculos de dias úteis (excluindo sábados e domingos).
 *
 * Nota: date-fns não está disponível neste projeto.
 * Todas as operações usam Date nativo do JavaScript.
 */

// ============================================================================
// TIPOS
// ============================================================================

/** Retorno padronizado de cálculo de dias úteis */
export interface WorkingDaysResult {
  /** Total de dias úteis (seg–sex) no intervalo */
  workingDays: number;
  /** Total de dias corridos (calendário) no intervalo */
  calendarDays: number;
  /** Dias de final de semana descartados */
  weekendDays: number;
}

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

/**
 * Normaliza um argumento de data para um objeto Date com o horário zerado
 * (meia-noite local), eliminando qualquer influência de horário ou fuso
 * que poderia causar erros de "off-by-one".
 *
 * Estratégia:
 *   - Se receber string ISO "YYYY-MM-DD", fatia apenas a parte da data e
 *     usa o construtor com (ano, mês, dia) — isso cria a data no fuso
 *     local, evitando o UTC-shift que `new Date("YYYY-MM-DD")` aplica.
 *   - Se receber um objeto Date, cria uma cópia com horário zerado.
 */
function toMidnightLocal(input: string | Date): Date {
  if (input instanceof Date) {
    // Cria cópia para não mutar o objeto original
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }

  // Fatia apenas a parte da data (ignora "T..." em strings ISO completas)
  const datePart = input.split("T")[0];
  const [year, month, day] = datePart.split("-").map(Number);

  // Mês é 0-indexed no construtor do Date
  return new Date(year, month - 1, day);
}

/**
 * Retorna true se o dia da semana for sábado (6) ou domingo (0).
 */
function isWeekend(date: Date): boolean {
  const dow = date.getDay(); // 0 = domingo, 6 = sábado
  return dow === 0 || dow === 6;
}

// ============================================================================
// FUNÇÃO PRINCIPAL: calculateWorkingDays
// ============================================================================

/**
 * Calcula a quantidade de dias úteis entre duas datas (inclusive em ambas
 * as pontas), excluindo sábados e domingos.
 *
 * Matemática dos dias úteis:
 *   1. Normaliza as datas para meia-noite local (elimina drift de fuso).
 *   2. Garante que startDate ≤ endDate (swap automático se necessário).
 *   3. Itera cada dia do intervalo e conta apenas os dias de semana (seg–sex).
 *   4. A iteração é feita somando 86400000 ms (1 dia) ao timestamp para
 *      manter a complexidade O(n) e evitar armadilhas de DST.
 *
 * Por que não usar diferença simples de timestamps?
 *   `(endDate - startDate) / MS_PER_DAY` retorna dias corridos. Para dias
 *   úteis não há fórmula fechada trivial — a iteração é a abordagem mais
 *   legível e correta para projetos típicos (< alguns anos de duração).
 *
 * @param startDate - Data de início (string "YYYY-MM-DD" ou objeto Date)
 * @param endDate   - Data de fim   (string "YYYY-MM-DD" ou objeto Date)
 * @returns Número de dias úteis (seg–sex) no intervalo [startDate, endDate]
 *
 * @example
 * // Segunda a próxima sexta → 5 dias úteis
 * calculateWorkingDays("2024-01-08", "2024-01-12") // => 5
 *
 * // Inclui um fim de semana → 6 dias úteis (seg–sáb conta 5 + próx seg)
 * calculateWorkingDays("2024-01-08", "2024-01-15") // => 6
 */
export function calculateWorkingDays(
  startDate: string | Date,
  endDate: string | Date
): number {
  // Normalizar ambas as datas para meia-noite local
  let start = toMidnightLocal(startDate);
  let end = toMidnightLocal(endDate);

  // Garantir ordem cronológica (swap se invertido)
  if (start.getTime() > end.getTime()) {
    [start, end] = [end, start];
  }

  let workingDays = 0;

  // Usar timestamp numérico para iteração — mais performático e imune a DST
  const MS_PER_DAY = 86_400_000; // 24 * 60 * 60 * 1000
  let current = start.getTime();
  const endTime = end.getTime();

  while (current <= endTime) {
    const currentDate = new Date(current);
    if (!isWeekend(currentDate)) {
      workingDays++;
    }
    current += MS_PER_DAY;
  }

  return workingDays;
}

/**
 * Versão detalhada que também retorna dias corridos e dias de fim de semana.
 *
 * @param startDate - Data de início
 * @param endDate   - Data de fim
 * @returns `WorkingDaysResult` com breakdown completo
 */
export function calculateWorkingDaysDetailed(
  startDate: string | Date,
  endDate: string | Date
): WorkingDaysResult {
  let start = toMidnightLocal(startDate);
  let end = toMidnightLocal(endDate);

  if (start.getTime() > end.getTime()) {
    [start, end] = [end, start];
  }

  const MS_PER_DAY = 86_400_000;

  // Dias corridos: diferença de timestamps + 1 (inclusivo nas duas pontas)
  const calendarDays =
    Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;

  let workingDays = 0;
  let current = start.getTime();
  const endTime = end.getTime();

  while (current <= endTime) {
    if (!isWeekend(new Date(current))) {
      workingDays++;
    }
    current += MS_PER_DAY;
  }

  return {
    workingDays,
    calendarDays,
    weekendDays: calendarDays - workingDays,
  };
}

/**
 * Adiciona N dias úteis a uma data de início, retornando a data resultante.
 *
 * Útil para calcular a data de término de uma etapa dado o início e a
 * duração em dias úteis.
 *
 * @param startDate    - Data de partida
 * @param workingDays  - Quantidade de dias úteis a avançar (≥ 0)
 * @returns Nova data (sem alterar o objeto original)
 *
 * @example
 * addWorkingDays("2024-01-08", 5) // => Date(2024-01-12) — seg + 5 dias úteis
 */
export function addWorkingDays(
  startDate: string | Date,
  workingDays: number
): Date {
  if (workingDays < 0) {
    throw new RangeError("workingDays deve ser um valor não-negativo.");
  }

  const MS_PER_DAY = 86_400_000;
  let current = toMidnightLocal(startDate).getTime();
  let daysAdded = 0;

  // O dia de início conta como dia 1 se for útil
  while (daysAdded < workingDays) {
    current += MS_PER_DAY;
    if (!isWeekend(new Date(current))) {
      daysAdded++;
    }
  }

  return new Date(current);
}

/**
 * Formata um objeto Date para string no padrão "YYYY-MM-DD" (ISO 8601).
 * Usa getFullYear/getMonth/getDate para respeitar o fuso local.
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formata um objeto Date para string no padrão "DD/MM/YYYY" (pt-BR).
 */
export function formatDateBR(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${day}/${month}/${year}`;
}
