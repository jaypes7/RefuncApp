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

O sistema gerencia desde o cadastro inicial até a liberação para operação em campo, com acompanhamento em tempo real de etapas administrativas, métricas executivas e geração de relatórios integrados com **Supabase**.

### 🎯 Objetivo Principal

Eliminar silos de informação entre departamentos (RH, Logística, Segurança) através de:
- ✅ Centralização de dados de colaboradores em banco de dados seguro
- 📊 Dashboards executivos com métricas em tempo real
- 🔄 Automação do ciclo de onboarding
- 📈 Acompanhamento de prazos e metas
- 📸 Documentação e registro fotográfico

---

## ✨ Características

### 📊 Dashboards Inteligentes
- **Dashboard Geral**: Visão consolidada de todos os colaboradores e etapas
- **Dashboard RH**: Análise demográfica dos colaboradores
- **Dashboard Logística**: Status de hospedagem e transporte
- **Dashboard Suprimentos**: Requisições e ordens de compra
- **Relatório Executivo**: Visualizações avançadas com curva S e métricas
- **Curva S**: Visualização do progresso do projeto vs. planejado

### 👥 Gestão de Colaboradores
- 📝 Cadastro completo com **58 campos** estruturados
- 🔍 Busca avançada e filtros dinâmicos
- 📤 Importação em lote via **XLSX** com validação de duplicidades
- 📥 Exportação de dados em tempo real
- 🚦 Acompanhamento de status e etapas
- 📸 Registros fotográficos de mobilizações
- 📋 Checklists de mobilização
- 💬 Sistema de comentários com editor rich-text
- ♿ Interface acessível e responsiva

### ⚙️ Configurações Avançadas
- 🏥 Gerenciamento de clínicas credenciadas
- 🏨 Configuração de hotéis e vagas
- 👤 Controle de usuários e acesso restrito
- 📋 Definição dinâmica de etapas do projeto
- 📅 Cronograma e duração de cada fase
- 📊 Metas e métricas do projeto
- 🔐 Gerenciamento de permissões e segurança

### 🔐 Segurança e Autenticação
- 🔑 Autenticação via Supabase Auth + JWT
- 🛡️ Row Level Security (RLS) no banco de dados
- 📝 Logs de auditoria completos
- 👥 Sistema de roles e permissões
- 🔒 Endpoints protegidos com validação de token

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
| **Supabase** | Banco de dados PostgreSQL + autenticação |
| **Axios** | Cliente HTTP |
| **Zod** | Validação e schemas |
| **Jose** | JWT para autenticação |
| **Vercel Analytics** | Métricas de performance e uso |

### Formulários, Validação & Edição
| Tecnologia | Propósito |
|---|---|
| **React Hook Form** | Gerenciamento de formulários |
| **Zod** | Schema validation |
| **React IMask** | Máscaras de input |
| **TipTap** | Editor rich-text para comentários e relatórios |
| **jsPDF** | Geração de PDFs |
| **html-to-image** | Conversão de HTML para imagem |

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
- **Credenciais Supabase** (para banco de dados e autenticação)

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
# Supabase
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_chave_de_servico_supabase

# Autenticação JWT (opcional, se usar JWT customizado)
JWT_SECRET=sua_chave_secreta_jwt

# URL da aplicação
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> Obtenha as credenciais Supabase em: https://app.supabase.com/projects

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
- **Relatório Executivo**: Métricas avançadas com curva S

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
### 📸 Registros Fotográficos

Tire e organize fotos de mobilizações:

- Upload de fotos em lote
- Associação com colaboradores
- Organização por projeto e etapa
- Visualização em galeria

### 📋 Checklists

Acompanhe checklist de mobilização:

- Itens configuráveis por projeto
- Atribuição a colaboradores
- Histórico de alterações
- Status em tempo real

### 💬 Comentários e Documentação

Sistema de comentários com editor rich-text:

- Editor visual com formatação
- Anexação de imagens e documentos
- Histórico de conversas
- Notificações de menções


---

## 📁 Estrutura do Projeto

