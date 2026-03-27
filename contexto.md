# RefuncApp — Documento de Contexto Completo (26/03/2026 - Phase 4: Supabase Live)

> **📁 ESTRUTURA DO PROJETO**: Para análise completa de arquivos, pastas, componentes e endpoints, consulte [ESTRUTURA-PROJETO.md](ESTRUTURA-PROJETO.md)

## 1. Visão Geral e Arquitetura

**RefuncApp** é um sistema de gestão de colaboradores para projetos de implementação em larga escala que gerencia o ciclo completo de onboarding, desde cadastro até treinamento, operação e auditoria com rastreamento de progresso em tempo real.

### Stack Técnico (Atualizado - Phase 4)

**Frontend:**
- **Framework**: Next.js 16.1.6 (React 19.2.3) com TypeScript 5
- **Gerenciamento de Estado**: React Query (@tanstack/react-query 5.90.21) + React Context (AuthProvider)
- **Autenticação**: JWT via jose 6.2.1 com Cookie httpOnly
- **Banco de Dados**: Supabase (PostgreSQL) @supabase/supabase-js 2.100.0
- **Tema**: next-themes (light/dark mode automático)
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS 4)
- **Ícones**: lucide-react (577 ícones)
- **Gráficos**: Recharts 2.15.4 + Chart.js 4.5.1 + react-chartjs-2 5.3.1
- **Formulários**: react-hook-form 7.71.2 + Zod 4.3.6 (validação type-safe)
- **Importação Excel**: SheetJS (xlsx 0.18.5)
- **Animações**: framer-motion 12.36.0
- **Notificações**: sonner 2.0.7 (toast notifications)
- **Máscaras**: react-imask 7.6.1 (input formatting)

**Backend:**
- **API**: Next.js API Routes (serverless on Vercel)
- **Base de Dados**: Supabase (PostgreSQL 14+) - 11 tabelas
- **Autenticação**: JWT assinado com HS256 (jose library)
- **Validação**: Zod 4.3.6 (runtime + compile-time)
- **Logging**: Auditoria completa em table `logs_auditoria`

**Deployment:**
- **Frontend/Backend**: Vercel (serverless, auto-redeployment via git)
- **Analytics**: @vercel/analytics 2.0.1 + @vercel/speed-insights 2.0.0
- **Variáveis de Ambiente**: .env.local (desenvolvimento), Vercel Dashboard (produção)

### Fluxo de Dados Principal (Phase 4 - Supabase)

```
┌─────────────────────────────────────────────────────────┐
│ FRONTEND (Next.js Client Components)                    │
├─────────────────────────────────────────────────────────┤
│ 1. Usuário faz login com RE (Registro do Empregado)     │
│ 2. POST /api/auth/login { re: "123456" }                │
│ 3. Backend valida RE contra `usuarios_permitidos`       │
│ 4. Gera JWT (expiração: 8 horas)                        │
│ 5. Retorna token em cookie httpOnly                     │
│ 6. React Query invalida cache automaticamente           │
│ 7. Usuário pode acessar Central, Dashboard, Config      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ API ROUTES (Next.js Backend)                            │
├─────────────────────────────────────────────────────────┤
│ • Valida JWT no middleware requireAuth()                │
│ • Executa lógica de negócio (Zod validation)            │
│ • Leia/escreve no Supabase via createServerClient()     │
│ • Registra ações em logs_auditoria                      │
│ • Retorna JSON tipado                                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ SUPABASE (PostgreSQL 14+)                               │
├─────────────────────────────────────────────────────────┤
│ 11 Tabelas: colaboradores, usuarios_permitidos,         │
│             configuracoes, etapas, logs_auditoria,      │
│             clinicas, hoteis, suprimentos_ordens,       │
│             logistica_controle, seguranca_fits,         │
│             rh_colaboradores                            │
│                                                         │
│ Row Level Security (RLS): Ativo (service role bypasses) │
│ Backup: Automático Supabase                             │
│ Replicação: PT (Primary) + Backup                       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ DASHBOARD (Gráficos em Tempo Real)                      │
├─────────────────────────────────────────────────────────┤
│ Curva S com etapas (realizado vs planejado)            │
│ Métricas: cadastrados, admitidos, liberados             │
│ Agregações: por função, faixa etária, UF, hotel        │
│ Pendências: atrasos, faltando documentação             │
│ Domínios: RH, Logística, Segurança, Suprimentos        │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Banco de Dados — Tabelas Supabase (Phase 4)

### 2.1 Tabela: `colaboradores`

**Propósito**: Registro central de colaboradores com todos os 40 campos.

**Colunas (snake_case)**:
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()

-- Campos de identificação
cpf             TEXT NOT NULL UNIQUE
re              TEXT
nome            TEXT NOT NULL
dt_nascimento   DATE
idade           INT CHECK (idade >= 16 AND idade <= 99)

-- Dados de pessoal
sexo            TEXT
telefone        TEXT
municipio       TEXT
uf              TEXT (AC...TO - 27 estados)
endereco        TEXT

-- Dados contratuais (RH)
status          TEXT (Ativo | Pendente | Inativo | Desligado)
contrato        TEXT (CLT | PJ | Temporário | Estagiário)
data_admissao   DATE
termino         DATE
prorrogacao     DATE
demissao        DATE
funcao_clt      TEXT
enviado_rh      TEXT (Sim | Não | Pendente)

-- Saúde & Segurança
clinica         TEXT (fk: configuracoes_clinicas.nome)
exame           TEXT (Realizado | Agendado | Pendente)
aso             TEXT (Apto | Inapto | Pendente) ← CRÍTICO para gráficos
rpv             TEXT
docs            TEXT (Completo | Pendente | Incompleto)

-- Mobilização & Logística
mob             TEXT (Sim | Não | Pendente) ← usado em % MOB
op              TEXT
vinculado       TEXT
carta_oferta    TEXT (Sim | Não | Pendente)
colab_pend      TEXT (Sim | Não)

-- Operacional
portal          TEXT (Liberado | Pendente | Bloqueado)
cracha          TEXT (Emitido | Pendente)
ponto           TEXT (Cadastrado | Pendente)
treinamento   TEXT (Concluído | Em Andamento | Pendente)
realizar_treinamento TEXT (Sim | Não | Pendente)
local_treinamento TEXT
pre_admissao    TEXT (Sim | Não | Pendente)

-- Outros
ind             TEXT
pessoa          TEXT (Física | Jurídica)
req             TEXT
vr              TEXT (Ativo | Pendente) ← Vale Refeição
histograma      TEXT

-- Logística Estendida (logistica_controle)
turno_trabalho  TEXT
```

