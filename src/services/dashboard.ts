import { api } from "@/lib/http";

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
      Desistente: number;
      Desligado: number;
      "Restrição Cliente": number;
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
    diasExtras?: number;
    motivoAtraso?: string | null;
    datasAtraso?: string[];
    diasAdiantados?: number;
    motivoAdiantamento?: string | null;
    datasAdiantamento?: string[];
  }>;
  agregacoes: Pick<DashboardData["agregacoes"], "distribuicaoFuncoes" | "distribuicaoMob"> & {
    terminoDetalhado: Array<{
      nome: string;
      funcao_clt: string | null;
      termino: string;
      prorrogado: boolean;
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
    terminoDetalhado: Array<{ nome: string; funcao_clt: string | null; termino: string; prorrogado: boolean; status: string | null; uf: string | null }>;
    distribuicaoASO: Array<{ status: string; total: number }>;
    distribuicaoSexo: Array<{ sexo: string; total: number }>;
    distribuicaoEscolaridade: Array<{ escolaridade: string; total: number }>;
    distribuicaoExperienciaFuncao: Array<{ experiencia: string; total: number }>;
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
  suprimentos: {
    totalInvestido: number;
    totalOrdens: number;
    totalAPagar: number;
    orcado: number;
    investido: number;
    distribuicaoStatus: Array<{ status: string; total: number }>;
    porCategoria: Array<{ categoria: string; valor: number }>;
    sgpPorTipo: Array<{ tipo: string; valor: number }>;
    ocAbertas: number;
    qtRecebimentos: number;
    itensPendentes: Array<{
      requisicao_id: string;
      numero_oc: string;
      item_id: string;
      nome_item: string;
      quantidade: number;
      quantidade_recebida: number;
      faltam: number;
    }>;
    ocAtrasadas: Array<{
      numero_oc: string;
      fornecedor: string;
      previsao_entrega: string;
      itens_pendentes: Array<{
        nome_item: string;
        quantidade: number;
        recebido: number;
        faltam: number;
      }>;
    }>;
  };
};

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
