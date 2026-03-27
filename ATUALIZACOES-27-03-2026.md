# Atualizações da Documentação — 27/03/2026

## Resumo

Foi criado um novo arquivo **ESTRUTURA-PROJETO.md** com análise completa da estrutura de arquivos e diretórios do projeto RefuncApp. Este documento organiza e documenta:

✅ Todas as pastas e arquivos  
✅ Descrição funcional de cada um  
✅ Endpoints API (27+ rotas)  
✅ Componentes React por categoria  
✅ Utilitários e serviços  
✅ Stack técnico por camada

---

## Arquivos Criados/Atualizados

### 📄 **ESTRUTURA-PROJETO.md** (NOVO)
**Localização**: `/ESTRUTURA-PROJETO.md`

Documentação completa com:
- Raiz do projeto (configurações, pacotes, assets)
- /src/app (rotas, páginas, API endpoints)
- /src/components (componentes negócio + UI base shadcn)
- /src/lib (utilitários reutilizáveis - essencial)
- /src/constants, /src/contexts, /src/hooks, /src/services
- /public (assets estáticos)
- Fluxo de dados completo
- Stack técnico por camada

**Uso**: Consulte este arquivo quando precisar entender a estrutura ou procurar por um arquivo/componente específico.

---

## Nota sobre contexto.md

O arquivo `contexto.md` original contém duplicatas (8 cópias completas do mesmo documento). O novo arquivo `ESTRUTURA-PROJETO.md` serve como referência principal para a estrutura.

---

## Como Usar

1. **Estrutura do Projeto**: Abra [ESTRUTURA-PROJETO.md](ESTRUTURA-PROJETO.md)
2. **Contexto Técnico**: Abra [contexto.md](contexto.md) para APIs, Banco de Dados, Schemas, Gráficos
3. **Visão Geral**: Leia [README.md](README.md) para setup e deployment

---

## Conteúdo do ESTRUTURA-PROJETO.md

### Seções Principais:

1. **Raiz do Projeto (`/`)** - Configurationfiles, packages, assets
2. **/src/app** - Rotas, páginas, 27+ API endpoints detalhados
3. **/src/components** - 10+ componentes principais + 19+ UI base components
4. **/src/lib** - 10 arquivos de utilitários (auth, supabase, axios, curva-s, date-utils, import-utils, schemas, logs, project-math, utils)
5. **/src/constants** - Enums e constantes estáticas
6. **/src/contexts** - AuthContext global
7. **/src/hooks** - use-debounce
8. **/src/services** - import-service
9. **/public** - Assets estáticos

### Detalhes de Cada Seção:

**API Endpoints Documentados:**
- ✅ Autenticação (login, logout, me)
- ✅ Colaboradores (CRUD + import)
- ✅ Dashboards (principal, RH, logística, suprimentos)
- ✅ Configurações (projeto, etapas, clínicas, hotéis, acessos, logs)
- ✅ Domínios (RH, logística, segurança, suprimentos)
- ✅ Utilitários (export, logs, clinicas)

**Componentes Documentados:**
- ✅ 10 componentes principais negócio
- ✅ 19 componentes UI base (shadcn/ui + Radix)
- ✅ Função e uso de cada um

**Utilitários Documentados:**
- ✅ 10 arquivos em `/src/lib` com exports principais
- ✅ Descrição de cada função

---

## Próximos Passos Recomendados

1. **Revisar ESTRUTURA-PROJETO.md** para familiarização
2. **Referenciar ao procurar por componentes/utilitários**
3. **Usar contexto.md para detalhes técnicos** (DB, APIs, Schemas)
4. **Executar `npm run dev`** para desenvolvimento local

---

## Notas Técnicas

- ❌ `contexto.md` tem duplicatas (8 cópias) - use como referência secundária
- ✅ `ESTRUTURA-PROJETO.md` é novo e limpo - use como primário para estrutura
- ✅ Todos os 27+ endpoints estão documentados em tabela
- ✅ Stack técnico por camada está claramente separado

---

**Última atualização**: 27/03/2026 às 14:30  
**Versão**: Phase 4 - Supabase Live