**Índices**:
```sql
CREATE UNIQUE INDEX idx_cpf ON colaboradores(cpf);
CREATE INDEX idx_status ON colaboradores(status);
CREATE INDEX idx_data_admissao ON colaboradores(data_admissao);
CREATE INDEX idx_funcao_clt ON colaboradores(funcao_clt);
CREATE INDEX idx_uf ON colaboradores(uf);
```

### 2.2 Tabela: `usuarios_permitidos`

**Propósito**: ACL - quem pode fazer login no sistema.

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
re              TEXT NOT NULL UNIQUE
nome            TEXT NOT NULL
perfil          TEXT (admin | user | guest) DEFAULT 'user'
autorizado_em   TIMESTAMPTZ DEFAULT now()
```

**Tipos Zod**:
```typescript
UsuariosPermitidosSchema = z.object({
  id: z.string().uuid().optional(),
  re: z.string().regex(/^\d+$/, "RE deve conter apenas números").min(1),
  nome: z.string().min(1, "Nome é obrigatório"),
  perfil: z.enum(["admin", "user", "guest"]).default("user"),
  autorizado_em: z.string().datetime().optional(),
});
```

### 2.3 Tabela: `configuracoes`

**Propósito**: Configurações únicas do projeto (id = 1).

```sql
id              INT PRIMARY KEY DEFAULT 1
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()

-- Datas e Duração
data_inicio_projeto   DATE NOT NULL
data_fim_projeto      DATE NOT NULL
dias_totais_projeto   INT

-- Metas
meta_admissoes        INT DEFAULT 150
etapa_atual           INT DEFAULT 1
colaboradores_previstos INT ← Headcount contragual
orcado_suprimentos    DECIMAL(12,2) ← Orçamento de suprimentos

-- Feriados
feriados_projeto      TEXT[] ← Array de datas YYYY-MM-DD (JSON-serialized)

-- Gestão
gerente_operacoes    TEXT
gerente_contrato     TEXT
nome_cliente         TEXT
centro_custo         TEXT
```

**Exemplo de Payload**:
```json
{
  "dataInicio": "2026-02-01",
  "dataFim": "2026-06-30",
  "etapas": [
    { "id": 1, "nome": "Mobilização", "duracaoDias": 30, "percentualConcluido": 100 },
    { "id": 2, "nome": "Admissão RH", "duracaoDias": 45, "percentualConcluido": 85 },
    // ... até 20 etapas
  ],
  "gerenteOperacoes": "João Silva",
  "gerenteContrato": "Maria Santos",
  "colaboradores_previstos": 200,
  "orcado_suprimentos": 500000.00,
  "feriados_projeto": ["2026-04-21", "2026-05-01"]
}
```

### 2.4 Tabela: `etapas`

**Propósito**: Cronograma do projeto (múltiplas linhas, até 20).

```sql
id              INT PRIMARY KEY
projeto_id      INT (fk: configuracoes.id)
nome            TEXT NOT NULL
dias            INT NOT NULL (duração em dias)
ordem           INT NOT NULL (1=primeira, 20=última)
concluida       BOOLEAN DEFAULT false
percentual_concluido DECIMAL(5,2) DEFAULT 0
created_at      TIMESTAMPTZ DEFAULT now()
```

**Relação com Curva S**:
- A Curva S é gerada a partir dessas etapas
- `percentual_concluido` é preenchido manualmente pelo supervisor
- Cada etapa contribui = (dias/diasTotais) × 100% ao progresso planejado

### 2.5 Tabela: `logs_auditoria`

**Propósito**: Rastreamento completo de todas as ações.

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
created_at      TIMESTAMPTZ DEFAULT now()
usuario         TEXT NOT NULL ← RE do usuário
acao            TEXT NOT NULL (LOGIN|LOGOUT|ADICIONAR|EDITAR|REMOVER|IMPORTAR|EXPORTAR|CONFIG)
detalhes        TEXT ← Descrição livre da ação
cpf_colaborador TEXT ← CPF afetado (opcional)
```

**Exemplo de Log**:
```json
{
  "id": "uuid-123",
  "created_at": "2026-03-26T14:30:00-03:00",
  "usuario": "12345",
  "acao": "EDITAR",
  "detalhes": "ASO: Apto",
  "cpf_colaborador": "12345678901"
}
```

### 2.6 Tabela: `configuracoes_clinicas`

**Propósito**: CRUD de clínicas de exame.

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
nome            TEXT NOT NULL UNIQUE
endereco        TEXT
cidade          TEXT
uf              TEXT CHECK (uf IN ('SP', 'RJ', ... 'TO'))
ativo           BOOLEAN DEFAULT true
```

**Operações**:
- GET /api/clinicas → lista todas
- POST /api/clinicas → cria/atualiza (upsert on nome)
- DELETE /api/clinicas?id=uuid → deleta

### 2.7 Tabela: `configuracoes_hoteis`

**Propósito**: Gestão de hospedagem.

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
nome            TEXT NOT NULL
qt_vagas        INT NOT NULL DEFAULT 0
ativo           BOOLEAN DEFAULT true
```

### 2.8 Tabela: `suprimentos_ordens`

**Propósito**: Ordens de compra (PO).

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
item            TEXT
requisicao      TEXT
prioridade      TEXT
descricao       TEXT
fornecedores    TEXT
cotacoes        TEXT
requisitante    TEXT
data_criacao    DATE
status          TEXT (Aprovada | Cancelada | Em Aprovação | Pendente | Em cotação | Entregue)
ordem_compra    TEXT UNIQUE ← Chave de negócio
valores         DECIMAL(14,2)
informado_por   TEXT
status_ordem    TEXT
entregue_obra   BOOLEAN DEFAULT false ← Toggle no dashboard
total_req_previstas INT
projeto_id      INT (fk: configuracoes.id)
created_at      TIMESTAMPTZ DEFAULT now()
```

**API Endpoints**:
- GET /api/suprimentos/ordens → listar
- POST /api/suprimentos/ordens → criar/importar
- PATCH /api/suprimentos/ordens/[id] → toggle entregue_obra

### 2.9 Tabela: `logistica_controle`

**Propósito**: Rastreamento de turno, hotel, transporte (details de logística).

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
cpf             TEXT (fk: colaboradores.cpf) ← fallback: re
re              TEXT
nome            TEXT
funcao_clt      TEXT

-- Hotel
hotel           TEXT (fk: configuracoes_hoteis.nome)
quarto          TEXT ← "123", "205", etc
data_checkin    DATE
tipo_transporte TEXT
rota_transporte TEXT

-- Turno
turno_semana    TEXT (ex: "07:00-15:00")
turno_sabado    TEXT (ex: "07:00-15:00" ou vazio se não trabalha)
turno_domingo   TEXT
turno_trabalho  TEXT ← Referência consolidada

-- Status
status          TEXT
situacao        TEXT
fase            TEXT
sexo            TEXT
data_admissao   DATE

-- Hierarquia
coordenador     TEXT
supervisor      TEXT
encarregado     TEXT

-- Local
local_trabalho  TEXT
setor_trabalho  TEXT
tipo_apto       TEXT

-- Fechamento
demissao        DATE
data_nascimento DATE
telefone        TEXT
uf              TEXT
created_at      TIMESTAMPTZ DEFAULT now()
```

