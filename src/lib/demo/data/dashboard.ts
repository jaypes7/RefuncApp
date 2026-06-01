import { DEMO_COLABORADORES } from "./colaboradores";
import { DEMO_CONFIG, DEMO_ETAPAS, DEMO_GRUPOS_ETAPAS, DEMO_HOTEIS } from "./config";
import { DEMO_REQUISICOES, DEMO_ORDENS_COMPRA } from "./suprimentos";

// ── Helpers ──────────────────────────────────────────────────────────────────

function relDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

function fmt(iso: string): string {
  const [, mm, dd] = iso.split("-");
  return `${dd}/${mm}`;
}

// Gera evolucaoDiaria simplificada para uma etapa (apenas dias úteis até hoje)
function gerarEvolucaoDiaria(
  dataInicio: string,
  dataFim: string,
  percentualFinal: number,
): Array<{ data: string; previsto: number; realizado: number }> {
  const ini  = new Date(dataInicio + "T00:00:00Z");
  const fim  = new Date(dataFim + "T00:00:00Z");
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);

  // Conta total de dias úteis da etapa
  let totalUtil = 0;
  const cur1 = new Date(ini);
  while (cur1 <= fim) {
    const dow = cur1.getUTCDay();
    if (dow !== 0 && dow !== 6) totalUtil++;
    cur1.setUTCDate(cur1.getUTCDate() + 1);
  }
  if (totalUtil === 0) return [];

  const result: Array<{ data: string; previsto: number; realizado: number }> = [];
  let workDay = 0;
  const cur = new Date(ini);

  while (cur <= fim && cur <= hoje) {
    const dow = cur.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      workDay++;
      const data     = cur.toISOString().split("T")[0];
      const previsto = Math.round((workDay / totalUtil) * 100);
      const realizado = Math.min(percentualFinal, Math.round((workDay / totalUtil) * percentualFinal));
      result.push({ data, previsto, realizado });
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return result;
}

// Gera a Curva S global (ponderada por peso de cada etapa)
function gerarCurvaSGlobal() {
  const totalDias = DEMO_ETAPAS.reduce((s, e) => s + e.duracao_dias, 0);
  if (totalDias === 0) return null;

  // Coleta todas as datas únicas de evolucaoDiaria de todas as etapas
  const etapasComEvolucao = DEMO_ETAPAS.map((e) => ({
    ...e,
    peso: e.duracao_dias / totalDias,
    evolucao: gerarEvolucaoDiaria(e.data_inicio, e.data_fim, e.percentual_fisico),
  }));

  const datasSet = new Set<string>();
  for (const e of etapasComEvolucao) {
    for (const d of e.evolucao) datasSet.add(d.data);
    // Adiciona datas futuras da etapa a cada 7 dias para a linha de planejado
    const fim  = new Date(e.data_fim + "T00:00:00Z");
    const hoje = new Date();
    hoje.setUTCHours(0, 0, 0, 0);
    if (fim > hoje) {
      const cur = new Date(hoje);
      cur.setUTCDate(cur.getUTCDate() + 7);
      while (cur <= fim) {
        datasSet.add(cur.toISOString().split("T")[0]);
        cur.setUTCDate(cur.getUTCDate() + 7);
      }
      datasSet.add(e.data_fim);
    }
  }

  const datas = [...datasSet].sort();
  const hoje  = new Date().toISOString().split("T")[0];

  const labels:   string[]          = [];
  const planejado: (number | null)[] = [];
  const realizado: (number | null)[] = [];
  const detalhes:  object[]          = [];

  for (const data of datas) {
    labels.push(fmt(data));

    // Planejado: soma ponderada de quanto cada etapa deveria estar neste ponto
    let plan = 0;
    for (const e of etapasComEvolucao) {
      if (data < e.data_inicio) continue;
      if (data >= e.data_fim) {
        plan += 100 * e.peso;
      } else {
        // Interpolação linear dentro da etapa
        const iniMs  = new Date(e.data_inicio + "T00:00:00Z").getTime();
        const fimMs  = new Date(e.data_fim    + "T00:00:00Z").getTime();
        const curMs  = new Date(data          + "T00:00:00Z").getTime();
        const frac   = (curMs - iniMs) / (fimMs - iniMs);
        plan += frac * 100 * e.peso;
      }
    }
    planejado.push(Math.round(plan * 10) / 10);

    // Realizado: calculado apenas até hoje
    if (data > hoje) {
      realizado.push(null);
    } else {
      let real = 0;
      for (const e of etapasComEvolucao) {
        if (data < e.data_inicio) continue;
        const entradas = e.evolucao.filter((d) => d.data <= data);
        const ultimaEntrada = entradas[entradas.length - 1];
        if (ultimaEntrada) {
          real += (ultimaEntrada.realizado / 100) * 100 * e.peso;
        }
      }
      realizado.push(Math.round(real * 10) / 10);
    }

    detalhes.push({
      etapaNome: "—", planejadoEtapa: 0, realizadoEtapa: 0,
      mediaPlanejadoEtapas: 0, mediaRealizadoEtapas: 0,
    });
  }

  // Indicador do dia atual
  const todayPlanIdx = labels.lastIndexOf(fmt(hoje));
  const plHoje = todayPlanIdx >= 0 ? (planejado[todayPlanIdx] ?? 0) : 0;
  const reHoje = todayPlanIdx >= 0 ? (realizado[todayPlanIdx] ?? 0) : 0;

  return {
    labels,
    planejado,
    realizado,
    detalhes,
    valoresHoje: {
      diario: { planejado: plHoje as number, realizado: reHoje as number },
      etapas: { planejado: 100, realizado: reHoje as number },
    },
  };
}

