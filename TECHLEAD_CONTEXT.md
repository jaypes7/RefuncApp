# 🏗️ RefuncApp - Contexto Técnico para Tech Lead

## 📋 Sumário Executivo

**RefuncApp** é uma plataforma de gestão inteligente de mobilização de pessoal com dashboards especializados para RH, Logística, Segurança e Suprimentos. Gerencia todo o ciclo de vida do colaborador desde a seleção até a demissão, com foco em conformidade regulatória e otimização de recursos.

- **Tipo:** SaaS BaseWeb (Next.js)
- **Usuários:** Supervisores e gerentes de operações
- **Escala:** Até 10k+ colaboradores por projeto
- **Criticidade:** Alta (dados de RH, segurança, operações)

---

## 🎯 Funcionalidades Principais

### 1. **Gestão de Colaboradores (Central)**
- **Importação:** Upload XLSX com validação inteligente (fuzzy matching de headers)
- **Edição:** Modal de edição em tempo real com merge de dados (preenche apenas vazios)
- **Visualização:** Tabela com busca, filtros e paginação
- **Localização:** `src/app/central/` (página principal) e `src/app/api/colaboradores/`
- **Dados:**
  - Armazenagem: Supabase tabela `colaboradores`
  - Backup legado: Google Sheets aba `"Colaboradores"`
  - 40+ campos incluindo CPF, dados pessoais, status de admissão, datas críticas

### 2. **Dashboards Especializados** (4 domínios)

#### 2.1 Dashboard Principal
- **Local:** `src/app/dashboard/page.tsx`
- **Endpoint:** `GET /api/dashboard`
- **Cards:** Previsto vs Real, MOB%, ASO%, Pendências
- **Gráficos:** Curva S, Distribuição de Funções, Status Colaboradores
- **Dados:** Supabase (colaboradores, configuracoes, etapas)

#### 2.2 Dashboard Logística
- **Local:** `src/app/dashboard/logistica/page.tsx`
- **Endpoint:** `GET /api/dashboard`
- **Cards:** Ocupação Total, Vagas Disponíveis, Colaboradores
- **Gráficos:** Ocupação por Hotel (barras), Distribuição de Turnos (pizza)
- **Dados:** Supabase `logistica_controle` + Google Sheets `HOTEIS`
- **Importação:** `POST /api/logistica/controle`

#### 2.3 Dashboard RH
- **Local:** `src/app/dashboard/rh/page.tsx`
- **Endpoin:** `GET /api/dashboard`
- **Cards:** Total Cadastrados, Admitidos, Pendentes
- **Gráficos:** Faixas Etárias, Distribuição UF, Término de Contrato, ASO
- **Dados:** Supabase `colaboradores`

#### 2.4 Dashboard Segurança
- **Local:** `src/app/dashboard/seguranca/page.tsx`
- **Endpoint:** `GET /api/seguranca/dashboard`
- **Cards:** Total FITs, Aptos, Treinamentos Concluídos, Aprovados Portal
- **Gráficos:** Status Portal (pizza), Distribuição ASO (barras), Status Treinamentos
- **Dados:** Supabase `seguranca_fits`
- **Importação:** `POST /api/seguranca/fits`

#### 2.5 Dashboard Suprimentos
- **Local:** `src/app/dashboard/suprimentos/page.tsx`
- **Endpoint:** `GET /api/dashboard` + `GET /api/suprimentos/ordens`
- **Cards:** Total Investido, Total Ordens, Ordens Entregues, % Entregue
- **Gráficos:** Status das Ordens (pizza), Tabela de Ordens com Toggle Entregue
- **Dados:** Supabase `suprimentos_ordens`
- **Importação:** `POST /api/suprimentos/ordens`

### 3. **Configurações & Projetos**
- **Local:** `src/app/configuracoes/page.tsx`
- **Endpoints:**
  - `GET/POST /api/config` - Dados do projeto (datas, metas, gerentes)
  - `GET /api/config/clinicas` - Lista de clínicas
  - `GET /api/config/hoteis` - Hotels e vagas totais
  - `GET /api/config/acessos` - Usuários permitidos
  - `GET /api/config/cronograma` - Configurações de cronograma