### 2.10 Tabela: `seguranca_fits`

**Propósito**: Dados de FITS (Ficha de Informação de Toxicologia).

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
re              TEXT NOT NULL UNIQUE ← Chave de negócio
cpf             TEXT
nome            TEXT NOT NULL
funcao_clt      TEXT

-- FITS
num_fit         TEXT ← Número de FITS
aso             TEXT (Apto | Inapto | Pendente)
rpv             TEXT
data_cracha_retirado DATE

-- Status Portal
status_portal   TEXT (Aprovado | Pendente | Aprovado - DEMITIDO)

-- Localização
municipio       TEXT
uf              TEXT

-- Admin
mob             TEXT (Sim | Não | Pendente)
data_admissao   DATE
created_at      TIMESTAMPTZ DEFAULT now()
```

### 2.11 Tabela: `rh_colaboradores`

**Propósito**: Dados específicos do domínio RH (redundância controlada).

```sql
id              UUID PRIMARY KEY
cpf             TEXT UNIQUE (fk: colaboradores.cpf)
nome            TEXT
re              TEXT
status          TEXT
funcao_clt      TEXT
contrato        TEXT
data_admissao   DATE
dt_nascimento   DATE
idade           INT
uf              TEXT
municipio       TEXT
telefone        TEXT
-- ... campos RH específicos
```

**Nota**: Esta tabela é opcional; dados podem vir direto de `colaboradores`.

---

## 3. Autenticação e Segurança (Phase 4)

### 3.1 Fluxo de Login Completo

```
1. Usuario acessa /login
2. Digita RE (ex: "123456")
3. Frontend POST /api/auth/login { re: "123456" }
4. Backend:
   a. Valida schema: re deve ser string de dígitos
   b. Busca em Supabase: SELECT * FROM usuarios_permitidos WHERE re = "123456"
   c. Se não encontrado → 401 "Acesso não autorizado"
   d. Se encontrado → Gera JWT com (re, nome, perfil)
   e. Assina JWT com HS256 (JWT_SECRET)
   f. Seta cookie httpOnly, secure, sameSite=Strict
   g. Registra log: logLogin(re)
5. Frontend recebe { success: true, user: { re, nome, perfil } }
6. AuthContext.setUser() e redireciona para /central
7. Todas as requisições subsequentes enviam cookie JWT automaticamente
```

### 3.2 JWT & Cookies (jose library)

**Geração** (`lib/auth.ts`):
```typescript
export async function generateToken(payload: JWTPayload): Promise<string> {
  const encoder = new TextEncoder();
  const secret = encoder.encode(process.env.JWT_SECRET!);
  
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8 hours")
    .sign(secret);
    
  return token;
}

export async function setAuthCookie(token: string): Promise<void> {
  (await cookies()).set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 8, // 8 horas
  });
}
```

**Validação** (`requireAuth()` middleware):
```typescript
export async function requireAuth(): Promise<JWTPayload> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  
  if (!token) throw new Error("UNAUTHORIZED");
  
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const verified = await jwtVerify(token, secret);
  
  return verified.payload as JWTPayload;
}
```

### 3.3 Supabase Security (RLS + Service Role)

**Dois clientes distintos** (`lib/supabase.ts`):

1. **Cliente Anon** (Client Components):
```typescript
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
// Respeita Row Level Security (RLS)
```

2. **Service Role** (API Routes - contorna RLS):
```typescript
export const createServerClient = (): SupabaseClient => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,  // ← admin key
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
};
```

### 3.4 Linhas de Defesa (Defense in Depth)

```
┌──────────────────────────────────────────────────────┐
│ FRONTEND (Cliente)                                   │
├──────────────────────────────────────────────────────┤
│ 1. HTML5 validation (required, pattern)              │
│ 2. React Hook Form + Zod (client-side)              │
│ 3. Debouncing de requisições (300ms)                 │
│ 4. ProtectedRoute wrapper (auth redirect)           │
└──────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────┐
│ NETWORK                                              │
├──────────────────────────────────────────────────────┤
│ 1. HTTPS obrigatório (Vercel)                        │
│ 2. CSP headers (Vercel automático)                   │
│ 3. Axios com interceptores (error handling)          │
└──────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────┐
│ BACKEND (API Routes)                                 │
├──────────────────────────────────────────────────────┤
│ 1. requireAuth() valida JWT (middleware)            │
│ 2. Zod schema validation (runtime + type)           │
│ 3. Rate limiting (Vercel automático)                │
│ 4. Supabase RLS (row-level security)                │
│ 5. Service role para operações de admin             │
└──────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────┐
│ DATABASE (Supabase / PostgreSQL)                    │
├──────────────────────────────────────────────────────┤
│ 1. Constraints & unique indexes                      │
│ 2. Foreign keys (fk: colaboradores.cpf)             │
│ 3. Backup automático                                │
│ 4. Encryption at rest                               │
│ 5. Point-in-time recovery (PITR)                    │
└──────────────────────────────────────────────────────┘
```

---

## 4. APIs - Rotas Completas (27 Endpoints)

### 4.1 Autenticação

**POST /api/auth/login**
```
Body:     { re: string }
Response: { success: true, user: { re, nome?, perfil? } }
Status:   200, 401, 400, 500
Ação Log: LOGIN
```

**POST /api/auth/logout**
```
Response: { success: true }
Status:   200, 401
Ação Log: LOGOUT
```

**GET /api/auth/me**
```
Response: { user: { re, nome?, perfil? } }
Status:   200, 401
```

### 4.2 Colaboradores (CRUD + Import)

**GET /api/colaboradores**
```
Query:    ?page=1&limit=20&search=João&status=Ativo&setor=RH
Response: { data: Colaborador[], pagination: {page, limit, total, totalPages} }
Status:   200, 401, 400
Cálculo:  progresso por setor (RH%, Logística%, Segurança%)
```

**POST /api/colaboradores**
```
Body:     { CPF, NOME, STATUS?, CONTRATO?, ... }
Response: { success: true, data: Colaborador }
Status:   201, 400 (validação), 409 (CPF duplicado), 401
Ação Log: ADICIONAR
```

**GET /api/colaboradores/[CPF]**
```
Response: { data: Colaborador }
Status:   200, 404, 401
```

**PUT /api/colaboradores/[CPF]**
```
Body:     Partial<Colaborador>
Response: { success: true, data: Colaborador } (merge)
Status:   200, 404, 400, 401
Ação Log: EDITAR
```

**DELETE /api/colaboradores/[CPF]**
```
Response: { success: true }
Status:   200, 404, 401
Ação Log: REMOVER
```

**POST /api/colaboradores/import**
```
Body:     { rows: RawRow[] }
Response: {
  inseridos: number,
  atualizados: number,
  ignorados: number,
  erros: [{ linha, campo?, motivo }, ...],
  total: number
}
Status:   200, 401, 400, 422
Ação Log: IMPORTAR

