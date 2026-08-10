import { api } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";

export interface EtapaConfig {
  id: number;
  nome: string;
  duracaoDias: number;
  /** Persiste no banco — marcada pelo usuário na aba Cronograma */
  concluida?: boolean;
  grupoId?: number | null;
  responsavel?: string | null;
}

export interface GrupoEtapa {
  id: number;
  nome: string;
  ordem: number;
}

export interface ConfigData {
  DIAS_TOTAIS_PROJETO: number;
  DATA_INICIO_PROJETO: string | null;
  DATA_FIM_PROJETO: string | null;
  ETAPA_ATUAL: number;
  META_ADMISSOES: number;
  ETAPAS_PROJETO: EtapaConfig[];
  GRUPOS_ETAPAS: GrupoEtapa[];
  GERENTE_OPERACOES: string | null;
  GERENTE_CONTRATO: string | null;
  NOME_CLIENTE: string | null;
  CENTRO_CUSTO: string | null;
  /** Meta de colaboradores configurada no projeto */
  COLABORADORES_PREVISTOS: number;
  /** Orçamento total de suprimentos (R$) */
  ORCADO_SUPRIMENTOS: number;
}

export const configApi = {
  get: (centroCusto?: string | null) => {
    const params = centroCusto ? `?centro_custo=${encodeURIComponent(centroCusto)}` : "";
    return api.get<{ data: ConfigData }>(`/config${params}`);
  },

  update: (config: {
    dataInicio: string;
    dataFim: string;
    etapas: EtapaConfig[];
    gerenteOperacoes?: string;
    gerenteContrato?: string;
    nomeCliente?: string;
    centroCusto?: string;
  }) => api.post("/config", config),
};

export interface Clinica {
  id: number;
  nome: string;
}

export const clinicasApi = {
  listar: () => api.get<Clinica[]>("/clinicas"),
};

export type AcaoLog =
  | "LOGIN"
  | "LOGOUT"
  | "ADICIONAR"
  | "EDITAR"
  | "REMOVER"
  | "IMPORTAR"
  | "EXPORTAR"
  | "CONFIG";

export interface LogEntry {
  timestamp: string;
  usuario: string;
  acao: AcaoLog;
  detalhes: string;
  cpfColaborador?: string | null;
}

export interface ListarLogsParams {
  page?: number;
  limit?: number;
  usuario?: string;
  acao?: AcaoLog;
  dataInicio?: string;
  dataFim?: string;
}

export const logsApi = {
  listar: (params?: ListarLogsParams) =>
    api.get<
      PaginatedResponse<LogEntry> & {
        resumo: {
          contagemPorAcao: Record<AcaoLog, number>;
          totalGeral: number;
        };
      }
    >("/logs", { params }),
};

export interface UsuarioPermitido {
  id: string;
  re: string;
  nome: string;
  perfil: string;
  autorizadoEm: string;
}

export const usuariosPermitidosApi = {
  listar: () => api.get<{ usuarios: UsuarioPermitido[] }>("/usuarios-permitidos"),

  criar: (data: { re: string; nome: string; perfil?: string }) =>
    api.post("/usuarios-permitidos", data),

  remover: (id: string) => api.delete(`/usuarios-permitidos/${id}`),
};