// ── Dashboard Principal ──────────────────────────────────────────────────────

export function getDashboardPrincipal() {
  const total    = DEMO_COLABORADORES.length;
  const ativos   = DEMO_COLABORADORES.filter((c) => c.status === "Ativo").length;
  const pendentes = DEMO_COLABORADORES.filter((c) => c.status === "Pendente").length;
  const desligados = DEMO_COLABORADORES.filter((c) => c.status === "Desligado").length;
  const emAndamento = DEMO_COLABORADORES.filter((c) => c.status === "Em Andamento").length;
  const aptos    = DEMO_COLABORADORES.filter((c) => c.aso_status === "Apto").length;
  const admitidos = DEMO_COLABORADORES.filter((c) => c.data_admissao).length;
  const pctASO   = total > 0 ? Math.round((aptos / total) * 100) : 0;
  const previstos = DEMO_CONFIG.colaboradores_previstos;

  const diasCorridos = Math.floor(
    (new Date().getTime() - new Date(DEMO_CONFIG.data_inicio_projeto + "T00:00:00Z").getTime()) /
      (1000 * 60 * 60 * 24),
  );

  // Admissões acumuladas (últimos 10 eventos)
  const admissoesAcumuladas = DEMO_COLABORADORES
    .filter((c) => c.data_admissao)
    .sort((a, b) => (a.data_admissao! > b.data_admissao! ? 1 : -1))
    .slice(0, 10)
    .reduce(
      (acc, c, i) => {
        const anterior = i > 0 ? acc[i - 1].acumulado : 0;
        acc.push({ data: c.data_admissao!, quantidade: 1, acumulado: anterior + 1 });
        return acc;
      },
      [] as Array<{ data: string; quantidade: number; acumulado: number }>,
    );

  // Distribuição por função
  const funcaoMap: Record<string, number> = {};
  for (const c of DEMO_COLABORADORES) {
    if (c.funcao) funcaoMap[c.funcao] = (funcaoMap[c.funcao] || 0) + 1;
  }
  const distribuicaoFuncoes = Object.entries(funcaoMap)
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total);

  // Distribuição por MOB
  const mobMap: Record<string, number> = {};
  for (const c of DEMO_COLABORADORES) {
    const mob = c.mob?.trim();
    if (mob) mobMap[mob] = (mobMap[mob] || 0) + 1;
  }
  const distribuicaoMob = Object.entries(mobMap)
    .map(([mob, total]) => ({ mob, total }))
    .sort((a, b) => a.mob.localeCompare(b.mob));

  // Término detalhado
  const terminoDetalhado = DEMO_COLABORADORES
    .filter((c) => c.termino)
    .map((c) => ({
      nome:       c.nome,
      funcao_clt: c.funcao,
      termino:    c.termino!,
      status:     c.status,
      uf:         c.uf,
    }))
    .sort((a, b) => {
      const fnCmp = a.funcao_clt.localeCompare(b.funcao_clt, "pt-BR");
      return fnCmp !== 0 ? fnCmp : a.termino.localeCompare(b.termino);
    });

  // Evolução por setor
  const evolucaoPorSetor = {
    rh:        { total: admitidos, percentual: Math.round((admitidos / total) * 100) },
    logistica:  { total: DEMO_COLABORADORES.filter((c) => c.mob?.trim()).length, percentual: Math.round((DEMO_COLABORADORES.filter((c) => c.mob?.trim()).length / total) * 100) },
    seguranca:  { total: aptos, percentual: pctASO },
  };

  // Etapas com evolucaoDiaria
  const etapas = DEMO_ETAPAS.map((e) => ({
    id:                  e.id,
    nome:                e.nome,
    duracaoDias:         e.duracao_dias,
    percentualConcluido: e.percentual_fisico,
    concluida:           e.concluida ?? false,
    dataInicio:          e.data_inicio,
    dataFim:             e.data_fim,
    evolucaoDiaria:      gerarEvolucaoDiaria(e.data_inicio, e.data_fim, e.percentual_fisico),
    temRegistros:        e.percentual_fisico > 0,
  }));

  // Curva S global
  const curvaS = gerarCurvaSGlobal();

  return {
    metricas: {
      totalCadastrados:    total,
      totalAdmitidos:      admitidos,
      totalLiberados:      DEMO_COLABORADORES.filter((c) => c.portal === "Aprovado").length,
      totalEmTreinamento:  DEMO_COLABORADORES.filter((c) => c.treinamento === "Em Andamento").length,
      percentualASO:       pctASO,
      colaboradoresPrevistos: previstos,
    },
    projeto: {
      dataInicio:    DEMO_CONFIG.data_inicio_projeto,
      dataFim:       DEMO_CONFIG.data_fim_projeto,
      diasCorridos,
      metaAdmissoes: DEMO_CONFIG.meta_admissoes,
      status: {
        atrasado:          true,
        diasAtraso:        0,
        percentualAtraso:  3,
      },
    },
    etapasCount: etapas.length,
    etapas,
    pendencias: [],
    graficos: {
      curvaS,
      evolucaoPorSetor,
      admissoesAcumuladas,
      statusCount: {
        Ativo:       ativos,
        Pendente:    pendentes,
        Inativo:     emAndamento,
        Desligado:   desligados,
      },
    },
    agregacoes: {
      distribuicaoFuncoes,
      distribuicaoMob,
      terminoDetalhado,
    },
  };
}