Fluxo:
  1. Normaliza headers com fuzzy matching (100+ aliases)
  2. Valida cada linha com Zod
  3. SELECT único CPFs existentes do banco
  4. Merge em memória:
     - Se novo: insere completo
     - Se existe: preenche apenas vazios (não sobrescreve edições)
  5. UPSERT único em transaction
  6. Retorna relatório com erros por linha
```

### 4.3 Dashboard (Métricas)

**GET /api/dashboard** (agregado - principal)
```
Response: {
  metricas: {
    totalCadastrados: number,
    totalAdmitidos: number,
    totalLiberados: number,
    totalEmTreinamento: number,
    percentualMOB: number,
    percentualASO: number,
    percentualPortal: number
  },
  projeto: {
    dataInicio: string,
    dataFim: string,
    diasCorridos: number,
    metaAdmissoes: number,
    status: { atrasado: boolean, diasAtraso: number, percentualAtraso: number }
  },
  pendencias: [...],
  graficos: {
    curvaS: { labels, planejado[], realizado[] },
    evolucaoPorSetor: {...},
    admissoesAcumuladas: [...],
    statusCount: {...}
  },
  agregacoes: {
    distribuicaoFuncoes: [...],
    distribuicaoIdades: [...],
    distribuicaoUF: [...],
    vagasHoteis: [...],
    suprimentos: {...}
  }
}
Status:   200, 401
Cálculo:  Curva S (etapas), agregações em tempo real
```

**GET /api/dashboard/rh**
```
Response: {
  metricas: {
    totalCadastrados: number,
    totalAdmitidos: number,
    percentualASO: number
  },
  agregacoes: {
    distribuicaoIdades: [{ faixa: "16-20", total: 5 }, ...],
    distribuicaoFuncoes: [{ nome: "Encanador", total: 32 }, ...],
    terminoDetalhado: [{ nome, funcao_clt, termino }, ...]
  }
}
Status:   200, 401
```

**GET /api/dashboard/logistica**
```
Response: {
  kpis: {
    totalVagas: number,
    totalPreenchidas: number,
    totalDisponiveis: number,
    ocupacaoTotal: number (%)
  },
  vagasHoteis: [
    { hotel: "Hotel A", vagasTotais: 50, vagasPreenchidas: 42, percentual: 84 },
    ...
  ],
  turnoTrabalho: [
    { turno: "07:00-15:00", total: 45, percentual: 30 },
    ...
  ]
}
Status:   200, 401
```

**GET /api/dashboard/suprimentos**
```
Response: {
  suprimentos: {
    totalInvestido: number (R$),
    totalOrdens: number,
    entregues: number,
    percentualEntregue: number (%),
    distribuicaoStatus: [
      { status: "Entregue", total: 25 },
      { status: "Pendente", total: 8 },
      ...
    ]
  }
}
Status:   200, 401
```

### 4.4 Configurações (Project Setup)

**GET /api/config**
```
Response: {
  data: {
    DIAS_TOTAIS_PROJETO: number,
    DATA_INICIO_PROJETO: string (YYYY-MM-DD),
    DATA_FIM_PROJETO: string,
    ETAPA_ATUAL: number,
    META_ADMISSOES: number,
    ETAPAS_PROJETO: [{ id, nome, duracaoDias, concluida, percentualConcluido }, ...],
    GERENTE_OPERACOES: string?,
    GERENTE_CONTRATO: string?,
    NOME_CLIENTE: string?,
    CENTRO_CUSTO: string?,
    COLABORADORES_PREVISTOS: number?,
    ORCADO_SUPRIMENTOS: number?
  }
}
Status:   200, 401
```

**POST /api/config**
```
Body: {
  dataInicio: string (YYYY-MM-DD),
  dataFim: string,
  etapas: [{ id, nome, duracaoDias, percentualConcluido? }, ...],
  gerenteOperacoes?: string,
  gerenteContrato?: string,
  nomeCliente?: string,
  centroCusto?: string,
  colaboradores_previstos?: number,
  orcado_suprimentos?: number,
  feriados_projeto?: [string, ...]
}
Response: { success: true, message: "...", data: {...} }
Status:   200, 400, 401
Ação Log: CONFIG

Cálculos:
  - DIAS_TOTAIS_PROJETO = calculateWorkingDays(dataInicio, dataFim, feriados)
  - Excluir fins de semana + feriados nacionais brasileiros
  - Armazena etapas em transaction
