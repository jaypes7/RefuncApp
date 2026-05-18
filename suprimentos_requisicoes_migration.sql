-- ============================================================================
-- MIGRATION: Módulo de Requisições Suprimentos
-- Execute no SQL Editor do Supabase
-- ============================================================================

-- 1. Requisições
CREATE TABLE IF NOT EXISTS public.suprimentos_requisicoes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo        TEXT NOT NULL,
  coordenador   TEXT NOT NULL,
  data_abertura DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'rascunho'
                CHECK (status IN ('rascunho', 'aberta', 'em_andamento', 'concluida', 'cancelada')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Itens da Requisição
CREATE TABLE IF NOT EXISTS public.suprimentos_requisicao_itens (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicao_id       UUID NOT NULL REFERENCES public.suprimentos_requisicoes(id) ON DELETE CASCADE,
  nome_item           TEXT NOT NULL,
  categoria           TEXT NOT NULL,
  unidade             TEXT NOT NULL,
  quantidade          NUMERIC NOT NULL DEFAULT 0,
  quantidade_estoque  NUMERIC NOT NULL DEFAULT 0,
  criticidade         TEXT NOT NULL DEFAULT 'media'
                      CHECK (criticidade IN ('baixa', 'media', 'alta', 'critica')),
  tipo                TEXT NOT NULL DEFAULT 'item'
                      CHECK (tipo IN ('item', 'servico')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Ordens de Compra vinculadas à Requisição
CREATE TABLE IF NOT EXISTS public.suprimentos_ordens_compra (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicao_id    UUID NOT NULL REFERENCES public.suprimentos_requisicoes(id) ON DELETE CASCADE,
  numero_oc        TEXT NOT NULL,
  fornecedor       TEXT NOT NULL,
  valor            NUMERIC,
  valor_previsto   NUMERIC,
  previsao_entrega DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Recebimentos
CREATE TABLE IF NOT EXISTS public.suprimentos_recebimentos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicao_id    UUID NOT NULL REFERENCES public.suprimentos_requisicoes(id) ON DELETE CASCADE,
  tipo             TEXT NOT NULL CHECK (tipo IN ('total', 'parcial')),
  data_recebimento DATE NOT NULL,
  observacao       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Itens recebidos por evento de recebimento
CREATE TABLE IF NOT EXISTS public.suprimentos_recebimento_itens (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recebimento_id       UUID NOT NULL REFERENCES public.suprimentos_recebimentos(id) ON DELETE CASCADE,
  item_id              UUID NOT NULL REFERENCES public.suprimentos_requisicao_itens(id) ON DELETE CASCADE,
  quantidade_recebida  NUMERIC NOT NULL DEFAULT 0
);

-- ============================================================================
-- ÍNDICES (performance nas queries de join)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_req_itens_requisicao_id   ON public.suprimentos_requisicao_itens(requisicao_id);
CREATE INDEX IF NOT EXISTS idx_oc_requisicao_id          ON public.suprimentos_ordens_compra(requisicao_id);
CREATE INDEX IF NOT EXISTS idx_receb_requisicao_id       ON public.suprimentos_recebimentos(requisicao_id);
CREATE INDEX IF NOT EXISTS idx_receb_itens_recebimento_id ON public.suprimentos_recebimento_itens(recebimento_id);
CREATE INDEX IF NOT EXISTS idx_receb_itens_item_id       ON public.suprimentos_recebimento_itens(item_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.suprimentos_requisicoes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suprimentos_requisicao_itens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suprimentos_ordens_compra     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suprimentos_recebimentos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suprimentos_recebimento_itens ENABLE ROW LEVEL SECURITY;

-- Policies: service_role tem acesso total (padrão do app)
CREATE POLICY "service_role full access requisicoes"
  ON public.suprimentos_requisicoes FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access req_itens"
  ON public.suprimentos_requisicao_itens FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access oc"
  ON public.suprimentos_ordens_compra FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access recebimentos"
  ON public.suprimentos_recebimentos FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access receb_itens"
  ON public.suprimentos_recebimento_itens FOR ALL
  TO service_role USING (true) WITH CHECK (true);
