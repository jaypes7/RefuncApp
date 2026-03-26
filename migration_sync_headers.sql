-- ============================================================================
-- MIGRATION: Sincronizar colunas do banco com headers reais das planilhas
-- ============================================================================
-- Gerado automaticamente pela análise 3-Way: CSV × schemas.ts × PostgreSQL
-- Data: 2026-03-26
--
-- INSTRUÇÕES: Execute este script no Supabase SQL Editor.
-- Todos os comandos usam IF NOT EXISTS — seguro para re-execução.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. TABELA: colaboradores
-- ────────────────────────────────────────────────────────────────────────────
-- CSV Header: "DATA DE VIAGEM" → data_viagem (date)
-- Motivo: Tracking de quando o colaborador viaja para o canteiro de obras.
ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS data_viagem date;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. TABELA: logistica_controle
-- ────────────────────────────────────────────────────────────────────────────
-- Colunas descobertas na planilha "Plan Logistica.xlsx - Controle"
-- que NÃO existem na tabela atual.
ALTER TABLE public.logistica_controle
  ADD COLUMN IF NOT EXISTS status character varying;

ALTER TABLE public.logistica_controle
  ADD COLUMN IF NOT EXISTS situacao character varying;

ALTER TABLE public.logistica_controle
  ADD COLUMN IF NOT EXISTS fase character varying;

ALTER TABLE public.logistica_controle
  ADD COLUMN IF NOT EXISTS sexo character varying;

ALTER TABLE public.logistica_controle
  ADD COLUMN IF NOT EXISTS data_admissao date;

ALTER TABLE public.logistica_controle
  ADD COLUMN IF NOT EXISTS coordenador character varying;

ALTER TABLE public.logistica_controle
  ADD COLUMN IF NOT EXISTS supervisor character varying;

ALTER TABLE public.logistica_controle
  ADD COLUMN IF NOT EXISTS encarregado character varying;

ALTER TABLE public.logistica_controle
  ADD COLUMN IF NOT EXISTS tipo_apto character varying;

ALTER TABLE public.logistica_controle
  ADD COLUMN IF NOT EXISTS local_trabalho character varying;

ALTER TABLE public.logistica_controle
  ADD COLUMN IF NOT EXISTS setor_trabalho character varying;

ALTER TABLE public.logistica_controle
  ADD COLUMN IF NOT EXISTS demissao date;

ALTER TABLE public.logistica_controle
  ADD COLUMN IF NOT EXISTS data_nascimento date;

ALTER TABLE public.logistica_controle
  ADD COLUMN IF NOT EXISTS telefone character varying;

ALTER TABLE public.logistica_controle
  ADD COLUMN IF NOT EXISTS uf character varying;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. TABELA: seguranca_fits
-- ────────────────────────────────────────────────────────────────────────────
-- Colunas descobertas na planilha "plan Segurança.xlsx - FIT'S"
ALTER TABLE public.seguranca_fits
  ADD COLUMN IF NOT EXISTS mob character varying;

ALTER TABLE public.seguranca_fits
  ADD COLUMN IF NOT EXISTS municipio character varying;

ALTER TABLE public.seguranca_fits
  ADD COLUMN IF NOT EXISTS uf character varying;

ALTER TABLE public.seguranca_fits
  ADD COLUMN IF NOT EXISTS rpv character varying;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. TABELA: suprimentos_ordens
-- ────────────────────────────────────────────────────────────────────────────
-- Colunas descobertas na planilha "plan Suprimentos2.xlsx - SUPRIMENTOS"
ALTER TABLE public.suprimentos_ordens
  ADD COLUMN IF NOT EXISTS cotacoes character varying;

ALTER TABLE public.suprimentos_ordens
  ADD COLUMN IF NOT EXISTS data_criacao character varying;

ALTER TABLE public.suprimentos_ordens
  ADD COLUMN IF NOT EXISTS informado_por character varying;

-- ============================================================================
-- COLUNAS NÃO ADICIONADAS (Tech Lead Rule — dados irrelevantes ou redundantes):
-- ============================================================================
-- logistica_controle:
--   HORARIO CHECK-IN, DATA CHECK-IN2, HORA CHECK-IN — horários granulares
--   DATA EMB. IDA, HORA DESEMB. IDA, DATA-DESEMBARQUE, etc. — itinerário detalhado
--   LOCAL REF. TRAB., MOTIVO REFEIÇÃO, LANCHE TRAB. — dados de refeição
--   CRÉD VR ALM., CRÉD VR JANT — créditos VR (financeiro)
--   ADMISSÃO2 — duplicata
--   C. CUSTOS HOSPEDAGEM — centro de custo (financeiro, NÃO hotel)
--   ENDEREÇO, Nº, COMPLEM., BARRO, PONTO TRANSPORTE, CIDADE — endereço completo
--   ROTA VIAGEM TERRESTRE, ROTA VIAGEM AÉREA — rotas de viagem detalhadas
--   DATA FÉRIAS — domínio separado
-- ============================================================================