- **Dados:** Supabase `configuracoes` + Google Sheets (hoteis, clinicas, users)
- **Entidades Supabase:**
  - `configuracoes` - Único registro (id=1) com dados do projeto
  - `etapas` - N fases com durações e percentual de progresso físico

### 4. **Autenticação & Acesso**
- **Método:** JWT (cookie httpOnly)
- **Validação:** Google Sheets contra aba `"USERS_PERMITIDOS"` (RE, NOME, ROLE)
- **Endpoints:**
  - `POST /api/auth/login` - Autentica via RE + senha
  - `GET /api/auth/me` - Info do usuário autenticado
  - `POST /api/auth/logout` - Limpa sessão
- **Local:** `src/app/api/auth/`
- **Roles:** user, admin, gerente
- **Proteção:** ProtectedRoute component (redirect a /login se não autenticado)

---

## 📊 Arquitetura de Dados

### Supabase (PostgreSQL) - Principal
```
┌─ colaboradores (40+ campos)
│  └─ Dados pessoais, status, datas críticas, admissão
├─ configuracoes (1 registro)
│  └─ Projeto: datas, metas, orçamento, feriados
├─ etapas (N registros)
│  └─ Cronograma: durações, ordem, % conclusão físico
├─ logistica_controle
│  └─ Controle: hoteis, turnos, crachás, pontos
├─ seguranca_fits
│  └─ FITs: ASO, treinamento, status portal
├─ suprimentos_ordens
│  └─ Ordens: compras, valores, status, entrega
└─ usuarios_fits (se houver)
   └─ Relacionamento FIT ↔ Colaboradores
```

### Google Sheets (Legado) - Configurações
```
Aba "Colaboradores"     → Backup / Legado
Aba "Hoteis"            → Lista de hoteis + vagas (leitura)
Aba "Clinicas"          → Clínicas cadastradas
Aba "USERS_PERMITIDOS"  → Controle de acesso (RE, NOME, ROLE)
Aba "Cronograma"        → Configurações de dias cancelamento/reagendamento
Aba "Logs"              → Auditoria de operações
Aba "Projetos"          → Histórico de projetos
```

### Fluxo de Dados Principal
```
Frontend (React) 
  ↓
Client API (axios)
  ↓
Next.js Route Handlers (validação, auth)
  ↓
Supabase OR Google Sheets (dados)
  ↓
Processamento (agregações, cálculos)
  ↓
JSON Response
  ↓
TanStack Query (cache 30s)
  ↓
Recharts (visualização)
```

---

