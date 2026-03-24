# RefuncApp — Documento de Contexto Completo

## 1. Visão Geral

**RefuncApp** é um sistema de gestão de colaboradores para projetos de implantação/construção. O sistema gerencia o ciclo completo de onboarding — desde o cadastro até a liberação para treinamento e operação.

### Fluxo Principal
```
Recebe Planilha "Refunc" (XLSX)
    ↓
Input de Dados (Importação XLSX ou Manual por setor/etapa)
    ↓
Verificar Duplicidades (por CPF)
    ↓
Banco de Dados (dados processados)
    ↓
Dashboard Interativo + Exportar XLSX
```

---

## 2. Páginas do App

| Página | Função |
|--------|--------|
| **Central (CRUD)** | Cadastro manual por etapas (waterfall), importação/exportação XLSX, tabela com busca e filtros |
| **Dashboard** | Gráficos e métricas: cadastrados, admitidos, liberados, em treinamento, evolução por setor |
| **Admin** | Configuração do projeto (duração, etapas, metas), visualização de logs de atividades |

---

## 3. Estrutura de Dados — Planilha Colaboradores (38 colunas)

A ordem abaixo é a ordem real das colunas na planilha:

| # | Header Real | Nome Interno | Tipo | Descrição |
|---|-------------|-------------|------|-----------|
| 1 | IND | IND | texto | Indicador |
| 2 | STATUS | STATUS | select | Ativo, Pendente, Inativo, Desligado |
| 3 | ENVIADO RH | ENVIADO_RH | select | Sim, Não, Pendente |
| 4 | PESSOA | PESSOA | select | Física, Jurídica |
| 5 | REQ | REQ | texto | Número da requisição |
| 6 | VINCULADO | VINCULADO | texto | Vínculo |
| 7 | CARTA OFERTA | CARTA_OFERTA | select | Sim, Não, Pendente |
| 8 | COLAB. PEND. | COLAB_PEND | select | Sim, Não |
| 9 | EXAME | EXAME | select | Realizado, Agendado, Pendente |
| 10 | CLINICA | CLINICA | select (dinâmico) | Lista de clínicas cadastradas |
| 11 | DOCS | DOCS | select | Completo, Pendente, Incompleto |
| 12 | ASO | ASO | select | Apto, Inapto, Pendente |
| 13 | RPV | RPV | texto | RPV |
| 14 | PRÉ ADMISSÃO | PRE_ADMISSAO | select | Sim, Não, Pendente |
| 15 | MOB | MOB | select | Sim, Não, Pendente |
| 16 | OP | OP | texto | OP |
| 17 | DATA ADMISSÃO | DATA_ADMISSAO | data | Data de admissão |
| 18 | CONTRATO | CONTRATO | select | CLT, PJ, Temporário, Estagiário |
| 19 | PORTAL | PORTAL | select | Liberado, Pendente, Bloqueado |
| 20 | CRACHA | CRACHA | select | Emitido, Pendente |
| 21 | PONTO | PONTO | select | Cadastrado, Pendente |
| 22 | TREINAMENTO | TREINAMENTO | select | Concluído, Em Andamento, Pendente |
| 23 | REALIZAR TREINAMENTO | REALIZAR_TREINAMENTO | select | Sim, Não, Pendente |
| 24 | LOCAL TREINAMENTO | LOCAL_TREINAMENTO | texto | Local do treinamento |
| 25 | RE | RE | texto | Registro do empregado |
| 26 | NOME | NOME | texto | Nome completo (*obrigatório) |
| 27 | FUNÇÃO CLT | FUNCAO_CLT | texto | Função registrada |
| 28 | HISTOGRAMA | HISTOGRAMA | texto | Histograma |
| 29 | IDADE | IDADE | número | Idade (16-99) |
| 30 | DT NASC | DT_NASCIMENTO | data | Data de nascimento |
| 31 | CPF | CPF | texto (máscara) | CPF — **identificador único** (*obrigatório) |
| 32 | VR | VR | select | Ativo, Pendente |
| 33 | TERMINO | TERMINO | data | Data de término |
| 34 | PRORROGAÇÃO | PRORROGACAO | data | Data de prorrogação |
| 35 | DEMISSÃO | DEMISSAO | data | Data de demissão |
| 36 | MUNICIPIO | MUNICIPIO | texto | Município |
| 37 | UF | UF | select | Sigla do estado (AC...TO) |
| 38 | TELEFONE | TELEFONE | texto | Telefone com DDD |

