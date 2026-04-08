/**
 * ============================================================================
 * CURVA S — Progressão Sigmoide de Projeto
 * ============================================================================
 *
 * Implementa a curva logística (sigmoide) para representar o comportamento
 * real de projetos de mobilização:
 *   - Início lento (setup / mobilização)
 *   - Aceleração intensa no meio
 *   - Estabilização ao se aproximar da meta
 *
 * Y = meta × σ(t)   onde  σ(t) = normalização da função logística em [0,1]
 */

import { EtapaConfig } from "./schemas";
import { calculateWorkingDays, formatDateISO } from "./date-utils";

// ============================================================================
// TIPOS PÚBLICOS
// ============================================================================

export interface PontoCurvaS {
  data: string;                  // YYYY-MM-DD
  percentualPlanejado: number;   // 0–100 (legado — mantido para compatibilidade)
  percentualRealizado?: number;
}

export interface DadosCurvaS {
  labels: string[];      // labels de exibição ("dd/MM")
  planejado: number[];   // meta acumulada pela sigmoide (nº de pessoas)
  realizado?: number[];  // admitidos acumulados reais por DATA_ADMISSAO
}

export interface ConfigProjeto {
  dataInicio: string;
  dataFim: string;
  etapas: EtapaConfig[];
  diasTotais: number;
}

// ============================================================================
// MATEMÁTICA DA SIGMOIDE
// ============================================================================

/**
 * Função logística normalizada: σ(0)=0, σ(1)=1.
 *
 * k controla a inclinação (steepness):
 *   k=6 → curva suave   k=8 → padrão engenharia   k=12 → curva agressiva
 */
export function sigmoid(t: number, k = 8): number {
  const raw = (x: number) => 1 / (1 + Math.exp(-k * (x - 0.5)));
  const s0 = raw(0);
  const s1 = raw(1);
  if (s1 === s0) return t; // degenerado — fallback linear
  return (raw(Math.max(0, Math.min(1, t))) - s0) / (s1 - s0);
}

/**
 * Dado um valor y ∈ [0,1], encontra t ∈ [0,1] tal que sigmoid(t) ≈ y.
 * Usado para calcular "quantos dias de atraso" em termos de progresso.
 */
