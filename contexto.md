# RefuncApp — Documento de Contexto Completo

## 1. Visão Geral e Arquitetura

**RefuncApp** é um sistema de gestão de colaboradores para projetos de implementação em larga escala. Gerencia o ciclo completo de onboarding, desde cadastro até treinamento e operação, com rastreamento de progresso em tempo real.

### Stack Técnico

**Frontend:**
- **Framework**: Next.js 16.1.6 (React 19.2.3) com TypeScript
- **Gerenciamento de Estado**: React Query (@tanstack/react-query 5.90.21) + React Context
- **Autenticação**: JWT com Cookie httpOnly
- **Tema**: next-themes (light/dark mode automático)
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Ícones**: lucide-react
- **Gráficos**: Recharts 2.15.4 + Chart.js 4.5.1 + react-chartjs-2
- **Formulários**: react-hook-form + Zod (validação)
- **Importação Excel**: xlsx (SheetJS) 0.18.5
- **Animações**: framer-motion 12.36.0
- **Notificações**: sonner 2.0.7
- **Máscaras**: react-imask 7.6.1

**Backend:**
- **API**: Next.js API Routes (serverless)
- **Base de Dados**: Google Sheets API v4 (via Service Account)
- **Autenticação**: googleapis 171.4.0 + jose 6.2.1 (JWT)
- **Validação**: Zod 4.3.6 (type-safe)

**Deployment:**
- **Frontend/Backend**: Vercel (serverless)
- **Analytics**: @vercel/analytics + @vercel/speed-insights

### Fluxo de Dados Principal
```
Usuário (Login com RE)
    ↓
JWT Cookie httpOnly
    ↓
Central (CRUD Manual / Importar XLSX)
    ↓
Google Sheets (armazema dados)
    ↓
Dashboard (Gráficos + Métricas em tempo real)
    ↓
Exportar XLSX
```

## 2. Páginas da Aplicação

| Página | URL | Função | Autenticação |
|--------|-----|--------|--------------|
| **Login** | `/login` | Validação de RE contra aba "users_permitidos" | ❌ Pública |
| **Central** | `/central` | CRUD manual/importação XLSX, tabela com busca e filtros | ✅ Protegida |
| **Dashboard Geral** | `/dashboard` | Visão consolidada com métricas e gráficos principais | ✅ Protegida |
| **Dashboard RH** | `/dashboard/rh` | Distribuição por função, faixa etária, análise demográfica | ✅ Protegida |
| **Dashboard Logística** | `/dashboard/logistica` | Ocupação de hotéis, vagantes, status de check-in | ✅ Protegida |
| **Dashboard Suprimentos** | `/dashboard/suprimentos` | Ordens de compra, investimento, percentual de entrega | ✅ Protegida |
| **Configurações** | `/configuracoes` | Setup de projeto, datas, etapas, metas, usuários permitidos | ✅ Protegida |

---

## 3. Modelo de Dados Completo — Tabela "Colaboradores"

A planilha possui **38 colunas** em ordem fixa (CRÍTICO: não alterar ordem). CPF é o identificador único.

### Colunas (Índice 0-37)

| Idx | Coluna | Tipo | Regra | Descrição |
|-----|--------|------|-------|-----------|
| 0 | **IND** | texto | opcional | Indicador genérico |
| 1 | **STATUS** | enum | opcional | `Ativo`, `Pendente`, `Inativo`, `Desligado` |
| 2 | **ENVIADO_RH** | enum | opcional | `Sim`, `Não`, `Pendente` — comunicação com RH |
| 3 | **PESSOA** | enum | opcional | `Física`, `Jurídica` |
| 4 | **REQ** | texto | opcional | Número da requisição |
| 5 | **VINCULADO** | texto | opcional | Nome do vínculo/contratante |
| 6 | **CARTA_OFERTA** | enum | opcional | `Sim`, `Não`, `Pendente` |
| 7 | **COLAB_PEND** | enum | opcional | `Sim`, `Não` — colaborador em pendência |
| 8 | **EXAME** | enum | opcional | `Realizado`, `Agendado`, `Pendente` |
| 9 | **CLINICA** | enum | opcional | Dropdowndinâmico (lista de clínicas cadastradas) |
| 10 | **DOCS** | enum | opcional | `Completo`, `Pendente`, `Incompleto` |
| 11 | **ASO** | enum | opcional | `Apto`, `Inapto`, `Pendente` ← usado em gráficos |
| 12 | **RPV** | texto | opcional | Referência/Protocolo |
| 13 | **PRE_ADMISSAO** | enum | opcional | `Sim`, `Não`, `Pendente` |
| 14 | **MOB** | enum | opcional | `Sim`, `Não`, `Pendente` ← mobilização |
| 15 | **OP** | texto | opcional | Ordem de Produção |
| 16 | **DATA_ADMISSAO** | data | opcional | YYYY-MM-DD ← conta como "Admitido" |
| 17 | **CONTRATO** | enum | opcional | `CLT`, `PJ`, `Temporário`, `Estagiário` |
| 18 | **PORTAL** | enum | opcional | `Liberado`, `Pendente`, `Bloqueado` |
| 19 | **CRACHA** | enum | opcional | `Emitido`, `Pendente` |
| 20 | **PONTO** | enum | opcional | `Cadastrado`, `Pendente` |
| 21 | **TREINAMENTO** | enum | opcional | `Concluído`, `Em Andamento`, `Pendente` |
| 22 | **REALIZAR_TREINAMENTO** | enum | opcional | `Sim`, `Não`, `Pendente` |
| 23 | **LOCAL_TREINAMENTO** | texto | opcional | Localização do treinamento |
| 24 | **RE** | texto | opcional | Registro do Empregado |
| 25 | **NOME** | texto | **OBRIGATÓRIO** | Nome completo |
| 26 | **FUNCAO_CLT** | texto | opcional | Função registrada (alimenta gráfico RH) |
| 27 | **HISTOGRAMA** | texto | opcional | Histograma/referência |
| 28 | **IDADE** | número | opcional | 16-99 anos (preenchido automático via DT_NASC) |
| 29 | **DT_NASCIMENTO** | data | opcional | YYYY-MM-DD |
| 30 | **CPF** | texto | **OBRIGATÓRIO + UNIQUE** | 11 dígitos (sempre normalizado com zeros à esquerda) |
| 31 | **VR** | enum | opcional | `Ativo`, `Pendente` — Vale Refeição |
| 32 | **TERMINO** | data | opcional | Data de término de contrato |
| 33 | **PRORROGACAO** | data | opcional | Data de prorrogação |
| 34 | **DEMISSAO** | data | opcional | Data de demissão |
| 35 | **MUNICIPIO** | texto | opcional | Cidade de residência |
| 36 | **UF** | enum | opcional | Sigla do estado (AC...TO) |
| 37 | **TELEFONE** | texto | opcional | Telefone com DDD |

