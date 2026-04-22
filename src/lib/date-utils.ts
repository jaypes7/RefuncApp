/**
 * ============================================================================
 * DATE UTILS - Utilitários de data para o cronograma de RH
 * ============================================================================
 *
 * Este módulo contém funções para manipulação de datas com foco em
 * cálculos de dias úteis (excluindo sábados, domingos e feriados nacionais
 * brasileiros calculados dinamicamente — sem necessidade de banco de dados).
 *
 * Nota: date-fns não está disponível neste projeto.
 * Todas as operações usam Date nativo do JavaScript.
 */

// ============================================================================
// TIPOS
// ============================================================================

/** Retorno padronizado de cálculo de dias úteis */
export interface WorkingDaysResult {
  /** Total de dias úteis (seg–sex, excluindo feriados) no intervalo */
  workingDays: number;
  /** Total de dias corridos (calendário) no intervalo */
  calendarDays: number;
  /** Dias não úteis (fins de semana + feriados) */
  weekendDays: number;
}

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

/**
 * Normaliza um argumento de data para um objeto Date com o horário zerado
 * (meia-noite local), eliminando qualquer influência de horário ou fuso
 * que poderia causar erros de "off-by-one".
 */
function toMidnightLocal(input: string | Date): Date {
  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }

  const datePart = input.split("T")[0];
  const [year, month, day] = datePart.split("-").map(Number);

  return new Date(year, month - 1, day);
}

/**
 * Retorna true se o dia da semana for sábado (6) ou domingo (0).
 */
function isWeekend(date: Date): boolean {
  const dow = date.getDay();
  return dow === 0 || dow === 6;
}

/**
 * Calcula a data da Páscoa para um determinado ano usando o algoritmo de
 * Butcher/Meeus — referência canônica para feriados móveis brasileiros.
 */
function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  // Constrói data em fuso local (meia-noite)
  return new Date(year, month - 1, day);
}

// ============================================================================
// FERIADOS NACIONAIS
// ============================================================================

/**
 * Retorna os feriados nacionais brasileiros para o ano informado.
 *
 * Feriados fixos:
 *   01/01 — Confraternização Universal
 *   21/04 — Tiradentes
 *   01/05 — Dia do Trabalho
 *   07/09 — Independência do Brasil
 *   12/10 — Nossa Sra. Aparecida
 *   02/11 — Finados
 *   15/11 — Proclamação da República
 *   25/12 — Natal
 *
 * Feriados móveis (baseados na Páscoa):
 *   Carnaval (terça-feira)  — Páscoa − 47 dias
 *   Sexta-Feira Santa       — Páscoa − 2 dias
 *   Páscoa                  — algoritmo de Butcher
 *   Corpus Christi          — Páscoa + 60 dias
 *
 * @returns Array de strings "YYYY-MM-DD"
 */
export function getNationalHolidays(year: number): string[] {
  const fixed: string[] = [
    `${year}-01-01`,
    `${year}-04-21`,
    `${year}-05-01`,
    `${year}-09-07`,
    `${year}-10-12`,
    `${year}-11-02`,
    `${year}-11-15`,
    `${year}-12-25`,
  ];

  const easter = calculateEaster(year);

  const goodFriday = new Date(easter);
  goodFriday.setDate(goodFriday.getDate() - 2);

  const corpusChristi = new Date(easter);
  corpusChristi.setDate(corpusChristi.getDate() + 60);

  const carnival = new Date(easter);
  carnival.setDate(carnival.getDate() - 47);

  return [
    ...fixed,
    formatDateISO(easter),
    formatDateISO(goodFriday),
    formatDateISO(corpusChristi),
    formatDateISO(carnival),
  ];
}

/**
 * Constrói um Set de timestamps (ms) com todos os feriados nacionais
 * que caem dentro do intervalo [start, end], cobrindo todos os anos
 * entre as duas datas. Feriados extras opcionais (regionais/manuais)
 * são incluídos também.
 */
function buildHolidaySet(
  start: Date,
  end: Date,
  extra: (string | Date)[] = [],
): Set<number> {
  const all: string[] = [...extra.map((h) =>
    h instanceof Date ? formatDateISO(h) : String(h)
  )];

  // Inclui feriados nacionais brasileiros para todos os anos do intervalo
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  for (let year = startYear; year <= endYear; year++) {
    const nationals = getNationalHolidays(year);
    for (const h of nationals) {
      const hDate = toMidnightLocal(h);
      if (hDate.getTime() >= start.getTime() && hDate.getTime() <= end.getTime()) {
        all.push(h);
      }
    }
  }

  return new Set<number>(
    all.map((h) => toMidnightLocal(h).getTime()),
  );
}

