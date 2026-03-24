/**
 * ============================================================================
 * PROJECT MATH - Funções de cálculo para baseline e progresso do projeto
 * ============================================================================
 *
 * Este módulo contém funções matemáticas para calcular:
 * - Baseline (curva S planejada) baseada nas etapas do projeto
 * - Progresso realizado baseado no status dos colaboradores
 */

// ============================================================================
// TIPOS
// ============================================================================

export interface Etapa {
  id: number;
  nome: string;
  duracaoDias: number;
}

export interface PontoBaseline {
  data: string; // ISO date string (YYYY-MM-DD)
  percentualAcumulado: number; // 0 a 100
}

export interface ColaboradorProgresso {
  id: string | number;
  nome: string;
  etapaAtual: number; // 0 a 12 (0 = não iniciado, 12 = completo)
}

export interface ResultadoProgresso {
  percentualAtual: number; // 0 a 100
  totalColaboradores: number;
  colaboradoresPorEtapa: Record<number, number>;
}

// ============================================================================
// FUNÇÃO: GENERATE BASELINE
// ============================================================================

/**
 * Gera a baseline (curva S planejada) do projeto
 *
 * @param dataInicio - Data de início do projeto (ISO string YYYY-MM-DD)
 * @param etapas - Array com as 12 etapas e suas durações em dias
 * @returns Array de pontos com data e percentual acumulado planejado
 *
 * Exemplo de uso:
 * ```typescript
 * const etapas = [
 *   { id: 1, nome: "Seleção", duracaoDias: 5 },
 *   { id: 2, nome: "Exames", duracaoDias: 10 },
 *   ...
 * ];
 * const baseline = generateBaseline("2024-01-01", etapas);
 * // Retorna: [{ data: "2024-01-01", percentualAcumulado: 0 }, ...]
 * ```
 */
export function generateBaseline(
  dataInicio: string,
  etapas: Etapa[]
): PontoBaseline[] {
  // Validar entrada
  if (!dataInicio || etapas.length === 0) {
    return [];
  }

  const pontos: PontoBaseline[] = [];
  const dataInicioObj = new Date(dataInicio);

  // Calcular duração total do projeto
  const duracaoTotal = etapas.reduce((acc, etapa) => acc + etapa.duracaoDias, 0);

  if (duracaoTotal === 0) {
    return [{ data: dataInicio, percentualAcumulado: 0 }];
  }

  // Ponto inicial (0%)
  pontos.push({
    data: formatarData(dataInicioObj),
    percentualAcumulado: 0,
  });

  // Calcular pontos para cada etapa
  let diasAcumulados = 0;

  for (const etapa of etapas) {
    diasAcumulados += etapa.duracaoDias;

    // Calcular a data deste ponto
    const dataEtapa = new Date(dataInicioObj);
    dataEtapa.setDate(dataEtapa.getDate() + diasAcumulados);

    // Calcular percentual acumulado
    const percentualAcumulado = (diasAcumulados / duracaoTotal) * 100;

    pontos.push({
      data: formatarData(dataEtapa),
      percentualAcumulado: Math.round(percentualAcumulado * 100) / 100, // Arredondar para 2 casas
    });
  }

  return pontos;
}

/**
 * Gera pontos diários para a baseline (para gráficos mais suaves)
 *
 * @param dataInicio - Data de início do projeto
 * @param etapas - Array com as etapas
 * @returns Array com pontos para cada dia do projeto
 */
export function generateDailyBaseline(
  dataInicio: string,
  etapas: Etapa[]
): PontoBaseline[] {
  if (!dataInicio || etapas.length === 0) {
    return [];
  }

  const pontos: PontoBaseline[] = [];
  const dataInicioObj = new Date(dataInicio);
  const duracaoTotal = etapas.reduce((acc, etapa) => acc + etapa.duracaoDias, 0);

  if (duracaoTotal === 0) {
    return [{ data: dataInicio, percentualAcumulado: 0 }];
  }

  // Gerar ponto para cada dia
  for (let dia = 0; dia <= duracaoTotal; dia++) {
    const dataAtual = new Date(dataInicioObj);
    dataAtual.setDate(dataAtual.getDate() + dia);

    const percentualAcumulado = (dia / duracaoTotal) * 100;

    pontos.push({
      data: formatarData(dataAtual),
      percentualAcumulado: Math.round(percentualAcumulado * 100) / 100,
    });
  }

  return pontos;
}

// ============================================================================
// FUNÇÃO: CALCULATE REALIZED
// ============================================================================

/**
 * Calcula o progresso realizado baseado nos colaboradores
 *
 * @param colaboradores - Array de colaboradores com sua etapa atual
 * @param totalEtapas - Número total de etapas (padrão: 12)
 * @returns Objeto com percentual atual, total de colaboradores e distribuição
 *
 * Regra de negócio:
 * - Progresso de um colaborador = (etapaAtual / totalEtapas) * 100
 * - Progresso total = média dos progressos individuais
 *
 * Exemplo de uso:
 * ```typescript
 * const colaboradores = [
 *   { id: 1, nome: "João", etapaAtual: 6 },  // 50% completo
 *   { id: 2, nome: "Maria", etapaAtual: 12 }, // 100% completo
 *   { id: 3, nome: "Pedro", etapaAtual: 3 },  // 25% completo
 * ];
 * const resultado = calculateRealized(colaboradores);
 * // Retorna: { percentualAtual: 58.33, totalColaboradores: 3, ... }
 * ```
 */