## 🛣️ Estrutura de Pastas

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Home (redirect para /login)
│   ├── layout.tsx                # Layout raiz
│   ├── globals.css               # Estilos globais
│   ├── login/                    # Autenticação
│   │   └── page.tsx
│   ├── central/                  # Gestão de Colaboradores
│   │   ├── page.tsx              # Tabela principal
│   │   ├── novo/                 # Novo colaborador
│   │   │   └── page.tsx
│   │   └── editar/[cpf]/         # Editar colaborador
│   │       └── page.tsx
│   ├── dashboard/                # 5 dashboards
│   │   ├── page.tsx              # Dashboard principal
│   │   ├── logistica/page.tsx    # Logística
│   │   ├── rh/page.tsx           # RH
│   │   ├── seguranca/page.tsx    # Segurança
│   │   └── suprimentos/page.tsx  # Suprimentos
│   ├── configuracoes/page.tsx    # Gerenciar projeto
│   ├── api/                      # Backend (Route Handlers)
│   │   ├── auth/                 # Autenticação
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   └── me/route.ts
│   │   ├── dashboard/            # Agregações principais
│   │   │   └── route.ts          # GET: todos os dados para dashboards
│   │   ├── colaboradores/        # Gestão de colaboradores
│   │   │   ├── route.ts          # GET/POST (lista, busca)
│   │   │   ├── [cpf]/            # Detalhes por CPF
│   │   │   │   └── route.ts      # GET/PUT/DELETE
│   │   │   └── import/
│   │   │       └── route.ts      # POST: importa XLSX
│   │   ├── logistica/
│   │   │   └── controle/         # Controle logístico
│   │   │       └── route.ts      # GET/POST
│   │   ├── rh/
│   │   │   └── colaboradores/
│   │   │       ├── route.ts
│   │   │       ├── [cpf]/route.ts
│   │   │       └── import/route.ts
│   │   ├── seguranca/
│   │   │   ├── dashboard/route.ts # Agregações FITS
│   │   │   └── fits/
│   │   ├── suprimentos/
│   │   │   └── ordens/
│   │   │       ├── route.ts
│   │   │       └── [id]/route.ts
│   │   ├── config/               # Configurações do projeto
│   │   │   ├── route.ts          # GET/POST config principal
│   │   │   ├── clinicas/route.ts
│   │   │   ├── hoteis/route.ts
│   │   │   ├── acessos/route.ts
│   │   │   ├── cronograma/route.ts
│   │   │   └── projeto-dados/route.ts
│   │   ├── logs/route.ts         # Auditoria
│   │   └── export/route.ts       # Exportar dados
│   ├── components/               # React Components
│   │   ├── ProtectedRoute.tsx    # Wrapper de autenticação
│   │   ├── sidebar.tsx           # Navegação
│   │   ├── providers.tsx         # Context + Query Provider
│   │   ├── sheet-upload.tsx      # Upload de XLSX
│   │   ├── ImportModal.tsx       # Modal de importação
│   │   ├── EditColaboradorModal.tsx
│   │   ├── ColaboradorDetailsModal.tsx
│   │   ├── CargoCombobox.tsx
│   │   ├── export-button.tsx
│   │   ├── conditional-layout.tsx
│   │   └── ui/                   # Componentes ShadCN
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── table.tsx
│   │       ├── input.tsx
│   │       ├── chart.tsx
│   │       ├── badge.tsx
│   │       ├── skeleton.tsx
│   │       └── ...mais 10+
│   ├── contexts/
│   │   └── AuthContext.tsx       # Estado de autenticação
│   ├── hooks/
│   │   └── use-debounce.ts       # Debounce helper
│   ├── lib/                      # Utilitários
│   │   ├── auth.ts               # Validação JWT, requireAuth()
│   │   ├── supabase.ts           # Cliente Supabase server-side
│   │   ├── axios.ts              # Cliente HTTP + tipos API
│   │   ├── sheets.ts             # Google Sheets API client
│   │   ├── import-utils.ts       # Validação de importação
│   │   ├── curva-s.ts            # Cálculos de mobilização
│   │   ├── date-utils.ts         # Funções de data
│   │   ├── logs.ts               # Auditoria
│   │   ├── project-math.ts       # Cálculos do projeto
│   │   ├── schemas.ts            # Zod schemas (validação)
│   │   └── utils.ts              # Helpers gerais
│   ├── constants/
│   │   ├── cargos.ts             # Lista de funções
│   │   ├── colaborador-schema.ts # Definição de campos
│   │   └── cronograma-data.ts    # Dados padrão
│   ├── services/
│   │   └── import-service.ts     # Lógica de importação
│   ├── middleware.ts.disabled    # Middleware (desativado)
│   └── proxy.ts                  # Helper de proxy (se necessário)
├── public/                       # Assets estáticos
└── package.json
```

---

## 🔑 Regras de Negócio Críticas

### 1. **Ciclo de Vida do Colaborador**
Estados possíveis no campo `STATUS`:
- **Candidato** → Selecionado → **Pré-Admissão** (passando por etapas: exame, docs, ASO)
- **Preenchimento de Formulário** → **Admitido** (entra em operação)
- Pode ter **Término** agendado
- Pode ser **Desligado** (DEMITIDO)

**Regra:** Apenas colaboradores com `status = "Admitido"` e `data_admissao` preenchida entram na Curva S.

### 2. **Curva S de Mobilização**
- **Meta:** Definida em `configuracoes.meta_admissoes` (ou fallback: `colaboradores_previstos`)
- **Planejado:** Progressão sigmoide sobre as etapas (cada etapa = % do total)
- **Realizado:** Soma cumulativa de `data_admissao` (com pesos das etapas)
- **Atraso:** Comparação com linha de tendência esperada
- **Cálculo:** `src/lib/curva-s.ts` (sigmoid, calcularProgressoReal, verificarAtraso)

### 3. **Indicadores de Saúde (MOB e ASO)**
- **MOB %:** Percentual de colaboradores com `mob = "Sim"`
- **ASO %:** Percentual de colaboradores com `aso = "Apto"`
- **Importância:** KPIs críticos para o projeto (usam em 3 dashboards)

### 4. **Importação de Dados**
- **Fuzzy Matching:** Headers normalizados (uppercase, sem acentos, múltiplas aliases)
- **Validação:** Zod schemas com coerção de tipos
- **Upsert:** Por CPF (único identificador seguro)
- **Merge:** Preenche apenas campos vazios no banco
- **Relatório:** Retorna inseridos, atualizados, ignorados, erros

**Arquivo crítico:** `src/lib/import-utils.ts` (sanitizeCPF, sanitizeText, mapStrictEnums)

### 5. **Controle de Acesso**
- **Autenticação:** JWT + Google Sheets `USERS_PERMITIDOS`
- **Autorização:** Role-based (user, admin, gerente)
- **Proteção:** Todas rotas do backend requerem `await requireAuth()`
- **Sessão:** 30 dias (configurável em auth)

### 6. **Logística Específica**
- **Hotéis:** Vagas totais vêm de Google Sheets, ocupação do Supabase
- **Turnos:** Capturados no campo `turno_trabalho` da importação
- **Check-in:** Data armazenada em `data_checkin`
- **Crachá & Ponto:** Status (Sim/Não/Pendente)

### 7. **Suprimentos**
- **Upsert:** Por `ordem_compra` + `descricao`
- **Entrega:** Campo `entregue_obra` é **manual via Switch** (não importável)
- **Status:** Aprovada, Cancelada, Em Aprovação, Pendente, Em cotação, Entregue
- **Valores:** Suportam formato BRL (R$ 1.234,56) com normalização

### 8. **Feriados & Dias Úteis**
- **Feriados:** Lista em `configuracoes.feriados_projeto` (array de datas)
- **Cálculo:** `calculateWorkingDays()` em `src/lib/date-utils.ts`
- **Uso:** Curva S, cronograma de etapas

---

## 🔌 Padrões de Código Utilizados

### 1. **Server Components & Route Handlers**
- Todas as APIs são `export const dynamic = "force-dynamic"` (sem cache de build)
- Autenticação em todos os endpoints com `await requireAuth()`
- Erros customizados com status HTTP apropriados (401, 403, 500)

### 2. **Validação com Zod**
```typescript
// Exemplo: src/lib/schemas.ts
const ColaboradorSchema = z.object({
  CPF: z.string().min(11).max(14),
  NOME: z.string().min(1),
  STATUS: StatusEnum.optional(),
  MOB: SimNaoPendenteEnum.optional(),
  // ...40+ campos
});
```

### 3. **Cliente HTTP Unificado**
- `src/lib/axios.ts`: Instância única com interceptadores
- Redirecionamento automático em 401 para `/login`
- Log de requisições em dev

### 4. **React Query (TanStack Query)**
- `staleTime: 30_000` (cache por 30s)
- `retry: 2` em queries críticas
- Invalidação manual em mutações (`queryClient.invalidateQueries`)

### 5. **Componentes ShadCN**
- UI library: Radix + Tailwind
- Componentes: Card, Dialog, Table, Badge, Skeleton, Chart (Recharts)
- Temas: Dark/Light (CSS variables)

### 6. **Importação de XLSX**
- Frontend: SheetJS (`src/components/sheet-upload.tsx`)
- Backend: Parsing com normalização de headers
- Relatório: Detalhado (linha, campo, motivo de erro)

### 7. **Logging & Auditoria**
- `src/lib/logs.ts`: Funções para registrar ações
- Cada operação crítica gera log em `configuracoes.logs` (Google Sheets)
- Rastreabilidade por usuário + timestamp

---

## 📌 Localização de Funcionalidades Críticas

| Funcionalidade | Principal | Secundária | Dados |
|---|---|---|---|
| **Autenticação** | `src/app/api/auth/` | `src/lib/auth.ts` | Google Sheets `USERS_PERMITIDOS` |
| **CRUD Colaboradores** | `src/app/api/colaboradores/` | `src/app/central/` | Supabase `colaboradores` |
| **Importação XLSX** | `src/lib/import-utils.ts` | `src/app/api/*/import/` | Múltiplas tabelas (upsert) |
| **Dashboards** | `src/app/api/dashboard/` | `src/app/dashboard/*/page.tsx` | Supabase (5 tabelas) |
| **Curva S** | `src/lib/curva-s.ts` | `src/app/api/dashboard/route.ts` | Supabase `etapas` + `colaboradores` |
| **Configurações** | `src/app/api/config/` | `src/app/configuracoes/` | Supabase `configuracoes` + Sheets |
| **Logística** | `src/app/api/logistica/controle/` | `src/app/dashboard/logistica/` | Supabase + Sheets `HOTEIS` |
| **Segurança** | `src/app/api/seguranca/` | `src/app/dashboard/seguranca/` | Supabase `seguranca_fits` |
| **Suprimentos** | `src/app/api/suprimentos/` | `src/app/dashboard/suprimentos/` | Supabase `suprimentos_ordens` |
| **Exportação** | `src/app/api/export/` | N/A | SheetJS (XLSX) |

---

## 🔐 Segurança & Autenticação

### Fluxo de Autenticação
```
1. User faz login: POST /api/auth/login (RE + senha)
2. Servidor valida contra Google Sheets
3. Se válido, gera JWT assinado
4. JWT guardado em cookie httpOnly
5. Todas requisições incluem JWT automaticamente (axios headers)
6. Middleware valida JWT antes de processar rotas protegidas
7. Logout limpa cookie
```

### Proteção de Endpoints
- `requireAuth()` em todas rotas backend que precisam proteção
- JWT validado com `jose` (JWE/JWS)
- Roles verificados se necessário (admin, gerente)

### Variáveis de Ambiente Críticas
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...  # Server-only

# Google Sheets
GOOGLE_SHEETS_ID=...
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY=...  # Server-only

# JWT
JWT_SECRET=...

# Auth
NEXT_PUBLIC_API_URL=/api  # ou URL externa
```

