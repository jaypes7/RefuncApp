import { api } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";

export interface RequisicaoItem {
  id: string;
  requisicao_id: string;
  nome_item: string;
  categoria: string;
  unidade: string;
  quantidade: number;
  valor_item: number | null;
  data_necessidade: string | null;
  quantidade_estoque: number;
  criticidade: "baixa" | "media" | "alta" | "critica";
  tipo: "item" | "servico";
  created_at: string;
}

export interface OrdemCompra {
  id: string;
  requisicao_id: string;
  numero_oc: string;
  fornecedor: string;
  valor: number | null;
  valor_previsto: number | null;
  previsao_entrega: string | null;
  itens?: RequisicaoItem[];
  created_at: string;
}

export interface RecebimentoItem {
  id: string;
  recebimento_id: string;
  item_id: string;
  quantidade_recebida: number;
}

export interface Recebimento {
  id: string;
  requisicao_id: string;
  tipo: "total" | "parcial";
  numero_nota: string | null;
  data_recebimento: string;
  observacao: string | null;
  created_at: string;
  suprimentos_recebimento_itens: RecebimentoItem[];
}

export interface Requisicao {
  id: string;
  titulo: string;
  coordenador: string;
  data_abertura: string;
  status: "rascunho" | "aberta" | "em_andamento" | "concluida" | "cancelada";
  created_at: string;
  updated_at: string;
  itens?: RequisicaoItem[];
  ocs?: OrdemCompra[];
  recebimentos?: Recebimento[];
}

export interface ListarRequisicoeParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export const requisicoesSuprimentosApi = {
  listar: (params?: ListarRequisicoeParams) =>
    api.get<PaginatedResponse<Requisicao>>("/suprimentos/requisicoes", { params }),

  buscar: (id: string) =>
    api.get<Requisicao>(`/suprimentos/requisicoes/${id}`),

  criar: (body: {
    titulo: string;
    coordenador: string;
    data_abertura: string;
    status?: string;
    itens: Array<{
      nome_item: string;
      categoria: string;
      unidade: string;
      quantidade: number;
      valor_item?: number | null;
      data_necessidade?: string | null;
      criticidade: string;
      tipo: string;
    }>;
  }) => api.post<Requisicao>("/suprimentos/requisicoes", body),

  atualizar: (id: string, body: {
    status?: string;
    itens?: Array<{ id: string; quantidade?: number; quantidade_estoque?: number; criticidade?: string }>;
  }) => api.patch(`/suprimentos/requisicoes/${id}`, body),

  registrarOC: (id: string, body: {
    numero_oc: string;
    fornecedor: string;
    valor?: number | null;
    valor_previsto?: number | null;
    previsao_entrega?: string | null;
    item_ids: string[];
  }) => api.post<OrdemCompra>(`/suprimentos/requisicoes/${id}/oc`, body),

  registrarRecebimento: (id: string, body: {
    tipo: "total" | "parcial";
    numero_nota: string;
    data_recebimento: string;
    observacao?: string;
    itens?: Array<{ item_id: string; quantidade_recebida: number }>;
  }) => api.post<Recebimento>(`/suprimentos/requisicoes/${id}/recebimento`, body),

  deletar: (id: string) =>
    api.delete(`/suprimentos/requisicoes/${id}`),

  deletarVarios: (ids: string[]) =>
    api.delete("/suprimentos/requisicoes", { data: { ids } }),
};
