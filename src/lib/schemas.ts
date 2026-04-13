/**
 * ============================================================================
 * SCHEMAS ZOD - Validação de Dados
 * ============================================================================
 *
 * Schemas rigorosos para validação de todos os dados que entram/saem
 * da API. Uma tipagem errada pode quebrar a planilha inteira.
 */

import { z } from "zod";

// ============================================================================
// ENUMS E TIPOS
// ============================================================================

export const StatusEnum = z.enum(["Ativo", "Pendente", "Inativo", "Desligado"]);
export const SimNaoPendenteEnum = z.enum(["Sim", "Não", "Pendente"]);
export const SimNaoEnum = z.enum(["Sim", "Não"]);
export const PessoaEnum = z.enum(["Física", "Jurídica"]);
export const ExameEnum = z.enum(["Realizado", "Agendado", "Pendente"]);
export const DocsEnum = z.enum(["Completo", "Pendente", "Incompleto"]);
export const AsoEnum = z.enum(["Apto", "Inapto", "Pendente"]);
export const ContratoEnum = z.enum(["CLT", "PJ", "Temporário", "Estagiário"]);
export const PortalEnum = z.enum(["Liberado", "Pendente", "Bloqueado"]);
export const CrachaEnum = z.enum(["Emitido", "Pendente"]);
export const PontoEnum = z.enum(["Cadastrado", "Pendente"]);
export const TreinamentoEnum = z.enum(["Concluído", "Em Andamento", "Pendente"]);
export const VREnum = z.enum(["Ativo", "Pendente"]);

