<div align="center">

# RefuncApp — ERP de Mobilização de Contratos

**Versão demonstrativa pública · Dados 100% fictícios**

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-0ea5e9?logo=tailwindcss)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[Sobre o projeto](#sobre-o-projeto) · [Stack](#stack) · [Rodar localmente](#rodar-localmente)

> ⚠️ **Esta é a branch `demo`** — versão sandbox para portfólio com dados 100% fictícios e sem integração com banco de dados real. A versão de produção usa Supabase + autenticação completa.

</div>

---

## Sobre o projeto

**RefuncApp** é um ERP web para gerenciar o ciclo completo de mobilização de colaboradores em projetos de implantação e construção industrial — desde o cadastro inicial até a operação em campo.

O sistema centraliza informações de RH, Logística, Segurança do Trabalho e Suprimentos em dashboards em tempo real, eliminando planilhas dispersas entre departamentos.

### O que este projeto demonstra

| Área | Implementação |
|---|---|
| **Autenticação** | JWT com cookie `httpOnly`, roles hierárquicos (admin/user/guest), rate limiting em login |
| **Autorização** | Middleware de roles em todas as API routes, Row Level Security no banco |
| **API Routes** | 77 endpoints Next.js com validação Zod, tratamento de erros padronizado |
| **Arquitetura** | Repository pattern (demoRepository), separação clara entre camadas |
| **Frontend** | React Query para cache/estado assíncrono, React Hook Form + Zod, dark mode |
| **Importação** | Upload e parsing de planilhas XLSX com fuzzy matching de headers |
| **Exportação** | Geração de PDF e XLSX no servidor |
| **Dashboards** | 5 dashboards especializados com Recharts e Chart.js |
| **UX** | Modo TV/Kiosk com rotação automática, relatório executivo com Curva S |

---

## Acesso à demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| **Administrador** | `admin@demo.com` | `demo123` |
| **Coordenador** | `coordenador@demo.com` | `demo123` |
| **Analista de RH** | `rh@demo.com` | `demo123` |

> Dados fictícios: CPFs com prefixo 999 (inválidos na Receita Federal), nomes genéricos e empresa fictícia ("Petroquímica Horizonte S.A."). Nenhuma informação real de pessoas ou empresas.

---

## Stack

### Backend / Full-stack
| Tecnologia | Papel |
|---|---|
| **Next.js 16** App Router | Framework + API Routes serverless |
| **TypeScript 5** | Tipagem estática em todo o projeto |
| **Supabase** (produção) | PostgreSQL + Storage + RLS |
| **Jose** | JWT HS256 — geração e verificação de tokens |
| **Bcryptjs** | Hash de senhas |
| **Zod** | Validação de schemas em API routes e formulários |
| **Moonshot AI** (produção) | Geração de relatórios executivos com IA |

### Frontend
| Tecnologia | Papel |
|---|---|
| **React 19** | UI com hooks e Context API |
| **TanStack Query** | Cache, estado assíncrono, invalidação |
| **React Hook Form** | Formulários performáticos |
| **Tailwind CSS 4** | Estilização utilitária |
| **shadcn/ui + Radix UI** | Componentes acessíveis |
| **Recharts + Chart.js** | Gráficos dos dashboards |
| **Framer Motion** | Animações |
| **SheetJS (xlsx)** | Importação/exportação de planilhas |
| **jsPDF** | Geração de PDFs |
| **TipTap** | Editor rich-text para comentários e relatórios |

---

## Decisões técnicas relevantes

**Por que JWT próprio em vez do Supabase Auth?**
O sistema usa RE (Registro do Empregado) como identificador, não e-mail. Isso exigiu um fluxo de autenticação customizado com tabela `usuarios_permitidos`, hash bcrypt e JWT gerenciado pela aplicação, enquanto o Supabase cuida apenas da persistência de dados.

**Por que `service_role` apenas no servidor?**
O cliente Supabase com `anon key` (com RLS) é usado em Client Components. O `service_role` (sem RLS) é instanciado exclusivamente dentro de API Routes via factory function, nunca exposto no bundle do cliente.

**Por que demoRepository em vez de mock no cliente?**
A abordagem de mock nas API Routes preserva a demonstração da arquitetura real: o frontend continua fazendo chamadas HTTP, a autenticação JWT continua funcionando, e qualquer pessoa inspecionando o Network tab vê a API real respondendo.

---

## Rodar localmente

### Modo demonstração (sem banco de dados)

```bash
git clone https://github.com/jaypes7/RefuncApp.git
cd RefuncApp
git checkout demo
npm install

# Copie o template de variáveis de ambiente
cp .env.demo.example .env.local

npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) e use qualquer credencial da tabela acima.

### Modo produção (com Supabase)

```bash
git checkout main
npm install
```

Crie `.env.local` com:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
JWT_SECRET=string_aleatoria_segura
DEFAULT_USER_PASSWORD=senha_inicial_usuarios
```

---

## Estrutura do projeto

```
src/
├── app/
│   ├── api/              # 77 API Routes Next.js
│   │   ├── auth/         # Login, logout, me, reset-password
│   │   ├── colaboradores/# CRUD + importação em lote
│   │   ├── dashboard/    # Endpoints de métricas (4 dashboards)
│   │   ├── config/       # Configurações do projeto
│   │   └── ...           # suprimentos, segurança, logística
│   └── (páginas)/        # 22 páginas do frontend
├── lib/
│   ├── auth.ts           # JWT, requireAuth, roles
│   ├── supabase.ts       # Clientes anon + service role
│   ├── demo/             # Camada mock para o sandbox
│   │   ├── repository.ts # Ponto único de dados fictícios
│   │   ├── handler.ts    # Helpers de resposta demo
│   │   └── data/         # Dados estáticos por domínio
│   └── schemas.ts        # Schemas Zod compartilhados
└── components/           # Componentes React reutilizáveis
```

---

## Licença

MIT © 2024–presente · [João Pedro Soares](https://github.com/jaypes7)
