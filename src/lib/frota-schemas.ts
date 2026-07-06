/**
 * ============================================================================
 * CONTROLE DE FROTA — Schemas Zod + configs CRUD por entidade
 * ============================================================================
 */

import { z } from "zod";
import type { CrudConfig } from "@/lib/frota-crud";

const optStr = z.string().max(500).optional().nullable();
const optDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (YYYY-MM-DD)").optional().nullable();
const optNum = z.number().optional().nullable();
const optInt = z.number().int().optional().nullable();
const optUuid = z.string().uuid().optional().nullable();

// ── Veículos ─────────────────────────────────────────────────────────────────

const VeiculoBase = z.object({
  placa: z.string().min(1, "Placa é obrigatória").max(10).transform((v) => v.toUpperCase().replace(/[\s-]/g, "")),
  renavam: optStr,
  crv: optStr,
  uf: optStr,
  marca: optStr,
  modelo: optStr,
  tipo: optStr,
  ano_fabricacao: optStr,
  exercicio_crlv: optStr,
  combustivel: optStr,
  chave_reserva: optStr,
  status: optStr,
  acao: optStr,
  aplicacao_devolucao: optStr,
  data_aplicacao: optDate,
  gestor: optStr,
  local_trabalho: optStr,
  centro_custo: optStr,
  ut_atual: optStr,
  condutor_nome: optStr,
  condutor_re: optStr,
  telefone: optStr,
  score_dirigibilidade: optStr,
  validade_credenciamento: optDate,
  propriedade: optStr,
  modalidade: optStr,
  tipo_contrato: optStr,
  valor_locacao: optNum,
  valor_aporte: optNum,
  cnpj_proprietario: optStr,
  rastreador: optStr,
  num_requisicao: optStr,
  data_requisicao: optDate,
  status_rv: optStr,
  chamado: optStr,
  conteudo: optStr,
  observacoes: optStr,
});

export const veiculosConfig: CrudConfig = {
  table: "frota_veiculos",
  searchCols: ["placa", "modelo", "marca", "condutor_nome"],
  filterCols: ["status", "tipo", "propriedade"],
  orderBy: { column: "placa", ascending: true },
  createSchema: VeiculoBase,
  updateSchema: VeiculoBase.partial(),
};

// ── Manutenções ──────────────────────────────────────────────────────────────

const ManutencaoBase = z.object({
  veiculo_id: optUuid,
  placa: z.string().min(1, "Placa é obrigatória").max(10).transform((v) => v.toUpperCase().replace(/[\s-]/g, "")),
  tipo: z.enum(["PREVENTIVA", "CORRETIVA", "SINISTRO"]),
  situacao: optStr,
  km_atual: optInt,
  previsao_proxima: optDate,
  km_proxima_revisao: optInt,
  data_atendimento: optDate,
  data_parada: optDate,
  hora: optStr,
  local_oficina: optStr,
  descricao_servico: optStr,
  protocolo: optStr,
  diretor: optStr,
  coligada: optStr,
});

export const manutencoesConfig: CrudConfig = {
  table: "frota_manutencoes",
  searchCols: ["placa", "descricao_servico", "local_oficina"],
  filterCols: ["tipo", "situacao", "veiculo_id"],
  orderBy: { column: "data_atendimento", ascending: false },
  createSchema: ManutencaoBase,
  updateSchema: ManutencaoBase.partial(),
};

// ── Prestadores (oficinas) ───────────────────────────────────────────────────

const PrestadorBase = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(500),
  cidade: optStr,
  classificacao: optStr,
  link_maps: optStr,
  telefone: optStr,
  contato: optStr,
  motivo_classificacao: optStr,
});

export const prestadoresConfig: CrudConfig = {
  table: "frota_prestadores",
  searchCols: ["nome", "cidade", "contato"],
  filterCols: ["classificacao", "cidade"],
  orderBy: { column: "nome", ascending: true },
  createSchema: PrestadorBase,
  updateSchema: PrestadorBase.partial(),
};

// ── Fornecedores (locadoras/rastreadores/pedágio) ────────────────────────────

const FornecedorBase = z.object({
  empresa: z.string().min(1, "Empresa é obrigatória").max(500),
  status: optStr,
  atendimento: optStr,
  servicos: optStr,
  contato: optStr,
  telefone: optStr,
  whatsapp: optStr,
  site_email: optStr,
});

export const fornecedoresConfig: CrudConfig = {
  table: "frota_fornecedores",
  searchCols: ["empresa", "servicos", "contato"],
  filterCols: ["status"],
  orderBy: { column: "empresa", ascending: true },
  createSchema: FornecedorBase,
  updateSchema: FornecedorBase.partial(),
};

// ── Cartões combustível (Alelo) ──────────────────────────────────────────────

const CartaoBase = z.object({
  numero: z.string().min(1, "Número é obrigatório").max(50),
  status: optStr,
  tipo: optStr,
  veiculo_id: optUuid,
  limite_anterior: optNum,
  limite_atual: optNum,
  saldo_atual: optNum,
  ultima_placa: optStr,
  ultimo_condutor: optStr,
});

export const cartoesConfig: CrudConfig = {
  table: "frota_cartoes",
  searchCols: ["numero", "ultima_placa", "ultimo_condutor"],
  filterCols: ["status", "tipo"],
  orderBy: { column: "numero", ascending: true },
  createSchema: CartaoBase,
  updateSchema: CartaoBase.partial(),
};

// ── Tags de pedágio (Veloe) ──────────────────────────────────────────────────

const TagBase = z.object({
  numero: z.string().min(1, "Número é obrigatório").max(50),
  status: optStr,
  marca: optStr,
  veiculo_id: optUuid,
});

export const tagsConfig: CrudConfig = {
  table: "frota_tags",
  searchCols: ["numero", "marca"],
  filterCols: ["status", "marca"],
  orderBy: { column: "numero", ascending: true },
  createSchema: TagBase,
  updateSchema: TagBase.partial(),
};