// UF do Brasil
export const UFEnum = z.enum([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

// ============================================================================
// HELPERS DE PRÉ-PROCESSAMENTO
// ============================================================================

/**
 * Converte strings vazias e null em undefined antes da validação Zod.
 * Evita que campos opcionais de enum recebam "" e falhem a validação estrita.
 */
const emptyStringToUndefined = (val: unknown) => {
  if (val === null || val === undefined) return undefined;
  if (typeof val === "string" && val.trim() === "") return undefined;
  return val;
};

// Valores válidos para cada enum (usado no safeEnum)
const STATUS_VALUES = ["Ativo", "Pendente", "Inativo", "Desligado"] as const;
const SIM_NAO_PENDENTE_VALUES = ["Sim", "Não", "Pendente"] as const;
const SIM_NAO_VALUES = ["Sim", "Não"] as const;
const PESSOA_VALUES = ["Física", "Jurídica"] as const;
const EXAME_VALUES = ["Realizado", "Agendado", "Pendente"] as const;
const DOCS_VALUES = ["Completo", "Pendente", "Incompleto"] as const;
const ASO_VALUES = ["Apto", "Inapto", "Pendente"] as const;
const CONTRATO_VALUES = ["CLT", "PJ", "Temporário", "Estagiário"] as const;
const PORTAL_VALUES = ["Liberado", "Pendente", "Bloqueado"] as const;
const CRACHA_VALUES = ["Emitido", "Pendente"] as const;
const PONTO_VALUES = ["Cadastrado", "Pendente"] as const;
const TREINAMENTO_VALUES = ["Concluído", "Em Andamento", "Pendente"] as const;
const VR_VALUES = ["Ativo", "Pendente"] as const;
const UF_VALUES = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"] as const;

/**
 * Cria um schema seguro para enums no update que:
 * - Aceita valores válidos do enum
 * - Converte null/undefined/"" para undefined
 * - Converte valores inválidos para undefined (não lança erro)
 */
function safeEnum<const T extends readonly string[]>(enumValues: T): z.ZodType<T[number] | undefined> {
  return z.preprocess(
    (val) => {
      // Converte null/undefined/vazio para undefined
      if (val === null || val === undefined) return undefined;
      if (typeof val === "string" && val.trim() === "") return undefined;
      
      // Valida se está nos valores permitidos
      if (typeof val === "string" && (enumValues as readonly string[]).includes(val)) return val;
      
      // Valor inválido - converte para undefined
      return undefined;
    },
    z.any().optional()
  ) as z.ZodType<T[number] | undefined>;
}

/**
 * Normaliza qualquer representação de data para "YYYY-MM-DD" ou undefined.
 *
 * Formatos tratados:
 *  - Serial numérico do Excel/Sheets  → "37604"
 *  - Padrão brasileiro                → "DD/MM/YYYY"
 *  - ISO com timestamp                → "2024-01-08T00:00:00Z"
 *  - Já normalizado                   → "YYYY-MM-DD"
 *  - Vazio / null / undefined         → undefined
 */
const preprocessDate = (val: unknown): unknown => {
  if (val === "" || val === null || val === undefined) return undefined;
  if (typeof val === "string") {
    const str = val.trim();
    if (str === "") return undefined;
    // Serial numérico do Excel
    if (/^\d+$/.test(str)) {
      return new Date((parseInt(str, 10) - 25569) * 86400 * 1000)
        .toISOString()
        .split("T")[0];
    }
    // Padrão brasileiro DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
      const [dd, mm, yyyy] = str.split("/");
      return `${yyyy}-${mm}-${dd}`;
    }
    // ISO ou qualquer outro formato — devolve só a parte da data
    return str.split("T")[0];
  }
  return val;
};

const preprocessTurno = (val: unknown) => {
  if (val === null || val === undefined || val === "") return undefined;

  const str = String(val).toUpperCase().trim();

  // BLOQUEIO CRÍTICO: Se a string for apenas um número ou float (ex: "0.75", "18.00"), converte para undefined.
  if (/^[\d.,]+$/.test(str)) return undefined;

  // Whitelist de Turnos
  if (str.includes("3")) return "3º TURNO";
  if (str.includes("2")) return "2º TURNO";
  if (str.includes("1")) return "1º TURNO";
  if (str.includes("ADM")) return "ADMINISTRATIVO";

  return undefined;
};

// ============================================================================
// SCHEMAS AUXILIARES
// ============================================================================

/**
 * Schema para CPF - remove máscara, garante 11 dígitos com zeros à esquerda
 */
export const CPFSchema = z
  .string()
  .or(z.number())
  .transform((cpf) => {
    // Converte para string e remove tudo que não é dígito
    const clean = String(cpf).replace(/\D/g, "");
    // Garante 11 dígitos com zeros à esquerda
    return clean.padStart(11, "0");
  })
  .refine((cpf) => /^\d{11}$/.test(cpf), {
    message: "CPF deve conter exatamente 11 dígitos numéricos",
  });

/**
 * Schema para datas opcionais no formato ISO (YYYY-MM-DD).
 * Aceita seriais do Excel, DD/MM/YYYY e strings ISO — converte tudo para YYYY-MM-DD.
 */
export const DateSchema = z.preprocess(
  preprocessDate,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD")
    .optional(),
);

/**
 * Schema para datas obrigatórias no formato ISO (YYYY-MM-DD).
 * Igual ao DateSchema mas sem `.optional()` — usado em campos que não podem ser nulos.
 */
export const DateRequiredSchema = z.preprocess(
  preprocessDate,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
);

/**
 * Schema para telefone
 * Aceita: formato válido, string vazia (converte para undefined), null, undefined
 */
export const TelefoneSchema = z.preprocess(
  (val) => {
    if (val === null || val === undefined) return undefined;
    if (typeof val === "string" && val.trim() === "") return undefined;
    return val;
  },
  z
    .string()
    .regex(/^\(\d{2}\)\s?\d{4,5}-?\d{4}$|^\d{10,11}$/, "Telefone inválido")
    .optional()
);

// ============================================================================
// SCHEMA PRINCIPAL - COLABORADOR
// ============================================================================

/**
 * Schema completo do Colaborador (38 colunas da planilha + campos extras do DB).
 *
 * ─ COMPORTAMENTO DE CAMPOS NÃO MAPEADOS ────────────────────────────────────
 * z.object() usa a estratégia "strip" por padrão: qualquer chave presente nos
 * dados de entrada que NÃO esteja declarada neste schema é SILENCIOSAMENTE
 * DESCARTADA antes de chegar à base de dados. Isso é intencional — planilhas
 * importadas costumam ter colunas extras que não precisam ser persistidas.
 * Para verificar: `ColaboradorSchema._def.unknownKeys === "strip"` → true.
 *
 * ORDEM DAS 38 COLUNAS SAGRADA - NÃO REORDENAR
 * Campos adicionais do banco ficam no bloco "Campos extras (DB)" abaixo.
 */
export const ColaboradorSchema = z.object({
  // Colunas 1-5
  IND: z.preprocess(emptyStringToUndefined, z.string().optional()),
  STATUS: z.preprocess(emptyStringToUndefined, StatusEnum.optional().catch(undefined)),
  ENVIADO_RH: z.preprocess(emptyStringToUndefined, SimNaoPendenteEnum.optional().catch(undefined)),
  PESSOA: z.preprocess(emptyStringToUndefined, PessoaEnum.optional().catch(undefined)),
  REQ: z.preprocess(emptyStringToUndefined, z.string().optional()),

  // Colunas 6-10
  VINCULADO: z.preprocess(emptyStringToUndefined, z.string().optional()),
  CARTA_OFERTA: z.preprocess(emptyStringToUndefined, SimNaoPendenteEnum.optional().catch(undefined)),
  COLAB_PEND: z.preprocess(emptyStringToUndefined, SimNaoEnum.optional().catch(undefined)),
  EXAME: z.preprocess(emptyStringToUndefined, ExameEnum.optional().catch(undefined)),
  CLINICA: z.preprocess(emptyStringToUndefined, z.string().optional()),

  // Colunas 11-15
  DOCS: z.preprocess(emptyStringToUndefined, DocsEnum.optional().catch(undefined)),
  ASO: z.preprocess(emptyStringToUndefined, AsoEnum.optional().catch(undefined)),
  RPV: z.preprocess(emptyStringToUndefined, z.string().optional()),
  PRE_ADMISSAO: z.preprocess(emptyStringToUndefined, SimNaoPendenteEnum.optional().catch(undefined)),
  MOB: z.preprocess(emptyStringToUndefined, z.string().optional()),

  // Colunas 16-20
  OP: z.preprocess(emptyStringToUndefined, z.string().optional()),
  DATA_ADMISSAO: DateSchema,
  CONTRATO: z.preprocess(emptyStringToUndefined, ContratoEnum.optional().catch(undefined)),
  PORTAL: z.preprocess(emptyStringToUndefined, PortalEnum.optional().catch(undefined)),
  CRACHA: z.preprocess(emptyStringToUndefined, CrachaEnum.optional().catch(undefined)),

  // Colunas 21-25
  PONTO: z.preprocess(emptyStringToUndefined, PontoEnum.optional().catch(undefined)),
  TREINAMENTO: z.preprocess(emptyStringToUndefined, TreinamentoEnum.optional().catch(undefined)),
  REALIZAR_TREINAMENTO: z.preprocess(emptyStringToUndefined, SimNaoPendenteEnum.optional().catch(undefined)),
  LOCAL_TREINAMENTO: z.preprocess(emptyStringToUndefined, z.string().optional()),
  RE: z.preprocess(emptyStringToUndefined, z.string().optional()),

  // Colunas 26-30
  NOME: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  FUNCAO_CLT: z.preprocess(emptyStringToUndefined, z.string().optional()),
  HISTOGRAMA: z.preprocess(emptyStringToUndefined, z.string().optional()),
  IDADE: z.coerce.number().min(16).max(99).optional().nullable(),
  DT_NASCIMENTO: DateSchema,

  // Colunas 31-35
  CPF: CPFSchema,
  VR: z.preprocess(emptyStringToUndefined, VREnum.optional().catch(undefined)),
  TERMINO: DateSchema,
  PRORROGACAO: DateSchema,
  DEMISSAO: DateSchema,

  // Colunas 36-38
  MUNICIPIO: z.preprocess(emptyStringToUndefined, z.string().optional()),
  UF: z.preprocess(emptyStringToUndefined, UFEnum.optional().catch(undefined)),
  TELEFONE: TelefoneSchema,

  // ── Campos extras (DB) — não presentes na planilha de importação ──────────
  // Ignorados durante o parse de planilhas (strip); persistidos via Supabase.
  turno_trabalho: z.preprocess(preprocessTurno, z.string().optional()),
  NUMERO_ORACLE: z.preprocess(emptyStringToUndefined, z.string().optional()),
  CENTRO_CUSTO: z.preprocess(emptyStringToUndefined, z.string().optional().nullable()),
});

/**
 * Schema para criação de colaborador (campos obrigatórios)
 * CPF e NOME são obrigatórios para cadastrar um colaborador
 */
export const ColaboradorCreateSchema = ColaboradorSchema.refine(
  (data) => data.CPF && data.NOME,
  {
    message: "CPF e NOME são obrigatórios",
    path: ["CPF"],
  }
);

/**
 * Schema para atualização parcial de colaborador
 * Schema explícito para garantir que o preprocess funcione corretamente em todos os campos
 */
export const ColaboradorUpdateSchema = z.object({
  // Colunas 1-5
  IND: z.preprocess(emptyStringToUndefined, z.string().optional()),
  STATUS: safeEnum(STATUS_VALUES),
  ENVIADO_RH: safeEnum(SIM_NAO_PENDENTE_VALUES),
  PESSOA: safeEnum(PESSOA_VALUES),
  REQ: z.preprocess(emptyStringToUndefined, z.string().optional()),

  // Colunas 6-10
  VINCULADO: z.preprocess(emptyStringToUndefined, z.string().optional()),
  CARTA_OFERTA: safeEnum(SIM_NAO_PENDENTE_VALUES),
  COLAB_PEND: safeEnum(SIM_NAO_VALUES),
  EXAME: safeEnum(EXAME_VALUES),
  CLINICA: z.preprocess(emptyStringToUndefined, z.string().optional()),

  // Colunas 11-15
  DOCS: safeEnum(DOCS_VALUES),
  ASO: safeEnum(ASO_VALUES),
  RPV: z.preprocess(emptyStringToUndefined, z.string().optional()),
  PRE_ADMISSAO: safeEnum(SIM_NAO_PENDENTE_VALUES),
  MOB: z.preprocess(emptyStringToUndefined, z.string().optional()),

  // Colunas 16-20
  OP: z.preprocess(emptyStringToUndefined, z.string().optional()),
  DATA_ADMISSAO: DateSchema,
  CONTRATO: safeEnum(CONTRATO_VALUES),
  PORTAL: safeEnum(PORTAL_VALUES),
  CRACHA: safeEnum(CRACHA_VALUES),

  // Colunas 21-25
  PONTO: safeEnum(PONTO_VALUES),
  TREINAMENTO: safeEnum(TREINAMENTO_VALUES),
  REALIZAR_TREINAMENTO: safeEnum(SIM_NAO_PENDENTE_VALUES),
  LOCAL_TREINAMENTO: z.preprocess(emptyStringToUndefined, z.string().optional()),
  RE: z.preprocess(emptyStringToUndefined, z.string().optional()),

  // Colunas 26-30
  NOME: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").optional(),
  FUNCAO_CLT: z.preprocess(emptyStringToUndefined, z.string().optional()),
  HISTOGRAMA: z.preprocess(emptyStringToUndefined, z.string().optional()),
  IDADE: z.coerce.number().min(16).max(99).optional().nullable(),
  DT_NASCIMENTO: DateSchema,

  // Colunas 31-35
  CPF: CPFSchema.optional(),
  VR: safeEnum(VR_VALUES),
  TERMINO: DateSchema,
  PRORROGACAO: DateSchema,
  DEMISSAO: DateSchema,

  // Colunas 36-38
  MUNICIPIO: z.preprocess(emptyStringToUndefined, z.string().optional()),
  UF: safeEnum(UF_VALUES),
  TELEFONE: TelefoneSchema,

  // ── Campos extras (DB)
  turno_trabalho: z.preprocess(preprocessTurno, z.string().optional()),
  NUMERO_ORACLE: z.preprocess(emptyStringToUndefined, z.string().optional()),
  CENTRO_CUSTO: z.preprocess(emptyStringToUndefined, z.string().optional().nullable()),
});

// ============================================================================
// SCHEMAS DE AUTENTICAÇÃO
// ============================================================================

export const LoginSchema = z.object({
  re: z.string().min(1, "RE é obrigatório"),
  senha: z.string().min(1, "Senha é obrigatória"),
});

// ============================================================================
// SCHEMAS DE CONFIGURAÇÃO
// ============================================================================

export const ConfigSchema = z.object({
  DIAS_TOTAIS_PROJETO: z.coerce.number().positive().optional(),
  DATA_INICIO_PROJETO: DateSchema,
  DATA_FIM_PROJETO: DateSchema,
  ETAPA_ATUAL: z.coerce.number().min(1).max(20).optional(),
  META_ADMISSOES: z.coerce.number().positive().optional(),
  ETAPAS_PROJETO: z.string().optional(), // JSON string com array de etapas
  DURACAO_ETAPAS: z.string().optional(), // JSON string com array de durações

  // ── Campos novos (Supabase) ───────────────────────────────────────────────
  /** Headcount previsto em contrato — usado para calcular déficit de mobilização */
  colaboradores_previstos: z.coerce.number().positive().optional(),
  /** Valor orçado para suprimentos (R$) */
  orcado_suprimentos: z.coerce.number().nonnegative().optional(),
  /** Lista de feriados específicos do projeto (ex.: paralisações programadas) */
  feriados_projeto: z.array(z.coerce.date()).optional(),
});

export const EtapaConfigSchema = z.object({
  id: z.number().min(1).max(20),
  nome: z.string().min(1),
  duracaoDias: z.number().nonnegative(),
  /** Indica se a etapa já foi concluída (persiste no banco) */
  concluida: z.boolean().optional(),
  /** Percentual de avanço físico informado manualmente pelo supervisor (0–100) */
  percentualConcluido: z.number().min(0).max(100).optional(),
  /** Data de início da etapa (YYYY-MM-DD) — deve estar dentro do intervalo do projeto */
  dataInicio: DateSchema,
  /** Data de fim da etapa (YYYY-MM-DD) — deve estar dentro do intervalo do projeto */
  dataFim: DateSchema,
});

export const ConfigUpdateSchema = z.object({
  dataInicio: DateRequiredSchema,
  dataFim:    DateRequiredSchema,
  etapas: z.array(EtapaConfigSchema).min(1).max(20),
  gerenteOperacoes: z.string().optional(),
  gerenteContrato: z.string().optional(),
  nomeCliente: z.string().optional(),
  centroCusto: z.coerce.string().optional(),
  // ── Campos novos (Supabase) ─────────────────────────────────────────────
  colaboradores_previstos: z.coerce.number().positive().optional(),
  orcado_suprimentos: z.coerce.number().nonnegative().optional(),
  feriados_projeto: z.array(z.coerce.date()).optional(),
});

// Schema para salvar apenas dados do projeto (sem etapas)
export const ConfigProjetoSchema = z.object({
  dataInicio: DateRequiredSchema,
  dataFim:    DateRequiredSchema,
  gerenteOperacoes: z.string().optional(),
  gerenteContrato: z.string().optional(),
  nomeCliente: z.string().optional(),
  centroCusto: z.coerce.string().optional(), // Aceita number ou string
  // ── Campos novos (Supabase) ─────────────────────────────────────────────
  colaboradores_previstos: z.coerce.number().positive().optional(),
  orcado_suprimentos: z.coerce.number().nonnegative().optional(),
  feriados_projeto: z.array(z.coerce.date()).optional(),
});

// Schema para salvar apenas as etapas do cronograma (sem dados do projeto)
export const ConfigEtapasSchema = z.object({
  etapas: z.array(EtapaConfigSchema).min(1).max(20),
});

/**
 * Schema para validação de etapas com validação de range de datas.
 * Garante que:
 *  - Data de início <= data de fim (cada etapa)
 *  - Data de início >= data de início do projeto
 *  - Data de fim <= data de fim do projeto
 *
 * Usado server-side para validar o payload antes de persistir no banco.
 */
export const ConfigEtapasValidadoSchema = ConfigEtapasSchema.extend({
  dataInicio: DateRequiredSchema,
  dataFim: DateRequiredSchema,
}).refine(
  (data) => data.dataInicio <= data.dataFim,
  {
    message: "Data de início do projeto deve ser menor ou igual à data de fim",
    path: ["dataInicio"],
  }
).refine(
  (data) => {
    // Valida que TODAS as etapas estão dentro do intervalo do projeto
    return data.etapas.every((etapa) => {
      if (!etapa.dataInicio || !etapa.dataFim) return true; // Campos opcionais
      return etapa.dataInicio >= data.dataInicio && etapa.dataFim <= data.dataFim;
    });
  },
  {
    message: "Todas as etapas devem estar dentro do intervalo de datas do projeto",
    path: ["etapas"],
  }
).refine(
  (data) => {
    // Valida que em cada etapa, dataInicio <= dataFim
    return data.etapas.every((etapa) => {
      if (!etapa.dataInicio || !etapa.dataFim) return true; // Campos opcionais
      return etapa.dataInicio <= etapa.dataFim;
    });
  },
  {
    message: "Em cada etapa, a data de início deve ser menor ou igual à data de fim",
    path: ["etapas"],
  }
);

// ============================================================================
// SCHEMAS DE QUERY PARAMS
// ============================================================================

// ============================================================================
// SCHEMA DE SUPRIMENTOS
// ============================================================================

/**
 * Converte qualquer representação numérica da planilha para number.
 *
 * Trata:
 *  - Número nativo                     →  42 / 3.14
 *  - String com símbolo de moeda       →  "R$ 25,75"  →  25.75
 *  - String com separadores de milhar  →  "1.234,56"  →  1234.56
 *  - String simples                    →  "42"        →  42
 *  - Vazio / null / inválido           →  0  (nunca undefined — evita .optional() que quebraria o reduce)
 */
const preprocessNumber = (val: unknown): number => {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    // Remove R$, $, espaços e pontos de milhar; troca vírgula decimal por ponto
    const cleaned = val.replace(/[R$\s.]/g, "").replace(",", ".");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// ============================================================================
// SCHEMA DE HOTÉIS
// ============================================================================

/**
 * Schema de uma linha da aba Hoteis (importação de planilha — UPPERCASE).
 * Layout: A=ID | B=NOME | C=QT_VAGAS | D=VAGAS_OCUPADAS
 */
export const HotelSchema = z.object({
  ID:             z.preprocess(emptyStringToUndefined, z.string().optional()),
  NOME:           z.preprocess(emptyStringToUndefined, z.string().optional()),
  QT_VAGAS:       z.preprocess(preprocessNumber, z.number().catch(0)),
  VAGAS_OCUPADAS: z.preprocess(preprocessNumber, z.number().catch(0)),
});

export type HotelRow = z.infer<typeof HotelSchema>;

/**
 * Schema de um hotel persistido na tabela `configuracoes_hoteis` (Supabase).
 * Usado pelas rotas /api/config/hoteis para validar criação e atualização.
 */
export const HotelDBSchema = z.object({
  id:       z.string().uuid().optional(),
  nome:     z.string(),
  qt_vagas: z.number().int().nonnegative(),
  ativo:    z.boolean().default(true),
});

export type HotelDB = z.infer<typeof HotelDBSchema>;

// ============================================================================
// SCHEMA DE CLÍNICAS
// ============================================================================

/**
 * Schema de uma clínica persistida na tabela `configuracoes_clinicas` (Supabase).
 * Usado pelas rotas /api/config/clinicas para validar criação e atualização.
 */
export const ClinicaSchema = z.object({
  id:       z.string().uuid().optional(),
  nome:     z.string().min(1, "Nome é obrigatório"),
  endereco: z.preprocess(emptyStringToUndefined, z.string().optional()),
  cidade:   z.preprocess(emptyStringToUndefined, z.string().optional()),
  uf:       z.preprocess(emptyStringToUndefined, UFEnum.optional()),
  ativo:    z.boolean().default(true),
});

export type Clinica = z.infer<typeof ClinicaSchema>;

export const StatusSuprimentosEnum = z.enum([
  "Aprovada",
  "Cancelada",
  "Em Aprovação",
  "Pendente",
  "Em cotação",
  "Entregue",
]);

export const EntregueObraEnum = z.enum(["Sim", "Não"]);

/**
 * Schema de uma linha da aba SUPRIMENTOS.
 * Layout real da planilha: A=TOTAL_REQ_PREVISTAS | B=VALORES | C=ORDEM_COMPRA | D=STATUS | E=ENTREGUE_OBRA
 *
 * TOTAL_REQ_PREVISTAS: coluna opcional na planilha (vem da config do projeto).
 *   .catch(0) + preprocessNumber(undefined)=0 garantem que a ausência da coluna
 *   nunca reprova a linha.
 * STATUS: aceita qualquer string (z.string()) para não barrar valores novos
 *   do Excel antes de chegar ao normalizeStatus da API.
 */
export const SuprimentosRowSchema = z.object({
  ORDEM_COMPRA: z.preprocess(emptyStringToUndefined, z.string().optional()),
  TOTAL_REQ_PREVISTAS: z.preprocess(preprocessNumber, z.number().catch(0)),
  VALORES: z.preprocess(preprocessNumber, z.number().catch(0)),
  // String livre — a normalização canônica acontece na API (normalizeStatus)
  STATUS: z.preprocess(emptyStringToUndefined, z.string().optional()),
  ENTREGUE_OBRA: z.preprocess(
    emptyStringToUndefined,
    EntregueObraEnum.optional(),
  ),
});

export type SuprimentosRow = z.infer<typeof SuprimentosRowSchema>;

export const ColaboradoresQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  cargo: z.string().optional(),
  centro_custo: z.string().optional(),
});