### Outras Tabelas

**Config** — Configurações do projeto:
| Coluna | Descrição |
|--------|-----------|
| CHAVE | Nome da config (DIAS_TOTAIS_PROJETO, DATA_INICIO_PROJETO, ETAPA_ATUAL, META_ADMISSOES, ETAPAS_PROJETO, DURACAO_ETAPAS) |
| VALOR | Valor da configuração |
| DESCRICAO | Descrição legível |

**Logs** — Histórico de ações:
| Coluna | Descrição |
|--------|-----------|
| TIMESTAMP | Data/hora da ação |
| USUARIO | Email do usuário |
| ACAO | ADICIONAR, EDITAR, REMOVER, IMPORTAR, CONFIG |
| DETALHES | Descrição da ação |
| CPF_COLABORADOR | CPF envolvido |

**Clinicas** — Lista fixa:
| ID | Nome |
|----|------|
| 1 | ATEMTO - UBERABA |
| 2 | CARVALHO SAÚDE - S. B. CAMPOS |
| 3 | APTA SOLUÇÕES - CATALÃO |
| 4 | ASSA GESTÃO SALVADORBA |
| 5 | SÃO RAFAEL - ARACAJU |
| 6 | PROMEDIC - CUBATÃO |
| 7 | DUAL SAÚDE - DUQUE DE CAXIAS |
| 8 | ARESQ - VIT. CONQUISTA |
| 9 | GESTOR VIDA - IPATINGA |

---

## 4. Setores e Fluxo Waterfall

O cadastro manual segue um fluxo catarata (waterfall) em **8 etapas** sequenciais:

### 🔵 Setor RH
| Etapa | Nome | Campos |
|-------|------|--------|
| 1 | Dados Pessoais | CPF*, NOME*, DT_NASCIMENTO, IDADE, MUNICIPIO, TELEFONE, UF, PESSOA, IND |
| 2 | Contratual/Admissão | DATA_ADMISSAO, RE, FUNCAO_CLT, HISTOGRAMA, CARTA_OFERTA, CONTRATO, STATUS, ENVIADO_RH, VINCULADO, TERMINO, PRORROGACAO, DEMISSAO, PRE_ADMISSAO |
| 3 | Benefícios | DOCS, CRACHA, PONTO, VR |

### 🟡 Setor Logística
| Etapa | Nome | Campos |
|-------|------|--------|
| 4 | Deslocamento | MOB |
| 5 | Operacional | OP, REQ, COLAB_PEND |
| 6 | Sistemas | PORTAL |

### 🟢 Setor Segurança
| Etapa | Nome | Campos |
|-------|------|--------|
| 7 | Saúde Ocupacional | EXAME, ASO, CLINICA (lista dinâmica), RPV |
| 8 | Capacitação | TREINAMENTO, REALIZAR_TREINAMENTO, LOCAL_TREINAMENTO |

**Regras do Waterfall:**
- Etapa 1 exige CPF + NOME antes de avançar
- Demais etapas avançam livremente (botão "Continuar →")
- Botão "Salvar" disponível em qualquer etapa
- Botão "Voltar" retorna à etapa anterior

---

## 5. Dashboard — Métricas e Regras de Dependência

| # | Métrica | Regra |
|---|---------|-------|
| 1 | Cadastrados | CPF + NOME preenchidos |
| 2 | Admitidos | Cadastrado + DATA_ADMISSAO ou STATUS ≠ "Pendente" |
| 3 | Liberados | Admitido + MOB ou ASO preenchido |
| 4 | Em Treinamento | Liberado + TREINAMENTO em andamento |
| 5 | Precisam Treinamento | Liberado + sem TREINAMENTO |
| 6 | Portal Liberado | PORTAL ≠ vazio, "Não", "Pendente" |

### Gráficos
- **Curva de desenvolvimento**: Série temporal acumulada de admissões por dia
- **Evolução por setor**: % de preenchimento de cada fase (RH, Logística, Segurança)
- **Cards de métricas**: Dias do projeto, etapa atual, contadores acima

