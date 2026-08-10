import { api } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";

export interface Colaborador {
  id?: string;
  IND?: string | null;
  STATUS?: string | null;
  ENVIADO_RH?: string | null;
  PESSOA?: string | null;
  SEXO?: string | null;
  REQ?: string | null;
  VINCULADO?: string | null;
  CARTA_OFERTA?: string | null;
  COLAB_PEND?: string | null;
  EXAME?: string | null;
  CLINICA?: string | null;
  DOCS?: string | null;
  ASO?: string | null;
  RPV?: string | null;
  PRE_ADMISSAO?: string | null;
  MOB?: string | null;
  OP?: string | null;
  TIPO_CONTRATO?: string | null;
  DATA_ADMISSAO?: string | null;
  CONTRATO?: string | null;
  PORTAL?: string | null;
  CRACHA?: string | null;
  PONTO?: string | null;
  TREINAMENTO?: string | null;
  REALIZAR_TREINAMENTO?: string | null;
  LOCAL_TREINAMENTO?: string | null;
  RE?: string | null;
  NOME: string;
  FUNCAO_CLT?: string | null;
  HISTOGRAMA?: string | null;
  IDADE?: number | null;
  DT_NASCIMENTO?: string | null;
  CPF: string;
  VR?: string | null;
  FRETADO?: string | null;
  TERMINO?: string | null;
  PRORROGACAO?: string | null;
  DEMISSAO?: string | null;
  MUNICIPIO?: string | null;
  UF?: string | null;
  TELEFONE?: string | null;
  NUMERO_ORACLE?: number | null;
  CENTRO_CUSTO?: string | null;
  ESCOLARIDADE?: string | null;
  EXPERIENCIA_FUNCAO?: string | null;
  turno_trabalho?: string | null;
  TURNO_TRABALHO?: string | null;
  CHECK_IN?: string | null;
  HOTEL?: string | null;
  DATA_VIAGEM?: string | null;
  CREATED_AT?: string | null;
  progresso?: {
    rh: number;
    logistica: number;
    seguranca: number;
    geral: number;
  };
  _rowIndex?: number;
}

export interface ListarColaboradoresParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  cargo?: string;
  centro_custo?: string;
}

export const colaboradoresApi = {
  listar: (params?: ListarColaboradoresParams) =>
    api.get<PaginatedResponse<Colaborador>>("/colaboradores", { params }),

  buscar: (id: string) =>
    api.get<{ data: Colaborador }>(`/colaboradores/${id}`),

  criar: (colaborador: Partial<Colaborador>) =>
    api.post("/colaboradores", colaborador),

  atualizar: (id: string, colaborador: Partial<Colaborador>) =>
    api.put(`/colaboradores/${id}`, colaborador),

  remover: (id: string) => api.delete(`/colaboradores/${id}`),

  realocar: (body: { id: string; novo_centro_custo: string }) =>
    api.post("/colaboradores/realocar", body),
};

export interface ExportParams {
  search?: string;
  status?: string;
  cargo?: string;
  centro_custo?: string;
}

export interface ExportResponse {
  data: Colaborador[];
  total: number;
}

export const exportApi = {
  exportar: (params?: ExportParams) =>
    api.get<ExportResponse>("/export", { params }),
};
