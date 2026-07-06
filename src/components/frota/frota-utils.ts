/**
 * Helpers compartilhados dos componentes de Controle de Frota.
 */

export const VEICULO_TIPOS = [
  "PASSAGEIRO",
  "PICKUP LEVE - CS",
  "PICKUP LEVE - CD",
  "CAMINHÃO",
  "FURGÃO",
  "MISTO CAMIONETA",
  "EQUIPAMENTO",
];

export const VEICULO_STATUS = ["ATIVO", "INATIVO", "MANUTENÇÃO"];
export const VEICULO_ACOES = ["MOBILIZAR", "DESMOBILIZAR", "MANUTENÇÃO"];
export const COMBUSTIVEIS = ["GASOLINA/ETANOL", "ETANOL", "DIESEL"];
export const MODALIDADES = ["ALUGADO", "PRÓPRIO"];
export const TIPOS_CONTRATO = ["FLEET", "RAC"];
export const MANUTENCAO_TIPOS = ["PREVENTIVA", "CORRETIVA", "SINISTRO"] as const;
export const CLASSIFICACOES = ["EXCELENTE", "BOM", "REGULAR", "RUIM"];

/** "YYYY-MM-DD" → "DD/MM/YYYY" (sem criar Date, evitando problemas de fuso) */
export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const [y, m, d] = value.split("T")[0].split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export function formatBRL(value?: number | null): string {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function statusBadgeClass(status?: string | null): string {
  switch (status) {
    case "ATIVO":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400";
    case "MANUTENÇÃO":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400";
    case "INATIVO":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function classificacaoBadgeClass(classificacao?: string | null): string {
  switch (classificacao) {
    case "EXCELENTE":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400";
    case "BOM":
      return "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400";
    case "REGULAR":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400";
    case "RUIM":
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  const e = error as { response?: { data?: { error?: string } } };
  return e.response?.data?.error || fallback;
}
