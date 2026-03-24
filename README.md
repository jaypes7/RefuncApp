<div align="center">

# 🚀 REFUNC APP

**Sistema Inteligente de Gestão de Colaboradores para Projetos de Implantação**

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2.3-61dafb?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-0ea5e9?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Version](https://img.shields.io/badge/Version-0.1.0-blue)
![Status](https://img.shields.io/badge/Status-Em%20Desenvolvimento-yellow)

[Características](#-características) • [Instalação](#-instalação) • [Como Usar](#-como-usar) • [Documentação](#-documentação) • [Contribuindo](#-contribuindo)

</div>

---

## 📋 Sobre o Projeto

**REFUNC APP** é uma solução empresarial para centralizar e automatizar o controle do ciclo completo de onboarding de colaboradores em projetos de implantação e construção. 

O sistema gerencia desde o cadastro inicial até a liberação para operação em campo, com acompanhamento em tempo real de etapas administrativas, métricas executivas e geração de relatórios integrados com **Google Sheets**.

### 🎯 Objetivo Principal

Eliminar silos de informação entre departamentos (RH, Logística, Segurança) através de:
- ✅ Centralização de dados de colaboradores
- 📊 Dashboards executivos com métricas em tempo real
- 🔄 Automação do ciclo de onboarding
- 📈 Acompanhamento de prazos e metas

---

## ✨ Características

### 📊 Dashboards Inteligentes
- **Dashboard Geral**: Visão consolidada de todos os colaboradores e etapas
- **Dashboard RH**: Análise demográfica dos colaboradores
- **Dashboard Logística**: Status de hospedagem e transporte
- **Dashboard Suprimentos**: Requisições e ordens de compra
- **Curva S**: Visualização do progresso do projeto vs. planejado

### 👥 Gestão de Colaboradores
- 📝 Cadastro completo com **58 campos** estruturados
- 🔍 Busca avançada e filtros dinâmicos
- 📤 Importação em lote via **XLSX** com validação de duplicidades
- 📥 Exportação de dados em tempo real
- 🚦 Acompanhamento de status e etapas
- ♿ Interface acessível e responsiva

### ⚙️ Configurações Avançadas
- 🏥 Gerenciamento de clínicas credenciadas
- 🏨 Configuração de hotéis e vagas
- 👤 Controle de usuários permitidos
- 📋 Definição dinâmica de etapas do projeto
- 📅 Cronograma e duração de cada fase
- 📊 Metas e métricas do projeto

### 🔐 Segurança e Autenticação
- 🔑 Autenticação via JWT
- 🛡️ Endpoints protegidos
- 📝 Logs de auditoria completos
- 👥 Sistema de roles e permissões (planejado)

---

## 🛠️ Stack Tecnológico

### Frontend
| Tecnologia | Versão | Propósito |
|---|---|---|
| **Next.js** | 16.1.6 | Framework meta-framework React |
| **React** | 19.2.3 | Biblioteca UI |
| **TypeScript** | 5 | Tipagem estática |
| **Tailwind CSS** | 4 | Estilização utilitária |

### UI & Componentes
| Tecnologia | Propósito |
|---|---|
| **shadcn/ui** | Componentes reutilizáveis |
| **Radix UI** | Primitivos acessíveis |
| **Lucide React** | Ícones vetoriais |
| **Framer Motion** | Animações fluidas |

### Gráficos e Dados
| Tecnologia | Propósito |
|---|---|
| **Recharts** | Gráficos responsivos |
| **Chart.js** | Visualizações avançadas |
| **XLSX** | Importação/exportação Excel |
| **React Query** | Gerenciamento de estado async |

### Backend & Integração
| Tecnologia | Propósito |
|---|---|
| **Google Sheets API v4** | Banco de dados em planilha |
| **Axios** | Cliente HTTP |
| **Zod** | Validação e schemas |
| **Jose** | JWT para autenticação |

### Formulários & Validação
| Tecnologia | Propósito |
|---|---|
| **React Hook Form** | Gerenciamento de formulários |
| **Zod** | Schema validation |
| **React IMask** | Máscaras de input |

---

## 📊 Estrutura de Dados

### Campos de Colaboradores (58 campos distribuídos em 4 grupos)

<details>
<summary><b>👤 Dados Pessoais (10 campos)</b></summary>

- RE, **NOME**, **CPF**, FUNÇÃO, DT_NASC, SEXO, TELEFONE, MUNICÍPIO, UF, ENDEREÇO

</details>

<details>
<summary><b>🏥 RH e Saúde (10 campos)</b></summary>

- STATUS_ADM, DATA_ADMISSÃO, CONTRATO_TIPO, PRÉ_ADMISSÃO, ENVIADO_RH, CLÍNICA, DATA_EXAME, ASO_STATUS, TREINAMENTO, PONTO_BATIDA

</details>

<details>
<summary><b>🏨 Logística (11 campos)</b></summary>

- HOTEL, QUARTO, TIPO_APTO, CHECKIN_DATA, TURNO_SEMANA, ROTA_TRANSPORTE, TIPO_TRANSPORTE, COORDENADOR, SUPERVISOR, ENCARREGADO, LOCAL_TRABALHO

</details>

<details>
<summary><b>📦 Suprimentos (7 campos)</b></summary>

- VR_STATUS, UNIFORME_TAM, EPI_STATUS, CRACHÁ, PORTAL, CENTRO_CUSTO, OBS_GERAL

</details>

---

## 🚀 Instalação

### Pré-requisitos

- **Node.js** 18+ e **npm** ou **yarn**
- **Git**
- **Credenciais Google Sheets API** (para integração de dados)

### Passos de Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/refuncapp-web.git
cd refuncapp-web
```

2. **Instale as dependências**
```bash
npm install
# ou
yarn install
```

3. **Configure as variáveis de ambiente**

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Google Sheets API
NEXT_PUBLIC_GOOGLE_SHEET_ID=seu_sheet_id
GOOGLE_SHEETS_API_KEY=sua_chave_api

# Autenticação JWT
JWT_SECRET=sua_chave_secreta_jwt

# URL da aplicação
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Banco de dados (Sheets)
DATABASE_TYPE=google_sheets
```

4. **Execute o servidor de desenvolvimento**
```bash
npm run dev
```

Acesse a aplicação em [http://localhost:3000](http://localhost:3000)

---

## 📖 Como Usar

### 🏠 Dashboard Principal

Ao fazer login, você terá acesso aos dashboards específicos:

- **Dashboard Geral**: Visão consolidada com gráficos gerais
- **Dashboard RH**: Análise demográfica dos colaboradores
- **Dashboard Logística**: Status de hospedagem e transporte
- **Dashboard Suprimentos**: Requisições e ordens de compra

### 👥 Central de Colaboradores

A seção **Central** permite:

#### Importação em Lote
- Faça upload de arquivo XLSX com dados de colaboradores
- Sistema valida duplicidades (CPF)
- Mesclagem inteligente com dados existentes

#### Cadastro Manual
- Preenchimento por etapas (waterfall)
- Validação em tempo real
- Máscaras de input para CPF, telefone, etc.

#### Busca e Filtros
- Busca full-text por nome e CPF
- Filtros por status, função, departamento
- Exportação dos resultados

### ⚙️ Configurações

Na seção **Configurações**, configure:

- **Clínicas**: Adicione clínicas credenciadas
- **Hotéis**: Defina hotéis e vagas disponíveis
- **Cronograma**: Configure duração das etapas
- **Usuários**: Gerencie acessos
- **Projeto**: Defina metas e datas

---

## 📁 Estrutura do Projeto

```
refuncapp-web/
├── src/
│   ├── app/
│   │   ├── api/                    # Rotas API
│   │   │   ├── auth/              # Autenticação
│   │   │   ├── colaboradores/     # CRUD colaboradores
│   │   │   ├── config/            # Configurações
│   │   │   └── dashboard/         # Dados para dashboards
│   │   ├── central/               # Página Central (CRUD)
│   │   ├── configuracoes/         # Página Configurações
│   │   ├── dashboard/             # Páginas Dashboards
│   │   └── login/                 # Página Login
│   ├── components/                # Componentes React
│   │   ├── ui/                   # Componentes UI (shadcn)
│   │   └── modals/               # Modais
│   ├── contexts/                 # Context API
│   ├── hooks/                    # Custom hooks
│   ├── lib/                      # Utilitários
│   │   ├── auth.ts              # Autenticação
│   │   ├── axios.ts             # Cliente HTTP
│   │   ├── schemas.ts           # Validações Zod
│   │   └── project-math.ts      # Cálculos do projeto
│   └── services/                # Serviços (API integration)
├── public/                       # Assets estáticos
├── package.json
├── tsconfig.json
├── next.config.ts
└── tailwind.config.ts
```

---

## 🔄 Fluxo de Dados

```
XLSX Input ──→ Validação ──→ Google Sheets ──→ Dashboard Métricas ──→ Visualização
  (Upload)    (Duplicidade) (Colaboradores)      (+ Gráficos)        (UI)
                   ↑                                      ↓
                   └──── Entrada Manual (Cadastro) ────→ Exportação XLSX
```

---

## 📊 Métricas Principais

O sistema acompanha automaticamente:

| Métrica | Descrição |
|---------|-----------|
| **Cadastrados** | CPF + NOME preenchidos |
| **Admitidos** | Cadastrado + DATA_ADMISSÃO preenchida |
| **Liberados** | Admitido + (PORTAL = Liberado OU ASO = Apto) |
| **Em Treinamento** | Liberado + TREINAMENTO = Em Andamento |
| **Portal Liberado** | Status de acesso ao portal do cliente |

---

## 🔐 Autenticação

O sistema utiliza **JWT (JSON Web Tokens)** para autenticação:

```
1. Login → Credenciais validadas
2. Token JWT gerado → Armazenado no cliente
3. Requisições → Token no header Authorization
4. Validação → Server verifica assinatura do token
5. Renovação → Token renovado a cada requisição
```

---

## 📝 Logs de Auditoria

Todas as ações são registradas em log:

| Campo | Descrição |
|-------|-----------|
| **TIMESTAMP** | Data/hora exata da ação |
| **USUARIO** | Email do usuário |
| **ACAO** | ADICIONAR, EDITAR, REMOVER, IMPORTAR, CONFIG |
| **DETALHES** | Descrição legível da ação |
| **CPF_COLABORADOR** | CPF do colaborador envolvido |

---

## 🎯 Roadmap de Features

### 🔴 Prioridade Máxima (Em Desenvolvimento)
- ✅ Dashboards específicos (RH, Logística, Suprimentos)  
- 🔄 Dropdown na aba Dashboard para filtrar visões
- 🔄 Toggle para recolher sidebar

### 🟡 Prioridade Média (Próximas Semanas)
- [ ] Revisão de rotas de salvamento de dados
- [ ] Integração completa com Google Sheets
- [ ] Logs com timestamp correto

### 🔵 Prioridade Baixa (Roadmap Futuro)
- [ ] Sistema avançado de roles e permissões
- [ ] Notificações por email
- [ ] Integração com sistemas externos

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. **Fork** o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Faça commit das mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Faça push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um **Pull Request**

### Padrões de Código

- Use **TypeScript** em todos os arquivos
- Siga o padrão de código do ESLint
- Escreva componentes funcionais com hooks
- Use **Zod** para validação de dados
- Documente funções complexas

### Executar Testes

```bash
npm run lint
npm run build
```

---

## 🐛 Reportando Bugs

Encontrou um bug? Por favor:

1. Verifique se o bug já foi reportado em [Issues](../../issues)
2. Se não, crie um novo issue com:
   - Descrição clara do bug
   - Passos para reproduzir
   - Comportamento esperado
   - Screenshots (se aplicável)
   - Ambiente (SO, navegador, versão do Node)

---

## 📚 Documentação Adicional

- [Apresentação Executiva](apresentacao.md) - Visão geral do projeto
- [Contexto Técnico](contexto.md) - Formulários e campos detalhados
- [Planejamento de Features](features.md) - Roadmap completo
- [Estrutura da Aplicação](estrutura.md) - Detalhes de arquitetura
- [Métricas e KPIs](metricas.md) - Indicadores de desempenho

---

## 📄 Licença

Este projeto está licenciado sob a **Licença MIT** - veja o arquivo [LICENSE](LICENSE) para detalhes.

```
MIT License © 2024-presente REFUNC APP
Você é livre para usar, modificar e distribuir este software.
```

---

## 📞 Suporte e Contato

- 📧 **Email**: [seu-email@example.com](mailto:seu-email@example.com)
- 🐛 **Issues**: [GitHub Issues](../../issues)
- 📝 **Discussões**: [GitHub Discussions](../../discussions)

---

## 🙏 Agradecimentos

Agradecimentos especiais a:

- [Next.js](https://nextjs.org) - Framework excepcional
- [Vercel](https://vercel.com) - Plataforma de deployment
- [shadcn/ui](https://ui.shadcn.com) - Componentes fantásticos
- [Tailwind CSS](https://tailwindcss.com) - Estilização poderosa
- Toda a comunidade open source

---

<div align="center">

### ⭐ Se este projeto foi útil, considere dar uma estrela!

[![GitHub stars](https://img.shields.io/github/stars/seu-usuario/refuncapp-web?style=social)](https://github.com/jaypes7/RefuncApp)
[![GitHub followers](https://img.shields.io/github/followers/seu-usuario?style=social)](https://github.com/jaypes7)

**Made with ❤️ usando Next.js + TypeScript + Tailwind CSS**

</div>