### Validação de Dados (Zod Schemas)

**Campos obrigatórios para criação:**
- `NOME` (não vazio)
- `CPF` (11 dígitos, sem CPF duplicado na planilha)

**Conversão automática:**
- **CPF**: Remove máscara, garante 11 dígitos com zero à esquerda
- **Datas**: Converte Excel serial, DD/MM/YYYY, ISO → YYYY-MM-DD
- **Strings vazias**: Convertidas para `undefined` (não armazenam)

**Enums rigorosos:**
Todos os campos enum são validados contra listas predefinidas. Valores inválidos causam erro 400.

---

## 4. Autenticação e Segurança

### Fluxo de Login

```
1. Usuário acessa /login
2. Digita seu RE (Registro do Empregado)
3. Frontend POST /api/auth/login { re: "123456" }
4. Backend:
   a. Busca RE em Google Sheets (aba "users_permitidos")
   b. Se encontrado → Gera JWT com expiração padrão
   c. Define cookie httpOnly com token
   d. Registra LOG de login
5. Frontend recebe { success: true, user: {...} }
6. Redireciona para /central
```

### JWT & Cookies

- **Algoritmo**: HS256 (HMAC SHA-256)
- **Payload**: `{ re, nome, perfil, iat, exp }`
- **Cookie**: `httpOnly`, `secure` (HTTPS), `sameSite=Strict`
- **Expiração**: Configurável via `JWT_EXPIRY` (padrão: 1 dia)
- **Secret**: Via `JWT_SECRET` (variável de ambiente)

### Proteção de Rotas

**Frontend:**
- `<ProtectedRoute>` wrapper valida autenticação e redireciona para `/login` se não autenticado
- React Query retry automático em caso de 401

**Backend:**
- Função `requireAuth(request)` em todas as rotas privadas
- Valida token JWT no cookie
- Retorna 401 se inválido/expirado

---

## 5. Regras de Negócio — Métricas e Cálculos

### Métricas de Progresso

Todas as métricas são calculadas dinamicamente em `/api/dashboard` e armazenadas temporariamente:

#### 5.1 Cadastrados
```
Regra: CPF != null AND NOME != null
Significado: Colaborador entrou no sistema
```

#### 5.2 Admitidos
```
Regra: Cadastrado AND (DATA_ADMISSAO != null OR STATUS != "Pendente")
Significado: Colaborador foi admitido (passou por RH)
```

#### 5.3 Liberados
```
Regra: Admitido AND (MOB == "Sim" OR ASO == "Apto")
Significado: Pronto para logística/operação
```

#### 5.4 Em Treinamento
```
Regra: TREINAMENTO IN ("Em Andamento", "Concluído")
Significado: Está/foi treinado
```

#### 5.5 Percentual MOB
```
Cálculo: (COUNT(MOB="Sim") / totalCadastrados) * 100
Intervalo: 0-100%
Gráfico: Card no dashboard
```

#### 5.6 Percentual ASO
```
Cálculo: (COUNT(ASO="Apto") / totalCadastrados) * 100
Intervalo: 0-100%
Gráfico: Gráfico de barras inferior esquerdo
```

#### 5.7 Percentual Portal
```
Cálculo: (COUNT(PORTAL="Liberado") / totalCadastrados) * 100
Intervalo: 0-100%
Card no dashboard
```

---

## 6. Lógica de Gráficos

### 6.1 Curva S (Sigmoide) — Gráfico Principal

**Objetivo**: Visa comparar a progressão planejada (sigmoide) com a progressão real (cumelativos por DATA_ADMISSAO).

#### Matemática da Sigmoide
```
Função logística normalizada:

σ(t) = 1 / (1 + e^(-k(t-0.5)))

Onde:
  t ∈ [0, 1]  → tempo normalizado (0 = início, 1 = fim)
  k = 8       → steepness (padrão engenharia)
  σ(t) ∈ [0, 1] → progresso normalizado

Meta acumulada(t) = σ(t) × metaAdmissoes
```

#### Características
- **Fase 1** (0-0.3): Curva suave (setup/mobilização inicial)
- **Fase 2** (0.3-0.7): Aceleração máxima (foco de contratação)
- **Fase 3** (0.7-1.0): Estabilização (finalizações)

#### Dados Gerados
```typescript
interface DadosCurvaS {
  labels: string[];      // ["01/01", "08/01", "15/01", ...]
  planejado: number[];   // [2, 5, 12, 25, 45, 70, 95, 120, 135, 150]
  realizado?: number[];  // [1, 3, 8, 20, 42, 75, 110, 135, 145, 150]
}
```