// ── Dashboard RH ─────────────────────────────────────────────────────────────

export function getDashboardRH() {
  const total      = DEMO_COLABORADORES.length;
  const admitidos  = DEMO_COLABORADORES.filter((c) => c.exame === "Realizado" && c.aso_status === "Apto" && c.status === "Ativo").length;
  const aptos      = DEMO_COLABORADORES.filter((c) => c.aso_status === "Apto").length;
  const inaptos    = DEMO_COLABORADORES.filter((c) => c.aso_status === "Inapto").length;
  const pendentesASO = DEMO_COLABORADORES.filter((c) => c.aso_status === "Pendente").length;
  const pctASO     = total > 0 ? Math.round((aptos / total) * 10000) / 100 : 0;
  const somaIdades = DEMO_COLABORADORES.reduce((s, c) => s + c.idade, 0);
  const mediaIdade = Math.round(somaIdades / total);

  // Faixas etárias
  const faixas: Record<string, number> = { "18-25": 0, "26-35": 0, "36-45": 0, "46-59": 0, "60+": 0 };
  for (const c of DEMO_COLABORADORES) {
    if (c.idade <= 25)      faixas["18-25"]++;
    else if (c.idade <= 35) faixas["26-35"]++;
    else if (c.idade <= 45) faixas["36-45"]++;
    else if (c.idade <= 59) faixas["46-59"]++;
    else                    faixas["60+"]++;
  }
  const distribuicaoIdades = Object.entries(faixas).map(([faixa, total]) => ({ faixa, total }));

  // Distribuição por função
  const funcaoMap: Record<string, number> = {};
  for (const c of DEMO_COLABORADORES) {
    if (c.funcao) funcaoMap[c.funcao] = (funcaoMap[c.funcao] || 0) + 1;
  }
  const distribuicaoFuncoes = Object.entries(funcaoMap)
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total);

  // Distribuição por sexo
  const sexoMap: Record<string, number> = {};
  for (const c of DEMO_COLABORADORES) {
    const s = c.sexo === "M" ? "Masculino" : "Feminino";
    sexoMap[s] = (sexoMap[s] || 0) + 1;
  }
  const distribuicaoSexo = Object.entries(sexoMap).map(([sexo, total]) => ({ sexo, total }));

  // Distribuição por UF
  const ufMap: Record<string, number> = {};
  for (const c of DEMO_COLABORADORES) {
    if (c.uf) ufMap[c.uf] = (ufMap[c.uf] || 0) + 1;
  }
  const distribuicaoUF = Object.entries(ufMap)
    .map(([uf, total]) => ({ uf, total }))
    .sort((a, b) => b.total - a.total);

  // Escolaridade
  const escMap: Record<string, number> = {};
  for (const c of DEMO_COLABORADORES) {
    if (c.escolaridade) escMap[c.escolaridade] = (escMap[c.escolaridade] || 0) + 1;
  }
  const distribuicaoEscolaridade = Object.entries(escMap)
    .map(([escolaridade, total]) => ({ escolaridade, total }));

  // Experiência na função
  const expMap: Record<string, number> = {};
  for (const c of DEMO_COLABORADORES) {
    if (c.experiencia_funcao) expMap[c.experiencia_funcao] = (expMap[c.experiencia_funcao] || 0) + 1;
  }
  const distribuicaoExperienciaFuncao = Object.entries(expMap)
    .map(([experiencia, total]) => ({ experiencia, total }));

  // Término detalhado
  const terminoDetalhado = DEMO_COLABORADORES
    .filter((c) => c.termino)
    .map((c) => ({
      nome:       c.nome,
      funcao_clt: c.funcao,
      termino:    c.termino!,
      status:     c.status,
      uf:         c.uf,
    }))
    .sort((a, b) => {
      const fnCmp = a.funcao_clt.localeCompare(b.funcao_clt, "pt-BR");
      return fnCmp !== 0 ? fnCmp : a.termino.localeCompare(b.termino);
    });

  return {
    metricas: { totalCadastrados: total, totalAdmitidos: admitidos, percentualASO: pctASO, mediaIdade },
    agregacoes: {
      distribuicaoIdades,
      distribuicaoFuncoes,
      distribuicaoUF,
      terminoDetalhado,
      distribuicaoASO: [
        { status: "Apto",    total: aptos },
        { status: "Inapto",  total: inaptos },
        { status: "Pendente",total: pendentesASO },
      ],
      distribuicaoSexo,
      distribuicaoEscolaridade,
      distribuicaoExperienciaFuncao,
    },
  };
}

