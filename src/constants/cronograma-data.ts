/**
 * ============================================================================
 * CRONOGRAMA DATA - Constantes e validações das etapas do projeto de RH
 * ============================================================================
 *
 * Este módulo define as 12 etapas do processo de integração de colaboradores
 * e fornece utilitários para validar a consistência do cronograma planejado.
 */

// ============================================================================
// CONSTANTES DAS ETAPAS
// ============================================================================

/**
 * Nomes das etapas do processo de admissão / integração de colaboradores.
 *
 * A ordem do array é significativa e representa a sequência cronológica
 * real do processo de RH.
 *
 * Usar `as const` garante:
 *   - Tipo literal de cada elemento (em vez de `string` genérico)
 *   - Array readonly, prevenindo mutações acidentais em runtime
 *
 *  A ordem reflete a sequência real do processo de RH.
 */
export const ETAPAS_BASE = [
  "PGR E PCMSO",
  "Seleção",
  "Exames",
  "ASO",
  "e-Social",
  "Contrato",
  "Treinamentos Normativos",  // unifica "Treinamento Yara" + "Treinamento MSV"
  "Portal",
  "Liberação de Credencial",  // unifica "Crachá" + "Credencial"
  "EPIs",
  "Início de Campo",
] as const;

/** Tipo derivado — representa exatamente um dos 12 nomes aceitos */
export type NomeEtapa = (typeof ETAPAS_BASE)[number];

/** Número total de etapas do projeto (constante derivada do array) */
export const TOTAL_ETAPAS = ETAPAS_BASE.length; // 11

// ============================================================================
// TIPOS
// ============================================================================

/** Configuração de uma etapa com sua duração planejada */
export interface EtapaConfig {
  /** Índice 1-based (1..12) */
  id: number;
  /** Nome canônico da etapa */
  nome: NomeEtapa;
  /** Duração planejada em dias úteis */
  duracaoDiasUteis: number;
}

/** Resultado da validação do cronograma */
export interface ValidacaoCronograma {
  /** true se a soma das etapas bate com o total de dias úteis do projeto */
  valid: boolean;
  /**
   * Diferença = soma(stepsDays) − totalProjectDays.
   *   > 0  → as etapas somam MAIS do que o total disponível (sobra)
   *   < 0  → as etapas somam MENOS do que o total disponível (falta)
   *   = 0  → cronograma perfeitamente balanceado
   */
  difference: number;
  /** Soma total dos dias informados nas etapas */
  stepsDaysTotal: number;
}

// ============================================================================
// FUNÇÃO: validateScheduleTotal
// ============================================================================

/**
 * Verifica se a soma dos dias de cada etapa corresponde ao total de dias
 * úteis do projeto.
 *
 * Matemática:
 *   soma  = Σ stepsDays[i]  (somatório de todos os elementos)
 *   diff  = soma − totalProjectDays
 *   valid = diff === 0
 *
 * @param stepsDays       - Array com a duração (dias úteis) de cada etapa.
 *                          Não precisa ter exatamente 12 elementos, mas
 *                          geralmente corresponde a ETAPAS_BASE.
 * @param totalProjectDays - Total de dias úteis do projeto (calculado via
 *                           `calculateWorkingDays` de date-utils.ts).
 * @returns `ValidacaoCronograma` indicando se o cronograma está equilibrado
 *          e, se não, qual é o saldo de dias.
 *
 * @example
 * // Projeto com 30 dias úteis e 3 etapas somando 30 dias → válido
 * validateScheduleTotal([10, 12, 8], 30)
 * // => { valid: true, difference: 0, stepsDaysTotal: 30 }
 *
 * @example
 * // Etapas somam 35 dias mas projeto tem 30 → inválido (sobram 5 dias)
 * validateScheduleTotal([10, 15, 10], 30)
 * // => { valid: false, difference: 5, stepsDaysTotal: 35 }
 *
 * @example
 * // Etapas somam 25 dias mas projeto tem 30 → inválido (faltam 5 dias)
 * validateScheduleTotal([10, 8, 7], 30)
 * // => { valid: false, difference: -5, stepsDaysTotal: 25 }
 */
export function validateScheduleTotal(
  stepsDays: number[],
  totalProjectDays: number
): ValidacaoCronograma {
  // Garante que valores negativos não poluam a soma (dias devem ser ≥ 0)
  const stepsDaysTotal = stepsDays.reduce(
    (acc, days) => acc + Math.max(0, days),
    0
  );

  const difference = stepsDaysTotal - totalProjectDays;

  return {
    valid: difference === 0,
    difference,
    stepsDaysTotal,
  };
}

// ============================================================================
// HELPERS: Construção e conversão de configurações de etapas
// ============================================================================

/**
 * Cria um array de `EtapaConfig` a partir de um array de durações.
 *
 * A posição [i] em `durations` corresponde à etapa ETAPAS_BASE[i].
 * Se `durations` tiver menos elementos que ETAPAS_BASE, as etapas
 * restantes recebem duração 0.
 *
 * @param durations - Durações em dias úteis, na ordem das etapas
 * @returns Array tipado de `EtapaConfig`
 *
 * @example
 * buildEtapasConfig([5, 3, 2, 1, 2, 3, 3, 2, 1, 2, 2, 4])
 * // => [{ id: 1, nome: "Seleção", duracaoDiasUteis: 5 }, ...]
 */
export function buildEtapasConfig(durations: number[]): EtapaConfig[] {
  return ETAPAS_BASE.map((nome, index) => ({
    id: index + 1,
    nome,
    duracaoDiasUteis: durations[index] ?? 0,
  }));
}

/**
 * Extrai apenas o array de durações de um array de `EtapaConfig`.
 * O resultado pode ser passado diretamente para `validateScheduleTotal`.
 *
 * @param etapas - Array de configurações de etapas
 * @returns Array de números (dias úteis por etapa)
 */
export function extractDurations(etapas: EtapaConfig[]): number[] {
  return etapas.map((e) => e.duracaoDiasUteis);
}

/**
 * Retorna a soma total dos dias úteis de um array de EtapaConfig.
 * Atalho conveniente para `extractDurations + reduce`.
 */
export function sumEtapasDays(etapas: EtapaConfig[]): number {
  return etapas.reduce((acc, e) => acc + e.duracaoDiasUteis, 0);
}
