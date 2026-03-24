/**
 * ============================================================================
 * API: GET /api/dashboard
 * ============================================================================
 *
 * Retorna métricas agregadas para alimentar o dashboard:
 * - Total de ativos
 * - % de MOB concluído
 * - % de ASO apto
 * - Dados para gráficos
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getSheetData, SHEETS, COLABORADORES_RANGE } from "@/lib/sheets";
import { requireAuth } from "@/lib/auth";
import type { DashboardData } from "@/lib/axios";
import {
  calcularMetricas,
  calcularProgressoReal,
  gerarDadosGraficoCurvaS,
  calcularDiaAtual,
  verificarAtraso,
  sigmoid,
} from "@/lib/curva-s";
import { EtapaConfig } from "@/lib/schemas";

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Converte data Excel (serial) ou string para formato ISO YYYY-MM-DD
 * Excel: dias desde 30/12/1899
 */
function parseDate(value: string | number | undefined | null): string | null {
  if (value === undefined || value === null) return null;

  // Se já é uma string no formato YYYY-MM-DD
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  // Se é número (Excel serial date)
  if (typeof value === "number" || /^\d+$/.test(String(value))) {
    const excelSerial = Number(value);
    // Excel epoch é 30/12/1899
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(
      excelEpoch.getTime() + excelSerial * 24 * 60 * 60 * 1000,
    );
    return date.toISOString().split("T")[0];
  }

  // Tenta parse como data brasileira (DD/MM/YYYY)
  const brMatch = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Converte array de valores da planilha para objeto
 * Garante que todos os valores sejam string ou null
 */
function rowToColaborador(row: (string | number | undefined)[]) {
  // Helper para converter valor da planilha para string|null
  const toStr = (val: string | number | undefined): string | null => {
    if (val === undefined || val === null) return null;
    return String(val);
  };

  // Garante que CPF tenha 11 dígitos (para evitar problemas com CPFs que perderam o zero à esquerda)
  const cpfRaw = row[30];
  const cpfFormatted = cpfRaw
    ? String(cpfRaw).replace(/\D/g, "").padStart(11, "0")
    : null;

  return {
    IND: toStr(row[0]),
    STATUS: toStr(row[1]),
    ENVIADO_RH: toStr(row[2]),
    PESSOA: toStr(row[3]),
    REQ: toStr(row[4]),
    VINCULADO: toStr(row[5]),
    CARTA_OFERTA: toStr(row[6]),
    COLAB_PEND: toStr(row[7]),
    EXAME: toStr(row[8]),
    CLINICA: toStr(row[9]),
    DOCS: toStr(row[10]),
    ASO: toStr(row[11]),
    RPV: toStr(row[12]),
    PRE_ADMISSAO: toStr(row[13]),
    MOB: toStr(row[14]),
    OP: toStr(row[15]),
    DATA_ADMISSAO: parseDate(row[16]),
    CONTRATO: toStr(row[17]),
    PORTAL: toStr(row[18]),
    CRACHA: toStr(row[19]),
    PONTO: toStr(row[20]),
    TREINAMENTO: toStr(row[21]),
    REALIZAR_TREINAMENTO: toStr(row[22]),
    LOCAL_TREINAMENTO: toStr(row[23]),
    RE: toStr(row[24]),
    NOME: toStr(row[25]),
    FUNCAO_CLT: toStr(row[26]),
    HISTOGRAMA: toStr(row[27]),
    IDADE: toStr(row[28]),
    DT_NASCIMENTO: parseDate(row[29]),
    CPF: cpfFormatted,
    VR: toStr(row[31]),
    TERMINO: parseDate(row[32]),
    PRORROGACAO: parseDate(row[33]),
    DEMISSAO: parseDate(row[34]),
    MUNICIPIO: toStr(row[35]),
    UF: toStr(row[36]),
    TELEFONE: toStr(row[37]),
  };
}

// ============================================================================
// TIPOS INTERNOS
// ============================================================================

type ColaboradorRow = ReturnType<typeof rowToColaborador>;

interface Hotel {
  nome: string;
  vagasTotais: number;
  vagasOcupadas: number;
}

// ============================================================================
// FUNÇÕES DE AGREGAÇÃO
// ============================================================================

/**
 * Busca hotéis da aba Hoteis com mapeamento dinâmico pelo header.
 * Lê a linha 1 como cabeçalho e monta um índice por nome de coluna —
 * imune a reordenação ou adição de novas colunas na planilha.
 *
 * Nomes reconhecidos (case-insensitive, sem espaços):
 *   NOME / HOTEL          → nome do hotel
 *   VAGAS / QT_VAGAS      → vagas totais
 *   VAGAS_OCUPADAS        → vagas já preenchidas
 */
async function getHoteis(): Promise<Hotel[]> {
  try {
    const rows = await getSheetData(SHEETS.HOTEIS);

    console.log("[Logística] TOTAL DE LINHAS:", rows.length);
    if (rows.length > 0) console.log("[Logística] HEADER:", JSON.stringify(rows[0]));
    if (rows.length > 1) console.log("[Logística] LINHA 1:", JSON.stringify(rows[1]));

    if (rows.length < 2) return [];

    // Monta mapa: nome_normalizado → índice
    const header = rows[0];
    const idx: Record<string, number> = {};
    header.forEach((cell, i) => {
      const key = String(cell).trim().toUpperCase().replace(/\s+/g, "_");
      idx[key] = i;
    });
    console.log("[Logística] MAPA DE COLUNAS:", JSON.stringify(idx));

    // Resolve índice com fallbacks: tenta múltiplos aliases
    const col = (aliases: string[], fallback: number): number => {
      for (const alias of aliases) {
        if (idx[alias] !== undefined) return idx[alias];
      }
      return fallback;
    };

    const iNome      = col(["NOME", "HOTEL", "NOME_HOTEL"], 1);
    const iVagas     = col(["QT_VAGAS", "VAGAS_TOTAIS", "VAGAS", "TOTAL_VAGAS"], 2);
    const iOcupadas  = col(["VAGAS_OCUPADAS", "OCUPADAS", "VAGAS_PREENCHIDAS"], 3);

    console.log(`[Logística] Colunas resolvidas → nome:${iNome} vagas:${iVagas} ocupadas:${iOcupadas}`);

    return rows
      .slice(1)
      .map((row) => {
        const nome = String(row[iNome] ?? row[0] ?? "").trim();
        if (!nome) return null;
        const vagasTotais   = cleanNumeric(row[iVagas]   ?? 0);
        const vagasOcupadas = cleanNumeric(row[iOcupadas] ?? 0);
        console.log(`[Logística] hotel="${nome}" totais=${vagasTotais} ocupadas=${vagasOcupadas}`);
        return { nome, vagasTotais, vagasOcupadas };
      })
      .filter((h): h is Hotel => h !== null);
  } catch (error) {
    console.error("[Logística] getHoteis falhou:", error);
    return [];
  }
}

/**
 * Agrupa colaboradores por FUNCAO_CLT.
 * Retorna array ordenado decrescente, excluindo funções vazias.
 */
function agruparPorFuncao(
  colaboradores: ColaboradorRow[],
): DashboardData["agregacoes"]["distribuicaoFuncoes"] {
  const contagem: Record<string, number> = {};
  for (const c of colaboradores) {
    const fn = c.FUNCAO_CLT?.trim();
    if (fn) contagem[fn] = (contagem[fn] || 0) + 1;
  }
  return Object.entries(contagem)
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Agrupa colaboradores por faixa etária.
 * Faixas: "18-25", "26-35", "36-45", "46+"
 * Colaboradores sem idade registrada são ignorados.
 */
function agruparPorFaixaEtaria(
  colaboradores: ColaboradorRow[],
): DashboardData["agregacoes"]["distribuicaoIdades"] {
  const faixas: Record<string, number> = {
    "18-25": 0,
    "26-35": 0,
    "36-45": 0,
    "46+": 0,
  };

  for (const c of colaboradores) {
    const idade = parseInt(String(c.IDADE || ""), 10);
    if (isNaN(idade) || idade < 18) continue;
    if (idade <= 25) faixas["18-25"]++;
    else if (idade <= 35) faixas["26-35"]++;
    else if (idade <= 45) faixas["36-45"]++;
    else faixas["46+"]++;
  }

  return Object.entries(faixas).map(([faixa, total]) => ({ faixa, total }));
}

/**
 * Agrupa colaboradores por UF.
 * Retorna array ordenado decrescente, excluindo UFs vazias.
 */
function agruparPorUF(
  colaboradores: ColaboradorRow[],
): DashboardData["agregacoes"]["distribuicaoUF"] {
  const contagem: Record<string, number> = {};
  for (const c of colaboradores) {
    const uf = c.UF?.trim();
    if (uf) contagem[uf] = (contagem[uf] || 0) + 1;
  }
  return Object.entries(contagem)
    .map(([uf, total]) => ({ uf, total }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Monta o array vagasHoteis usando VAGAS_OCUPADAS direto da planilha.
 */
function calcularVagasHoteis(
  hoteis: Hotel[],
): DashboardData["agregacoes"]["vagasHoteis"] {
  return hoteis.map((h) => {
    const vagasPreenchidas = h.vagasOcupadas;
    const percentual =
      h.vagasTotais > 0
        ? Math.round((vagasPreenchidas / h.vagasTotais) * 100)
        : 0;
    return {
      hotel:           h.nome,
      vagasTotais:     h.vagasTotais,
      vagasPreenchidas,
      percentual,
    };
  });
}

// ============================================================================
// SUPRIMENTOS
// ============================================================================

type SuprimentoNormalizado = {
  ordemCompra: string;
  totalReqPrevistas: number;
  valores: number;
  status: string;
  entregueObra: string;
};

/**
 * Limpa qualquer representação numérica da planilha e retorna number.
 * Trata: número nativo, "R$ 25,75", "1.234,56", "42"
 */
function cleanNumeric(val: unknown): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (typeof val === "string") {
    const cleaned = val.replace(/[R$\s.]/g, "").replace(",", ".");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Lê a aba SUPRIMENTOS com abordagem bruta — sem Zod, sem nomes de colunas.
 * Layout real: A=TOTAL_REQ_PREVISTAS | B=VALORES | C=ORDEM_COMPRA | D=STATUS | E=ENTREGUE_OBRA
 */
async function getSuprimentos(): Promise<SuprimentoNormalizado[]> {
  try {
    const rows = await getSheetData(SHEETS.SUPRIMENTOS);

    console.log("--- DEBUG SUPRIMENTOS ---");
    console.log("ABA:", SHEETS.SUPRIMENTOS, "| LINHAS:", rows.length);
    if (rows.length > 0) console.log("ROW[0] (header):", JSON.stringify(rows[0]));
    if (rows.length > 1) console.log("ROW[1] (dados):",  JSON.stringify(rows[1]));

    return rows.slice(1).map((row) => {
      // Aceita tanto array de strings (getSheetData retorna string[][])
      // quanto objeto — abordagem defensiva com fallback por chave
      const r = row as unknown as Record<string | number, unknown>;

      const rawPrevistas  = r[0] ?? r["TOTAL_REQ_PREVISTAS"] ?? 0;
      const rawValores    = r[1] ?? r["VALORES"]             ?? 0;
      const rawOrdem      = r[2] ?? r["ORDEM_COMPRA"]        ?? "";
      const rawStatus     = r[3] ?? r["STATUS"]              ?? "";
      const rawEntregue   = r[4] ?? r["ENTREGUE_OBRA"]       ?? "";

      console.log("ROW BRUTA:", JSON.stringify({ rawPrevistas, rawValores, rawOrdem, rawStatus, rawEntregue }));

      return {
        ordemCompra:       String(rawOrdem).trim(),
        totalReqPrevistas: cleanNumeric(rawPrevistas),
        valores:           cleanNumeric(rawValores),
        status:            String(rawStatus).trim(),
        entregueObra:      String(rawEntregue).trim(),
      };
    });
  } catch (error) {
    console.error("--- ERRO getSuprimentos ---", error);
    return [];
  }
}

/**
 * Sumariza as linhas de suprimentos para os KPIs e gráficos.
 */
function sumarizarSuprimentos(
  ordens: SuprimentoNormalizado[],
): DashboardData["agregacoes"]["suprimentos"] {
  const totalInvestido = ordens.reduce((s, o) => s + o.valores, 0);
  const entregues = ordens.filter((o) => o.entregueObra === "Sim").length;

  // Contagem por STATUS
  const statusMap: Record<string, number> = {};
  for (const o of ordens) {
    if (o.status) statusMap[o.status] = (statusMap[o.status] || 0) + 1;
  }
  const distribuicaoStatus = Object.entries(statusMap)
    .map(([status, total]) => ({ status, total }))
    .sort((a, b) => b.total - a.total);

  return {
    totalInvestido: Math.round(totalInvestido * 100) / 100,
    totalOrdens: ordens.length,
    entregues,
    percentualEntregue:
      ordens.length > 0 ? Math.round((entregues / ordens.length) * 100) : 0,
    distribuicaoStatus,
    ordens,
  };
}

/**
 * Busca configurações do projeto (estrutura horizontal)
 * Linha 1: Headers, Linha 2: Valores
 */
async function getConfig(): Promise<{
  dataInicio: string | null;
  dataFim: string | null;
  etapas: EtapaConfig[];
  metaAdmissoes: number;
}> {
  try {
    const configData = await getSheetData(SHEETS.CONFIG);

    const config: Record<string, string> = {};

    if (configData.length >= 2) {
      // Linha 1 = headers, Linha 2 = valores
      const headers = configData[0];
      const values = configData[1];

      headers.forEach((header, index) => {
        if (header && values[index]) {
          config[header] = values[index];
        }
      });
    }

    // Parse das etapas
    let etapas: EtapaConfig[] = [];
    if (config.ETAPAS_PROJETO && config.DURACAO_ETAPAS) {
      try {
        const nomes = JSON.parse(config.ETAPAS_PROJETO);
        const duracoes = JSON.parse(config.DURACAO_ETAPAS);
        etapas = nomes.map((nome: string, index: number) => ({
          id: index + 1,
          nome,
          duracaoDias: duracoes[index] || 1,
        }));
      } catch {
        // Fallback para etapas padrão
        etapas = Array.from({ length: 12 }, (_, i) => ({
          id: i + 1,
          nome: `Etapa ${i + 1}`,
          duracaoDias: 7,
        }));
      }
    } else {
      // Etapas padrão
      etapas = Array.from({ length: 12 }, (_, i) => ({
        id: i + 1,
        nome: `Etapa ${i + 1}`,
        duracaoDias: 7,
      }));
    }

    const dataInicio = parseDate(config.DATA_INICIO_PROJETO);
    const dataFim = parseDate(config.DATA_FIM_PROJETO);

    console.log(`[Dashboard API] Datas convertidas:`, {
      dataInicio,
      dataFim,
      originalInicio: config.DATA_INICIO_PROJETO,
      originalFim: config.DATA_FIM_PROJETO,
    });

    return {
      dataInicio,
      dataFim,
      etapas,
      metaAdmissoes: parseInt(config.META_ADMISSOES || "0", 10) || 0,
    };
  } catch (error) {
    console.error("Erro ao carregar configurações:", error);
    return {
      dataInicio: null,
      dataFim: null,
      etapas: [],
      metaAdmissoes: 0,
    };
  }
}

// ============================================================================
// GET /api/dashboard
// ============================================================================

export async function GET() {
  console.log("[Dashboard API] Requisição recebida");

  try {
    // Verifica autenticação
    console.log("[Dashboard API] Verificando autenticação...");
    await requireAuth();
    console.log("[Dashboard API] Autenticação OK");

    console.log("[Dashboard API] Buscando dados...");

    // Busca dados em paralelo
    const [colaboradoresRows, config, hoteis, suprimentosRows] = await Promise.all([
      getSheetData(SHEETS.COLABORADORES, COLABORADORES_RANGE),
      getConfig(),
      getHoteis(),
      getSuprimentos(),
    ]);

    console.log(
      `[Dashboard API] ${colaboradoresRows.length} linhas lidas da planilha`,
    );

    // Converte para objetos (ignora linhas vazias)
    const colaboradores = colaboradoresRows
      .map(rowToColaborador)
      .filter((c) => c.CPF && c.NOME);

    console.log(
      `[Dashboard API] ${colaboradores.length} colaboradores válidos`,
    );
    console.log(`[Dashboard API] Config:`, config);

    // Calcula métricas principais
    const metricas = calcularMetricas(colaboradores);

    // Calcula progresso real (% médio — usado internamente)
    const progressoReal = calcularProgressoReal(colaboradores);

    // ── Admissões acumuladas por DATA_ADMISSAO ────────────────────────────
    // Calculado ANTES da curva S para poder ser passado como realizado.
    const admissoesPorDia: Record<string, number> = {};
    colaboradores.forEach((c) => {
      if (c.DATA_ADMISSAO) {
        admissoesPorDia[c.DATA_ADMISSAO] =
          (admissoesPorDia[c.DATA_ADMISSAO] || 0) + 1;
      }
    });

    const admissoesAcumuladas = Object.entries(admissoesPorDia)
      .sort(([a], [b]) => a.localeCompare(b))
      .reduce(
        (acc, [data, count], index) => {
          const anterior = index > 0 ? acc[index - 1].acumulado : 0;
          acc.push({ data, quantidade: count, acumulado: anterior + count });
          return acc;
        },
        [] as Array<{ data: string; quantidade: number; acumulado: number }>,
      );

    const admitidosHoje =
      admissoesAcumuladas.length > 0
        ? admissoesAcumuladas[admissoesAcumuladas.length - 1].acumulado
        : 0;

    // ── Curva S sigmoide ─────────────────────────────────────────────────
    let curvaS = null;
    let statusProjeto = null;

    console.log(
      `[Dashboard API] Curva S: inicio=${config.dataInicio} fim=${config.dataFim} meta=${config.metaAdmissoes}`,
    );

    if (config.dataInicio && config.dataFim && config.metaAdmissoes > 0) {
      curvaS = gerarDadosGraficoCurvaS(
        config.dataInicio,
        config.dataFim,
        config.metaAdmissoes,
        admissoesAcumuladas,
      );

      statusProjeto = verificarAtraso(
        config.dataInicio,
        config.dataFim,
        config.metaAdmissoes,
        admitidosHoje,
      );

      console.log(
        `[Dashboard API] Curva S: ${curvaS.labels.length} pontos | status: atrasado=${statusProjeto.atrasado}`,
      );
    } else {
      console.log(
        `[Dashboard API] Curva S NÃO gerada — faltam: dataFim=${config.dataFim} meta=${config.metaAdmissoes}`,
      );
    }

    // ── Evolução por setor ───────────────────────────────────────────────
    const evolucaoPorSetor = {
      rh: {
        total: colaboradores.filter((c) => c.STATUS && c.STATUS !== "Pendente")
          .length,
        percentual: Math.round(
          (colaboradores.filter((c) => c.STATUS && c.STATUS !== "Pendente")
            .length /
            (colaboradores.length || 1)) *
            100,
        ),
      },
      logistica: {
        total: colaboradores.filter((c) => c.MOB === "Sim").length,
        percentual: Math.round(
          (colaboradores.filter((c) => c.MOB === "Sim").length /
            (colaboradores.length || 1)) *
            100,
        ),
      },
      seguranca: {
        total: colaboradores.filter((c) => c.ASO === "Apto").length,
        percentual: Math.round(
          (colaboradores.filter((c) => c.ASO === "Apto").length /
            (colaboradores.length || 1)) *
            100,
        ),
      },
    };

    // Status dos colaboradores
    const statusCount = {
      Ativo: colaboradores.filter((c) => c.STATUS === "Ativo").length,
      Pendente: colaboradores.filter((c) => c.STATUS === "Pendente").length,
      Inativo: colaboradores.filter((c) => c.STATUS === "Inativo").length,
      Desligado: colaboradores.filter((c) => c.STATUS === "Desligado").length,
    };

    // Dias do projeto
    const diasProjeto = config.dataInicio
      ? calcularDiaAtual(config.dataInicio)
      : 0;

    // ── Déficit de Mobilização (Etapas) ────────────────────────────────
    const hoje = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const hojeMs = new Date(hoje + "T00:00:00Z").getTime();

    const pendencias: DashboardData["pendencias"] = [];

    // Realizado acumulado = total de colaboradores ativos no RH
    const realizadoAcumulado = colaboradores.filter(
      (c) => c.STATUS === "Ativo",
    ).length;

    if (
      config.dataInicio &&
      config.etapas.length > 0 &&
      config.metaAdmissoes > 0
    ) {
      const inicioProjetoMs = new Date(config.dataInicio + "T00:00:00Z").getTime();

      // Total de dias das etapas (cronograma) — usado para normalizar t na sigmoide
      const totalDiasEtapas = config.etapas.reduce(
        (sum, e) => sum + (e.duracaoDias || 0),
        0,
      );

      console.log("[Déficit] inicioProjetoMs:", inicioProjetoMs,
        "totalDiasEtapas:", totalDiasEtapas,
        "metaAdmissoes:", config.metaAdmissoes,
        "realizadoAcumulado:", realizadoAcumulado);

      if (totalDiasEtapas > 0) {
        let diasAcum = 0;
        for (const etapa of config.etapas) {
          const inicioEtapaDias = diasAcum;
          diasAcum += etapa.duracaoDias || 0;
          const fimEtapaDias = diasAcum;

          const inicioEtapaMs = inicioProjetoMs + inicioEtapaDias * 86400000;
          const fimEtapaMs = inicioProjetoMs + fimEtapaDias * 86400000;
          const fimEtapaStr = new Date(fimEtapaMs).toISOString().split("T")[0];
          const inicioEtapaStr = new Date(inicioEtapaMs).toISOString().split("T")[0];

          // Só avaliar etapas cuja dataInicio já chegou
          if (hoje < inicioEtapaStr) continue;

          // t normalizado pelo cronograma (0→1 ao longo das etapas, não do calendário)
          const tFimEtapa = Math.min(1, fimEtapaDias / totalDiasEtapas);
          const metaAcumuladaEtapa = Math.ceil(
            sigmoid(tFimEtapa) * config.metaAdmissoes,
          ) || 0;

          // Déficit: faltam pessoas para bater a meta
          const deficit = metaAcumuladaEtapa - realizadoAcumulado;

          console.log("DEBUG ETAPA:", {
            nome: etapa.nome || `Etapa ${etapa.id}`,
            inicioEtapaStr,
            fimEtapaStr,
            tFimEtapa: tFimEtapa.toFixed(4),
            metaEtapa: metaAcumuladaEtapa,
            realizadoAcumulado,
            deficit,
          });

          if (deficit <= 0) continue; // meta batida, auto-limpa

          // Nível 1 (Crítico/Vermelho): já passou o fimEtapa e ainda há déficit
          // Nível 2 (Atenção/Amarelo): dentro do prazo da etapa, mas com déficit
          const passouPrazo = hoje > fimEtapaStr;
          const diasAtraso = passouPrazo
            ? Math.floor((hojeMs - fimEtapaMs) / 86400000)
            : 0;

          pendencias.push({
            tipo: "etapa",
            nivel: passouPrazo ? 1 : 2,
            cor: passouPrazo ? "red" : "yellow",
            nome: etapa.nome || `Etapa ${etapa.id}`,
            dataLimite: fimEtapaStr,
            diasAtraso,
            pessoasFaltando: deficit,
            metaEtapa: metaAcumuladaEtapa,
            realizadoAtual: realizadoAcumulado,
          });
        }
      }
    }

    // Ordenar: nível 1 (crítico) primeiro, depois maior déficit
    pendencias.sort((a, b) => {
      if (a.nivel !== b.nivel) return a.nivel - b.nivel;
      return b.pessoasFaltando - a.pessoasFaltando;
    });

    // Limitar a 10
    const pendenciasLimitadas = pendencias.slice(0, 10);

    console.log(
      `[Dashboard API] ${pendencias.length} déficits detectados (exibindo ${pendenciasLimitadas.length})`,
    );

    const responseData: DashboardData = {
      metricas,
      progresso: {
        real: progressoReal,
        planejado: curvaS?.planejado[curvaS.planejado.length - 1] || 0,
      },
      projeto: {
        dataInicio: config.dataInicio,
        dataFim: config.dataFim,
        diasCorridos: diasProjeto,
        metaAdmissoes: config.metaAdmissoes,
        status: statusProjeto,
      },
      pendencias: pendenciasLimitadas,
      graficos: {
        curvaS,
        evolucaoPorSetor,
        admissoesAcumuladas,
        statusCount,
      },
      agregacoes: {
        distribuicaoFuncoes: (() => {
          try { return agruparPorFuncao(colaboradores); }
          catch (e) { console.error("[Dashboard] distribuicaoFuncoes falhou:", e); return []; }
        })(),
        distribuicaoIdades: (() => {
          try { return agruparPorFaixaEtaria(colaboradores); }
          catch (e) { console.error("[Dashboard] distribuicaoIdades falhou:", e); return []; }
        })(),
        distribuicaoUF: (() => {
          try { return agruparPorUF(colaboradores); }
          catch (e) { console.error("[Dashboard] distribuicaoUF falhou:", e); return []; }
        })(),
        vagasHoteis: (() => {
          try {
            const resultado = calcularVagasHoteis(hoteis);
            console.log("[Dashboard] vagasHoteis:", JSON.stringify(resultado));
            return resultado;
          } catch (e) { console.error("[Dashboard] vagasHoteis falhou:", e); return []; }
        })(),
        suprimentos: (() => {
          try { return sumarizarSuprimentos(suprimentosRows); }
          catch (e) {
            console.error("[Dashboard] suprimentos falhou:", e);
            return { totalInvestido: 0, totalOrdens: 0, entregues: 0, percentualEntregue: 0, distribuicaoStatus: [], ordens: [] };
          }
        })(),
      },
    };

    console.log(
      "[Dashboard API] Retornando dados:",
      JSON.stringify(responseData, null, 2),
    );

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("[Dashboard API] Erro ao carregar dashboard:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      console.log("[Dashboard API] Usuário não autorizado");
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