**Cálculo de Realizado**:
```javascript
1. Filtra colaboradores com DATA_ADMISSAO não nula
2. Ordena por DATA_ADMISSAO
3. Para cada ponto de data no gráfico:
   - Conta cumulativo até essa data
   - Armazena em realizado[i]
```

#### Atraso Detectado
```typescript
function verificarAtraso(dataInicio, dataFim, metaAdmissoes, admitidosHoje) {
  const diasTotais = (dataFim - dataInicio) / (1000*60*60*24);
  const diasCorridos = (hoje - dataInicio) / (1000*60*60*24);
  const tHoje = diasCorridos / diasTotais;  // [0, 1]
  
  const metaHoje = sigmoid(tHoje) * metaAdmissoes;
  const diferenca = admitidosHoje - metaHoje;
  
  atrasado = diferenca < -0.5;  // tolerância de 0.5 pessoa
  diasAtraso = Math.round((tHoje - inverseSigmoid(admitidosHoje/metaAdmissoes)) * diasTotais);
  percentualAtraso = (Math.abs(diferenca) / metaAdmissoes) * 100;
}
```

### 6.2 Evolução por Setor — Gráfico de Pizza

Mostra percentual de preenchimento por setor:

```
RH:        % de colaboradores com STATUS != Pendente
Logística: % com MOB == "Sim"
Segurança: % com ASO == "Apto"
```

### 6.3 Status Count — Gráfico de Rosca

Distributção dos 4 status principais:

```
Ativo:    COUNT(STATUS == "Ativo")
Pendente: COUNT(STATUS == "Pendente" OR STATUS == null)
Inativo:  COUNT(STATUS == "Inativo")
Desligado: COUNT(STATUS == "Desligado")
```

### 6.4 Distribuição por Função CLT — Pizza Top 9 + Outros

```
1. Lista única de FUNCAO_CLT (sem duplicatas)
2. Agrupa COUNT por função
3. Ordena descendente
4. Top 9 aparecem separadas
5. Restantes agrupadas em "Outros"
```

### 6.5 Distribuição por Faixa Etária — Gráfico de Barras

Baseado em DT_NASCIMENTO → IDADE:

```
Faixas: 
  16-20, 21-25, 26-30, 31-35, 36-40, 
  41-45, 46-50, 51-55, 56-60, 60+
```

### 6.6 Distribuição por UF — Gráfico de Barras

Fácil agregação por UF:

```
COUNT(UF == "SP"), COUNT(UF == "RJ"), etc.
```

### 6.7 Ocupação de Hotéis — Gráfico de Barras (Dashboard Logística)

```
Para cada valor único em VINCULADO (assume = hotel):
  vagasTotais = COUNT(VINCULADO == hotel)
  vagasPreenchidas = COUNT(VINCULADO == hotel AND VINCULADO != null)
  percentual = (vagasPreenchidas / vagasTotais) * 100
```

### 6.8 Suprimentos — Tabela + Gráficos (Dashboard Suprimentos)

Dados mais complexos:

```
totalInvestido:    SUM(VALORES)
totalOrdens:       COUNT(unicas de ORDEM_COMPRA)
entregues:        COUNT(ENTREGUE_OBRA == "Sim")
percentualEntregue: (entregues / totalOrdens) * 100

distribuicaoStatus: [{status, COUNT}] para pie chart
```

---

## 7. Importação de Planilhas (XLSX/CSV)

### Fluxo de Importação

```
1. Usuário seleciona arquivo XLSX/CSV em /central
2. Frontend lê arquivo com SheetJS (xlsx NPM)
3. Passa para ImportModal (preview + validação)
4. POST /api/colaboradores/import { dados, modeocioso: "merge" }
5. Backend:
   a. Normaliza headers via fuzzy matching (HEADER_ALIASES)
   b. Valida cada linha com schemas Zod
   c. Para cada CPF:
      - Se novo → INSERT
      - Se existe → UPDATE (merge = preench só vazios)
   d. Retorna relatório: { inseridos, atualizados, ignorados, erros }
6. Frontend exibe toast com resultado
```

### Mapeamento de Headers (Fuzzy Matching)

Arquivo pode ter colunas em ordem diferente ou com nomes ligeiramente diferentes:

```javascript
HEADER_ALIASES = {
  nome: ["NOME", "NOME COMPLETO", "NOME DO COLABORADOR", ...],
  cpf:  ["CPF", "C.P.F.", "C P F", ...],
  data_admissao: ["DATA ADMISSÃO", "DATA ADMISSAO", "DT ADMISSAO", ...],
  // ... mais 40+ aliases
}
```

**Algoritmo**: Busca substring + case-insensitive match no primeiro header encontrado.

### Validações Durante Importação

1. **CPF**: Obrigatório, 11 dígitos após limpeza
2. **NOME**: Obrigatório, não vazio
3. **Datas**: Converte Excel serial → YYYY-MM-DD
4. **Enums**: Valida contra listas permitidas
5. **Duplicatas**: Aviso se CPF repetido no arquivo

### Relatório Final

```typescript
interface ImportReport {
  inseridos:  number;      // Novas linhas criadas
  atualizados: number;     // Linhas atualizadas (merge)
  ignorados:  number;      // Linhas com erro (não inseridas)
  erros: [{
    linha: number;
    campo?: string;
    motivo: string;
  }];
  total: number;
}
```

---

## 8. APIs (Backend)

### Autenticação

**POST /api/auth/login**
```
Body: { re: string }
Response: { success: true, user: { re, nome, perfil } }
         { error: "Credenciais inválidas" }
Status: 200, 401, 400
```

**POST /api/auth/logout**
```
Response: { success: true }
```

**GET /api/auth/me**
```
Response: { user: { re, nome, perfil } }
Status: 200, 401
```

### Colaboradores