---

## 6. Funcionalidades Completas

### Central (CRUD)
- ✅ Tabela de colaboradores com colunas: Nome, CPF, Função, Status, progresso RH/Log/Seg
- ✅ Busca por nome ou CPF (com debounce)
- ✅ Filtros por status e setor
- ✅ Paginação (20 por página)
- ✅ Formulário waterfall com stepper visual por setor
- ✅ Importação XLSX com mapeamento de colunas
- ✅ Exportação XLSX
- ✅ Verificação de CPF duplicado
- ✅ Merge de dados (importação que preenche campos vazios)

### Dashboard
- ✅ Cards de métricas com contadores
- ✅ Dados do projeto (dias, etapa, progresso)
- ✅ Gráfico de curva de desenvolvimento (Chart.js)
- ✅ Gráfico de evolução por setor

### Admin
- ✅ Configuração: duração do projeto, etapas, metas de admissão
- ✅ Visualização de logs com filtros (data, usuário, ação)

---

## 7. Estratégia de Banco de Dados para Versão Web

### 🟢 Google Sheets API (RECOMENDADA — Gratuita)

**Como funciona:** Mantém os dados no Google Sheets, mas a aplicação web roda em um servidor próprio (Vercel, Netlify, etc.) e acessa a planilha via API.

```
App Web (Next.js/Vite) → Google Sheets API v4 → Planilha Google Sheets
```

**Prós:**
- 100% gratuito (quota generosa: 300 req/min por projeto)
- Dados continuam acessíveis pela planilha original
- O time pode ver/editar dados diretamente no Sheets se necessário
- Não precisa migrar dados

**Contras:**
- Latência maior (~200-500ms por request)
- Limite de ~10 milhões de células por planilha
- Não tem relações complexas (joins, foreign keys)

**Stack sugerida:**
- Frontend: Next.js ou Vite + React
- Autenticação: Google OAuth2 (via Service Account)
- API: Google Sheets API v4 (`googleapis` npm package)
- Deploy: Vercel (gratuito)

**Como integrar:**
1. Criar projeto no Google Cloud Console
2. Habilitar Google Sheets API
3. Criar Service Account e compartilhar a planilha com ela
4. Usar a library `googleapis` para ler/escrever

```javascript
// Exemplo de leitura
const { google } = require('googleapis');
const sheets = google.sheets({ version: 'v4', auth });
const res = await sheets.spreadsheets.values.get({
  spreadsheetId: 'SEU_ID',
  range: 'Colaboradores!A2:AL',
});
```

## 8. Arquitetura da Versão Web Proposta

```
refuncapp-web/
├── app/
│   ├── layout.tsx              # Layout raiz
│   ├── page.tsx                # Redirect para /central
│   ├── central/
│   │   └── page.tsx            # Página Central (CRUD)
│   ├── dashboard/
│   │   └── page.tsx            # Página Dashboard
│   ├── admin/
│   │   └── page.tsx            # Página Admin
│   └── api/
│       ├── colaboradores/
│       │   ├── route.ts        # GET (listar), POST (criar)
│       │   └── [cpf]/
│       │       └── route.ts    # GET, PUT, DELETE por CPF
│       ├── dashboard/
│       │   └── route.ts        # GET dados do dashboard
│       ├── config/
│       │   └── route.ts        # GET/PUT configurações
│       ├── logs/
│       │   └── route.ts        # GET logs
│       ├── clinicas/
│       │   └── route.ts        # GET clínicas
│       ├── import/
│       │   └── route.ts        # POST importar XLSX
│       └── export/
│           └── route.ts        # GET exportar XLSX
├── components/
│   ├── Navbar.tsx
│   ├── Modal.tsx
│   ├── FormWaterfall.tsx       # Formulário waterfall
│   ├── DataTable.tsx
│   └── Charts.tsx
├── lib/
│   ├── sheets.ts              # Google Sheets API wrapper
│   ├── auth.ts                # Configuração de autenticação
│   └── utils.ts               # CPF validation, formatação, etc.
├── .env.local                  # GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_KEY
└── package.json
```