```

**GET /api/config/etapas**
```
Response: { data: Etapa[] }
```

**POST /api/config/etapas**
```
Body:     { etapas: EtapaConfig[] }
Response: { success: true, data: Etapa[] }
Status:   200, 201, 400, 401
Ação Log: CONFIG
```

**GET /api/config/clinicas**
```
Response: [{ id, nome, endereco, cidade, ativo }, ...]
Status:   200, 401
```

**POST /api/config/clinicas**
```
Body:     { nome, endereco?, cidade?, uf?, ativo? }
Response: { id, nome, ... } (upsert on nome)
Status:   201, 400, 401
```

**GET /api/config/hoteis**
```
Response: [{ id, nome, qt_vagas, ativo }, ...]
Status:   200, 401
```

**POST /api/config/hoteis**
```
Body:     { nome, qt_vagas }
Response: { id, nome, qt_vagas, ativo } (upsert on nome)
Status:   201, 400, 401
```

### 4.5 Suprimentos

**GET /api/suprimentos/ordens**
```
Query:    ?search=OC-123&status=Entregue
Response: {
  data: [{ id, ordem_compra, descricao, valores, entregue_obra, ... }, ...],
  total: number
}
Status:   200, 401
```

**POST /api/suprimentos/ordens**
```
Body:     { rows: SuprimentosRow[] } (import de planilha)
Response: ImportReport { inseridos, atualizados, ignorados, erros[], total }
Status:   200, 200 (com erros), 401
Ação Log: IMPORTAR
```

**PATCH /api/suprimentos/ordens/[id]**
```
Body:     { entregue_obra: boolean }
Response: { success: true }
Status:   200, 400 (validação), 401
```

### 4.6 Logs de Auditoria

**GET /api/logs**
```
Query:    ?page=1&limit=50&usuario=123&acao=EDITAR&dataInicio=2026-01-01&dataFim=2026-03-26
Response: {
  data: [
    {
      id: uuid,
      created_at: timestamp,
      usuario: string (RE),
      acao: string (LOGIN|LOGOUT|ADICIONAR|EDITAR|REMOVER|IMPORTAR|EXPORTAR|CONFIG),
      detalhes: string,
      cpf_colaborador?: string
    },
    ...
  ],
  pagination: { page, limit, total, totalPages },
  resumo: {
    contagemPorAcao: { LOGIN: 125, EDITAR: 45, ... },
    totalGeral: 200
  }
}
Status:   200, 401
```

### 4.7 Usuários Permitidos

**GET /api/usuarios-permitidos**
```
Response: { usuarios: [{ id, re, nome, perfil, autorizado_em }, ...] }
Status:   200, 401
```

**POST /api/usuarios-permitidos**
```
Body:     { re: string, nome: string, perfil?: string }
Response: { id, re, nome, perfil, autorizado_em }
Status:   201, 400, 401
Ação Log: CONFIG
```

**DELETE /api/usuarios-permitidos/[id]**
```
Response: { success: true }
Status:   200, 404, 401
Ação Log: CONFIG
```

### 4.8 Export

**GET /api/export**
```
Query:    ?search=&status=&setor=
Response: XLSX file (binary) — download automático
Status:   200, 401
Ação Log: EXPORTAR
```

### 4.9 Domínios Isolados (RH, Logística, Segurança)

**POST /api/rh/colaboradores/import**
```
Body:     { rows: RhRow[] }
Response: ImportReport
Status:   200, 401
Ação Log: IMPORTAR
```

**POST /api/logistica/controle/import**
```
Body:     { rows: LogisticaRow[] }
Response: ImportReport
Status:   200, 401
Ação Log: IMPORTAR
```

**POST /api/seguranca/fits/import**
```
Body:     { rows: SegurancaRow[] }
Response: ImportReport
Status:   200, 401
Ação Log: IMPORTAR
```

---

## 5. Schemas Zod - Validação Type-Safe

### 5.1 ColaboradorSchema (Principal)

```typescript
export const ColaboradorSchema = z.object({
  // Identificação (obrigatório: CPF, NOME)
  CPF: CPFSchema, // Remove máscara, garante 11 dígitos
  NOME: z.string().min(3, "Nome deve ter 3+ caracteres"),
  
  // Pessoal
  RE: z.preprocess(emptyStringToUndefined, z.string().optional()),
  DT_NASCIMENTO: DateSchema, // Serial Excel, DD/MM/YYYY, ISO → YYYY-MM-DD
  IDADE: z.coerce.number().min(16).max(99).optional().nullable(),
  PESSOA: z.preprocess(emptyStringToUndefined, z.enum(["Física", "Jurídica"]).optional()),
  
  // Contrato
  STATUS: z.preprocess(emptyStringToUndefined, z.enum(["Ativo", "Pendente", "Inativo", "Desligado"]).optional()),
  CONTRATO: z.preprocess(emptyStringToUndefined, z.enum(["CLT", "PJ", "Temporário", "Estagiário"]).optional()),
  DATA_ADMISSAO: DateSchema,
  TERMINO: DateSchema,
  PRORROGACAO: DateSchema,
  DEMISSAO: DateSchema,
  FUNCAO_CLT: z.preprocess(emptyStringToUndefined, z.string().optional()),
  
  // Saúde
  CLINICA: z.preprocess(emptyStringToUndefined, z.string().optional()),
  EXAME: z.preprocess(emptyStringToUndefined, z.enum(["Realizado", "Agendado", "Pendente"]).optional()),
  ASO: z.preprocess(emptyStringToUndefined, z.enum(["Apto", "Inapto", "Pendente"]).optional()), ← CRÍTICO
  DOCS: z.preprocess(emptyStringToUndefined, z.enum(["Completo", "Pendente", "Incompleto"]).optional()),
  
  // Mobilização
  MOB: z.preprocess(emptyStringToUndefined, z.enum(["Sim", "Não", "Pendente"]).optional()), ← MÉTRICA
  OP: z.preprocess(emptyStringToUndefined, z.string().optional()),
  
  // Operacional
  PORTAL: z.preprocess(emptyStringToUndefined, z.enum(["Liberado", "Pendente", "Bloqueado"]).optional()),
  CRACHA: z.preprocess(emptyStringToUndefined, z.enum(["Emitido", "Pendente"]).optional()),
  PONTO: z.preprocess(emptyStringToUndefined, z.enum(["Cadastrado", "Pendente"]).optional()),
  TREINAMENTO: z.preprocess(emptyStringToUndefined, z.enum(["Concluído", "Em Andamento", "Pendente"]).optional()),
  
  // Localização
  MUNICIPIO: z.preprocess(emptyStringToUndefined, z.string().optional()),
  UF: z.preprocess(emptyStringToUndefined, UFEnum.optional()), // AC...TO (27 estados)
  TELEFONE: TelefoneSchema, // (99) 99999-9999 ou 99 99999-9999
  
  // ... 15+ campos adicionais
});
```

**Pré-processamento Automático**:
```typescript
const emptyStringToUndefined = (val) => 
  val === "" || val === null || val === undefined ? undefined : val;