**GET /api/colaboradores**
```
Query: ?page=1&limit=20&search=João&status=Ativo&setor=RH
Response: { data: Colaborador[], pagination: {...} }
```

**POST /api/colaboradores**
```
Body: Colaborador (subset)
Response: { success: true, data: Colaborador }
Status: 201, 400, 409 (duplicity)
```

**GET /api/colaboradores/[CPF]**
```
Response: { data: Colaborador }
Status: 200, 404
```

**PUT /api/colaboradores/[CPF]**
```
Body: Partial<Colaborador>
Response: { success: true, data: Colaborador }
```

**DELETE /api/colaboradores/[CPF]**
```
Response: { success: true }
Status: 200, 404
```

**POST /api/colaboradores/import**
```
Body: FormData { file: File }
Response: ImportReport (inseridos, atualizados, ignorados, erros[])
```

### Dashboard

**GET /api/dashboard**
```
Response: {
  metricas: {
    totalCadastrados, totalAdmitidos, totalLiberados,
    totalEmTreinamento, percentualMOB, percentualASO, percentualPortal
  },
  progresso: { real: number, planejado: number },
  projeto: {
    dataInicio, dataFim, diasCorridos, metaAdmissoes,
    status: { atrasado: boolean, diasAtraso, percentualAtraso }
  },
  graficos: {
    curvaS: { labels, planejado, realizado? },
    evolucaoPorSetor: { rh: {total, percentual}, logistica: {...}, seguranca: {...} },
    admissoesAcumuladas: [{ data, quantidade, acumulado }],
    statusCount: { Ativo, Pendente, Inativo, Desligado }
  },
  pendencias: [{ tipo, nivel, cor, nome, dataLimite, diasAtraso, pessoasFaltando, metaEtapa, realizadoAtual }],
  agregacoes: {
    distribuicaoFuncoes: [{ nome, total }],
    distribuicaoIdades: [{ faixa, total }],
    distribuicaoUF: [{ uf, total }],
    vagasHoteis: [{ hotel, vagasTotais, vagasPreenchidas, percentual }],
    suprimentos: { totalInvestido, totalOrdens, entregues, percentualEntregue, ... }
  }
}
Status: 200, 401
```

### Configurações

**GET /api/config**
```
Response: {
  data: {
    DIAS_TOTAIS_PROJETO, DATA_INICIO_PROJETO, DATA_FIM_PROJETO,
    ETAPA_ATUAL, META_ADMISSOES, ETAPAS_PROJETO: EtapaConfig[],
    GERENTE_OPERACOES, GERENTE_CONTRATO, NOME_CLIENTE, CENTRO_CUSTO
  }
}
```

**POST /api/config**
```
Body: { dataInicio, dataFim, etapas, gerenteOperacoes, ... }
Response: { success: true }
```

### Clínicas

**GET /api/clinicas**
```
Response: { data: Clinica[] }   // Lista fixa de 9 clínicas
```

### Logs

**GET /api/logs**
```
Query: ?page=1&limit=50&usuario=...&acao=ADICIONAR&dataInicio=...&dataFim=...
Response: {
  data: LogEntry[],
  resumo: { contagemPorAcao, totalGeral }
}
```

### Export

**GET /api/export**
```
Query: ?search=&status=&setor=
Response: XLSX file download (todos dados filtrados)
```

---

## 9. Estrutura de Componentes React

### Layout Global

```
layout.tsx
  ↓ <Providers> (React Query, next-themes, AuthProvider)
  ├─ <Navbar>
  ├─ <Sidebar>
  └─ Page Component
```

### Componentes UI (shadcn/ui)

- `<Button>`, `<Input>`, `<Card>`, `<Dialog>`
- `<Dropdown>`, `<Select>`, `<Tabs>`, `<Badge>`
- `<Table>`, `<Checkbox>`, `<Popover>`
- `<Progress>`, `<Skeleton>`

### Componentes de Negócio

- **`<ImportModal>`**: Upload e preview de XLSX
- **`<ColaboradorDetailsModal>`**: View read-only de um colaborador
- **`<EditColaboradorModal>`**: Edição completa (campos inline ou form)
- **`<CargoCombobox>`**: Autocomplete para funcões CLT
- **`<ProtectedRoute>`**: Wrapper de autenticação
- **Gráficos**: Recharts `<AreaChart>`, `<PieChart>`, `<BarChart>`, `<ResponsiveContainer>`

### Hooks Customizados

- **`useDebounce(value, delay)`**: Delays pesquisa por 300ms
- **`useAuth()`**: Acesso ao contexto autenticação
- **`useTheme()`**: Acesso ao tema (light/dark)
- **`useQuery()` (React Query)**: Busca assíncrona com cache
- **`useMutation()` (React Query)**: Mutations com retry automático

---

## 10. Gerenciamento de Estado

### React Query

**Cache & Revalidação:**
- `staleTime: 30000` → dados "frescos" por 30s
- `retry: 2` → retry automático em erro
- `refetch` manual disponível em componentes

**Keys de Datas:**
```javascript
queryKey: ["dashboard"]
queryKey: ["colaboradores", { page: 1, search: "João" }]
queryKey: ["colaboradores", cpf]
```

### Context API

**AuthContext:**
```
user: User | null
isAuthenticated: boolean
isLoading: boolean
login(re): Promise<void>
logout(): void
error: string | null
```

### Local Storage

- **Tema**: Persistido em localStorage (next-themes)
- **Session**: JWT armazenado com cookie httpOnly

---

## 11. Validações Zod

Todas as validações centralizadas em `src/lib/schemas.ts`:

```typescript
ColaboradorSchema = z.object({
  CPF: CPFSchema,           // 11 dígitos com zero à esquerda
  NOME: z.string().min(1),
  STATUS: StatusEnum.optional(),
  DATA_ADMISSAO: DateSchema.optional(),
  ASO: AsoEnum.optional(),
  // ... 35+ campos
})

ColaboradoresQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: StatusEnum.optional(),
  setor: z.enum(["RH", "Logística", "Segurança"]).optional(),
})
```

