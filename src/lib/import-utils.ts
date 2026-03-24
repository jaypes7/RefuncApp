/**
 * ============================================================================
 * IMPORT UTILS — Utilitários compartilhados para importação de planilhas
 * ============================================================================
 *
 * Módulo puro TypeScript — sem dependências de React ou Next.js.
 * Pode ser importado tanto pelo frontend (import-service.ts) quanto pelo
 * backend (rota /api/colaboradores/import).
 */

// ── Tipos Públicos ───────────────────────────────────────────────────────────

/** Uma linha bruta vinda do parser de Excel/CSV (chaves são os headers) */
export type RawRow = Record<string, unknown>;

/** Erro de importação com rastreabilidade de linha */
export interface ImportError {
  linha: number;
  campo?: string;
  motivo: string;
}

/** Relatório final retornado por processImport */
export interface ImportReport {
  inseridos: number;
  atualizados: number;
  ignorados: number;
  erros: ImportError[];
  total: number;
}

// ── Dicionário de Cabeçalhos (Fuzzy Mapping) ────────────────────────────────

export const HEADER_ALIASES: Record<string, string[]> = {
  re: ["RE", "RE (REGISTRO)", "REGISTRO", "N PESSOA", "N_PESSOA", "NUMERO PESSOA", "NÚMERO PESSOA", "COD FUNCIONARIO"],
  nome: ["NOME", "NOME COMPLETO", "NOME DO COLABORADOR", "NOME DO FUNCIONARIO", "NOME FUNCIONARIO"],
  cpf: ["CPF", "C.P.F.", "C P F", "CPF DO COLABORADOR", "CPF FUNCIONARIO", "CPF DO FUNCIONÁRIO"],
  funcao: ["FUNÇÃO CLT", "FUNCAO CLT", "FUNÇÃO", "FUNCAO", "CARGO", "CARGO CLT", "FUNÇÃO/CARGO", "FUNCAO/CARGO"],
  dt_nasc: ["DT NASC", "DT_NASC", "DT NASCIMENTO", "DATA NASCIMENTO", "DATA DE NASCIMENTO", "NASCIMENTO", "DATA NASC"],
  sexo: ["SEXO", "GÊNERO", "GENERO"],
  telefone: ["TELEFONE", "FONE", "CELULAR", "WHATSAPP", "TELEFONE/WHATSAPP", "CONTATO"],
  municipio: ["MUNICIPIO", "MUNICÍPIO", "CIDADE", "CIDADE RESIDENCIA", "CIDADE DE RESIDÊNCIA"],
  uf: ["UF", "ESTADO", "UF ESTADO"],
  endereco: ["ENDEREÇO", "ENDERECO", "ENDEREÇO RESIDENCIAL", "LOGRADOURO"],
  status_adm: ["STATUS", "STATUS ADM", "STATUS ADMISSIONAL", "SITUAÇÃO", "SITUACAO"],
  clinica: ["CLINICA", "CLÍNICA", "CLÍNICA DE EXAME", "CLINICA DE EXAME", "CLINICA EXAME"],
  data_exame: ["DATA EXAME", "DATA DO EXAME", "DT EXAME", "EXAME DATA"],
  aso_status: ["ASO", "STATUS ASO", "ASO STATUS", "APTIDÃO", "APTIDAO", "RESULTADO ASO"],
  data_admissao: ["DATA ADMISSÃO", "DATA ADMISSAO", "DATA DE ADMISSÃO", "DT ADMISSAO", "DT ADMISSÃO", "ADMISSÃO"],
  contrato_tipo: ["CONTRATO", "TIPO CONTRATO", "TIPO DE CONTRATO"],
  treinamento: ["TREINAMENTO", "STATUS TREINAMENTO", "TREIN", "TREINAMENTOS NORMATIVOS"],
  ponto_batida: ["PONTO", "CARTÃO PONTO", "CARTAO PONTO", "BIOMETRIA"],
  cracha: ["CRACHA", "CRACHÁ", "STATUS CRACHÁ", "LIBERAÇÃO CRACHÁ", "LIBERACAO CRACHA"],
  enviado_rh: ["ENVIADO RH", "ENVIADO AO RH", "ENVIADO_RH", "ENV RH"],
  hotel: ["HOTEL", "HOTEL HOSPEDADO", "HOSPEDAGEM", "NOME DO HOTEL"],
  quarto: ["QUARTO", "QUARTO/APTO", "APTO", "APARTAMENTO", "N QUARTO", "Nº DO QUARTO"],
  tipo_apto: ["TIPO APTO", "TIPO DE ACOMODAÇÃO", "TIPO ACOMODACAO", "ACOMODAÇÃO"],
  checkin_data: ["CHECK-IN", "CHECKIN", "DATA CHECK-IN", "DATA CHECKIN"],
  turno_semana: ["TURNO", "TURNO SEMANA", "TURNO (2ª A 6ª)", "JORNADA"],
  rota_transporte: ["ROTA", "ROTA TRANSPORTE", "ROTA DE TRANSPORTE", "PERCURSO"],
  tipo_transporte: ["TIPO TRANSPORTE", "TIPO DE VEÍCULO", "TIPO VEICULO", "VEICULO", "VEÍCULO"],
  coordenador: ["COORDENADOR", "COORDENADOR RESP", "COORDENADOR RESPONSÁVEL"],
  supervisor: ["SUPERVISOR", "SUPERVISOR RESP", "SUPERVISOR RESPONSÁVEL"],
  encarregado: ["ENCARREGADO", "ENCARREGADO RESP"],
  local_trabalho: ["LOCAL TRABALHO", "FRENTE DE TRABALHO", "FRENTE TRABALHO", "LOCAL DE TRABALHO"],
  setor_trabalho: ["SETOR", "SETOR TRABALHO", "SETOR DE ATUAÇÃO", "AREA", "ÁREA"],
  vr_status: ["VR", "VALE REFEIÇÃO", "VALE REFEICAO", "VR STATUS"],
  uniforme_tam: ["UNIFORME", "TAMANHO UNIFORME", "TAM UNIFORME", "TAM. UNIFORME"],
  epi_status: ["EPI", "EPIS", "EPIs", "ENTREGA EPI", "ENTREGA DE EPIS", "STATUS EPI"],
  c_custo: ["CENTRO DE CUSTO", "C CUSTO", "CENTRO_CUSTO", "CC", "C.CUSTO"],
  obs_geral: ["OBS", "OBSERVAÇÕES", "OBSERVACOES", "OBS GERAL", "OBSERVAÇÃO GERAL"],
  data_desligamento: ["DATA DEMISSÃO", "DATA DEMISSAO", "DEMISSÃO", "DEMISSAO", "DT DESLIGAMENTO", "DATA DESLIGAMENTO"],
  ind: ["IND", "INDICADOR"],
  pessoa: ["PESSOA", "TIPO PESSOA"],
  req: ["REQ", "REQUISIÇÃO", "REQUISICAO"],
  vinculado: ["VINCULADO", "VÍNCULO"],
  carta_oferta: ["CARTA OFERTA", "CARTA DE OFERTA"],
  colab_pend: ["COLAB. PEND.", "COLAB PEND", "COLABORADOR PENDENTE"],
  docs: ["DOCS", "DOCUMENTOS", "DOCUMENTAÇÃO"],
  rpv: ["RPV"],
  pre_admissao: ["PRÉ ADMISSÃO", "PRE ADMISSAO", "PRE-ADMISSÃO", "PRÉ-ADMISSÃO"],
  mob: ["MOB", "MOBILIZAÇÃO", "MOBILIZACAO"],
  op: ["OP", "ORDEM PRODUCAO", "ORDEM DE PRODUÇÃO"],
  portal: ["PORTAL", "STATUS PORTAL"],
  realizar_trein: ["REALIZAR TREINAMENTO", "REAL TREIN", "REALIZAR TREIN"],
  local_trein: ["LOCAL TREINAMENTO", "LOCAL DO TREINAMENTO"],
  histograma: ["HISTOGRAMA", "HISTO"],
  idade: ["IDADE"],
  vr: ["VR"],
  termino: ["TERMINO", "TÉRMINO", "TÉRMINO CONTRATO"],
  prorrogacao: ["PRORROGACAO", "PRORROGAÇÃO"],
};