const preprocessDate = (val) => {
  if (val === "") return undefined;
  
  // Serial Excel (37604)
  if (/^\d+$/.test(val)) {
    return new Date((parseInt(val) - 25569) * 86400 * 1000)
      .toISOString().split("T")[0];
  }
  
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
    const [d, m, y] = val.split("/");
    return `${y}-${m}-${d}`;
  }
  
  // Já está no formato ISO ou pode ser
  return val.split("T")[0];
};
```

### 5.2 ConfigSchema (Projeto)

```typescript
export const ConfigUpdateSchema = z.object({
  dataInicio: DateRequiredSchema,
  dataFim: DateRequiredSchema,
  etapas: z.array(EtapaConfigSchema).min(1).max(20),
  
  // Novo
  colaboradores_previstos: z.coerce.number().positive().optional(),
  orcado_suprimentos: z.coerce.number().nonnegative().optional(),
  feriados_projeto: z.array(z.coerce.date()).optional(),
  
  // Gestão
  gerenteOperacoes: z.string().optional(),
  gerenteContrato: z.string().optional(),
  nomeCliente: z.string().optional(),
  centroCusto: z.coerce.string().optional(),
});

export const EtapaConfigSchema = z.object({
  id: z.number().min(1).max(20),
  nome: z.string().min(1),
  duracaoDias: z.number().positive(),
  concluida: z.boolean().optional(),
  percentualConcluido: z.number().min(0).max(100).optional(), ← Novo
});
```

### 5.3 Domínios Isolados

```typescript
// RH Domain
export const RhSchema = z.object({
  cpf: CPFSchema,
  nome: z.string().min(3),
  re: z.preprocess(emptyStringToUndefined, z.string().optional()),
  status: z.preprocess(emptyStringToUndefined, StatusEnum.optional()),
  funcao_clt: z.preprocess(emptyStringToUndefined, z.string().optional()),
  contrato: z.preprocess(emptyStringToUndefined, ContratoEnum.optional()),
  data_admissao: DateSchema,
  dt_nascimento: DateSchema,
  idade: z.coerce.number().min(16).max(99).optional().nullable(),
  // ... 20+ campos RH
});

// Logística Domain
export const LogisticaSchema = z.object({
  cpf: CPFSchema.optional(),
  re: z.string().min(1),
  nome: z.string().min(3),
  // Hotel
  hotel: z.preprocess(emptyStringToUndefined, z.string().optional()),
  quarto: z.preprocess(emptyStringToUndefined, z.string().optional()),
  data_checkin: DateSchema,
  // Turno
  turno_semana: z.preprocess(emptyStringToUndefined, z.string().optional()),
  turno_sabado: z.preprocess(emptyStringToUndefined, z.string().optional()),
  turno_domingo: z.preprocess(emptyStringToUndefined, z.string().optional()),
  // ... 15+ campos logística
});

// Segurança Domain
export const SegurancaSchema = z.object({
  re: z.string().min(1),
  cpf: CPFSchema.optional(),
  nome: z.string().min(3),
  funcao_clt: z.preprocess(emptyStringToUndefined, z.string().optional()),
  num_fit: z.preprocess(emptyStringToUndefined, z.string().optional()),
  aso: z.preprocess(emptyStringToUndefined, AsoEnum.optional()),
  rpv: z.preprocess(emptyStringToUndefined, z.string().optional()),
  status_portal: z.enum(["Aprovado", "Pendente", "Aprovado - DEMITIDO"]).optional(),
  data_cracha_retirado: DateSchema,
  // ... 10+ campos segurança
});

// Suprimentos Domain
export const SuprimentosSchema = z.object({
  ordem_compra: z.preprocess(emptyStringToUndefined, z.string().optional()),
  descricao: z.preprocess(emptyStringToUndefined, z.string().optional()),
  valores: z.preprocess(preprocessNumber, z.number().nonnegative().catch(0)),
  status: z.preprocess(emptyStringToUndefined, z.string().optional()),
  entregue_obra: z.boolean().default(false),
  // ... 10+ campos suprimentos
});
```

---

## 6. Gráficos - Curva S e Agregações

### 6.1 Curva S (Sigmoide) - Phase 4 Melhorado

**Matemática**:
```
σ(t, k) = 1 / (1 + e^(-k(t-0.5)))

Onde:
  t ∈ [0, 1] tempo normalizado (dias_corridos / dias_totais)
  k = 8 steepness (padrão engenharia)
  σ(t) ∈ [0, 1] progresso normalizado

Meta acumulada(t) = σ(t) × metaAdmissoes
```

**Características**:
- Fase 1 (0-0.3): Curva suave (setup/mobilização inicial)
- Fase 2 (0.3-0.7): Aceleração máxima (foco de contratação)
- Fase 3 (0.7-1.0): Estabilização (finalizações)

**Geração de Dados** (lib/curva-s.ts):
```typescript
export function gerarDadosGraficoCurvaS(
  dataInicio: string,
  dataFim: string,
  metaAdmissoes: number,
  admissoesCumulativas: Array<{ data: string; acumulado: number }>
): DadosCurvaS {
  // ~1 ponto por semana (12-60 pontos no gráfico)
  const nPontos = Math.max(12, Math.min(60, Math.ceil(diasTotais / 7)));
  
  const labels: string[] = [];
  const planejado: number[] = [];
  const realizado: number[] = [];
  
  for (let i = 0; i <= nPontos; i++) {
    const t = i / nPontos;
    
    // Meta sigmoide (arredondado)
    planejado.push(Math.round(sigmoid(t) * metaAdmissoes * 10) / 10);
    
    // Realizado: último acumulado com data ≤ pointDate
    // Busca linear eficiente (array pré-ordenado)
    let realVal = 0;
    for (const entry of admSorted) {
      if (entry.data <= dateStr) realVal = entry.acumulado;
      else break;
    }
    realizado.push(realVal);
  }
  
  return { labels, planejado, realizado };
}
```

**Cálculo de Atraso**:
```typescript
export function verificarAtraso(
  dataInicio: string,
  dataFim: string,
  metaAdmissoes: number,
  admitidosHoje: number
): { atrasado: boolean; diasAtraso: number; percentualAtraso: number } {
  // Usa dias úteis (seg-sex, exc. feriados) para mais precisão
  const diasTotais = calculateWorkingDays(dataInicio, dataFim);
  
  const hoje = new Date();
  const todayStr = formatDateISO(hoje);
  
  const diasCorridos = calculateWorkingDays(dataInicio, todayStr);
  const tHoje = diasCorridos / diasTotais;
  
  const metaHoje = sigmoid(tHoje) * metaAdmissoes;
  const diferenca = admitidosHoje - metaHoje;
  
  // Tolerância: 0.5 pessoa
  const atrasado = diferenca < -0.5;
  
  // Calcula dias de atraso usando inverseSigmoid
  const tAlvo = inverseSigmoid(admitidosHoje / metaAdmissoes);
  const diasAtraso = Math.round((tHoje - tAlvo) * diasTotais);
  
  const percentualAtraso = (Math.abs(diferenca) / metaAdmissoes) * 100;
  
  return { atrasado, diasAtraso, percentualAtraso };
}
```

### 6.2 Agregações de Dados

**Distribuição por Função CLT** (Top 9 + Outros):
```
1. Lista única de FUNCAO_CLT (sem duplicatas)
2. Agrupa COUNT por função
3. Ordena descendente
4. Top 9 aparecem separadas
5. Restantes agrupadas em "Outros"
```

**Distribuição por Faixa Etária**:
```
Faixas: 16-20, 21-25, 26-30, 31-35, 36-40, 41-45, 46-50, 51-55, 56-60, 60+
Cálculo de IDADE → DT_NASCIMENTO automático
```

**Ocupação de Hotéis**:
```
Para cada hotel (VINCULADO ou hotel field):
  vagasTotais = COUNT(hotel = X)
  vagasPreenchidas = COUNT(hotel = X AND status != Pendente)
  percentual = (vagasPreenchidas / vagasTotais) * 100