---

## ⚡ Performance & Otimizações

### Query Caching
- TanStack Query com `staleTime: 30_000`
- Invalidação seletiva após mutações
- Skeleton loaders durante loading

### Renderização
- React Server Components onde possível
- Lazy loading de componentes pesados (Recharts)
- Virtualization em tabelas grandes

### Banco de Dados
- Índices em: `cpf`, `status`, `data_admissao` (Supabase)
- Queries paralelas em `Promise.all()`
- Paginação em listas (limit 20-100 por padrão)

### Frontend
- Code splitting automático (Next.js)
- Dynamic imports para routes
- Debouncing em busca (`use-debounce.ts`)

---

## 🚨 Débitos Técnicos & Considerações

### 1. **Migração Google Sheets → Supabase Incompleta**
- Hotéis, Clínicas, Users ainda em Sheets
- **Plano:** Migrate para Supabase `configuracoes_hoteis`, etc.

### 2. **Campos Legados no Schema**
- Alguns campos em Colaboradores (_antigo_) não utilizados
- **Ação:** Limpeza de schema após migração completa

### 3. **Rate Limiting**
- Não implementado em produção (considerar adicionar)
- Google Sheets API tem quota de 300 requisições/minuto

### 4. **Testes E2E/Unit**
- Cobertura baixa (considerar adicionar)
- Crítico: validação de importação, cálculos de Curva S

