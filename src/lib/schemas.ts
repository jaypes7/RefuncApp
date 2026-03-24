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
    // Serial numérico do Excel/Google Sheets
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
 * Schema para datas no formato ISO (YYYY-MM-DD).
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
 * Schema para telefone
 */
export const TelefoneSchema = z
  .string()
  .regex(/^\(\d{2}\)\s?\d{4,5}-?\d{4}$|^\d{10,11}$/, "Telefone inválido")
  .optional()
  .nullable();

// ============================================================================
// SCHEMA PRINCIPAL - COLABORADOR
// ============================================================================

/**
 * Schema completo do Colaborador (38 colunas)
 * ORDEM SAGRADA - NÃO ALTERAR
 */
export const ColaboradorSchema = z.object({
  // Colunas 1-5
  IND: z.preprocess(emptyStringToUndefined, z.string().optional()),
  STATUS: z.preprocess(emptyStringToUndefined, StatusEnum.optional()),
  ENVIADO_RH: z.preprocess(emptyStringToUndefined, SimNaoPendenteEnum.optional()),
  PESSOA: z.preprocess(emptyStringToUndefined, PessoaEnum.optional()),
  REQ: z.preprocess(emptyStringToUndefined, z.string().optional()),

  // Colunas 6-10
  VINCULADO: z.preprocess(emptyStringToUndefined, z.string().optional()),
  CARTA_OFERTA: z.preprocess(emptyStringToUndefined, SimNaoPendenteEnum.optional()),
  COLAB_PEND: z.preprocess(emptyStringToUndefined, SimNaoEnum.optional()),
  EXAME: z.preprocess(emptyStringToUndefined, ExameEnum.optional()),
  CLINICA: z.preprocess(emptyStringToUndefined, z.string().optional()),

  // Colunas 11-15
  DOCS: z.preprocess(emptyStringToUndefined, DocsEnum.optional()),
  ASO: z.preprocess(emptyStringToUndefined, AsoEnum.optional()),
  RPV: z.preprocess(emptyStringToUndefined, z.string().optional()),
  PRE_ADMISSAO: z.preprocess(emptyStringToUndefined, SimNaoPendenteEnum.optional()),
  MOB: z.preprocess(emptyStringToUndefined, SimNaoPendenteEnum.optional()),

  // Colunas 16-20
  OP: z.preprocess(emptyStringToUndefined, z.string().optional()),
  DATA_ADMISSAO: DateSchema,
  CONTRATO: z.preprocess(emptyStringToUndefined, ContratoEnum.optional()),
  PORTAL: z.preprocess(emptyStringToUndefined, PortalEnum.optional()),
  CRACHA: z.preprocess(emptyStringToUndefined, CrachaEnum.optional()),

  // Colunas 21-25
  PONTO: z.preprocess(emptyStringToUndefined, PontoEnum.optional()),
  TREINAMENTO: z.preprocess(emptyStringToUndefined, TreinamentoEnum.optional()),
  REALIZAR_TREINAMENTO: z.preprocess(emptyStringToUndefined, SimNaoPendenteEnum.optional()),
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
  VR: z.preprocess(emptyStringToUndefined, VREnum.optional()),
  TERMINO: DateSchema,
  PRORROGACAO: DateSchema,
  DEMISSAO: DateSchema,

  // Colunas 36-38
  MUNICIPIO: z.preprocess(emptyStringToUndefined, z.string().optional()),
  UF: z.preprocess(emptyStringToUndefined, UFEnum.optional()),
  TELEFONE: TelefoneSchema,
});

/**
 * Schema para criação de colaborador (campos obrigatórios)
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
 */
export const ColaboradorUpdateSchema = ColaboradorSchema.partial();

// ============================================================================
// SCHEMAS DE AUTENTICAÇÃO
// ============================================================================

export const LoginSchema = z.object({
  re: z.string().regex(/^\d+$/, "RE deve conter apenas números").min(1),
});

// ============================================================================
// SCHEMAS DE CONFIGURAÇÃO
// ============================================================================

export const ConfigSchema = z.object({
  DIAS_TOTAIS_PROJETO: z.coerce.number().positive().optional(),
  DATA_INICIO_PROJETO: DateSchema,
  DATA_FIM_PROJETO: DateSchema,
  ETAPA_ATUAL: z.coerce.number().min(1).max(12).optional(),
  META_ADMISSOES: z.coerce.number().positive().optional(),
  ETAPAS_PROJETO: z.string().optional(), // JSON string com array de etapas
  DURACAO_ETAPAS: z.string().optional(), // JSON string com array de durações
});

export const EtapaConfigSchema = z.object({
  id: z.number().min(1).max(12),
  nome: z.string().min(1),
  duracaoDias: z.number().positive(),
});

export const ConfigUpdateSchema = z.object({
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  etapas: z.array(EtapaConfigSchema).min(1).max(20),
  gerenteOperacoes: z.string().optional(),
  gerenteContrato: z.string().optional(),
  nomeCliente: z.string().optional(),
  centroCusto: z.coerce.string().optional(),
});

// Schema para salvar apenas dados do projeto (sem etapas)
export const ConfigProjetoSchema = z.object({
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gerenteOperacoes: z.string().optional(),
  gerenteContrato: z.string().optional(),
  nomeCliente: z.string().optional(),
  centroCusto: z.coerce.string().optional(), // Aceita number ou string
});

// Schema para salvar apenas as etapas do cronograma (sem dados do projeto)
export const ConfigEtapasSchema = z.object({
  etapas: z.array(EtapaConfigSchema).min(1).max(20),
});

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
 * Schema de uma linha da aba Hoteis.
 * Layout: A=ID | B=NOME | C=QT_VAGAS | D=VAGAS_OCUPADAS
 */
export const HotelSchema = z.object({
  ID:             z.preprocess(emptyStringToUndefined, z.string().optional()),
  NOME:           z.preprocess(emptyStringToUndefined, z.string().optional()),
  QT_VAGAS:       z.preprocess(preprocessNumber, z.number().catch(0)),
  VAGAS_OCUPADAS: z.preprocess(preprocessNumber, z.number().catch(0)),
});

export type HotelRow = z.infer<typeof HotelSchema>;

export const StatusSuprimentosEnum = z.enum([
  "Aprovada",
  "Cancelada",
  "Em Aprovação",
]);

export const EntregueObraEnum = z.enum(["Sim", "Não"]);

/**
 * Schema de uma linha da aba SUPRIMENTOS.
 * Layout real da planilha: A=TOTAL_REQ_PREVISTAS | B=VALORES | C=ORDEM_COMPRA | D=STATUS | E=ENTREGUE_OBRA
 */
export const SuprimentosRowSchema = z.object({
  ORDEM_COMPRA: z.preprocess(emptyStringToUndefined, z.string().optional()),
  // .catch(0) garante que um valor inválido nunca derruba a linha toda
  TOTAL_REQ_PREVISTAS: z.preprocess(preprocessNumber, z.number().catch(0)),
  VALORES: z.preprocess(preprocessNumber, z.number().catch(0)),
  STATUS: z.preprocess(emptyStringToUndefined, StatusSuprimentosEnum.optional()),
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
  status: StatusEnum.optional(),
  setor: z.enum(["RH", "LOGISTICA", "SEGURANCA"]).optional(),
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
