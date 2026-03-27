# Estrutura de Arquivos e Diretórios — RefuncApp (27/03/2026)

Documentação completa da estrutura do projeto com descrição funcional de cada pasta e arquivo.

---

## Raiz do Projeto (`/`)

| Arquivo/Pasta | Descrição |
|---|---|
| **src/** | **Código-fonte principal** - TypeScript, componentes React, API routes |
| **public/** | **Assets estáticos** - imagens, ícones, favicon (servidos pelo Next.js) |
| **node_modules/** | Dependências npm (gerado automaticamente, não commitado) |
| **package.json** | Manifesto com versões, scripts de build/dev e 30+ dependências |
| **package-lock.json** | Lock file para instalação reproducível |
| **tsconfig.json** | Configuração TypeScript (target ES2020, módulos ESM, paths) |
| **next.config.ts** | Configuração Next.js (redirects, middleware, publicFiles) |
| **postcss.config.mjs** | Configuração PostCSS para Tailwind CSS 4 |
| **eslint.config.mjs** | Configuração ESLint (next/recommended rules) |
| **.env.local** | Variáveis de ambiente desenvolvimento (NÃO COMMITADO) |
| **.env.example** | Template de .env: NEXT_PUBLIC_SUPABASE_URL, JWT_SECRET, etc |
| **.gitignore** | Padrões ignorados: node_modules, .next, .env.local, .DS_Store |
| **README.md** | Instruções de setup local e deployment |
| **LICENSE** | Licença do projeto |
| **contexto.md** | Documentação técnica completa (Banco, APIs, Schemas, Gráficos) |
| **TECHLEAD_CONTEXT.md** | Contexto técnico para Tech Lead |
| **migration_sync_headers.sql** | Script SQL para sincronizar headers de importação |
| **apresentacao.md** | Relatório/apresentação (gerado automaticamente) |
| **features.md** | Lista detalhada de features implementadas |
| **metricas.md** | Documentação de cálculos e métricas |
| **.next/** | Artifacts compilados Next.js (gerado, não commitado) |
| **.git/** | Repositório Git local |

---

## /src - Código-Fonte Principal

```
src/
├── app/                    # Next.js App Router (rotas e páginas)
├── components/             # Componentes React reutilizáveis
├── contexts/               # React Context (global state)
├── hooks/                  # Custom React Hooks
├── lib/                    # Lógica e utilitários reutilizáveis (essencial)
├── constants/              # Constantes estáticas
├── services/               # Serviços de negócio
├── middleware.ts.disabled  # Middleware Next.js (desabilitado)
└── proxy.ts                # Proxy utilities (se needed)
```

---

## /src/app - Next.js App Router (Rotas e Páginas)

### Estrutura de Pastas:

```
app/
├── layout.tsx              # Root layout com HTML, providers, sidebar
├── page.tsx                # Página home (redirect)
├── globals.css             # Estilos Tailwind CSS globais
├── api/                    # Backend - API Routes serverless
├── login/
│   └── page.tsx
├── central/                # Central de Colaboradores (CRUD principal)
│   ├── page.tsx
│   ├── novo/
│   │   └── page.tsx
│   └── editar/
│       └── [cpf]/
├── configuracoes/          # Configuração do Projeto
│   └── page.tsx
├── dashboard/              # Dashboards Temáticos
│   ├── page.tsx            # Dashboard Principal (KPIs, Curva S)
│   ├── rh/
│   │   └── page.tsx
│   ├── logistica/
│   │   └── page.tsx
│   ├── suprimentos/
│   │   └── page.tsx
│   └── seguranca/
│       └── page.tsx
└── favicon.ico             # Favicon da aplicação
```

### /src/app/api - Backend (27+ Endpoints)

**Estrutura:**

```
api/
├── auth/                   # Autenticação JWT
│   ├── login/route.ts
│   ├── logout/route.ts
│   └── me/route.ts
├── colaboradores/          # CRUD + Importação
│   ├── route.ts
│   └── import/route.ts
├── config/                 # Configurações do Projeto
│   ├── route.ts
│   ├── acessos/
│   ├── clinicas/
│   ├── etapas/
│   ├── hoteis/
│   ├── logs/
│   └── projeto-dados/
├── dashboard/              # Dashboards e Métricas
│   ├── route.ts
│   ├── rh/
│   ├── logistica/
│   ├── suprimentos/
│   └── seguranca/ (opcional)
├── export/route.ts         # Download XLSX
├── clinicas/route.ts       # GET clínicas
├── logistica/
│   └── controle/route.ts
├── rh/
│   └── colaboradores/route.ts
├── logs/route.ts           # Auditoria
├── seguranca/
│   └── fits/route.ts
└── suprimentos/
    └── ordens/route.ts
```

**Endpoints Principais:**

| Rota | Método | Função |
|---|---|---|
| `/api/auth/login` | POST | Valida RE, gera JWT (8h), seta cookie httpOnly |
| `/api/auth/logout` | POST | Limpa cookie, encerra sessão |
| `/api/auth/me` | GET | Retorna usuário autenticado (requer JWT) |
| `/api/colaboradores` | GET | Listar colaboradores (paginado: 20/página) + search |
| `/api/colaboradores` | POST | Criar novo colaborador |
| `/api/colaboradores/[CPF]` | GET | Detalhes de um colaborador |
| `/api/colaboradores/[CPF]` | PUT | Editar colaborador (merge parcial) |
| `/api/colaboradores/[CPF]` | DELETE | Deletar colaborador |
| `/api/colaboradores/import` | POST | Importação XLSX/CSV (fuzzy header matching) |
| `/api/dashboard` | GET | KPIs principais (todo projeto) + Curva S |
| `/api/dashboard/rh` | GET | Métricas RH (etária, UF, ASO, término) |
| `/api/dashboard/logistica` | GET | Ocupação hotéis, vagas, distribuição turnos |
| `/api/dashboard/suprimentos` | GET | Total investido, status ordens |
| `/api/config` | GET | Get configurações do projeto |
| `/api/config` | POST | Set configurações + etapas (cronograma) |
| `/api/config/etapas` | GET/POST | CRUD etapas (até 20) |
| `/api/config/clinicas` | GET/POST | CRUD clínicas (exame) |
| `/api/config/hoteis` | GET/POST | CRUD hotéis (hospedagem) |
| `/api/config/acessos` | * | Gestão usuários permitidos |
| `/api/config/logs` | GET | Visualização auditoria filtrada |
| `/api/config/projeto-dados` | GET | Info projeto (readonly) |
| `/api/clinicas` | GET | Listar todas clínicas |
| `/api/export` | GET | Download XLSX completo |
| `/api/logs` | GET | Logs auditoria com filtros |
| `/api/rh/colaboradores` | GET/POST | API RH específica |
| `/api/logistica/controle` | POST | Importação dados logística |
| `/api/seguranca/fits` | POST | Importação FITS |
| `/api/suprimentos/ordens` | GET/POST/PATCH | CRUD ordens de compra + toggle entrega |

### /src/app/pages - Páginas Frontend

#### **login/**
- `page.tsx` - Formulário de login (RE input, autenticação JWT, redirecionamento)

#### **central/** - Central de Colaboradores  
- `page.tsx` - Listagem com search, filtros, paginação (20/página)
- `novo/page.tsx` - Cadastro novo colaborador (40 campos)
- `editar/[cpf]/page.tsx` - Edição colaborador existente

#### **configuracoes/**
- `page.tsx` - Dashboard de configuração (CRUD para: projeto, etapas, clínicas, hotéis, usuários)

#### **dashboard/**
- `page.tsx` - Dashboard principal (KPIs, Curva S, gráficos agregados)
- `rh/page.tsx` - Dashboard RH (faixa etária, distribuição UF, ASO, término contrato)
- `logistica/page.tsx` - Dashboard Logística (ocupação hotéis, vagas, turnos)
- `suprimentos/page.tsx` - Dashboard Suprimentos (status ordens, valores, toggle delivery)
- `seguranca/page.tsx` - Dashboard Segurança (FITs, ASO, treinamentos) *opcional*

### /src/app/suporte
- `layout.tsx` - Root layout (HTML, providers React Query/AuthContext/Sonner, sidebar)
- `page.tsx` - Redirect home (/)
- `globals.css` - Estilos base Tailwind CSS

---

## /src/components - Componentes React

### Componentes Principais (Negócio)

| Arquivo | Função | Uso |
|---|---|---|
| **ProtectedRoute.tsx** | Wrapper para rotas autenticadas | Redireciona se !user |
| **providers.tsx** | Providers globais | React Query, AuthContext, Sonner toast |
| **sidebar.tsx** | Menu lateral navegação | Links entre seções principais |
| **conditional-layout.tsx** | Layout adaptativo | Com/sem sidebar baseado em rota |
| **ImportModal.tsx** | Modal upload XLSX/CSV | Import de colaboradores, logística, etc |
| **sheet-upload.tsx** | Widget drag-and-drop | Upload arquivo (reutilizável) |
| **export-button.tsx** | Botão download | Export XLSX com filtros aplicados |
| **CargoCombobox.tsx** | Combobox seletor | Seleção de cargo (FUNCAO_CLT) |
| **ColaboradorDetailsModal.tsx** | Modal visualização | Exibe 40 campos de colaborador |
| **EditColaboradorModal.tsx** | Modal edição | Edita campo único ou múltiplos |

### /src/components/ui - Componentes Base (shadcn/ui)

Componentes reutilizáveis com Radix UI + Tailwind CSS:

| Arquivo | Tipo | Uso |
|---|---|---|
| **button.tsx** | Control | Botão (multiple variantes, sizes, states) |
| **card.tsx** | Container | Card container (header, content, footer) |
| **badge.tsx** | Label | Badge/etiqueta colorida |
| **input.tsx** | Form | Input text com placeholder |
| **textarea.tsx** | Form | TextArea multilinha |
| **select.tsx** | Form | Select dropdown (Radix Select) |
| **dialog.tsx** | Modal | Dialog modal com overlay |
| **dropdown-menu.tsx** | Menu | Menu dropdown (Radix Dropdown) |
| **table.tsx** | Data | Tabela com th, td, tbody |
| **tabs.tsx** | Navigation | Tabs/abas (Radix Tabs) |
| **checkbox.tsx** | Control | Checkbox (Radix Checkbox) |
| **switch.tsx** | Control | Switch/toggle (Radix Switch) |
| **popover.tsx** | Floating | Popover (Radix Popover) |
| **skeleton.tsx** | Feedback | Loading placeholder |
| **progress.tsx** | Feedback | Progress bar (Radix Progress) |
| **command.tsx** | Input | Command palette (cmdk library) |
| **chart.tsx** | Visualization | Wrapper Chart.js |
| **sonner.tsx** | Toast | Toast notifications (sonner library) |
| **input-group.tsx** | Form | Input + label combinado |

---

## /src/lib - Lógica e Utilitários Reutilizáveis (Essencial)

| Arquivo | Descrição | Exports Principais |
|---|---|---|
| **auth.ts** | JWT generation/verification (jose library HS256) | `generateToken()`, `verifyToken()`, `requireAuth()` (middleware) |
| **supabase.ts** | Clientes Supabase (anon + service role) | `supabase` (client), `createServerClient()` (service role) |
| **axios.ts** | Axios instance configurado | `axios` com interceptadores (error handling, retry) |
| **curva-s.ts** | Cálculos de Curva S (progresso sigmoide) | `gerarDadosGraficoCurvaS()`, `verificarAtraso()` |
| **date-utils.ts** | Parsing e formatação datas | `parseDate()`, `formatDate()`, `calcularDiasUteis()`, `feriados` |
| **import-utils.ts** | Fuzzy matching headers, normalização | `normalizarHeaders()`, `fuzzyMatch()` (100+ aliases) |
| **schemas.ts** | Zod schemas validação runtime | `ColaboradorSchema`, `ConfigSchema`, `EtapaSchema`, etc |
| **logs.ts** | Logger auditoria em banco | `logAuditoria()`, `logLogin()`, `logAcao()` |
| **project-math.ts** | Cálculos agregações | `calcularPercentual()`, `agruparPor()` |
| **utils.ts** | Utilitários genéricos | `clsx()`, `cn()`, `formatCPF()`, validators |

---

## /src/constants - Constantes Estáticas

| Arquivo | Descrição | Conteúdo |
|---|---|---|
| **cargos.ts** | Enum de cargos válidos | FUNCAO_CLT enum/array |
| **colaborador-schema.ts** | Schema Zod colaborador | (ou importado de schemas.ts) |
| **cronograma-data.ts** | Feriados nacionais brasileiros 2026 | Datas array em YYYY-MM-DD |

---

## /src/contexts - React Context (Global State)

| Arquivo | Descrição | Exports |
|---|---|---|
| **AuthContext.tsx** | Contexto de autenticação | `AuthProvider`, `useAuth()`, `{ user, login, logout, isLoading }` |

---

## /src/hooks - Custom React Hooks

| Arquivo | Descrição | Exports |
|---|---|---|
| **use-debounce.ts** | Debouncing para search, input | `useDebounce(value, delay)` (300ms default) |

---

## /src/services - Serviços de Negócio

| Arquivo | Descrição | Funções |
|---|---|---|
| **import-service.ts** | Orquestração importação completa | `parseImportFile()`, `validateRows()`, `upsertColaboradores()` |

---

## /public - Assets Estáticos

- **Imagens** - PNG, SVG, JPG
- **Ícones** - Favicon, logo
- **Favicon.ico** - Ícone da aba

Servidos diretamente pelo servidor Next.js (cache-friendly).

---

## Fluxo de Dados

```
User (Login) 
  ↓
/login/page.tsx (form RE)
  ↓
POST /api/auth/login (validate RE vs usuarios_permitidos)
  ↓
Generate JWT (8h expiry) + set httpOnly cookie
  ↓
Redirect /central
  ↓
React Query + AuthContext cache
  ↓
All requests include JWT cookie automatically
  ↓
/api/colaboradores (requireAuth middleware validates JWT)
  ↓
Supabase query (service role bypasses RLS)
  ↓
Response + React Query cache invalidation
  ↓
UI re-renders with fresh data
```

---

## Stack Técnico por Camada

### Frontend Layer
- **Framework**: Next.js 16.1.6 + React 19.2.3
- **State**: React Query (5.90.21) + Context API
- **UI**: shadcn/ui (Radix UI) + Tailwind CSS 4
- **Forms**: react-hook-form + Zod
- **Charts**: Recharts + Chart.js

### Backend Layer
- **API**: Next.js API Routes (serverless)
- **Auth**: JWT (jose library HS256)
- **Validation**: Zod runtime
- **DB Client**: @supabase/supabase-js

### Database Layer
- **Primary**: Supabase PostgreSQL 14+
- **Backup**: Supabase automated backups
- **Security**: Row Level Security (RLS), service role

### Infrastructure
- **Deployment**: Vercel (serverless, auto-git redeploy)
- **Analytics**: Vercel Analytics + Speed Insights
- **CDN**: Vercel Edge Network

---

## Notas Importantes

1. **Estrutura API**: Todas as rotas em `/src/app/api/` são Next.js API Routes serverless
2. **Autenticação**: JWT em cookie httpOnly, validado em middleware `requireAuth()`
3. **Validação**: Duas camadas - client (React Hook Form) + server (Zod)
4. **Importação**: Fuzzy matching de headers com 100+ aliases para robustez
5. **Supabase**: Dois clientes - `anon` (respects RLS) e `service role` (bypasses RLS)
6. **Componentes**: Todos reutilizáveis com shadcn/ui patterns
7. **Logs**: Auditoria completa em `logs_auditoria` table
8. **Feriados**: Sincronizados com script SQL `migration_sync_headers.sql`