// ============================================================================
// SCHEMA DE USUÁRIOS PERMITIDOS
// ============================================================================

export const PerfilEnum = z.enum(["admin", "user", "guest"]);

/**
 * Schema de registro de usuário autorizado.
 *
 * Representa a tabela `usuarios_permitidos` no Supabase.
 * O campo `id` é gerado pelo banco (UUID v4) e opcional na criação.
 */
export const UsuariosPermitidosSchema = z.object({
  /** UUID gerado pelo Supabase — ausente no payload de criação */
  id: z.string().uuid().optional(),
  /** Registro do Empregado — chave de login */
  re: z.string().min(1, "RE é obrigatório"),
  /** Nome completo do usuário */
  nome: z.string().min(1, "Nome é obrigatório"),
  /** Nível de acesso no sistema */
  perfil: PerfilEnum.default("user"),
  /** Centro de custo vinculado (obrigatório para perfil guest) */
  centro_custo: z.string().optional().nullable(),
  /** Timestamp ISO da autorização (preenchido automaticamente pelo banco) */
  autorizado_em: z.string().datetime().optional(),
});

/** Schema para o payload de criação (sem id e autorizado_em) */
export const UsuariosPermitidosCreateSchema = UsuariosPermitidosSchema.omit({
  id: true,
  autorizado_em: true,
});