**Pre-processamento**:
- `emptyStringToUndefined`: "" → undefined
- `preprocessDate`: Serial Excel, DD/MM/YYYY → ISO YYYY-MM-DD
- `normalizeEnums`: Case-insensitive matching

---

## 12. Fluxo de Dados — Detalhado

### Criar Colaborador (POST /api/colaboradores)

```
Frontend (Central > Novo)
  ↓ FormWaterfall coleta dados em 8 etapas
  ↓ POST /api/colaboradores { IND, STATUS, ... CPF, NOME }
  ↓ Backend validates com Zod
  ↓ Busca CPF existente em Google Sheets
  ↓ Se novo → appendRow() (nova linha)
  ↓ Se duplica → 409 Conflict
  ↓ logAdicionar(CPF) registra ação
  ↓ Retorna 201 + dados completos
  ↓ React Query invalida cache ["colaboradores"]
  ↓ Toast successfully inserido
```

### Editar Colaborador (PUT /api/colaboradores/[CPF])

```
Frontend (Central > Editar)
  ↓ EditColaboradorModal exibe campos editáveis
  ↓ PUT /api/colaboradores/12345678901 { NOME: "Novo Nome", ... }
  ↓ Backend valida mudanças com Zod
  ↓ Busca CPF na Sheets
  ↓ updateRow() (sobrescreve linha inteira com merge)
  ↓ logEditar(CPF) registra
  ↓ Retorna 200 + dados atualizados
  ↓ React Query refetch automático
```

### Importar Planilha (POST /api/colaboradores/import)

```
Frontend (Central > Upload)
  ↓ ImportModal seleciona arquivo XLSX
  ↓ SheetJS lê arquivo em memória
  ↓ Preview mostra primeiras linhas
  ↓ POST /api/colaboradores/import FormData { file }
  ↓ Backend:
    a. Parseia XLSX com SheetJS
    b. Extrai headers, normaliza com fuzzy matching
    c. Para cada linha valida com Zod
    d. Para cada CPF:
       - getSheetData() busca todos existentes
       - findRowByColumn() procura CPF
       - Se novo → appendRow()
       - Se existe → updateRow(merge=apenas vazios)
  ↓ Retorna ImportReport
  ↓ Toast mostra inseridos/atualizados/errados
```

### Gerar Dashboard (GET /api/dashboard)

```
Frontend (Dashboard)
  ↓ useQuery launches GET /api/dashboard
  ↓ Server-side cálculos:
    a. getSheetData("Colaboradores", "A2:AL")
    b. rowToColaborador() converte para objetos
    c. calcularMetricas() → totalCadastrados, etc.
    d. gerarDadosGraficoCurvaS() → labels, planejado, realizado
    e. Busca dados de configuração (DATA_INICIO, META_ADMISSOES)
    f. Para cada gráficocálcula agregações (distribuicaoFuncoes, etc.)
    g. Retorna DashboardData completo
  ↓ Frontend caches por 30s (staleTime)
  ↓ useMemo() transformações (curveData, charts)
  ↓ Recharts renderiza gráficos
```

---

## 13. Tratamento de Erros

### Axios Interceptadores

```javascript
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Token expirado → redireciona para /login
      window.location.href = "/login";
    }
    if (error.response?.status === 429) {
      // Rate limit → warning no console
      console.warn("Rate limit atingido");
    }
    return Promise.reject(error);
  }
)
```

### React Query Retries

- Retries apenas em erro 5xx ou timeout (não em 401/409)
- Exponential backoff: 1s, 2s, 4s...
- Máximo 2 retries por padrão

### UX de Erros

```
API Error → toast.error(message)
           → console.error() em dev
           → User nunca vê detalhes técnicos
Validação → toast.warn("Nome obrigatório")
Sucesso → toast.success("Salvo com sucesso")
```

---

## 14. Performance & Otimizações

### Frontend

1. **Code Splitting**: Next.js (route-based) + lazy imports
2. **Image Optimization**: next/image (otimizado para Vercel)
3. **Debouncing**: Busca com 300ms delay (useDebounce hook)
4. **React Query Caching**: staleTime, cacheTime, deduplication
5. **Memoization**: useMemo() para gráficos pesados
6. **CSS-in-JS**: Tailwind (purge automático)

### Backend

1. **Google Sheets caching**: Dados lidos uma vez por request
2. **Validação Zod**: Early rejection sem I/O
3. **Índices implícitos**: Sheets tem auto-index por coluna
4. **Batch updates**: appendRow() para múltiplas linhas

### Deployment

1. **Vercel Edge Functions**: Respostas ultra-rápidas
2. **Analytics**: @vercel/analytics (Web Vitals)
3. **Speed Insights**: @vercel/speed-insights
4. **Caching Headers**: Cache-Control automático

---

## 15. Configurações Ambientais

### .env.local (Development)