// ============================================================================
// FUNÇÃO PRINCIPAL: calculateWorkingDays
// ============================================================================

/**
 * Calcula a quantidade de dias úteis entre duas datas (inclusive em ambas
 * as pontas), excluindo sábados, domingos e feriados nacionais brasileiros.
 *
 * Os feriados nacionais são calculados automaticamente via
 * `getNationalHolidays` — não é necessário banco de dados.
 * O parâmetro `holidays` é **aditivo**: permite incluir feriados extras
 * específicos do projeto (paralisações programadas, etc.).
 *
 * @param startDate - Data de início (string "YYYY-MM-DD" ou objeto Date)
 * @param endDate   - Data de fim   (string "YYYY-MM-DD" ou objeto Date)
 * @param holidays  - Feriados extras opcionais além dos nacionais
 * @returns Número de dias úteis no intervalo [startDate, endDate]
 *
 * @example
 * // Segunda a próxima sexta, sem feriado → 5 dias úteis
 * calculateWorkingDays("2024-01-08", "2024-01-12") // => 5
 *
 * // Semana do Carnaval (terça é feriado) → 4 dias úteis
 * calculateWorkingDays("2025-03-03", "2025-03-07") // => 4
 */
export function calculateWorkingDays(
  startDate: string | Date,
  endDate: string | Date,
  holidays?: (string | Date)[],
): number {
  let start = toMidnightLocal(startDate);
  let end   = toMidnightLocal(endDate);

  if (start.getTime() > end.getTime()) {
    [start, end] = [end, start];
  }

  const holidaySet = buildHolidaySet(start, end, holidays);

  let workingDays = 0;
  const MS_PER_DAY = 86_400_000;
  let current  = start.getTime();
  const endTime = end.getTime();

  while (current <= endTime) {
    const d = new Date(current);
    if (!isWeekend(d) && !holidaySet.has(current)) {
      workingDays++;
    }
    current += MS_PER_DAY;
  }

  return workingDays;
}

/**
 * Versão detalhada que retorna dias corridos, dias úteis e dias não úteis.
 * Feriados nacionais são excluídos automaticamente dos dias úteis.
 *
 * @param startDate - Data de início
 * @param endDate   - Data de fim
 * @returns `WorkingDaysResult` com breakdown completo
 */
export function calculateWorkingDaysDetailed(
  startDate: string | Date,
  endDate: string | Date,
): WorkingDaysResult {
  let start = toMidnightLocal(startDate);
  let end   = toMidnightLocal(endDate);

  if (start.getTime() > end.getTime()) {
    [start, end] = [end, start];
  }

  const MS_PER_DAY = 86_400_000;

  const calendarDays =
    Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;

  const holidaySet = buildHolidaySet(start, end);

  let workingDays = 0;
  let current  = start.getTime();
  const endTime = end.getTime();

  while (current <= endTime) {
    const d = new Date(current);
    if (!isWeekend(d) && !holidaySet.has(current)) {
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
 * Sábados, domingos e feriados nacionais brasileiros são automaticamente
 * pulados — não contam como dias úteis.
 *
 * @param startDate   - Data de partida
 * @param workingDays - Quantidade de dias úteis a avançar (≥ 0)
 * @param holidays    - Feriados extras opcionais além dos nacionais
 * @returns Nova data (sem alterar o objeto original)
 *
 * @example
 * addWorkingDays("2024-01-08", 5) // => Date(2024-01-12) — seg + 5 dias úteis
 */
export function addWorkingDays(
  startDate: string | Date,
  workingDays: number,
  holidays?: (string | Date)[],
): Date {
  if (workingDays < 0) {
    throw new RangeError("workingDays deve ser um valor não-negativo.");
  }

  const MS_PER_DAY = 86_400_000;
  let current   = toMidnightLocal(startDate).getTime();
  let daysAdded = 0;

  // Pré-calcula feriados para um horizonte de 2 anos a partir do início
  // (suficiente para qualquer etapa de projeto típico)
  const startYear = new Date(current).getFullYear();
  const tempHolidaySet = buildHolidaySet(
    new Date(current),
    new Date(startYear + 2, 11, 31),
    holidays,
  );

  while (daysAdded < workingDays) {
    current += MS_PER_DAY;
    const d = new Date(current);
    if (!isWeekend(d) && !tempHolidaySet.has(current)) {
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
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day   = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formata um objeto Date para string no padrão "DD/MM/YYYY" (pt-BR).
 */
export function formatDateBR(date: Date): string {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day   = String(date.getDate()).padStart(2, "0");
  return `${day}/${month}/${year}`;
}
