/**
 * ============================================================================
 * ⚠️  MOCK TEMPORÁRIO — REMOVER ANTES DO MERGE NA MAIN  ⚠️
 * ============================================================================
 *
 * Dados falsos para a branch `feat/pgv-layout-adoption`, cujo objetivo é
 * revisar o LAYOUT dos padrões trazidos do PGV (ver ANALISE_PGV.md §6) antes
 * de existir backend para eles.
 *
 * Nada aqui vem da API. Nenhum número deste arquivo é verdadeiro.
 *
 * ─── Como arrancar isto na hora do merge ────────────────────────────────────
 *
 *   1. `grep -rn "mock-pgv" src/`  → lista todo consumidor.
 *   2. Em cada um, troque a chamada mock pelo dado real da API.
 *   3. Delete este arquivo.
 *
 * O passo 1 só funciona porque TODO mock passa por aqui. Se precisar de mais
 * um dado falso, acrescente NESTE arquivo — não espalhe literal pelas telas.
 *
 * Os componentes que consomem isto (PageHeader, KpiCard, ContextLine,
 * DataQualityBlock, ImportProvenanceHeader) são definitivos e ficam. Só a
 * origem dos números é que é temporária.
 */

import type { DataQualityIndicator } from "@/components/ui/data-quality";
import type { ImportProvenance } from "@/components/ui/import-provenance";

/** Marca visível no app de que o número ao lado é inventado. */
export const MOCK_BADGE = "dados de exemplo";

/**
 * Timestamp determinístico. Usa uma data fixa em vez de `new Date()` para não
 * gerar hydration mismatch entre servidor e cliente no Next.
 */
export function mockUpdatedAt(offsetMinutes = 0): Date {
  const base = new Date("2026-07-17T09:29:00");
  return new Date(base.getTime() - offsetMinutes * 60_000);
}

// ── Proveniência de importação ──────────────────────────────────────────────

export const MOCK_PROVENANCE_CENTRAL: ImportProvenance = {
  arquivo: "Efetivo_Pessoal_JUL26.xlsx",
  data: mockUpdatedAt(45),
  autor: "joao.soares",
  novos: 33,
  atualizados: 0,
  ausentes: 4,
  rejeitados: 0,
  warnings: 1,
};

export const MOCK_PROVENANCE_BANCO_TALENTOS: ImportProvenance = {
  arquivo: "Banco_Talentos_2026.xlsx",
  data: mockUpdatedAt(1440),
  autor: null,
  novos: 128,
  atualizados: 12,
  ausentes: 0,
  rejeitados: 3,
  warnings: 0,
};

export const MOCK_DUPLICIDADES = { grupos: 1, registros: 2 };

// ── Qualidade dos dados ─────────────────────────────────────────────────────

export const MOCK_DQ_MOBILIZACAO: DataQualityIndicator[] = [
  { label: "Ativos sem integração PB", count: 10 },
  { label: "Possíveis duplicidades (grupos)", count: 1, severity: "danger" },
  { label: "Ativos sem alojamento", count: 0 },
  { label: "Ausentes na última importação", count: 4 },
  { label: "Ativos sem sexo", count: 0 },
  { label: "Warnings da importação", count: 1 },
  { label: "Ativos sem EPI completo", count: 0 },
  { label: "Rejeitados na importação", count: 0, severity: "danger" },
  { label: "Sem ID Petrobras", count: 33 },
  {
    label: "Crachá liberado sem ID Petrobras",
    count: 26,
    severity: "danger",
    hint: "Crachá emitido sem o ID da Petrobras vinculado — bloqueia o acesso à obra.",
  },
];

export const MOCK_DQ_BANCO_TALENTOS: DataQualityIndicator[] = [
  { label: "Sem telefone de contato", count: 17 },
  { label: "CPF duplicado", count: 2, severity: "danger" },
  { label: "Sem cargo definido", count: 5 },
  { label: "Sem município/UF", count: 8 },
  { label: "Sem escolaridade", count: 41 },
  { label: "Rejeitados na importação", count: 3, severity: "danger" },
  { label: "Sem experiência na função", count: 23 },
  { label: "Warnings da importação", count: 0 },
];

// ── Distribuição de uniformes (ProportionBar) ───────────────────────────────

export const MOCK_UNIFORMES = {
  total: 54,
  itens: [
    { label: "P", value: 6 },
    { label: "M", value: 18 },
    { label: "G", value: 21 },
    { label: "GG", value: 8 },
    { label: "Sem informação", value: 1 },
  ],
};
