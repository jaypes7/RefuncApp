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
  TERMINO?: string | null;
  PRORROGACAO?: string | null;
  DEMISSAO?: string | null;
  MUNICIPIO?: string | null;
  UF?: string | null;
  TELEFONE?: string | null;
  NUMERO_ORACLE?: number | null;
  CENTRO_CUSTO?: string | null;
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

// ============================================================================
// FUNÇÕES DE API - AUTH
// ============================================================================

export interface User {
  re: string;
  nome: string | null;
  perfil: string | null;
  centro_custo?: string[] | null;
  precisaRedefinirSenha?: boolean;
}

export const authApi = {
  login: (re: string, senha: string) =>
    api.post<{
      success: boolean;
      user: User;
    }>("/auth/login", { re, senha }),

  logout: () => api.post("/auth/logout"),

  me: () =>
    api.get<{
      user: User;
    }>("/auth/me"),

  resetPassword: (novaSenha: string) =>
    api.post("/auth/reset-password", { novaSenha }),
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
      valoresHoje?: {
        diario?: { planejado: number; realizado: number } | null;
        etapas?: { planejado: number; realizado: number } | null;
      } | null;
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
      detalhes?: Array<{
        etapaId: number;
        etapaNome: string;
        planejadoEtapa: number;
        realizadoEtapa: number;
        mediaPlanejadoEtapas?: number;
        mediaRealizadoEtapas?: number;
      }>;
      valoresHoje?: {
        diario?: { planejado: number; realizado: number } | null;
        etapas?: { planejado: number; realizado: number } | null;
      } | null;
    } | null;
  };
  etapasCount: number;
  etapas: Array<{
    id: number;
    nome: string;
    duracaoDias: number;
    percentualConcluido: number;
    concluida: boolean;
    dataInicio?: string;
    dataFim?: string;
    evolucaoDiaria?: Array<{ data: string; previsto: number; realizado: number }>;
    temRegistros?: boolean;
  }>;
  agregacoes: Pick<DashboardData["agregacoes"], "distribuicaoFuncoes" | "distribuicaoMob"> & {
    terminoDetalhado: Array<{
      nome: string;
      funcao_clt: string | null;
      termino: string;
      status: string | null;
      uf: string | null;
    }>;
  };
};

