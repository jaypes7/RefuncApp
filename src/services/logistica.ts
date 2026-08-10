import { api } from "@/lib/http";

// Passagens, hospedagens e alimentação do colaborador (Logística)

export interface PassagemTrecho {
  id?: string;
  passagem_id?: string;
  ordem: number;
  cidade_embarque?: string | null;
  data_embarque?: string | null;
  horario_embarque?: string | null;
  cidade_desembarque?: string | null;
  data_desembarque?: string | null;
  horario_desembarque?: string | null;
  valor_com_taxas?: number | null;
}

export interface ColaboradorPassagem {
  id?: string;
  colaborador_id?: string;
  motivo?: string | null;
  tipo_passagem?: string | null;
  observacoes?: string | null;
  trechos?: PassagemTrecho[];
  created_at?: string;
}

export const passagensApi = {
  listar: (colaboradorId: string) =>
    api.get<{ data: ColaboradorPassagem[] }>(`/colaboradores/${colaboradorId}/passagens`),

  criar: (colaboradorId: string, body: Omit<ColaboradorPassagem, "id" | "colaborador_id" | "created_at">) =>
    api.post<{ data: ColaboradorPassagem }>(`/colaboradores/${colaboradorId}/passagens`, body),

  atualizar: (colaboradorId: string, passagemId: string, body: Partial<Omit<ColaboradorPassagem, "id" | "colaborador_id" | "created_at">>) =>
    api.put<{ data: ColaboradorPassagem }>(`/colaboradores/${colaboradorId}/passagens/${passagemId}`, body),

  remover: (colaboradorId: string, passagemId: string) =>
    api.delete(`/colaboradores/${colaboradorId}/passagens/${passagemId}`),
};

export interface ColaboradorHospedagem {
  id?: string;
  colaborador_id?: string;
  hotel_nome?: string | null;
  hotel_endereco?: string | null;
  hotel_telefone?: string | null;
  tipo_apto?: string | null;
  valor_diaria?: number | null;
  qtd_leitos_bloqueados?: number;
  data_bloqueio?: string | null;
  qtd_leitos_disponiveis?: number;
  data_checkin?: string | null;
  horario_checkin?: string | null;
  observacoes?: string | null;
  created_at?: string;
}

export const hospedagensApi = {
  listar: (colaboradorId: string) =>
    api.get<{ data: ColaboradorHospedagem[] }>(`/colaboradores/${colaboradorId}/hospedagens`),

  criar: (colaboradorId: string, body: Omit<ColaboradorHospedagem, "id" | "colaborador_id" | "created_at">) =>
    api.post<{ data: ColaboradorHospedagem }>(`/colaboradores/${colaboradorId}/hospedagens`, body),

  atualizar: (colaboradorId: string, hospedagemId: string, body: Partial<Omit<ColaboradorHospedagem, "id" | "colaborador_id" | "created_at">>) =>
    api.put<{ data: ColaboradorHospedagem }>(`/colaboradores/${colaboradorId}/hospedagens/${hospedagemId}`, body),

  remover: (colaboradorId: string, hospedagemId: string) =>
    api.delete(`/colaboradores/${colaboradorId}/hospedagens/${hospedagemId}`),
};

export interface ColaboradorAlimentacao {
  id?: string;
  colaborador_id?: string;
  credito_vr_almoco?: boolean;
  credito_vr_janta?: boolean;
  observacoes?: string | null;
  created_at?: string;
}

export const alimentacaoApi = {
  buscar: (colaboradorId: string) =>
    api.get<{ data: ColaboradorAlimentacao }>(`/colaboradores/${colaboradorId}/alimentacao`),

  atualizar: (colaboradorId: string, body: Partial<Omit<ColaboradorAlimentacao, "id" | "colaborador_id" | "created_at">>) =>
    api.put<{ data: ColaboradorAlimentacao }>(`/colaboradores/${colaboradorId}/alimentacao`, body),
};