// ============================================================================
// SCHEMA DE SUPRIMENTOS (BANCO DE DADOS)
// ============================================================================

/**
 * Schema de um registro de ordem de compra persistido no Supabase.
 * Usa snake_case para alinhar com a convenção do banco.
 *
 * Difere do `SuprimentosRowSchema` (que usa UPPERCASE para leitura de planilha):
 *  - `SuprimentosRowSchema`  → parse de linhas brutas da planilha importada
 *  - `SuprimentosSchema`     → registro tipado para escrita/leitura no banco
 */
export const SuprimentosSchema = z.object({
  id: z.string().uuid().optional(),
  item: z.preprocess(emptyStringToUndefined, z.string().optional()),
  requisicao: z.preprocess(emptyStringToUndefined, z.string().optional()),
  prioridade: z.preprocess(emptyStringToUndefined, z.string().optional()),
  descricao: z.preprocess(emptyStringToUndefined, z.string().optional()),
  fornecedores: z.preprocess(emptyStringToUndefined, z.string().optional()),
  cotacoes: z.preprocess(emptyStringToUndefined, z.string().optional()),
  requisitante: z.preprocess(emptyStringToUndefined, z.string().optional()),
  data_criacao: z.preprocess(emptyStringToUndefined, z.string().optional()),
  status: z.preprocess(emptyStringToUndefined, z.string().optional()),
  ordem_compra: z.preprocess(emptyStringToUndefined, z.string().optional()),
  valores: z.preprocess(preprocessNumber, z.number().nonnegative().catch(0)),
  informado_por: z.preprocess(emptyStringToUndefined, z.string().optional()),
  status_ordem: z.preprocess(emptyStringToUndefined, z.string().optional()),
  entregue_obra: z.boolean().default(false),
  projeto_id: z.string().optional(),
  created_at: z.string().datetime().optional(),
});

