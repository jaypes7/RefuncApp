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
    total_investido: 354050,
    orcado: DEMO_CONFIG.orcado_suprimentos,
    total_ordens: 12,
    ordens_entregues: 7,
    ordens_pendentes: 4,
    ordens_atrasadas: 1,
    entrega_pct: 58,
    status_ordens: [
      { status: "Entregue",  total: 7 },
      { status: "Pendente",  total: 4 },
      { status: "Atrasada",  total: 1 },
    ],
    por_categoria: [
      { categoria: "EPI",        total: 4, valor: 159700 },
      { categoria: "Uniforme",   total: 2, valor: 46800  },
      { categoria: "Ferramenta", total: 3, valor: 75500  },
      { categoria: "Serviço",    total: 2, valor: 54000  },
      { categoria: "Outros",     total: 1, valor: 18050  },
    ],
  };
}

// ── Dashboard Segurança ───────────────────────────────────────────────────────
// Shape exato esperado pela página dashboard/seguranca/page.tsx:
// { total, distribuicaoRpv, distribuicaoTreinamento, distribuicaoStatusPortal }

export function getDashboardSeguranca() {
  const total = DEMO_COLABORADORES.length;

  // Portal — labels exatos usados pela página: "Aprovado", "Pendente", "Aprovado - DEMITIDO"
  const distribuicaoStatusPortal = [
    { label: "Aprovado",            value: DEMO_COLABORADORES.filter((c) => c.portal === "Aprovado").length },
    { label: "Pendente",            value: DEMO_COLABORADORES.filter((c) => c.portal === "Pendente").length },
    { label: "Aprovado - DEMITIDO", value: DEMO_COLABORADORES.filter((c) => c.portal === "Aprovado - DEMITIDO").length },
  ];

  // RPV — labels: "OK", "Pendente", "N/A"
  const distribuicaoRpv = [
    { label: "OK",      value: DEMO_COLABORADORES.filter((c) => c.rpv === "OK").length      },
    { label: "Pendente",value: DEMO_COLABORADORES.filter((c) => c.rpv === "Pendente").length },
    { label: "N/A",     value: DEMO_COLABORADORES.filter((c) => c.rpv === "N/A").length      },
  ];

  // Treinamento — labels: "Concluído", "Em Andamento", "Pendente"
  const distribuicaoTreinamento = [
    { label: "Concluído",    value: DEMO_COLABORADORES.filter((c) => c.treinamento === "Concluído").length    },
    { label: "Em Andamento", value: DEMO_COLABORADORES.filter((c) => c.treinamento === "Em Andamento").length },
    { label: "Pendente",     value: DEMO_COLABORADORES.filter((c) => c.treinamento === "Pendente").length     },
  ];

  return {
    total,
    distribuicaoStatusPortal,
    distribuicaoRpv,
    distribuicaoTreinamento,
    // Campos extras para compatibilidade com versões alternativas da página
    status_treinamentos: [
      { status: "Concluído",    total: DEMO_COLABORADORES.filter((c) => c.treinamento === "Concluído").length    },
      { status: "Em Andamento", total: DEMO_COLABORADORES.filter((c) => c.treinamento === "Em Andamento").length },
      { status: "Pendente",     total: DEMO_COLABORADORES.filter((c) => c.treinamento === "Pendente").length     },
    ],
  };
}