export function calculateRealized(
  colaboradores: ColaboradorProgresso[],
  totalEtapas: number = 12
): ResultadoProgresso {
  // Validar entrada
  if (!colaboradores || colaboradores.length === 0) {
    return {
      percentualAtual: 0,
      totalColaboradores: 0,
      colaboradoresPorEtapa: {},
    };
  }

  const totalColaboradores = colaboradores.length;

  // Inicializar contagem por etapa
  const colaboradoresPorEtapa: Record<number, number> = {};
  for (let i = 0; i <= totalEtapas; i++) {
    colaboradoresPorEtapa[i] = 0;
  }

  // Calcular progresso total
  let somaProgressos = 0;

  for (const colab of colaboradores) {
    // Normalizar etapa atual (garantir que está entre 0 e totalEtapas)
    const etapaNormalizada = Math.max(0, Math.min(totalEtapas, colab.etapaAtual));

    // Contar colaborador na etapa
    colaboradoresPorEtapa[etapaNormalizada]++;

    // Calcular progresso individual
    const progressoIndividual = (etapaNormalizada / totalEtapas) * 100;
    somaProgressos += progressoIndividual;
  }

  // Calcular média
  const percentualAtual = somaProgressos / totalColaboradores;

  return {
    percentualAtual: Math.round(percentualAtual * 100) / 100, // Arredondar para 2 casas
    totalColaboradores,
    colaboradoresPorEtapa,
  };
}

/**
 * Calcula o progresso realizado com pesos diferentes para cada etapa
 *
 * @param colaboradores - Array de colaboradores
 * @param pesosEtapas - Array com o peso (importância) de cada etapa
 * @returns Objeto com percentual atual calculado com pesos
 */
export function calculateRealizedWeighted(
  colaboradores: ColaboradorProgresso[],
  pesosEtapas: number[]
): ResultadoProgresso {
  if (!colaboradores || colaboradores.length === 0 || pesosEtapas.length === 0) {
    return {
      percentualAtual: 0,
      totalColaboradores: 0,
      colaboradoresPorEtapa: {},
    };
  }

  const totalEtapas = pesosEtapas.length;
  const pesoTotal = pesosEtapas.reduce((acc, peso) => acc + peso, 0);

  if (pesoTotal === 0) {
    return calculateRealized(colaboradores, totalEtapas);
  }

  const totalColaboradores = colaboradores.length;
  const colaboradoresPorEtapa: Record<number, number> = {};

  for (let i = 0; i <= totalEtapas; i++) {
    colaboradoresPorEtapa[i] = 0;
  }

  let somaProgressos = 0;

  for (const colab of colaboradores) {
    const etapaNormalizada = Math.max(0, Math.min(totalEtapas, colab.etapaAtual));
    colaboradoresPorEtapa[etapaNormalizada]++;

    // Calcular progresso com pesos
    let pesoAcumulado = 0;
    for (let i = 0; i < etapaNormalizada; i++) {
      pesoAcumulado += pesosEtapas[i] || 0;
    }

    const progressoIndividual = (pesoAcumulado / pesoTotal) * 100;
    somaProgressos += progressoIndividual;
  }

  const percentualAtual = somaProgressos / totalColaboradores;

  return {
    percentualAtual: Math.round(percentualAtual * 100) / 100,
    totalColaboradores,
    colaboradoresPorEtapa,
  };
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Formata uma data para string ISO (YYYY-MM-DD)
 */
function formatarData(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/**
 * Calcula a diferença em dias entre duas datas
 */
export function calcularDiasEntre(dataInicio: string, dataFim: string): number {
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  const diffTime = Math.abs(fim.getTime() - inicio.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Gera dados para o gráfico Curva S comparando baseline vs realizado
 */
export function generateCurvaSData(
  dataInicio: string,
  etapas: Etapa[],
  colaboradores: ColaboradorProgresso[]
): {
  labels: string[];
  baseline: number[];
  realizado: number[];
} {
  const baseline = generateDailyBaseline(dataInicio, etapas);
  const progressoReal = calculateRealized(colaboradores, etapas.length);

  // Gerar array de realizado com mesmo tamanho do baseline
  const realizadoArray = baseline.map((_, index) => {
    if (index === baseline.length - 1) {
      return progressoReal.percentualAtual;
    }
    // Interpolar valores para criar uma curva suave
    const progressoParcial = (progressoReal.percentualAtual * index) / (baseline.length - 1);
    return Math.round(progressoParcial * 100) / 100;
  });

  return {
    labels: baseline.map((p) => p.data),
    baseline: baseline.map((p) => p.percentualAcumulado),
    realizado: realizadoArray,
  };
}