// ============================================================================
// SCHEMAS DE DOMÍNIOS ISOLADOS
// ============================================================================

/**
 * Schema do domínio RH.
 * Representa os campos HR da tabela `colaboradores` no Supabase.
 * Chave de conflito no upsert: `cpf`.
 */
export const RhSchema = z.object({
  id: z.string().uuid().optional(),
  cpf: CPFSchema,
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  re: z.preprocess(emptyStringToUndefined, z.string().optional()),
  status: z.preprocess(emptyStringToUndefined, StatusEnum.optional()),
  funcao_clt: z.preprocess(emptyStringToUndefined, z.string().optional()),
  contrato: z.preprocess(emptyStringToUndefined, ContratoEnum.optional()),
  data_admissao: DateSchema,
  dt_nascimento: DateSchema,
  idade: z.coerce.number().min(16).max(99).optional().nullable(),
  uf: z.preprocess(emptyStringToUndefined, UFEnum.optional()),
  municipio: z.preprocess(emptyStringToUndefined, z.string().optional()),
  telefone: TelefoneSchema,
  enviado_rh: z.preprocess(emptyStringToUndefined, SimNaoPendenteEnum.optional()),
  docs: z.preprocess(emptyStringToUndefined, DocsEnum.optional()),
  pre_admissao: z.preprocess(emptyStringToUndefined, SimNaoPendenteEnum.optional()),
  vr: z.preprocess(emptyStringToUndefined, VREnum.optional()),
  termino: DateSchema,
  prorrogacao: DateSchema,
  demissao: DateSchema,
  numero_oracle: z.preprocess(emptyStringToUndefined, z.string().optional()),
  created_at: z.string().datetime().optional(),
});