// ── Mapeamento schemaId → chave da API (coluna na planilha) ─────────────────

export const SCHEMA_TO_API: Record<string, string | null> = {
  re: "RE",
  nome: "NOME",
  cpf: "CPF",
  funcao: "FUNCAO_CLT",
  dt_nasc: "DT_NASCIMENTO",
  sexo: null,
  telefone: "TELEFONE",
  municipio: "MUNICIPIO",
  uf: "UF",
  endereco: null,
  idade: "IDADE",
  status_adm: "STATUS",
  clinica: "CLINICA",
  data_exame: "EXAME",
  aso_status: "ASO",
  data_admissao: "DATA_ADMISSAO",
  contrato_tipo: "CONTRATO",
  treinamento: "TREINAMENTO",
  ponto_batida: "PONTO",
  cracha: "CRACHA",
  enviado_rh: "ENVIADO_RH",
  hotel: null,
  quarto: null,
  tipo_apto: null,
  checkin_data: null,
  turno_semana: null,
  rota_transporte: null,
  tipo_transporte: null,
  coordenador: null,
  supervisor: null,
  encarregado: null,
  local_trabalho: null,
  setor_trabalho: null,
  vr_status: "VR",
  uniforme_tam: null,
  epi_status: null,
  c_custo: null,
  obs_geral: null,
  data_desligamento: "DEMISSAO",
  ind: "IND",
  pessoa: "PESSOA",
  req: "REQ",
  vinculado: "VINCULADO",
  carta_oferta: "CARTA_OFERTA",
  colab_pend: "COLAB_PEND",
  docs: "DOCS",
  rpv: "RPV",
  pre_admissao: "PRE_ADMISSAO",
  mob: "MOB",
  op: "OP",
  portal: "PORTAL",
  realizar_trein: "REALIZAR_TREINAMENTO",
  local_trein: "LOCAL_TREINAMENTO",
  histograma: "HISTOGRAMA",
  vr: "VR",
  termino: "TERMINO",
  prorrogacao: "PRORROGACAO",
};