```
refuncapp-web/
├── src/
│   ├── app/
│   │   ├── api/                         # Rotas API Next.js
│   │   │   ├── auth/                   # Autenticação
│   │   │   ├── colaboradores/          # CRUD colaboradores
│   │   │   ├── banco-talentos/         # Banco de talentos
│   │   │   ├── checklist-mobilizacao/  # Checklists
│   │   │   ├── registros-fotograficos/ # Fotos
│   │   │   ├── comentarios-cliente/    # Comentários
│   │   │   ├── config/                 # Configurações
│   │   │   ├── dashboard/              # Dados para dashboards
│   │   │   ├── relatorio/              # Relatórios
│   │   │   ├── logs/                   # Auditoria
│   │   │   └── export/                 # Exportação
│   │   ├── central/                    # Página Central (CRUD)
│   │   ├── configuracoes/              # Página Configurações
│   │   ├── dashboard/                  # Páginas Dashboards
│   │   ├── relatorio-executivo/        # Relatório Executivo
│   │   ├── registros-fotograficos/     # Registros Fotográficos
│   │   ├── checklist-mobilizacao/      # Checklists
│   │   └── login/                      # Página Login
│   ├── components/                     # Componentes React
│   │   ├── ui/                        # Componentes UI (shadcn)
│   │   ├── tv/                        # Componentes TV/Tela Grande
│   │   ├── modals/                    # Modais
│   │   └── relatorio-*.tsx            # Componentes de Relatório
│   ├── contexts/                      # Context API
│   │   ├── AuthContext.tsx           # Autenticação
│   │   └── FilterContext.tsx         # Filtros
│   ├── hooks/                        # Custom hooks
│   ├── lib/                          # Utilitários
│   │   ├── auth.ts                  # Autenticação Supabase
│   │   ├── axios.ts                 # Cliente HTTP
│   │   ├── supabase.ts              # Cliente Supabase
│   │   ├── schemas.ts               # Validações Zod
│   │   ├── project-math.ts          # Cálculos do projeto
│   │   ├── date-utils.ts            # Utilitários de data
│   │   └── utils.ts                 # Utilitários gerais
│   └── services/                    # Serviços (API integration)
├── supabase/
│   └── migrations/                  # Migrações de banco de dados
├── public/                          # Assets estáticos
│   └── geo/                        # Dados geográficos
├── package.json
├── tsconfig.json
├── next.config.ts
└── tailwind.config.ts
```

---

## 🔄 Fluxo de Dados

O sistema utiliza **Supabase Auth** com **JWT** para autenticação:

```
1. Login → Credenciais validadas no Supabase
2. Token JWT gerado → Armazenado no cliente + localStorage
3. Requisições → Token no header Authorization
4. Validação → Server verifica assinatura e RLS
5. Refresh → Token automaticamente renovado pelo Supabase
6. Logout → Session encerrada no servidor
```

### Row Level Security (RLS)

Todas as tabelas possuem RLS habilitado, garantindo que:
- Usuários só acessem dados que têm permissão
- Operações CRUD são filtradas por usuário/role
- Segurança em múltiplos níveis (banco de dados + aplicação)

---

## 📝 Logs de Auditoria

Todas as ações são registradas em log no banco de dados:

| Campo | Descrição |
|-------|-----------|
| **TIMESTAMP** | Data/hora exata da ação (UTC) |
| **USUARIO_ID** | ID do usuário que realizou a ação |
| **USUARIO_EMAIL** | Email do usuário |
| **ACAO** | ADICIONAR, EDITAR, REMOVER, IMPORTAR, EXPORTAR |
| **TABELA** | Tabela afetada |
| **REGISTRO_ID** | ID do registro modificado |
| **DADOS_ANTERIORES** | Snapshot dos dados antes da mudança |
| **DADOS_NOVOS** | Snapshot dos dados após a mudança |
| **IP_ADDRESS** | Endereço IP da requisição |
| **STATUS** | Sucesso ou erro |

---

## 🎯 Roadmap de Features

### 🔴 Prioridade Máxima (Em Desenvolvimento)
- ✅ Dashboards específicos (RH, Logística, Suprimentos)  
- ✅ Registros fotográficos de mobilizações
- ✅ Checklists de mobilização
- ✅ Sistema de comentários com editor rich-text
- ✅ Relatório executivo com curva S
- 🔄 Otimizações de performance e SEO
- 🔄 Melhorias na experiência do usuário

### 🟡 Prioridade Média (Próximas Semanas)
- [ ] Sistema avançado de notificações (email/SMS)
- [ ] Integração com sistemas externos (ERP)
- [ ] Backup automático de dados
- [ ] API pública para integrações
- [ ] Dashboard mobile otimizado

### 🔵 Prioridade Baixa (Roadmap Futuro)
- [ ] Inteligência artificial para previsões (ML)
- [ ] Análise preditiva de riscos
- [ ] Automação workflow com IA
- [ ] Integração com calendário (Google/Outlook)
- [ ] Mobile app nativo (iOS/Android)ação |
| ✅ Registros fotográficos de mobilizações
- ✅ Checklists de mobilização
- ✅ Sistema de comentários com editor rich-text
- ✅ Relatório executivo com curva S
- 🔄 Otimizações de performance e SEO
- 🔄 Melhorias na experiência do usuário

### 🟡 Prioridade Média (Próximas Semanas)
- [ ] Sistema avançado de notificações (email/SMS)
- [ ] Integração com sistemas externos (ERP)
- [ ] Backup automático de dados
- [ ] API pública para integrações
- [ ] Dashboard mobile otimizado

### 🔵 Prioridade Baixa (Roadmap Futuro)
- [ ] Inteligência artificial para previsões (ML)
- [ ] Análise preditiva de riscos
- [ ] Automação workflow com IA
- [ ] Integração com calendário (Google/Outlook)
- [ ] Mobile app nativo (iOS/Android)nas)
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

<div align="center">

### ⭐ Se este projeto foi útil, considere dar uma estrela!

[![GitHub stars](https://img.shields.io/github/stars/jaypes7/refuncapp?style=social)](https://github.com/jaypes7/RefuncApp)
[![GitHub followers](https://img.shields.io/github/followers/jaypes7?style=social)](https://github.com/jaypes7)

**Made with ❤️ usando Next.js + TypeScript + Tailwind CSS**

</div>