```

---

## 7. Importação de Planilhas - Sistema Completo

### 7.1 Fluxo de Importação (5 Fases)

```
FASE 1: Parse Headers com Fuzzy Matching
  ├─ Usuário carrega arquivo XLSX/CSV
  ├─ SheetJS lê para memória
  ├─ buildHeaderMap() mapeia colunas com 100+ aliases
  ├─ Caso-insensitivo, substring matching
  └─ Primeira match vence

FASE 2: Sanitização Linha a Linha
  ├─ CPF: remove máscara, garante 11 dígitos
  ├─ Datas: serial Excel → ISO YYYY-MM-DD
  ├─ Números: remove R$, pontos, converte para decimal
  ├─ Enums: case-insensitive, defaults para Pendente
  └─ Deduplicação intra-arquivo em Set<cpf>

FASE 3: Leitura do Banco (SELECT único)
  ├─ Coleta todos os CPF do arquivo em array
  ├─ ONE SELECT: .in("cpf", cpfArray)
  ├─ Resultado em memória para merge O(1)
  └─ Sem N+1 queries

FASE 4: Merge em Memória
  ├─ Lê todas as linhas do arquivo
  ├─ Para cada CPF:
  │  ├─ Se novo: cria objeto completo
  │  └─ Se existe: preenche apenas campos nulos (não sobrescreve)
  ├─ Valida com ColaboradorSchema
  └─ Acumula em array para upsert

FASE 5: UPSERT Único + Log
  ├─ Uma única operação .upsert(payload, { onConflict: "cpf" })
  ├─ Retorna ImportReport { inseridos, atualizados, ignorados, erros }
  ├─ Registra logImport(usuario, linhasProcessadas)
  └─ Frontend exibe toast com resultado
```

### 7.2 HeaderAliases (Fuzzy Matching Examples)

```typescript
export const HEADER_ALIASES: Record<string, string[]> = {
  re:           ["RE", "REGISTRO", "N PESSOA", "NUMERO PESSOA", ...],
  nome:         ["NOME", "NOME COMPLETO", "NOME DO COLABORADOR", ...],
  cpf:          ["CPF", "C.P.F.", "C P F", "CPF DO COLABORADOR", ...],
  funcao:       ["FUNÇÃO CLT", "FUNCAO", "CARGO", "CARGO CLT", ...],
  data_adm:     ["DATA ADMISSÃO", "DT ADMISSAO", "DATA ADMISSAO", ...],
  aso_status:   ["ASO", "ASO STATUS", "RESULTADO ASO", ...],
  hotel:        ["HOTEL", "HOSPEDAGEM", "HOSPEDARIA", ...],
  quarto:       ["QUARTO", "APT", "Nº APTO", "NUMERO APTO", ...],
  // ... 50+ mapeamentos
};

// Algoritmo:
1. Para cada header do arquivo:
   a. Normaliza: trim, uppercase, remove extra spaces
   b. Busca match exato em aliases (rápido)
   c. Se falhar, tenta substring matching
   d. Primeira match vence
2. Headers não mapeados são ignorados (safe)
3. Campos obrigatórios não mapeados causam erro 400
```

### 7.3 Exemplo de Importação

```
Arquivo Excel (3 linhas):
┌──────────┬──────────────┬──────────────────┐
│ CPF      │ NOME         │ DATA ADMISSAO    │
├──────────┼──────────────┼──────────────────┤
│ 123...1  │ João Silva   │ 2026-02-15       │   ← Novo
├──────────┼──────────────┼──────────────────┤
│ 456...6  │ Maria Santos │ 2026-01-20       │   ← Existe
├──────────┼──────────────┼──────────────────┤
│ 123...1  │ João S.      │ 2026-02-15       │   ← Duplicado no arquivo
└──────────┴──────────────┴──────────────────┘

Frontend:
1. ImportModal mostra preview (2 linhas, avisa de duplicado)
2. Usuário clica "Iniciar Importação"
3. POST /api/colaboradores/import { rows: [...] }

Backend:
1. Normaliza headers
2. Processa linhas:
   - Linha 1: novo CPF → validação passa
   - Linha 2: CPF existente → busca no DB, preenche campos vazios
   - Linha 3: CPF duplicado → ignorado (Set dedup)
3. Upsert em transaction:
   INSERT INTO colaboradores VALUES (...)
   ON CONFLICT (cpf) DO UPDATE SET ...
4. Response: { inseridos: 1, atualizados: 1, ignorados: 1, erros: [], total: 3 }

Frontend:
- Toast: "✓ 1 novo, 1 atualizado, 1 ignorado"
- ImportModal exibe relatório com cards de resumo
- Botão "Concluir e Voltar" fecha modal e atualiza cache
```

---

## 8. Sistema de Logs (Auditoria Completa)

### 8.1 Fluxo de Logging

```
Ação do usuário (cria/edita/deleta colaborador)
                   ↓