```bash
# Google Sheets
GOOGLE_SHEETS_ID="1ABC...123"
GOOGLE_SERVICE_ACCOUNT_EMAIL="refunc@...iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# JWT
JWT_SECRET="sua_chave_ultra_secreta_aqui"
JWT_EXPIRY="24h"

# Vercel
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

### Vercel Environment Variables

Mesmo setup, mas via UI do Vercel Dashboard.

---

## 16. Stack Técnico Resumido

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Client)                          │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 16 (React 19) + TypeScript                             │
│  ├─ UI: shadcn/ui (Radix + Tailwind CSS 4)                      │
│  ├─ State: React Query + Context API                            │
│  ├─ Forms: react-hook-form + Zod                                │
│  ├─ Gráficos: Recharts + Chart.js                               │
│  ├─ Tema: next-themes (light/dark)                              │
│  └─ HTTP: axios (interceptadores incluídos)                     │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                   API Gateway
                   (Next.js Routes)
                         │
┌────────────────────────┴─────────────────────────────────────────┐
│                      BACKEND (Server)                            │
├─────────────────────────────────────────────────────────────────┤
│  Next.js API Routes (Serverless)                                │
│  ├─ Auth: JWT (jose) + Google Sheets validação                  │
│  ├─ Validation: Zod (type-safe)                                 │
│  ├─ Data: Google Sheets API v4                                  │
│  ├─ Logging: Sheets secundária                                  │
│  └─ Export: SheetJS (xlsx)                                      │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                 Google Cloud API
                         │
┌────────────────────────┴─────────────────────────────────────────┐
│                      DATA (Sheets)                               │
├─────────────────────────────────────────────────────────────────┤
│  Google Sheets (Read & Write via Service Account)               │
│  ├─ Colaboradores (38 colunas, read-heavy)                      │
│  ├─ users_permitidos (RE, Nome, Perfil)                         │
│  ├─ Config (Datas, etapas, metas)                               │
│  ├─ Logs (Relatório de auditoria)                               │
│  ├─ Clinicas (9 clínicas fixa)                                  │
│  └─ Etapas (Configuração de sprints)                            │
└─────────────────────────────────────────────────────────────────┘

                   DEPLOYMENT
                   ─────────
                   Vercel (Frontend + Backend)
                   └─ Auto-redeployment (git push)
                   └─ SSL/TLS automático
                   └─ Analytics integrado
```

---

## 17. Casos de Teste & Regras Críticas

### CPF é Identificador Único

❌ **NUNCA** permitir duplicatas
✅ Validar em INSERT e UPDATE
✅ Normalizar com zero à esquerda
✅ Comparar limpas (remove máscara)

### Ordem de Colunas é Sagrada

❌ **NUNCA** reordenar colunas na planilha
✅ Manter índice 0-37 sempre igual
✅ COLUNAS_ORDEM array é source-of-truth

### Data debe sempre ser ISO YYYY-MM-DD

❌ DD/MM/YYYY, Excel serial, timestamps mistarados
✅ Converter tudo para YYYY-MM-DD antes de armazenar
✅ Aceitar várias entradas, normalize output

### Campos Enum são Rigorosos

❌ "Sim", "sim", "SIM", "Y", "1" 
✅ Apenas valores predefinidos
✅ Toast erro se inválido

### Métrica de "Admitido" tem 2 Regras

✅ DATA_ADMISSAO != null
✅ OU STATUS != "Pendente"

(Ler como OR — qualquer uma das duas conta)

### Gráfico Curva S é o Mais Crítico

- Se não está renderizando, checar:
  1. dataInicio e dataFim definidos em Config
  2. metaAdmissoes > 0
  3. DATA_ADMISSAO preenchido para admitidos
  4. Dates são ISO YYYY-MM-DD

### Importação pode ter Headers em Qualquer Ordem

✅ Fuzzy matching procura substring
✅ Case-insensitive
✅ Primeira match vence

---

## 18. Troubleshooting Comum

### "404 Not Found" em /api/dashboard

✅ Verificar se rota `/api/dashboard/route.ts` existe
✅ Validar JWT no cookie (401 vs 404)
✅ Checar baseURL do axios (`/api`)

### Planilha Não Atualiza no Dashboard

✅ React Query cache antigo → manual refetch
✅ Google Sheets API rate limit? (300req/min)
✅ Service Account sem permissão na Sheets?

### CPF com Zero à Esquerda Desapareceu

✅ Excel foi convertido para número → perdeu zeros
✅ Solução: Coluna CPF deve ser "Texto" na Sheets
✅ Ou sempre normalizar antes de INSERT

### Importação Falha com Erro 400

✅ Planilha tem headers diferentes → ajustar HEADER_ALIASES
✅ Dados inválidos → verificar ImportReport.erros[]
✅ CPF duplicado no arquivo → avisar user

---

## 19. Roadmap & Extensibilidade

### Features Futuras (Conceitual)

1. **Dashboard RH**: Gráficos de rotatividade, análise demográfica
2. **Dashboard Vendas**: Metricas de contrato, receita
3. **Notificações**: Email alerts para atrasos, pendências
4. **Mobile App**: React Native com mesmo backend
5. **API Pública**: GraphQL ou REST para integrações
6. **Webhooks**: Trigger automático em eventos Dashboard
7. **Multi-tenant**: Suporte a múltiplos projetos

### Como Adicionar Feature

1. Definir schema (Zod) em `src/lib/schemas.ts`
2. Adicionar rota API em `src/app/api/[feature]/route.ts`
3. Criar React Query hooks em componente ou novo arquivo
4. UI components em `src/components/`
5. Testes com exemplos de dados

---

## 20. Referências & Padrões

### Padrões Adotados

- **T3 Stack** (Next.js + TypeScript + Tailwind + tRPC-like): Inspiração
- **Server Components** (RSC): Leitura de Sheets no servidor
- **Client Components** ("use client"): Interatividade no browser
- **Composition over Inheritance**: shadcn/ui pattern
- **Strict Mode**: Zod + ESLint (strict ts config)

### Linhas de Defesa (Defense in Depth)

```
1. Frontend
   ├─ Validação input (HTML5 + React Hook Form)
   └─ Debouncing/throttling

2. Network
   └─ HTTPS obrigatório (Vercel)

3. Backend
   ├─ Auth middleware (JWT)
   ├─ Validação Zod
   ├─ Rate limiting (Vercel)
   └─ SQL injection N/A (Sheets não tem SQL)

4. Data
   └─ Google Sheets (permissões granulares por conta)
```

