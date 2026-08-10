import { api } from "@/lib/http";

// Treinamentos (Segurança)

export interface Treinamento {
  id?: string;
  nome: string;
  descricao?: string | null;
  obrigatorio?: boolean;
  prazo_validade_meses?: number;
  created_at?: string;
}

export interface ColaboradorTreinamento {
  id?: string;
  colaborador_id?: string;
  treinamento_id: string;
  treinamento?: Treinamento;
  data_realizacao?: string | null;
  data_validade?: string | null;
  status?: string | null;
  observacoes?: string | null;
  aplicavel?: boolean;
  created_at?: string;
}

export const treinamentosApi = {
  listarCatalogo: () =>
    api.get<{ data: Treinamento[] }>("/treinamentos"),

  criar: (nome: string) =>
    api.post<{ data: Treinamento }>("/treinamentos", { nome }),

  listarDoColaborador: (colaboradorId: string) =>
    api.get<{ data: ColaboradorTreinamento[] }>(`/colaboradores/${colaboradorId}/treinamentos`),

  adicionarAoColaborador: (
    colaboradorId: string,
    treinamentoId: string,
    body?: { data_realizacao?: string | null; data_validade?: string | null },
  ) =>
    api.post<{ data: ColaboradorTreinamento }>(`/colaboradores/${colaboradorId}/treinamentos`, {
      treinamento_id: treinamentoId,
      ...body,
    }),

  atualizar: (colaboradorId: string, treinamentoId: string, body: { data_realizacao?: string | null; data_validade?: string | null; observacoes?: string | null; aplicavel?: boolean }) =>
    api.put<{ data: ColaboradorTreinamento }>(`/colaboradores/${colaboradorId}/treinamentos/${treinamentoId}`, body),

  // Remove o vínculo (marca como não aplicável a este colaborador).
  removerDoColaborador: (colaboradorId: string, treinamentoId: string) =>
    api.put<{ data: ColaboradorTreinamento }>(`/colaboradores/${colaboradorId}/treinamentos/${treinamentoId}`, { aplicavel: false }),
};
