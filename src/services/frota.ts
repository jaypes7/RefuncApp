import { api } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";

export interface FrotaVeiculo {
  id: string;
  placa: string;
  renavam?: string | null;
  crv?: string | null;
  uf?: string | null;
  marca?: string | null;
  modelo?: string | null;
  tipo?: string | null;
  ano_fabricacao?: string | null;
  exercicio_crlv?: string | null;
  combustivel?: string | null;
  chave_reserva?: string | null;
  status?: string | null;
  acao?: string | null;
  aplicacao_devolucao?: string | null;
  data_aplicacao?: string | null;
  gestor?: string | null;
  local_trabalho?: string | null;
  centro_custo?: string | null;
  ut_atual?: string | null;
  condutor_nome?: string | null;
  condutor_re?: string | null;
  telefone?: string | null;
  score_dirigibilidade?: string | null;
  validade_credenciamento?: string | null;
  propriedade?: string | null;
  modalidade?: string | null;
  tipo_contrato?: string | null;
  valor_locacao?: number | null;
  valor_aporte?: number | null;
  cnpj_proprietario?: string | null;
  rastreador?: string | null;
  num_requisicao?: string | null;
  data_requisicao?: string | null;
  status_rv?: string | null;
  chamado?: string | null;
  conteudo?: string | null;
  observacoes?: string | null;
  created_at?: string;
}

export interface FrotaManutencao {
  id: string;
  veiculo_id?: string | null;
  placa: string;
  tipo: "PREVENTIVA" | "CORRETIVA" | "SINISTRO";
  situacao?: string | null;
  km_atual?: number | null;
  previsao_proxima?: string | null;
  km_proxima_revisao?: number | null;
  data_atendimento?: string | null;
  data_parada?: string | null;
  hora?: string | null;
  local_oficina?: string | null;
  descricao_servico?: string | null;
  protocolo?: string | null;
  diretor?: string | null;
  coligada?: string | null;
  created_at?: string;
}

export interface FrotaPrestador {
  id: string;
  nome: string;
  cidade?: string | null;
  classificacao?: string | null;
  link_maps?: string | null;
  telefone?: string | null;
  contato?: string | null;
  motivo_classificacao?: string | null;
  created_at?: string;
}

export interface FrotaFornecedor {
  id: string;
  empresa: string;
  status?: string | null;
  atendimento?: string | null;
  servicos?: string | null;
  contato?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  site_email?: string | null;
  created_at?: string;
}

export interface FrotaCartao {
  id: string;
  numero: string;
  status?: string | null;
  tipo?: string | null;
  veiculo_id?: string | null;
  limite_anterior?: number | null;
  limite_atual?: number | null;
  saldo_atual?: number | null;
  ultima_placa?: string | null;
  ultimo_condutor?: string | null;
  created_at?: string;
}

export interface FrotaTag {
  id: string;
  numero: string;
  status?: string | null;
  marca?: string | null;
  veiculo_id?: string | null;
  created_at?: string;
}

export interface FrotaDashboardData {
  veiculos: {
    total: number;
    porStatus: Array<{ nome: string; total: number }>;
    porTipo: Array<{ nome: string; total: number }>;
    porPropriedade: Array<{ nome: string; total: number }>;
  };
  cartoes: { total: number; estoque: number; ativos: number };
  tags: { total: number; vinculadas: number };
  revisoesProximas: Array<{
    placa: string;
    previsao: string;
    km_proxima_revisao: number | null;
    descricao: string | null;
    vencida: boolean;
  }>;
}

export type ListarFrotaParams = {
  page?: number;
  limit?: number;
  search?: string;
} & Record<string, string | number | undefined>;

function makeFrotaApi<T>(recurso: string) {
  return {
    listar: (params?: ListarFrotaParams) =>
      api.get<PaginatedResponse<T>>(`/frota/${recurso}`, { params }),
    criar: (body: Partial<T>) =>
      api.post<{ data: T }>(`/frota/${recurso}`, body),
    atualizar: (id: string, body: Partial<T>) =>
      api.put<{ data: T }>(`/frota/${recurso}/${id}`, body),
    remover: (id: string) => api.delete(`/frota/${recurso}/${id}`),
  };
}

export const frotaApi = {
  veiculos: makeFrotaApi<FrotaVeiculo>("veiculos"),
  manutencoes: makeFrotaApi<FrotaManutencao>("manutencoes"),
  prestadores: makeFrotaApi<FrotaPrestador>("prestadores"),
  fornecedores: makeFrotaApi<FrotaFornecedor>("fornecedores"),
  cartoes: makeFrotaApi<FrotaCartao>("cartoes"),
  tags: makeFrotaApi<FrotaTag>("tags"),
  dashboard: () => api.get<FrotaDashboardData>("/frota/dashboard"),
};