/** Shape retornada por GET /api/dashboard/rh */
export type DashboardRhData = {
  metricas: { totalCadastrados: number; totalAdmitidos: number; percentualASO: number; mediaIdade: number };
  agregacoes: {
    distribuicaoIdades: DashboardData["agregacoes"]["distribuicaoIdades"];
    distribuicaoFuncoes: DashboardData["agregacoes"]["distribuicaoFuncoes"];
    distribuicaoUF: DashboardData["agregacoes"]["distribuicaoUF"];
    terminoDetalhado: Array<{ nome: string; funcao_clt: string | null; termino: string; status: string | null; uf: string | null }>;
    distribuicaoASO: Array<{ status: string; total: number }>;
    distribuicaoSexo: Array<{ sexo: string; total: number }>;
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
  get: (centroCusto?: string | null) => {
    const params = centroCusto ? `?centro_custo=${encodeURIComponent(centroCusto)}` : "";
    return api.get<DashboardPrincipalData>(`/dashboard/principal${params}`);
  },
};

export const dashboardRhApi = {
  get: (centroCusto?: string | null) => {
    const params = centroCusto ? `?centro_custo=${encodeURIComponent(centroCusto)}` : "";
    return api.get<DashboardRhData>(`/dashboard/rh${params}`);
  },
};

export type ChecklistEtapa = {
  id: number;
  centro_custo: string;
  etapa_origem_id: number | null;
  nome: string;
  ordem: number;
  created_at?: string;
};

export type ChecklistSubetapa = {
  id: string;
  centro_custo: string | null;
  etapa_id: number;
  nome: string;
  setor: string | null;
  responsavel: string | null;
  previsto: number | null;
  avanco: number | null;
  data_inicio: string | null;
  data_termino: string | null;
  observacao: string | null;
  ordem: number;
  created_at?: string;
};

export const checklistMobilizacaoApi = {
  listar: (centroCusto?: string | null) => {
    const params = centroCusto ? `?centro_custo=${encodeURIComponent(centroCusto)}` : "";
    return api.get<{ etapas: ChecklistEtapa[]; subetapas: ChecklistSubetapa[] }>(`/checklist-mobilizacao${params}`);
  },
  criar: (data: Omit<ChecklistSubetapa, "id" | "created_at">) => {
    const params = data.centro_custo ? `?centro_custo=${encodeURIComponent(data.centro_custo)}` : "";
    return api.post<{ id: string }>(`/checklist-mobilizacao${params}`, data);
  },
  atualizar: (id: string, data: Partial<Omit<ChecklistSubetapa, "id" | "created_at">>) =>
    api.patch(`/checklist-mobilizacao/${id}`, data),
  remover: (id: string) => api.delete(`/checklist-mobilizacao/${id}`),
};

export const checklistEtapasApi = {
  criar: (data: Omit<ChecklistEtapa, "id" | "created_at">) => {
    const params = data.centro_custo ? `?centro_custo=${encodeURIComponent(data.centro_custo)}` : "";
    return api.post<{ id: number }>(`/checklist-mobilizacao/etapas${params}`, data);
  },
  atualizar: (id: number, data: Partial<Omit<ChecklistEtapa, "id" | "created_at">>) =>
    api.patch(`/checklist-mobilizacao/etapas/${id}`, data),
  remover: (id: number) => api.delete(`/checklist-mobilizacao/etapas/${id}`),
  reordenar: (etapas: Array<{ id: number; ordem: number }>) =>
    api.put("/checklist-mobilizacao/etapas/reordenar", { etapas }),
};

export const dashboardLogisticaApi = {
  get: (centroCusto?: string | null) => {
    const params = centroCusto ? `?centro_custo=${encodeURIComponent(centroCusto)}` : "";
    return api.get<DashboardLogisticaData>(`/dashboard/logistica${params}`);
  },
};

export const dashboardSuprimentosApi = {
  get: (centroCusto?: string | null) => {
    const params = centroCusto ? `?centro_custo=${encodeURIComponent(centroCusto)}` : "";
    return api.get<DashboardSuprimentosData>(`/dashboard/suprimentos${params}`);
  },
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

// ============================================================================
// FUNÇÕES DE API - OCORRÊNCIAS
// ============================================================================

export interface Ocorrencia {
  id: number;
  texto: string;
  /** ISO date string YYYY-MM-DD */
  data: string;
  created_at: string;
  centro_custo?: string;
}

export const ocorrenciasApi = {
  listar: (centroCusto?: string | null) => {
    const params = centroCusto ? `?centro_custo=${encodeURIComponent(centroCusto)}` : "";
    return api.get<{ data: Ocorrencia[] }>(`/ocorrencias${params}`);
  },

  criar: (body: { texto: string; data: string; centro_custo?: string }) =>
    api.post<{ data: Ocorrencia }>("/ocorrencias", body),

  atualizar: (id: number, body: { texto: string; data: string; centro_custo?: string }) =>
    api.put<{ data: Ocorrencia }>(`/ocorrencias/${id}`, body),

  deletar: (id: number) => api.delete(`/ocorrencias/${id}`),
};

// ============================================================================
// FUNÇÕES DE API - PENDÊNCIAS MANUAIS
// ============================================================================

export interface PendenciaManual {
  id: number;
  texto: string;
  created_at: string;
  centro_custo?: string;
}

export const pendenciasApi = {
  listar: (centroCusto?: string | null) => {
    const params = centroCusto ? `?centro_custo=${encodeURIComponent(centroCusto)}` : "";
    return api.get<{ data: PendenciaManual[] }>(`/pendencias${params}`);
  },

  criar: (body: { texto: string; centro_custo?: string }) =>
    api.post<{ data: PendenciaManual }>("/pendencias", body),

  atualizar: (id: number, body: { texto: string; centro_custo?: string }) =>
    api.put<{ data: PendenciaManual }>(`/pendencias/${id}`, body),

  deletar: (id: number) => api.delete(`/pendencias/${id}`),
};

// ============================================================================
// FUNÇÕES DE API - BANCO DE TALENTOS
// ============================================================================

export interface BancoTalento {
  id: string;
  pessoa?: string | null;
  nome: string;
  idade?: number | null;
  dt_nasc?: string | null;
  cpf?: string | null;
  municipio?: string | null;
  uf?: string | null;
  telefone?: string | null;
  created_at?: string | null;
}

export interface ListarBancoTalentosParams {
  page?: number;
  limit?: number;
  search?: string;
  pessoa?: string;
  cpf?: string;
  municipio?: string;
}

export const bancoTalentosApi = {
  listar: (params?: ListarBancoTalentosParams) =>
    api.get<PaginatedResponse<BancoTalento>>("/banco-talentos", { params }),

  criar: (talento: Omit<BancoTalento, "id" | "created_at">) =>
    api.post<{ data: BancoTalento }>("/banco-talentos", talento),

  atualizar: (id: string, talento: Partial<Omit<BancoTalento, "id" | "created_at">>) =>
    api.put<{ data: BancoTalento }>(`/banco-talentos/${id}`, talento),

  remover: (id: string) => api.delete(`/banco-talentos/${id}`),

  importar: (body: { rows: Record<string, unknown>[] }) =>
    api.post("/banco-talentos/import", body),

  realocar: (body: { id: string; novo_centro_custo: string }) =>
    api.post("/banco-talentos/realocar", body),
};

// ============================================================================
// FUNÇÕES DE API - REGISTROS FOTOGRÁFICOS
// ============================================================================

export interface RegistroFotografico {
  id: string;
  nome: string;
  descricao?: string | null;
  centro_custo: string;
  urls: string[];
  created_at: string;
  created_by?: string | null;
}

export const registrosFotograficosApi = {
  listar: (centroCusto?: string | null) => {
    const params = centroCusto ? `?centro_custo=${encodeURIComponent(centroCusto)}` : "";
    return api.get<{ data: RegistroFotografico[] }>(`/registros-fotograficos${params}`);
  },

  criar: (formData: FormData) =>
    api.post<{ data: RegistroFotografico }>("/registros-fotograficos", formData, {
      headers: { "Content-Type": undefined },
    }),

  atualizar: (id: string, body: { nome: string; descricao?: string | null }) =>
    api.put<{ data: RegistroFotografico }>(`/registros-fotograficos/${id}`, body),

  atualizarComFotos: (id: string, formData: FormData) =>
    api.put<{ data: RegistroFotografico }>(`/registros-fotograficos/${id}`, formData, {
      headers: { "Content-Type": undefined },
    }),

  remover: (id: string) => api.delete(`/registros-fotograficos/${id}`),
};

// ============================================================================
// FUNÇÕES DE API - COMENTÁRIOS DO CLIENTE
// ============================================================================

export interface ComentarioCliente {
  id: number;
  texto: string;
  /** ISO date string YYYY-MM-DD */
  data: string;
  created_at: string;
  centro_custo?: string;
}

export const comentariosClienteApi = {
  listar: (centroCusto?: string | null) => {
    const params = centroCusto ? `?centro_custo=${encodeURIComponent(centroCusto)}` : "";
    return api.get<{ data: ComentarioCliente[] }>(`/comentarios-cliente${params}`);
  },

  criar: (body: { texto: string; data: string; centro_custo?: string }) =>
    api.post<{ data: ComentarioCliente }>("/comentarios-cliente", body),

  atualizar: (id: number, body: { texto: string; data: string; centro_custo?: string }) =>
    api.put<{ data: ComentarioCliente }>(`/comentarios-cliente/${id}`, body),

  deletar: (id: number) => api.delete(`/comentarios-cliente/${id}`),
};

// ============================================================================
// FUNÇÕES DE API - COLABORADORES RESTRITOS
// ============================================================================

export interface ColaboradorRestrito {
  id: string;
  nome: string;
  cpf?: string | null;
  tipo_demissao?: string | null;
  motivo_demissao?: string | null;
  created_at?: string | null;
}

export interface ListarColaboradoresRestritosParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const colaboradoresRestritosApi = {
  listar: (params?: ListarColaboradoresRestritosParams) =>
    api.get<PaginatedResponse<ColaboradorRestrito>>("/colaboradores-restritos", { params }),

  criar: (body: Omit<ColaboradorRestrito, "id" | "created_at">) =>
    api.post<{ data: ColaboradorRestrito }>("/colaboradores-restritos", body),

  atualizar: (id: string, body: Partial<Omit<ColaboradorRestrito, "id" | "created_at">>) =>
    api.put<{ data: ColaboradorRestrito }>(`/colaboradores-restritos/${id}`, body),

  remover: (id: string) => api.delete(`/colaboradores-restritos/${id}`),

  verificarAcesso: () => api.get<{ hasAccess: boolean }>("/auth/restrito"),

  importar: (body: { rows: Record<string, unknown>[] }) =>
    api.post<{
      inseridos: number;
      atualizados: number;
      ignorados: number;
      erros: Array<{ linha: number; motivo: string }>;
      total: number;
    }>("/colaboradores-restritos/import", body),
};
