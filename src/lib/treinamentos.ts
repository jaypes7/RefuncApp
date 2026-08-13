/**
 * ============================================================================
 * TREINAMENTOS — regra de derivação de status por colaborador
 * ============================================================================
 *
 * O app tem dois modelos de treinamento que historicamente não conversavam:
 *
 *   • `colaboradores.treinamento`   → texto livre legado (Concluído / Em
 *                                     Andamento / Pendente), preenchido à mão
 *                                     e quase sempre vazio.
 *   • `colaborador_treinamentos`    → uma linha por curso, com datas e status
 *                                     calculado no banco (OK / A Vencer /
 *                                     Vencido / Pendente).
 *
 * Este módulo condensa o modelo relacional em um único status por colaborador,
 * para que dashboard e Central mostrem o dado real em vez da coluna legada.
 * Só entram os vínculos marcados como aplicáveis (`aplicavel = true`).
 */

/** Agregado de `colaborador_treinamentos` para um colaborador. */
export interface ResumoTreinamentos {
  colaborador_id: string;
  total: number;
  ok: number;
  aVencer: number;
  vencido: number;
  pendente: number;
}

export type StatusTreinamentoColab =
  | "concluido"
  | "vencido"
  | "aVencer"
  | "pendente"
  | "semCadastro";

/**
 * Condensa o resumo em um status único.
 *
 * A ordem importa: um curso vencido contamina o colaborador inteiro, mesmo que
 * todos os outros estejam OK — é o dado que exige ação imediata.
 *
 * `semCadastro` é distinto de `pendente`: significa que ninguém marcou quais
 * treinamentos se aplicam a este colaborador, não que ele esteja em falta.
 */
export function derivarStatusTreinamento(
  resumo?: ResumoTreinamentos,
): StatusTreinamentoColab {
  if (!resumo || resumo.total === 0) return "semCadastro";
  if (resumo.vencido > 0) return "vencido";
  if (resumo.aVencer > 0) return "aVencer";
  if (resumo.ok === resumo.total) return "concluido";
  return "pendente";
}

export const STATUS_TREINAMENTO_LABEL: Record<StatusTreinamentoColab, string> = {
  concluido: "Concluído",
  vencido: "Vencido",
  aVencer: "A Vencer",
  pendente: "Pendente",
  semCadastro: "Sem cadastro",
};

/** Tom visual de cada status — mesmo vocabulário do `StatTone` dos dashboards. */
export const STATUS_TREINAMENTO_TONE: Record<
  StatusTreinamentoColab,
  "ok" | "warn" | "danger" | "muted"
> = {
  concluido: "ok",
  vencido: "danger",
  aVencer: "warn",
  pendente: "warn",
  semCadastro: "muted",
};

/** Contadores de colaboradores por status derivado. */
export interface ContagemTreinamentos {
  concluido: number;
  aVencer: number;
  vencido: number;
  pendente: number;
  semCadastro: number;
}

export function contarStatusTreinamentos(
  colaboradores: Array<{ id?: string }>,
  resumos: Map<string, ResumoTreinamentos>,
): ContagemTreinamentos {
  const contagem: ContagemTreinamentos = {
    concluido: 0,
    aVencer: 0,
    vencido: 0,
    pendente: 0,
    semCadastro: 0,
  };
  for (const c of colaboradores) {
    contagem[derivarStatusTreinamento(c.id ? resumos.get(c.id) : undefined)]++;
  }
  return contagem;
}

/** Indexa a resposta de `/api/treinamentos/resumo` por `colaborador_id`. */
export function indexarResumos(
  resumos: ResumoTreinamentos[] | undefined,
): Map<string, ResumoTreinamentos> {
  return new Map((resumos ?? []).map((r) => [r.colaborador_id, r]));
}