API Route valida e executa
                   ↓
Chama função semântica (logAdicionar, logEditar, etc)
                   ↓
registrarLog(usuario, acao, detalhes, cpfColaborador)
                   ↓
INSERT INTO logs_auditoria (usuario, acao, detalhes, cpf_colaborador, created_at)
                   ↓
Supabase armazena
                   ↓
GET /api/logs retorna histórico paginado
```

### 8.2 Ações Registradas

| Ação | Descrição | CPF | Exemplo |
|------|-----------|-----|---------|
| **LOGIN** | Usuário entrou | ✗ | "Usuário 12345 realizou login" |
| **LOGOUT** | Usuário saiu | ✗ | "Usuário 12345 realizou logout" |
| **ADICIONAR** | Novo colaborador | ✓ | "João Silva criado" |
| **EDITAR** | Atualizou colaborador | ✓ | "ASO: Apto" (CPF do colab) |
| **REMOVER** | Deletou colaborador | ✓ | "Colaborador removido" |
| **IMPORTAR** | Batch import | ✗ | "50 linhas importadas (40 novos, 10 atualizados)" |
| **EXPORTAR** | Export XLSX | ✗ | "150 colaboradores exportados" |
| **CONFIG** | Mudança de config | ✗ | "Projeto: 02/02 a 30/06, meta 150" |

### 8.3 Funções de Log (lib/logs.ts)

```typescript
export async function logLogin(usuario: string): Promise<void> {
  await registrarLog(usuario, "LOGIN", "Usuário realizou login no sistema");
}

export async function logAdicionar(usuario: string, cpf: string, nome: string): Promise<void> {
  await registrarLog(usuario, "ADICIONAR", `Novo: ${nome}`, cpf);
}

export async function logEditar(usuario: string, cpf: string, mudanca: string): Promise<void> {
  await registrarLog(usuario, "EDITAR", mudanca, cpf);
}

export async function logImport(usuario: string, inseridos: number, atualizados: number): Promise<void> {
  await registrarLog(
    usuario,
    "IMPORTAR",
    `${inseridos + atualizados} linhas processadas (${inseridos} novos, ${atualizados} atualizados)`
  );
}

// Nunca deixa log quebrar o fluxo principal
export async function registrarLog(
  usuario: string,
  acao: AcaoLog,
  detalhes: string,
  cpfColaborador?: string
): Promise<void> {
  try {
    const db = createServerClient();
    await db.from("logs_auditoria").insert({
      usuario,
      acao,
      detalhes,
      ...(cpfColaborador ? { cpf_colaborador: cpfColaborador } : {}),
    });
  } catch (err) {
    // Log do erro mas continua a execução
    console.error("[logs] Exceção:", err);
  }
}
```

---

## 9. Componentes React (src/components/)

### 9.1 Componentes Principal

**ImportModal.tsx**
```typescript
// Props
{ open: boolean; onOpenChange: (open: boolean) => void; onSuccess?: () => void }

// Telas internas
Tela 1: Upload
  ├─ Input file (XLSX, CSV)
  ├─ Preview dos dados (CPF, NOME, STATUS)
  ├─ Erros de validação
  └─ Botão "Iniciar Importação"

Tela 2: Relatório
  ├─ Cards: "X Novos" "Y Atualizados" "Z Ignorados"
  ├─ Lista de erros detalhados (linha, motivo)
  ├─ Message de sucesso/parcial
  └─ Botão "Concluir e Voltar"

Estados:
- file: File | null
- previewData: PreviewRow[] | null
- validationErrors: string[]
- bufferedRows: RawRow[] | null
- importResult: ImportReport | null
```

**EditColaboradorModal.tsx**
```
// Modal para edição inline de um colaborador
Props:
- cpf: string
- onSuccess?: () => void

Campos editáveis: todos (40+ campos)
Validação: Zod ColaboradorUpdateSchema
Envio: PUT /api/colaboradores/[cpf]
```

**ColaboradorDetailsModal.tsx**
```
// Modal read-only de visualização
Props:
- cpf: string

Exibe: todos os 40+ campos
Sem edição direta (abrir EditColaboradorModal se precisar editar)
```

**ExportButton.tsx**
```
// Botão de exportação XLSX
Query params: ?search=&status=&setor=
Ação: GET /api/export
Log: EXPORTAR
```

**SheetUpload.tsx**
```
// Componente genérico de upload de planilha
Props:
- accept: ".xlsx" | ".csv" | ".xls"
- onData: (rows: RawRow[]) => void
- onError: (error: string) => void
```

**ProtectedRoute.tsx**
```
// Wrapper de autenticação
Props:
- children: React.ReactNode

Comportamento:
- Se não autenticado: redireciona para /login
- Se autenticado: renderiza children
- Loading state: skeleton/spinner
```

**ConditionalLayout.tsx**
```
// Layout condicional com sidebar
Props:
- children: React.ReactNode

Comportamento:
- Se em /login: sem sidebar
- Se em /dashboard, /central, etc: com sidebar (nav por setor)
- Dark mode toggle (next-themes)
```

### 9.2 Componentes UI (shadcn/ui)

Todos os 18 componentes base:
- `Button`, `Input`, `Card`, `Dialog`
- `Dropdown`, `Select`, `Tabs`, `Badge`
- `Table`, `Checkbox`, `Popover`
- `Progress`, `Skeleton`, `Switch`, `Textarea`
- `Input-Group`, `Sonner`, `Command`, `Chart`

### 9.3 Hooks Customizados

**use-debounce.ts**
```typescript
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
}

// Uso: const debouncedSearch = useDebounce(search, 300);
```

---

## 10. Contextos e Providers

### 10.1 AuthContext

```typescript
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (re: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

//
```


## License: unknown
https://github.com/omerdemirkan/stem-bound-client/blob/9f81dcc2ba5db7dd1b3c62e2f3236ffa67a00c60/src/hooks/useDebounce.ts

```
Since I cannot edit files in read-only mode, I'll provide you with the **complete updated contexto.md** content that you should use to replace your current file. This is a comprehensive document with all the current system details:

---

## **UPDATED CONTEXTO.MD (Complete Version)**

Here's the updated file with all Phase 4 (Supabase migration) and new features documented. I'll break it into sections for clarity:

### **PART 1 - Core Documentation** 

Please replace your `contexto.md` with this structure:

```markdown