// ── Dashboard Logística ───────────────────────────────────────────────────────

export function getDashboardLogistica() {
  const totalVagas       = DEMO_HOTEIS.reduce((s, h) => s + h.vagas_total, 0);
  const totalPreenchidas = DEMO_HOTEIS.reduce((s, h) => s + h.vagas_ocupadas, 0);
  const totalDisponiveis = totalVagas - totalPreenchidas;
  const ocupacaoTotal    = Math.round((totalPreenchidas / totalVagas) * 100);

  const vagasHoteis = DEMO_HOTEIS.map((h) => ({
    hotel:            h.nome,
    vagasTotais:      h.vagas_total,
    vagasPreenchidas: h.vagas_ocupadas,
    percentual:       Math.round((h.vagas_ocupadas / h.vagas_total) * 100),
  }));

  // Distribuição de turnos derivada dos colaboradores
  const turnoMap: Record<string, number> = {};
  for (const c of DEMO_COLABORADORES) {
    const t = c.turno_trabalho || "Diurno";
    turnoMap[t] = (turnoMap[t] || 0) + 1;
  }
  const turnoTrabalho = Object.entries(turnoMap)
    .map(([turno, total]) => ({ turno, total }))
    .sort((a, b) => b.total - a.total);

  return {
    kpis: { totalVagas, totalPreenchidas, totalDisponiveis, ocupacaoTotal },
    vagasHoteis,
    turnoTrabalho,
  };
}

// ── Dashboard Suprimentos ─────────────────────────────────────────────────────