/**
 * Schema do domínio Logística.
 * Tabela: `logistica_controle`. Chave de conflito: `cpf` (fallback: `re`).
 */
export const LogisticaSchema = z.object({
  id: z.string().uuid().optional(),
  cpf: z.preprocess(emptyStringToUndefined, CPFSchema.optional()),
  re: z.preprocess(emptyStringToUndefined, z.string().optional()),
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  funcao_clt: z.preprocess(emptyStringToUndefined, z.string().optional()),
  // Colunas que já existem no DB
  mob: z.preprocess(emptyStringToUndefined, z.string().optional()),
  portal: z.preprocess(emptyStringToUndefined, z.string().optional()),
  ponto: z.preprocess(emptyStringToUndefined, z.string().optional()),
  cracha: z.preprocess(emptyStringToUndefined, z.string().optional()),
  turno_semana: z.preprocess(preprocessTurno, z.string().optional()),
  turno_trabalho: z.preprocess(preprocessTurno, z.string().optional()),
  turno_sabado: z.preprocess(preprocessTurno, z.string().optional()),
  turno_domingo: z.preprocess(preprocessTurno, z.string().optional()),
  hotel: z.preprocess(emptyStringToUndefined, z.string().optional()),
  /** DB column: `quarto` — recebe "Nº APTO." da planilha */
  quarto: z.preprocess(emptyStringToUndefined, z.string().optional()),
  data_checkin: DateSchema,
  tipo_transporte: z.preprocess(emptyStringToUndefined, z.string().optional()),
  rota_transporte: z.preprocess(emptyStringToUndefined, z.string().optional()),
  // Colunas novas (migration_sync_headers.sql)
  status: z.preprocess(emptyStringToUndefined, z.string().optional()),
  situacao: z.preprocess(emptyStringToUndefined, z.string().optional()),
  fase: z.preprocess(emptyStringToUndefined, z.string().optional()),
  sexo: z.preprocess(emptyStringToUndefined, z.string().optional()),
  data_admissao: DateSchema,
  coordenador: z.preprocess(emptyStringToUndefined, z.string().optional()),
  supervisor: z.preprocess(emptyStringToUndefined, z.string().optional()),
  encarregado: z.preprocess(emptyStringToUndefined, z.string().optional()),
  tipo_apto: z.preprocess(emptyStringToUndefined, z.string().optional()),
  local_trabalho: z.preprocess(emptyStringToUndefined, z.string().optional()),
  setor_trabalho: z.preprocess(emptyStringToUndefined, z.string().optional()),
  demissao: DateSchema,
  data_nascimento: DateSchema,
  telefone: z.preprocess(emptyStringToUndefined, z.string().optional()),
  uf: z.preprocess(emptyStringToUndefined, z.string().optional()),
  numero_oracle: z.preprocess(emptyStringToUndefined, z.string().optional()),
  created_at: z.string().datetime().optional(),
});