// ── Sanitização ──────────────────────────────────────────────────────────────

function toStr(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return String(value).trim();
}

export function sanitizeCPF(value: unknown): string {
  return toStr(value).replace(/\D/g, "");
}

export function sanitizeDate(value: unknown): string | null {
  if (!value && value !== 0) return null;
  if (typeof value === "number") {
    const date = new Date((value - 25569) * 86400 * 1000);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split("T")[0];
  }
  const str = toStr(value);
  if (!str) return null;
  const brMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) return str;
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) return new Date(parsed).toISOString().split("T")[0];
  return null;
}

export function sanitizeText(value: unknown, options: { upper?: boolean } = {}): string | null {
  const str = toStr(value);
  if (!str) return null;
  return options.upper ? str.toUpperCase() : str;
}

export function mapStrictEnums(schemaId: string, rawValue: string | null): string | null {
  if (!rawValue) {
    if (["status_adm", "docs", "aso_status", "mob", "vr_status", "vr", "carta_oferta", "cracha", "ponto_batida"].includes(schemaId)) return "Pendente";
    if (schemaId === "contrato_tipo") return "CLT";
    if (schemaId === "pessoa") return "Física";
    if (schemaId === "colab_pend") return "Não";
    return null;
  }
  const v = rawValue.toUpperCase().trim();
  switch (schemaId) {
    case "status_adm":
      if (v.includes("ATIVO")) return "Ativo";
      if (v.includes("DESLIGADO") || v.includes("DEMITIDO")) return "Desligado";
      if (v.includes("INATIVO") || v.includes("DESIST") || v.includes("RETIRADO")) return "Inativo";
      return "Pendente";
    case "docs":
      if (v === "OK" || v.includes("COMPLETO") || v === "SIM") return "Completo";
      if (v.includes("INCOMPLETO") || v.includes("FALTA")) return "Incompleto";
      return "Pendente";
    case "aso_status":
      if (v === "OK" || v.includes("APTO") || v === "SIM") return "Apto";
      if (v.includes("INAPTO") || v.includes("RESTRI")) return "Inapto";
      return "Pendente";
    case "mob":
      if (v === "OK" || v.includes("MOB") || v === "SIM") return "Sim";
      if (v === "NÃO" || v === "NAO") return "Não";
      return "Pendente";
    case "contrato_tipo":
      if (v === "PJ") return "PJ";
      if (v.includes("TEMP") || v.includes("DET")) return "Temporário";
      if (v.includes("ESTAG")) return "Estagiário";
      return "CLT";
    case "vr_status":
    case "vr":
      if (v === "OK" || v === "SIM" || v.includes("ATIVO")) return "Ativo";
      return "Pendente";
    case "pessoa":
      if (v.includes("JUR") || v === "PJ") return "Jurídica";
      return "Física";
    case "carta_oferta":
      if (v === "OK" || v === "SIM" || v === "S") return "Sim";
      if (v === "NÃO" || v === "NAO" || v === "N") return "Não";
      return "Pendente";
    case "colab_pend":
      if (v === "OK" || v === "SIM" || v === "S") return "Sim";
      return "Não";
    case "cracha":
      if (v === "OK" || v.includes("EMITIDO") || v === "SIM" || v === "S") return "Emitido";
      return "Pendente";
    case "ponto_batida":
      if (v === "OK" || v.includes("CADAS") || v.includes("BIO") || v === "SIM") return "Cadastrado";
      return "Pendente";
    default:
      return rawValue;
  }
}