---

## 21. Logs & Auditoria

### Sistema de Logs

Tabela **logs** em Google Sheets:

```
TIMESTAMP | USUARIO | ACAO       | DETALHES          | CPF_COLABORADOR
2024-01-15 09:30:00 | 12345 | LOGIN       | IP: 192.168.1.1 | null
2024-01-15 09:31:22 | 12345 | ADICIONAR   | Novo COL         | 12345678901
2024-01-15 09:35:15 | 12345 | EDITAR      | ASO Apto         | 12345678901
2024-01-15 09:40:00 | 12345 | IMPORTAR    | 50 linhas        | null
2024-01-15 09:42:30 | 12345 | LOGOUT      | Fim sessão       | null
```

**Ações registradas:**
- LOGIN, LOGOUT
- ADICIONAR, EDITAR, REMOVER (colaborador)
- IMPORTAR, EXPORTAR
- CONFIG (mudança de settings)

**Função helper:**
```typescript
await logAdicionar(cpf);        // CPF_COLABORADOR
await logEditar(cpf);
await logRemover(cpf);
await logImportar(qtdLinhas);   // null em CPF
await logExportar(qtdLinhas);
await logConfig(mudancas);
```

---

## 22. Resumo de Responsabilidades

| Camada | Responsabilidade |
|--------|------------------|
| **Frontend** | Renderizar UI, validação UX, requisições HTTP, gerenciamento local |
| **Backend** | Autenticação, autorização, lógica de negócio, validação Zod, logs |
| **Google Sheets** | Armazenamento de dados persistentes (tabelas normalizadas) |
| **Vercel** | Hospedagem, SSL, analytics, auto-deploy |

---

## 23. 🚨 CÓDIGO OBSOLETO E PENDENTE DE REVISÃO

### ⚠️ CRÍTICO: Tipos Duplicados em `axios.ts` vs `schemas.ts`

**Localização**: `src/lib/axios.ts` linhas 68-159
**Severidade**: 🔴 ALTO
**Problema**:
- Interface `Colaborador` duplicada em `axios.ts` (68-114)
- Já existe `ColaboradorSchema` em `schemas.ts` com types mais robustos
- Interface `User` duplicada (154-158)
- Interface `DashboardData` duplicada (179-284)
- Causa inconsistência entre camadas e dificuldade em manutenção

**Código a Remover/Substituir**:
```typescript
// ❌ REMOVER ESTAS INTERFACES DE axios.ts:
export interface Colaborador { ... }     // linhas 68-114
export interface User { ... }             // linhas 154-158
export interface DashboardData { ... }   // linhas 179-284
export interface EtapaConfig { ... }     // linhas 294-300
export interface ConfigData { ... }      // linhas 302-317
```

**Ação Recomendada**:
```typescript
// ✅ USAR IMPORTS DE schemas.ts:
import {
  Colaborador,
  Config as ConfigData,
  User,
  EtapaConfig
} from "@/lib/schemas";
```

**Impacto**: Reduz linhas duplicadas, facilita manutenção, fonte única de verdade para tipos.

---

### ⚠️ ALTO: Inconsistência de Naming - snake_case vs UPPERCASE

**Localização**:
- `src/lib/schemas.ts` linha 240 (colaboradores_previstos — snake_case)
- `src/lib/axios.ts` linha 314 (COLABORADORES_PREVISTOS — UPPERCASE)

**Problema**:
- ConfigData usa UPPERCASE para compatibilidade com Google Sheets
- Mas banco Supabase usa snake_case
- Cria confusão ao mapear entre camadas

**Ação Recomendada**:
```typescript
// Padronizar em schemas.ts como snake_case (padrão Supabase)
export const ConfigSchema = z.object({
  // ... outros campos
  colaboradores_previstos: z.coerce.number().positive().optional(),
  orcado_suprimentos: z.coerce.number().nonnegative().optional(),
});

// Em axios.ts, criar helper de transformação:
const configToApi = (config: Config) => ({
  ...config,
  COLABORADORES_PREVISTOS: config.colaboradores_previstos,
});
```

---

### ⚠️ MÉDIO: Console.logs em Produção

**Localização**:
- `src/contexts/AuthContext.tsx` linhas 40, 43, 47, 66, 68, 72, 78
- `src/lib/axios.ts` linhas 33, 50, 57

**Problema**:
```typescript
// ❌ DEIXA LOG EXPOSTO EM PRODUÇÃO
console.log("[AuthContext] Verificando sessão...");
console.error("[AuthContext] Erro no login:", err);
```

**Ação Recomendada**:
```typescript
// ✅ CONDICIONAR A NODE_ENV
if (process.env.NODE_ENV === "development") {
  console.log("[AuthContext] Debug message");
}

// OU usar logger centralizado
import { log } from "@/lib/logger";
log.debug("[AuthContext]", "Verificando sessão");
```

**Impacto**: Evita exposição de info sensível no browser console.

---

### ⚠️ MÉDIO: Função `toLowerKeys()` Duplicada