/**
 * Schema do domínio Segurança (FITs).
 * Tabela: `seguranca_fits`. Chave de conflito: `re`.
 */
export const SegurancaSchema = z.object({
  id: z.string().uuid().optional(),
  re: z.string().min(1, "RE é obrigatório"),
  cpf: z.preprocess(emptyStringToUndefined, CPFSchema.optional()),
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  funcao_clt: z.preprocess(emptyStringToUndefined, z.string().optional()),
  mob: z.preprocess(emptyStringToUndefined, z.string().optional()),
  data_admissao: DateSchema,
  municipio: z.preprocess(emptyStringToUndefined, z.string().optional()),
  uf: z.preprocess(emptyStringToUndefined, UFEnum.optional()),
  num_fit: z.preprocess(emptyStringToUndefined, z.string().optional()),
  aso: z.preprocess(emptyStringToUndefined, AsoEnum.optional()),
  rpv: z.preprocess(emptyStringToUndefined, z.string().optional()),
  numero_oracle: z.preprocess(emptyStringToUndefined, z.string().optional()),
  status_portal: z.preprocess(
    emptyStringToUndefined,
    z.enum(["Aprovado", "Pendente", "Aprovado - DEMITIDO"]).optional(),
  ),
  data_cracha_retirado: DateSchema,
  created_at: z.string().datetime().optional(),
});