// ── Resolução de Cabeçalhos ──────────────────────────────────────────────────

export function buildHeaderMap(headers: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const rawHeader of headers) {
    const normalized = rawHeader.trim().toUpperCase().replace(/\s+/g, " ");
    for (const [schemaId, aliases] of Object.entries(HEADER_ALIASES)) {
      const found = aliases.some((alias) => {
        const a = alias.toUpperCase().replace(/\s+/g, " ");
        return normalized === a || normalized.startsWith(a) || normalized.includes(a);
      });
      if (found) {
        map.set(rawHeader, schemaId);
        break;
      }
    }
  }
  return map;
}

// ── Conversão de Linha → Record com chaves da API ───────────────────────────

export function rowToColaborador(row: RawRow, headerMap: Map<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [rawHeader, schemaId] of headerMap.entries()) {
    const rawValue = row[rawHeader];
    const apiKey = SCHEMA_TO_API[schemaId];
    if (!apiKey) continue;

    if (schemaId === "cpf") {
      const cpf = sanitizeCPF(rawValue);
      if (cpf) result[apiKey] = cpf;
    } else if (["dt_nasc", "data_exame", "data_admissao", "checkin_data", "data_desligamento", "termino", "prorrogacao"].includes(schemaId)) {
      result[apiKey] = sanitizeDate(rawValue);
    } else if (schemaId === "idade") {
      const n = Number(rawValue);
      if (!isNaN(n) && n >= 16 && n <= 99) result[apiKey] = Math.round(n);
    } else if (["nome", "funcao"].includes(schemaId)) {
      result[apiKey] = sanitizeText(rawValue, { upper: true });
    } else {
      result[apiKey] = mapStrictEnums(schemaId, sanitizeText(rawValue));
    }
  }
  return result;
}
