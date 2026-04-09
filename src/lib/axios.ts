/**
 * ============================================================================
 * AXIOS CLIENT - Configuração da API
 * ============================================================================
 *
 * Cliente HTTP configurado para comunicação com as APIs do Next.js.
 * Inclui interceptores para tratamento de erros e redirecionamento.
 */

import axios from "axios";

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

export const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Importante: envia cookies JWT
});

// ============================================================================
// INTERCEPTORES
// ============================================================================

// Interceptor de requisição
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de resposta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Tratamento de erro 401 - Não autorizado
    if (error.response?.status === 401) {
      // Só redireciona se não estiver já na página de login
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// FUNÇÕES DE API - COLABORADORES
// ============================================================================

export interface Colaborador {
  IND?: string | null;
  STATUS?: string | null;
  ENVIADO_RH?: string | null;
  PESSOA?: string | null;
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
  TERMINO?: string | null;
  PRORROGACAO?: string | null;
  DEMISSAO?: string | null;
  MUNICIPIO?: string | null;
  UF?: string | null;
  TELEFONE?: string | null;
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
  setor?: "RH" | "LOGISTICA" | "SEGURANCA";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const colaboradoresApi = {
  listar: (params?: ListarColaboradoresParams) =>
    api.get<PaginatedResponse<Colaborador>>("/colaboradores", { params }),

  buscar: (cpf: string) =>
    api.get<{ data: Colaborador }>(`/colaboradores/${cpf}`),

  criar: (colaborador: Partial<Colaborador>) =>
    api.post("/colaboradores", colaborador),

  atualizar: (cpf: string, colaborador: Partial<Colaborador>) =>
    api.put(`/colaboradores/${cpf}`, colaborador),

  remover: (cpf: string) => api.delete(`/colaboradores/${cpf}`),
};

// ============================================================================
// FUNÇÕES DE API - AUTH
// ============================================================================

export interface User {
  re: string;
  nome: string | null;
  perfil: string | null;
}

export const authApi = {
  login: (re: string) =>
    api.post<{
      success: boolean;
      user: User;
    }>("/auth/login", { re }),

  logout: () => api.post("/auth/logout"),

  me: () =>
    api.get<{
      user: User;
    }>("/auth/me"),
};

// ============================================================================
// FUNÇÕES DE API - DASHBOARD
// ============================================================================

export interface DashboardData {
  metricas: {
    totalCadastrados: number;
    totalAdmitidos: number;
    totalLiberados: number;
    totalEmTreinamento: number;
    percentualMOB: number;
    percentualASO: number;
    percentualPortal: number;
    /** Meta de colaboradores configurada no projeto */
    colaboradoresPrevistos: number;
  };
  progresso: {
    real: number;
    planejado: number;
  };
  projeto: {
    dataInicio: string | null;
    dataFim: string | null;
    diasCorridos: number;
    metaAdmissoes: number;
    status: {
      atrasado: boolean;
      diasAtraso: number;
      percentualAtraso: number;
    } | null;
  };
  graficos: {
    curvaS: {
      labels: string[];
      planejado: number[];
      realizado?: number[];
      valoresHoje?: { planejado: number; realizado: number } | null;
    } | null;
    evolucaoPorSetor: {
      rh: { total: number; percentual: number };
      logistica: { total: number; percentual: number };
      seguranca: { total: number; percentual: number };
    };
    admissoesAcumuladas: Array<{
      data: string;
      quantidade: number;
      acumulado: number;
    }>;
    statusCount: {
      Ativo: number;
      Pendente: number;
      Inativo: number;
      Desligado: number;
    };
  };
  /** Atraso físico por etapa do cronograma (máx. 10) */
  pendencias: Array<{
    tipo: "etapa";
    nivel: 1 | 2;
    cor: "red" | "yellow";
    nome: string;
    dataLimite: string;
    diasAtraso: number;
    percentualFaltando: number;
    status: "Atrasado" | "Em Andamento";
  }>;
  /** Agregações para os dashboards temáticos (RH, Logística, etc.) */
  agregacoes: {
    /** Distribuição por função CLT — alimenta gráfico de pizza/bar no dashboard RH */
    distribuicaoFuncoes: Array<{ nome: string; total: number }>;
    /** Distribuição por faixa etária — alimenta gráfico de bar no dashboard RH */
    distribuicaoIdades: Array<{ faixa: string; total: number }>;
    /** Distribuição por UF — alimenta gráfico de bar/mapa no dashboard Geral */
    distribuicaoUF: Array<{ uf: string; total: number }>;
    /** Distribuição por fase MOB — agrupa colaboradores por valor do campo MOB */
    distribuicaoMob: Array<{ mob: string; total: number }>;
    /** Ocupação dos hotéis — vagasTotais x vagasPreenchidas (VINCULADO === nome do hotel) */
    vagasHoteis: Array<{
      hotel: string;
      vagasTotais: number;
      vagasPreenchidas: number;
      percentual: number;
    }>;
    /** Dados da aba SUPRIMENTOS */
    suprimentos: {
      /** Soma de todos os VALORES (R$) */
      totalInvestido: number;
      /** Número total de ordens de compra */
      totalOrdens: number;
      /** Ordens com ENTREGUE_OBRA === "Sim" */
      entregues: number;
      /** Percentual de entrega (0-100) */
      percentualEntregue: number;
      /** Valor orçado para suprimentos (config do projeto) */
      orcado: number;
      /** Contagem por STATUS para o PieChart */
      distribuicaoStatus: Array<{ status: string; total: number }>;
      /** Linhas brutas para a tabela (ordem original da planilha) */
      ordens: Array<{
        ordemCompra: string;
        totalReqPrevistas: number;
        valores: number;
        status: string;
        entregueObra: string;
      }>;
    };
    /** Distribuição por turno de trabalho */
    turnoTrabalho: Array<{ turno: string; total: number }>;
    /** Contratos com TERMINO definido, agrupados por função */
    terminoPorFuncao: Array<{ funcao: string; total: number }>;
  };
}

export const dashboardApi = {
  get: () => api.get<DashboardData>("/dashboard"),
};

// ============================================================================
// TIPOS ESPECÍFICOS POR DOMÍNIO
// ============================================================================

/** Shape retornada por GET /api/dashboard/principal */
export type DashboardPrincipalData = {
  metricas: DashboardData["metricas"];
  projeto: DashboardData["projeto"];
  pendencias: DashboardData["pendencias"];
  graficos: Omit<DashboardData["graficos"], "curvaS"> & {
    curvaS: {
      labels: string[];
      planejado: (number | null)[];
      realizado?: (number | null)[];
      valoresHoje?: { planejado: number; realizado: number } | null;
    } | null;
  };
  etapasCount: number;
  agregacoes: Pick<DashboardData["agregacoes"], "distribuicaoFuncoes" | "distribuicaoMob">;
};

/** Shape retornada por GET /api/dashboard/rh */
export type DashboardRhData = {
  metricas: { totalCadastrados: number; totalAdmitidos: number; percentualASO: number };
  agregacoes: {
    distribuicaoIdades: DashboardData["agregacoes"]["distribuicaoIdades"];
    distribuicaoFuncoes: DashboardData["agregacoes"]["distribuicaoFuncoes"];
    terminoDetalhado: Array<{ nome: string; funcao_clt: string | null; termino: string }>;
  };
};

/** Shape retornada por GET /api/dashboard/logistica */
export type DashboardLogisticaData = {
  kpis: { totalVagas: number; totalPreenchidas: number; totalDisponiveis: number; ocupacaoTotal: number };
  vagasHoteis: DashboardData["agregacoes"]["vagasHoteis"];
  turnoTrabalho: DashboardData["agregacoes"]["turnoTrabalho"];
};

/** Shape retornada por GET /api/dashboard/suprimentos */
export type DashboardSuprimentosData = {
  suprimentos: Omit<DashboardData["agregacoes"]["suprimentos"], "ordens">;
};

// ============================================================================
// HELPERS DE API POR DOMÍNIO
// ============================================================================

export const dashboardPrincipalApi = {
  get: () => api.get<DashboardPrincipalData>("/dashboard/principal"),
};

export const dashboardRhApi = {
  get: () => api.get<DashboardRhData>("/dashboard/rh"),
};

export const dashboardLogisticaApi = {
  get: () => api.get<DashboardLogisticaData>("/dashboard/logistica"),
};

export const dashboardSuprimentosApi = {
  get: () => api.get<DashboardSuprimentosData>("/dashboard/suprimentos"),
};

// ============================================================================
// FUNÇÕES DE API - CONFIG
// ============================================================================

export interface EtapaConfig {
  id: number;
  nome: string;
  duracaoDias: number;
  /** Persiste no banco — marcada pelo usuário na aba Cronograma */
  concluida?: boolean;
}

export interface ConfigData {
  DIAS_TOTAIS_PROJETO: number;
  DATA_INICIO_PROJETO: string | null;
  DATA_FIM_PROJETO: string | null;
  ETAPA_ATUAL: number;
  META_ADMISSOES: number;
  ETAPAS_PROJETO: EtapaConfig[];
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
  get: () => api.get<{ data: ConfigData }>("/config"),

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

// ============================================================================
// FUNÇÕES DE API - CLINICAS
// ============================================================================

export interface Clinica {
  id: number;
  nome: string;
}

export const clinicasApi = {
  listar: () => api.get<{ data: Clinica[] }>("/clinicas"),
};

// ============================================================================
// FUNÇÕES DE API - LOGS
// ============================================================================

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

// ============================================================================
// FUNÇÕES DE API - USUÁRIOS PERMITIDOS
// ============================================================================

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

// ============================================================================
// FUNÇÕES DE API - EXPORT
// ============================================================================

export interface ExportParams {
  search?: string;
  status?: string;
  setor?: string;
}

export interface ExportResponse {
  data: Colaborador[];
  total: number;
}

export const exportApi = {
  exportar: (params?: ExportParams) =>
    api.get<ExportResponse>("/export", { params }),
};

// ============================================================================
// FUNÇÕES DE API - OCORRÊNCIAS
// ============================================================================

export interface Ocorrencia {
  id: number;
  texto: string;
  /** ISO date string YYYY-MM-DD */
  data: string;
  created_at: string;
}

export const ocorrenciasApi = {
  listar: () => api.get<{ data: Ocorrencia[] }>("/ocorrencias"),

  criar: (body: { texto: string; data: string }) =>
    api.post<{ data: Ocorrencia }>("/ocorrencias", body),

  deletar: (id: number) => api.delete(`/ocorrencias/${id}`),
};