### 5. **Logs de Auditoria**
- Armazenados em Google Sheets (lento)
- **Migração:** Mover para Supabase `audit_logs`

---

## 🛠️ Linguagens & Tecnologias

### Frontend
- **Framework:** Next.js 14+ (App Router, TypeScript)
- **UI:** React 18+ + ShadCN/ui + Tailwind CSS
- **Gráficos:** Recharts
- **Estado:** React Context + TanStack Query
- **Validação:** Zod
- **HTTP:** Axios

### Backend
- **Runtime:** Node.js via Next.js Route Handlers
- **Auth:** Jose (JWT)
- **DB:** Supabase (PostgreSQL)
- **Google API:** googleapis (Google Sheets)
- **XLSX:** SheetJS

### DevOps & Config
- **Versioning:** TypeScript, ESLint
- **Format:** Prettier
- **Env:** Next.js `.env.local`
- **Build:** `npm run build` → `npm run start`

---

## 📝 Convenções de Código

### Nomenclatura
- Componentes React: PascalCase (`EditColaboradorModal.tsx`)
- Funções/vars: camelCase (`calcularMetricas`, `staleTime`)
- Constantes: UPPER_SNAKE_CASE (`SHEETS`, `VALID_STATUS`)
- Tipos/Interfaces: PascalCase (`Colaborador`, `DashboardData`)