function inverseSigmoid(y: number, k = 8): number {
  const clamped = Math.max(0.001, Math.min(0.999, y));
  // Busca binária: 20 iterações → precisão de ~0.001%
  let lo = 0, hi = 1;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (sigmoid(mid, k) < clamped) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

function formatarData(data: Date): string {
  const ano  = data.getUTCFullYear();
  const mes  = String(data.getUTCMonth() + 1).padStart(2, "0");
  const dia  = String(data.getUTCDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function parseUTC(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00Z");
}

// ============================================================================
// CURVA S PRINCIPAL — gerarDadosGraficoCurvaS
// ============================================================================

/**
 * Gera os arrays `planejado` (sigmoide) e `realizado` (DATA_ADMISSAO real)
 * alinhados nas mesmas datas para o AreaChart do Recharts.
 *
 * @param dataInicio           - "YYYY-MM-DD" início do projeto
 * @param dataFim              - "YYYY-MM-DD" fim previsto (ou null)
 * @param metaAdmissoes        - Total de admissões planejadas
 * @param admissoesCumulativas - Array já calculado em route.ts: [{data, acumulado}]
 */
export function gerarDadosGraficoCurvaS(
  dataInicio: string,
  dataFim: string | null,
  metaAdmissoes: number,
  admissoesCumulativas: Array<{ data: string; acumulado: number }> = [],
): DadosCurvaS {
  if (!dataInicio || !dataFim || metaAdmissoes <= 0) {
    return { labels: [], planejado: [], realizado: [] };
  }

  const inicio = parseUTC(dataInicio);
  const fim    = parseUTC(dataFim);
  const diasTotais = Math.round(
    (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diasTotais <= 0) return { labels: [], planejado: [], realizado: [] };

  // ~1 ponto por semana, entre 12 e 60 pontos
  const nPontos = Math.max(12, Math.min(60, Math.ceil(diasTotais / 7)));

  // Ordena admissões para varredura linear eficiente
  const admSorted = [...admissoesCumulativas].sort((a, b) =>
    a.data.localeCompare(b.data),
  );

  const labels:    string[] = [];
  const planejado: number[] = [];
  const realizado: number[] = [];

  for (let i = 0; i <= nPontos; i++) {
    const t          = i / nPontos;
    const daysOffset = Math.round(t * diasTotais);
    const pointDate  = addDays(inicio, daysOffset);
    const dateStr    = formatarData(pointDate);

    // Label de exibição: "dd/MM"
    labels.push(
      pointDate.toLocaleDateString("pt-BR", {
        day:   "2-digit",
        month: "2-digit",
        timeZone: "UTC",
      }),
    );

    // Meta acumulada sigmoide (arredondado à décima)
    planejado.push(Math.round(sigmoid(t) * metaAdmissoes * 10) / 10);

    // Realizado: último acumulado com data ≤ dateStr
    let realVal = 0;
    for (const entry of admSorted) {
      if (entry.data <= dateStr) realVal = entry.acumulado;
      else break;
    }
    realizado.push(realVal);
  }

  return { labels, planejado, realizado };
}

// ============================================================================
// VERIFICAR ATRASO — baseado na sigmoide
// ============================================================================

/**
 * Calcula se o projeto está atrasado comparando o realizado com a meta
 * sigmoide no dia atual.
 *
 * @param dataInicio      - Início do projeto
 * @param dataFim         - Fim previsto
 * @param metaAdmissoes   - Total de admissões planejadas
 * @param admitidosHoje   - Contagem real de admitidos até hoje
 */
export function verificarAtraso(
  dataInicio: string,
  dataFim: string | null,
  metaAdmissoes: number,
  admitidosHoje: number,
): { atrasado: boolean; diasAtraso: number; percentualAtraso: number } {
  if (!dataInicio || !dataFim || metaAdmissoes <= 0) {
    return { atrasado: false, diasAtraso: 0, percentualAtraso: 0 };
  }

  // Usa dias úteis (excluindo fins de semana e feriados nacionais) para
  // calcular o atraso real de mobilização — mais preciso que dias corridos.
  const diasTotais = calculateWorkingDays(dataInicio, dataFim);
  if (diasTotais <= 0) return { atrasado: false, diasAtraso: 0, percentualAtraso: 0 };

  const hoje     = new Date();
  const todayStr = formatDateISO(hoje);

  // Se hoje ainda não chegou ao início do projeto, não há atraso computável
  const diasCorridos = hoje < parseUTC(dataInicio)
    ? 0
    : calculateWorkingDays(dataInicio, todayStr);

  const tHoje = Math.max(0, Math.min(1, diasCorridos / diasTotais));

  const metaHoje     = sigmoid(tHoje) * metaAdmissoes;
  const diferenca    = admitidosHoje - metaHoje; // positivo = adiantado
  const atrasado     = diferenca < -0.5; // tolerância de meio colaborador

  let diasAtraso = 0;
  if (atrasado && metaAdmissoes > 0) {
    const tRealizado  = inverseSigmoid(admitidosHoje / metaAdmissoes);
    diasAtraso = Math.round(Math.max(0, tHoje - tRealizado) * diasTotais);
  }

  const percentualAtraso =
    Math.abs(Math.round((diferenca / metaAdmissoes) * 10000) / 100);

  return { atrasado, diasAtraso, percentualAtraso };
}

// ============================================================================
// VERIFICAR ATRASO FÍSICO — baseado em percentual de cronograma
// ============================================================================

/**
 * Compara o percentual planejado vs. realizado do cronograma físico.
 * Não depende de admissões — usa os arrays da gerarCurvaSEtapas.
 */
export function verificarAtrasoFisico(
  planejadoHoje: number,
  realizadoHoje: number,
): { atrasado: boolean; percentualAtraso: number } {
  const diferenca = planejadoHoje - realizadoHoje;
  const atrasado = diferenca > 0.5;
  const percentualAtraso = Math.round(Math.max(0, diferenca) * 10) / 10;
  return { atrasado, percentualAtraso };
}

// ============================================================================
// MÉTRICAS E PROGRESSO — mantidos para compatibilidade
// ============================================================================

export interface MetricasDashboard {
  totalCadastrados: number;
  totalAdmitidos: number;
  totalLiberados: number;
  totalEmTreinamento: number;
  percentualMOB: number;
  percentualASO: number;
  percentualPortal: number;
}

export function calcularMetricas(
  colaboradores: Array<{
    CPF?: string | null;
    NOME?: string | null;
    STATUS?: string | null;
    DATA_ADMISSAO?: string | null;
    MOB?: string | null;
    ASO?: string | null;
    TREINAMENTO?: string | null;
    PORTAL?: string | null;
  }>,
): MetricasDashboard {
  const totalCadastrados = colaboradores.filter((c) => c.CPF && c.NOME).length;

  const totalAdmitidos = colaboradores.filter(
    (c) =>
      c.CPF &&
      c.NOME &&
      (c.DATA_ADMISSAO || (c.STATUS && c.STATUS !== "Pendente")),
  ).length;

  const totalLiberados = colaboradores.filter(
    (c) =>
      c.CPF &&
      c.NOME &&
      (c.DATA_ADMISSAO || (c.STATUS && c.STATUS !== "Pendente")) &&
      (c.MOB?.trim() || c.ASO === "Apto"),
  ).length;

  const totalEmTreinamento = colaboradores.filter(
    (c) => c.TREINAMENTO === "Em Andamento" || c.TREINAMENTO === "Concluído",
  ).length;

  const pct = (n: number) =>
    totalCadastrados > 0
      ? Math.round((n / totalCadastrados) * 10000) / 100
      : 0;

  // Conta colaboradores com MOB preenchido (qualquer valor não vazio)
  const totalMob = colaboradores.filter((c) => c.MOB?.trim()).length;

  return {
    totalCadastrados,
    totalAdmitidos,
    totalLiberados,
    totalEmTreinamento,
    percentualMOB:   pct(totalMob),
    percentualASO:   pct(colaboradores.filter((c) => c.ASO === "Apto").length),
    percentualPortal: pct(colaboradores.filter((c) => c.PORTAL === "Liberado").length),
  };
}

export function calcularProgressoReal(
  colaboradores: Array<{
    STATUS?: string | null;
    DATA_ADMISSAO?: string | null;
    MOB?: string | null;
    ASO?: string | null;
    TREINAMENTO?: string | null;
    PORTAL?: string | null;
    PRE_ADMISSAO?: string | null;
  }>,
): number {
  if (!colaboradores || colaboradores.length === 0) return 0;

  let soma = 0;
  for (const c of colaboradores) {
    let etapa = 1;
    if (c.STATUS && c.STATUS !== "Pendente") etapa = 2;
    if (c.PRE_ADMISSAO === "Sim") etapa = 3;
    if (c.MOB?.trim()) etapa = 4;
    if (c.PORTAL === "Liberado") etapa = 5;
    if (c.ASO === "Apto") etapa = 6;
    if (c.TREINAMENTO === "Em Andamento") etapa = 7;
    if (c.TREINAMENTO === "Concluído") etapa = 8;
    soma += (etapa / 8) * 100;
  }
  return Math.round((soma / colaboradores.length) * 100) / 100;
}

export function calcularDiaAtual(dataInicio: string): number {
  const inicio = parseUTC(dataInicio);
  const hoje   = new Date();
  const diff = Math.floor((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(0, diff); // Não retorna negativo quando projeto ainda não começou
}

// ============================================================================
// LEGADO — mantidos para não quebrar outros imports
// ============================================================================

export function calcularBaseline(
  dataInicio: string,
  etapas: EtapaConfig[],
): PontoCurvaS[] {
  if (!dataInicio || etapas.length === 0) return [];
  const inicio = new Date(dataInicio);
  const diasTotais = etapas.reduce((a, e) => a + e.duracaoDias, 0);
  if (diasTotais === 0) return [{ data: dataInicio, percentualPlanejado: 0 }];

  const pontos: PontoCurvaS[] = [{ data: dataInicio, percentualPlanejado: 0 }];
  let acum = 0;
  for (const etapa of etapas) {
    acum += etapa.duracaoDias;
    const d = new Date(inicio);
    d.setDate(d.getDate() + acum);
    pontos.push({
      data: formatarData(d),
      percentualPlanejado: Math.round((acum / diasTotais) * 10000) / 100,
    });
  }
  return pontos;
}

export function calcularBaselineDiaria(
  dataInicio: string,
  etapas: EtapaConfig[],
): PontoCurvaS[] {
  if (!dataInicio || etapas.length === 0) return [];
  const inicio = new Date(dataInicio);
  const diasTotais = etapas.reduce((a, e) => a + e.duracaoDias, 0);
  if (diasTotais === 0) return [{ data: dataInicio, percentualPlanejado: 0 }];

  return Array.from({ length: diasTotais + 1 }, (_, dia) => {
    const d = new Date(inicio);
    d.setDate(d.getDate() + dia);
    return {
      data: formatarData(d),
      percentualPlanejado: Math.round((dia / diasTotais) * 10000) / 100,
    };
  });
}