**Localização**: `src/app/api/rh/colaboradores/route.ts` linhas 29-33
**Problema**:
```typescript
// Função genérica que deveria estar centralizada
function toLowerKeys(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]),
  );
}
```
- Provavelmente duplicada em outras rotas (`seguranca/fits`, `logistica/controle`)
- Viola DRY (Don't Repeat Yourself)

**Ação Recomendada**:
1. Mover para `src/lib/import-utils.ts`
2. Exportar função centralizada
3. Remover de routes

```typescript
// ✅ Em import-utils.ts
export function toLowerKeys(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]),
  );
}

// ✅ Em routes
import { toLowerKeys } from "@/lib/import-utils";
```

---

### 🟡 MÉDIO: Helper Function `isEmpty()` Duplicada

**Localização**: `src/app/api/rh/colaboradores/route.ts` linhas 35-37
**Problema**:
```typescript
function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}
```
- Função trivial mas duplicada em várias rotas
- Não existe em `utils` centralizado

**Ação Recomendada**:
```typescript
// Adicionar a import-utils.ts ou utils.ts
export const isEmpty = (v: unknown): boolean =>
  v === null || v === undefined || v === "";
```

---

### 🟡 BAIXO: Arquivo `proxy.ts` Não Documentado

**Localização**: `src/proxy.ts`
**Problema**:
- Sem referência no código
- Sem commit recente mencionando seu propósito
- Pode ser experimentação antiga

**Ação Recomendada**:
```bash
# Verificar se arquivo é realmente usado
grep -r "from.*proxy" src/
grep -r "import.*proxy" src/

# Se sem referências → REMOVER
rm src/proxy.ts
```

---

### 🟡 BAIXO: Supabase Client Novo Sem Documentação

**Localização**: `src/lib/supabase.ts` (novo arquivo, não está em contexto anterior)
**Problema**:
- Arquivo novo não tem documentação
- Pode haver conflito com `createServerClient()` usado em routes
- Não claro quando usar `supabase.ts` vs `createServerClient()`

**Ação Recomendada**:
1. Documentar a diferença:
   - `createServerClient()` → Server-side (API routes)
   - `supabase.ts` → Client-side (components)
2. Consolidar se possível
3. Adicionar comentário no arquivo

---

### 🟡 BAIXO: Novos Componentes Não Integrados

**Localização**:
- `src/components/export-button.tsx` (novo)
- `src/components/sheet-upload.tsx` (novo)
- `src/components/ui/switch.tsx` (novo)

**Problema**:
- Não há referência clara de onde são usados
- Podem ser duplicados de funcionalidade existente (ImportModal, EditColaboradorModal)
- Risco de funcionalidades desincronizadas

**Ação Recomendada**:
```bash
# Verificar referências
grep -r "export-button" src/
grep -r "sheet-upload" src/
grep -r "import.*Switch" src/

# Se sem uso → considerar remover ou integrar
# Se em uso → adicionar comentário explicando propósito
```

---

### 🟢 BAIXO: Falta Testes Unitários

**Problema**:
- Nenhum arquivo `.test.ts` ou `.spec.ts` encontrado
- Schemas Zod não têm testes de validação
- Funções críticas (date-utils, import-utils, curva-s) sem cobertura

**Impacto**: Risco de regressão em refatoração

**Ação Recomendada**:
```bash
# Adicionar Jest/Vitest
npm install --save-dev vitest @testing-library/react

# Arquivos de teste críticos:
src/lib/schemas.test.ts           # Validação Zod
src/lib/date-utils.test.ts        # Conversão de datas
src/lib/import-utils.test.ts      # Parsers de planilha
src/lib/curva-s.test.ts           # Cálculos de sigmoide
src/contexts/AuthContext.test.tsx # Fluxo de autenticação
```

---

### 🟢 BAIXO: README Obsoleto/Incompleto

**Localização**: `README.md` (34KB, muito genérico)
**Problema**:
- Documentação genérica do Next.js
- Não inclui setup específico do RefuncApp (Supabase, Google Sheets, JWT)
- Sem instruções de ambiente

**Ação Recomendada**:
```markdown
# RefuncApp

## Setup Local

### 1. Clonar repositório
git clone ...
cd refuncapp-web

### 2. Instalar dependências
npm install

### 3. Configurar variáveis de ambiente
cp .env.example .env.local

### 4. Popular Supabase
# Schema em docs/supabase-schema.sql
psql -h ... -d ... < docs/supabase-schema.sql

### 5. Rodar em desenvolvimento
npm run dev
```

---

### 📊 Resumo de Ações Prioritizadas

| Prioridade | Item | Estimativa | Impacto |
|-----------|------|-----------|--------|
| 🔴 CRÍTICO | Remover tipos duplicados em axios.ts | 1-2h | Alto (manutenção) |
| 🔴 CRÍTICO | Consolidar naming (snake vs UPPERCASE) | 2-3h | Alto (bugs futuros) |
| 🟡 ALTO | Remover console.logs de produção | 30min | Médio (segurança) |
| 🟡 ALTO | Centralizar funções duplicadas (toLowerKeys, isEmpty) | 1h | Médio (manutenção) |
| 🟢 MÉDIO | Investigar proxy.ts + componentes novos | 30min | Baixo (limpeza) |
| 🟢 MÉDIO | Adicionar testes básicos (schemas, utils) | 4-8h | Alto (confiança) |
| 🟢 BAIXO | Atualizar README com setup RefuncApp | 1h | Médio (onboarding) |

---

## 23. Conclusão

RefuncApp é um sistema bem arquitetado, centrado em dados no Supabase (migração de Google Sheets) com frontend moderno em Next.js. Todos os cálculos matemáticos (Curva S, métricas, agregações) são determinísticos e reutilizáveis. O sistema é facilmente extensível para novas features via novos endpoints e componentes React.

**Principais características:**
✅ Autenticação JWT segura
✅ Validação Zod rigorosa
✅ Cache React Query inteligente
✅ Gráficos dinâmicos (Recharts)
✅ Importação/Exportação XLSX
✅ Auditoria completa (Logs)
✅ Dark mode integrado
✅ Deployment automático (Vercel)
✅ Domínios isolados (RH, Logística, Segurança, Suprimentos)

**Próximas Ações Essenciais:**
1. ✅ Remover tipos duplicados (axios.ts)
2. ✅ Consolidar naming de campos
3. ✅ Remover console.logs de produção
4. ✅ Adicionar testes unitários
5. ✅ Documentar novos componentes/arquivos
