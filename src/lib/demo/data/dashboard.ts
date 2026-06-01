import { DEMO_COLABORADORES } from "./colaboradores";
import { DEMO_CONFIG, DEMO_ETAPAS, DEMO_HOTEIS } from "./config";

function relDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

// ── Dashboard Principal ──────────────────────────────────────────────────────

export function getDashboardPrincipal() {
  const total = DEMO_COLABORADORES.length;
  const ativos = DEMO_COLABORADORES.filter((c) => c.status === "Ativo").length;
  const pendentes = DEMO_COLABORADORES.filter((c) => c.status === "Pendente").length;
  const aptos = DEMO_COLABORADORES.filter((c) => c.aso_status === "Apto").length;
  const previstos = DEMO_CONFIG.colaboradores_previstos;

  const mob_pct = Math.round((ativos / previstos) * 100);
  const aso_pct = Math.round((aptos / total) * 100);

  const curvaS = DEMO_ETAPAS.map((e, i) => ({
    etapa: e.nome,
    planejado: Math.round((i + 1) * (100 / DEMO_ETAPAS.length)),
    realizado: Math.max(0, Math.round((i + 1) * (100 / DEMO_ETAPAS.length)) - (i > 4 ? 8 : 0)),
  }));

  return {
    totais: {
      colaboradores: total,
      previstos,
      ativos,
      pendentes,
      mob_pct,
      aso_pct,
    },
    config: DEMO_CONFIG,
    etapas: DEMO_ETAPAS,
    curva_s: curvaS,
    ocorrencias_abertas: 3,
    pendencias_abertas: 7,
  };
}

// ── Dashboard RH ─────────────────────────────────────────────────────────────

export function getDashboardRH() {
  const faixasEtarias = [
    { faixa: "18-25", total: DEMO_COLABORADORES.filter((c) => c.idade <= 25).length },
    { faixa: "26-35", total: DEMO_COLABORADORES.filter((c) => c.idade >= 26 && c.idade <= 35).length },
    { faixa: "36-45", total: DEMO_COLABORADORES.filter((c) => c.idade >= 36 && c.idade <= 45).length },
    { faixa: "46+",   total: DEMO_COLABORADORES.filter((c) => c.idade >= 46).length },
  ];

  const porUF = ["PA", "SP", "BA", "RJ", "MG", "CE"].map((uf) => ({
    uf,
    total: DEMO_COLABORADORES.filter((c) => c.uf === uf).length,
  })).filter((x) => x.total > 0);

  const porFuncao = Array.from(
    DEMO_COLABORADORES.reduce((acc, c) => {
      acc.set(c.funcao, (acc.get(c.funcao) ?? 0) + 1);
      return acc;
    }, new Map<string, number>()),
  )
    .map(([funcao, total]) => ({ funcao, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const porContrato = [
    { tipo: "CLT", total: DEMO_COLABORADORES.filter((c) => c.contrato_tipo === "CLT").length },
    { tipo: "PJ",  total: DEMO_COLABORADORES.filter((c) => c.contrato_tipo === "PJ").length },
  ];

  return {
    total: DEMO_COLABORADORES.length,
    admitidos: DEMO_COLABORADORES.filter((c) => c.data_admissao).length,
    pendentes: DEMO_COLABORADORES.filter((c) => !c.data_admissao).length,
    faixas_etarias: faixasEtarias,
    por_uf: porUF,
    por_funcao: porFuncao,
    por_contrato: porContrato,
    aso: {
      apto: DEMO_COLABORADORES.filter((c) => c.aso_status === "Apto").length,
      inapto: DEMO_COLABORADORES.filter((c) => c.aso_status === "Inapto").length,
      pendente: DEMO_COLABORADORES.filter((c) => c.aso_status === "Pendente").length,
    },
  };
}

// ── Dashboard Logística ───────────────────────────────────────────────────────

export function getDashboardLogistica() {
  const totalVagas = DEMO_HOTEIS.reduce((s, h) => s + h.vagas_total, 0);
  const totalOcupadas = DEMO_HOTEIS.reduce((s, h) => s + h.vagas_ocupadas, 0);

  return {
    total_vagas: totalVagas,
    total_ocupadas: totalOcupadas,
    vagas_livres: totalVagas - totalOcupadas,
    ocupacao_pct: Math.round((totalOcupadas / totalVagas) * 100),
    hoteis: DEMO_HOTEIS.map((h) => ({
      ...h,
      ocupacao_pct: Math.round((h.vagas_ocupadas / h.vagas_total) * 100),
    })),
    turnos: [
      { turno: "Diurno", total: 75 },
      { turno: "Noturno", total: 35 },
      { turno: "12x36", total: 10 },
    ],
  };
}

// ── Dashboard Suprimentos ─────────────────────────────────────────────────────

export function getDashboardSuprimentos() {
  return {
    total_investido: 623450.75,
    orcado: DEMO_CONFIG.orcado_suprimentos,
    total_ordens: 18,
    ordens_entregues: 11,
    ordens_pendentes: 5,
    ordens_atrasadas: 2,
    entrega_pct: 61,
    status_ordens: [
      { status: "Entregue",  total: 11 },
      { status: "Pendente",  total: 5  },
      { status: "Atrasada",  total: 2  },
    ],
  };
}

// ── Dashboard Segurança ───────────────────────────────────────────────────────

export function getDashboardSeguranca() {
  const total = DEMO_COLABORADORES.length;
  return {
    total_fits: total,
    aptos: DEMO_COLABORADORES.filter((c) => c.aso_status === "Apto").length,
    inaptos: DEMO_COLABORADORES.filter((c) => c.aso_status === "Inapto").length,
    pendentes: DEMO_COLABORADORES.filter((c) => c.aso_status === "Pendente").length,
    treinamentos_concluidos: DEMO_COLABORADORES.filter((c) => c.treinamento === "Concluído").length,
    portal_aprovados: DEMO_COLABORADORES.filter((c) => c.portal === "Liberado").length,
    status_portal: [
      { status: "Liberado",  total: DEMO_COLABORADORES.filter((c) => c.portal === "Liberado").length  },
      { status: "Pendente",  total: DEMO_COLABORADORES.filter((c) => c.portal === "Pendente").length  },
      { status: "Bloqueado", total: DEMO_COLABORADORES.filter((c) => c.portal === "Bloqueado").length },
    ],
    distribuicao_aso: [
      { label: "Apto",     value: DEMO_COLABORADORES.filter((c) => c.aso_status === "Apto").length     },
      { label: "Inapto",   value: DEMO_COLABORADORES.filter((c) => c.aso_status === "Inapto").length   },
      { label: "Pendente", value: DEMO_COLABORADORES.filter((c) => c.aso_status === "Pendente").length },
    ],
    status_treinamentos: [
      { status: "Concluído",    total: DEMO_COLABORADORES.filter((c) => c.treinamento === "Concluído").length    },
      { status: "Em Andamento", total: DEMO_COLABORADORES.filter((c) => c.treinamento === "Em Andamento").length },
      { status: "Pendente",     total: DEMO_COLABORADORES.filter((c) => c.treinamento === "Pendente").length     },
    ],
  };
}