export function getDashboardSuprimentos() {
  // OCs entregues = entregue:true
  const ocsEntregues  = DEMO_ORDENS_COMPRA.filter((oc) => oc.entregue);
  const ocsPendentes  = DEMO_ORDENS_COMPRA.filter((oc) => !oc.entregue);

  const totalInvestido = DEMO_ORDENS_COMPRA.reduce((s, oc) => s + oc.valor, 0);
  const investido      = ocsEntregues.reduce((s, oc) => s + oc.valor, 0);
  const orcado         = ocsPendentes.reduce((s, oc) => s + oc.valor_previsto, 0);
  const totalAPagar    = ocsPendentes.reduce((s, oc) => s + oc.valor, 0);

  // Status das requisições
  const statusMap: Record<string, number> = {};
  for (const req of DEMO_REQUISICOES) {
    statusMap[req.status] = (statusMap[req.status] || 0) + 1;
  }
  const distribuicaoStatus = Object.entries(statusMap)
    .map(([status, total]) => ({ status, total }))
    .sort((a, b) => b.total - a.total);

  // Por categoria
  const catMap: Record<string, number> = {};
  for (const req of DEMO_REQUISICOES) {
    for (const item of req.itens) {
      const cat = item.categoria || "Outros";
      // Estima valor proporcional pela OC vinculada à req
      const oc = DEMO_ORDENS_COMPRA.find((o) => o.requisicao_id === req.id);
      const share = oc ? oc.valor / req.itens.length : 0;
      catMap[cat] = (catMap[cat] || 0) + share;
    }
  }
  const porCategoria = Object.entries(catMap)
    .map(([categoria, valor]) => ({ categoria, valor: Math.round(valor) }))
    .sort((a, b) => b.valor - a.valor);

  // Por tipo (item vs servico)
  const tipoMap: Record<string, number> = {};
  for (const req of DEMO_REQUISICOES) {
    for (const item of req.itens) {
      const tipo = item.tipo || "item";
      const oc = DEMO_ORDENS_COMPRA.find((o) => o.requisicao_id === req.id);
      const share = oc ? oc.valor / req.itens.length : 0;
      tipoMap[tipo] = (tipoMap[tipo] || 0) + share;
    }
  }
  const sgpPorTipo = Object.entries(tipoMap)
    .map(([tipo, valor]) => ({ tipo, valor: Math.round(valor) }));

  // OCs atrasadas (prazo vencido e não entregue)
  const hoje = new Date().toISOString().split("T")[0];
  const ocAtrasadas = ocsPendentes
    .filter((oc) => oc.previsao_entrega < hoje)
    .map((oc) => {
      const req = DEMO_REQUISICOES.find((r) => r.id === oc.requisicao_id);
      return {
        numero_oc:        oc.numero_oc,
        fornecedor:       oc.fornecedor,
        previsao_entrega: oc.previsao_entrega,
        itens_pendentes:  (req?.itens ?? []).map((it) => ({
          nome_item: it.nome_item,
          quantidade: it.quantidade,
          recebido: 0,
          faltam: it.quantidade,
        })),
      };
    });

  // Itens pendentes em OCs não entregues
  const itensPendentes = ocsPendentes
    .filter((oc) => oc.previsao_entrega >= hoje)
    .flatMap((oc) => {
      const req = DEMO_REQUISICOES.find((r) => r.id === oc.requisicao_id);
      return (req?.itens ?? []).slice(0, 2).map((it) => ({
        requisicao_id:     req!.id,
        numero_oc:         oc.numero_oc,
        item_id:           it.id,
        nome_item:         it.nome_item,
        quantidade:        it.quantidade,
        quantidade_recebida: 0,
        faltam:            it.quantidade,
      }));
    })
    .slice(0, 10);

  return {
    suprimentos: {
      totalInvestido:    Math.round(totalInvestido),
      totalOrdens:       DEMO_ORDENS_COMPRA.length,
      totalAPagar:       Math.round(totalAPagar),
      orcado:            Math.round(orcado),
      investido:         Math.round(investido),
      distribuicaoStatus,
      porCategoria,
      sgpPorTipo,
      ocAbertas:         ocsPendentes.length,
      qtRecebimentos:    ocsEntregues.length,
      itensPendentes,
      ocAtrasadas,
    },
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
    { label: "OK",       value: DEMO_COLABORADORES.filter((c) => c.rpv === "OK").length },
    { label: "Pendente", value: DEMO_COLABORADORES.filter((c) => c.rpv === "Pendente").length },
    { label: "N/A",      value: DEMO_COLABORADORES.filter((c) => c.rpv === "N/A").length },
  ];

  // Treinamento — labels: "Concluído", "Em Andamento", "Pendente"
  const distribuicaoTreinamento = [
    { label: "Concluído",    value: DEMO_COLABORADORES.filter((c) => c.treinamento === "Concluído").length },
    { label: "Em Andamento", value: DEMO_COLABORADORES.filter((c) => c.treinamento === "Em Andamento").length },
    { label: "Pendente",     value: DEMO_COLABORADORES.filter((c) => c.treinamento === "Pendente").length },
  ];

  return {
    total,
    distribuicaoStatusPortal,
    distribuicaoRpv,
    distribuicaoTreinamento,
    // Campos extras para compatibilidade com versões alternativas da página
    status_treinamentos: [
      { status: "Concluído",    total: DEMO_COLABORADORES.filter((c) => c.treinamento === "Concluído").length },
      { status: "Em Andamento", total: DEMO_COLABORADORES.filter((c) => c.treinamento === "Em Andamento").length },
      { status: "Pendente",     total: DEMO_COLABORADORES.filter((c) => c.treinamento === "Pendente").length },
    ],
  };
}