// ============================================================================
// TIPOS TYPESCRIPT
// ============================================================================

export type Colaborador = z.infer<typeof ColaboradorSchema>;
export type ColaboradorCreate = z.infer<typeof ColaboradorCreateSchema>;
export type ColaboradorUpdate = z.infer<typeof ColaboradorUpdateSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type Config = z.infer<typeof ConfigSchema>;
export type EtapaConfig = z.infer<typeof EtapaConfigSchema>;
export type ConfigUpdate = z.infer<typeof ConfigUpdateSchema>;
export type ConfigProjeto = z.infer<typeof ConfigProjetoSchema>;
export type ConfigEtapas = z.infer<typeof ConfigEtapasSchema>;
export type ColaboradoresQuery = z.infer<typeof ColaboradoresQuerySchema>;
export type UsuarioPermitido = z.infer<typeof UsuariosPermitidosSchema>;
export type UsuarioPermitidoCreate = z.infer<typeof UsuariosPermitidosCreateSchema>;
export type Suprimento = z.infer<typeof SuprimentosSchema>;
export type PerfilUsuario = z.infer<typeof PerfilEnum>;
export type RhRecord = z.infer<typeof RhSchema>;
export type LogisticaRecord = z.infer<typeof LogisticaSchema>;
export type SegurancaRecord = z.infer<typeof SegurancaSchema>;