### Estrutura de Função de API
```typescript
export const dynamic = "force-dynamic";
import { ... } from "...";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();  // ← SEMPRE primeira linha
    
    // Validação de input
    const param = searchParams.get("x");
    
    // Busca de dados (Supabase)
    const db = createServerClient();
    const { data, error } = await db.from("tabela").select("*");
    
    if (error) throw new Error(error.message);
    
    // Processamento
    const resultado = processar(data);
    
    return NextResponse.json(resultado);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    console.error("[GET /api/rota]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
```

---

## 🔍 Como Debugar

### Erros Comuns
1. **"Não autorizado" (401)**
   - Verificar JWT em cookie: `document.cookie`
   - Validar usuario em Google Sheets `USERS_PERMITIDOS`
   - Checar JWT_SECRET em `.env.local`

2. **Importação falha com erros de validação**
   - Ver relatório de erro na resposta POST
   - Campos esperados em `src/lib/import-utils.ts`

3. **Dashboard não carrega dados**
   - Verificar conexão Supabase em `.env.local`
   - Ver logs do servidor (terminal)
   - Validar que tabela existe no DB

4. **Hotéis não aparecem em Logística**
   - Verificar Google Sheets ID em `.env.local`
   - Validar aba "Hoteis" existe
   - Headers devem ser: NOME, QT_VAGAS

### Logs Úteis
```bash
# Terminal de dev
npm run dev

# Google Sheets API logs
console.log("[Dashboard] getHoteis:", rows);

# TanStack Query DevTools
Import QueryDevtools no layout
```

---

## 📚 Roadmap Técnico Recomendado

1. **Curto Prazo (1-2 sprints)**
   - Completar migração Sheets → Supabase
   - Adicionar testes unitários para curva-s.ts
   - Rate limiting em APIs

2. **Médio Prazo (2-4 sprints)**
   - Audit logs em Supabase ao invés de Sheets
   - Otimizar queries do dashboard (índices)
   - Error tracking (Sentry)

3. **Longo Prazo (4+ sprints)**
   - Testes E2E (Playwright)
   - Real-time updates (Supabase Realtime)
   - Multi-project (tenant isolation)
   - Mobile app (React Native)

---

## 👥 Contatos & Recursos

- **Docs Supabase:** https://supabase.com/docs
- **Docs Next.js:** https://nextjs.org/docs
- **Docs Google Sheets API:** https://developers.google.com/sheets/api
- **File:** `contexti.md` - Análise detalhada de fontes de dados

---

**Última atualização:** 25 de Março de 2026
**Versão da App:** Fase 4 (Supabase completo)
**Mantido por:** Tech Lead Team