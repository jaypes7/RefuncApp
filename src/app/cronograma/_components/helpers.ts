import { calculateWorkingDays, formatDateISO } from "@/lib/date-utils";

// --- Types ---
export type AtrasoEntry = {
  etapa_id: number;
  dias_extras: number;
  motivo: string | null;
  data_inicio_atraso: string | null;
  datas_atraso: string[];
};

export type AdiantamentoEntry = {
  etapa_id: number;
  dias_adiantados: number;
  motivo: string | null;
  data_inicio_adiantamento: string | null;
  datas_adiantamento: string[];
};

export type EtapaCronograma = {
  id: number;
  nome: string;
  percentual_concluido: number;
  dias: number;
  concluida?: boolean;
  data_inicio?: string;
  data_fim?: string;
  responsavel?: string | null;
  grupo_id?: number | null;
};

export type EtapaGrupo = { id: number; nome: string; ordem: number };

export type ConfigCronograma = {
  etapas: EtapaCronograma[];
  dias_totais: number;
};

export type ProgressoDiarioEntry = {
  etapa_id: number;
  data: string; // YYYY-MM-DD
  percentual: number;
};

export type EtapaDateError = {
  id: number;
  dataInicio: boolean;
  dataFim: boolean;
  dataStartGreaterThanEnd: boolean;
};

export const ETAPAS_DEFAULT: EtapaCronograma[] = [
  { id: 1,  nome: "PGR E PCMSO",                dias: 3,  percentual_concluido: 0 },
  { id: 2,  nome: "Seleção de Mão de Obra",     dias: 3,  percentual_concluido: 0 },
  { id: 3,  nome: "Realização de Exames",       dias: 4,  percentual_concluido: 0 },
  { id: 4,  nome: "Liberação de ASO",           dias: 2,  percentual_concluido: 0 },
  { id: 5,  nome: "e-Social",                   dias: 4,  percentual_concluido: 0 },
  { id: 6,  nome: "Assinatura de contrato",     dias: 3,  percentual_concluido: 0 },
  { id: 7,  nome: "Treinamentos Normativos",    dias: 8,  percentual_concluido: 0 },
  { id: 8,  nome: "Portal do Colaborador",      dias: 3,  percentual_concluido: 0 },
  { id: 9,  nome: "Liberação de Credencial",    dias: 4,  percentual_concluido: 0 },
  { id: 10, nome: "Liberação de EPIs",          dias: 3,  percentual_concluido: 0 },
  { id: 11, nome: "Início de Campo",            dias: 3,  percentual_concluido: 0 },
];

export const MESES = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

export function addCalendarDays(date: string, days: number): string {
  const next = new Date(date + "T00:00:00Z");
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().split("T")[0];
}

export function sortUniqueDates(dates: string[]): string[] {
  return [...new Set(dates)].sort();
}

export function formatDatePtBr(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function legacyAtrasoDates(dataInicio: string | null | undefined, diasExtras: number): string[] {
  if (!dataInicio || diasExtras <= 0) return [];
  return Array.from({ length: diasExtras }, (_, index) => addCalendarDays(dataInicio, index));
}

export function legacyAdiantamentoDates(dataInicio: string | null | undefined, diasAdiantados: number): string[] {
  if (!dataInicio || diasAdiantados <= 0) return [];
  return Array.from({ length: diasAdiantados }, (_, index) => addCalendarDays(dataInicio, index));
}

// Retorna todos os dias corridos entre duas datas (inclusive), formato YYYY-MM-DD
export function getDaysInRange(startDate: string, endDate: string): string[] {
  const days: string[] = [];
  const cur = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  while (cur <= end) {
    days.push(formatDateISO(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// Calcula dias úteis de uma etapa a partir das datas e do calendário
export function calcularDiasUteisEtapa(
  dataInicio: string | undefined,
  dataFim: string | undefined,
  diasTrabalhadosData: string[] | undefined,
): number {
  if (!dataInicio || !dataFim) return 0;
  if (diasTrabalhadosData && diasTrabalhadosData.length > 0) {
    const diasTrabalhadosSet = new Set(diasTrabalhadosData);
    return getDaysInRange(dataInicio, dataFim).filter((dia) => diasTrabalhadosSet.has(dia)).length;
  }
  // Fallback: usa cálculo de dias úteis padrão quando calendário ainda não carregou
  return calculateWorkingDays(dataInicio, dataFim);
}
