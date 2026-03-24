# REFUNC APP — Apresentação Executiva do Projeto

**Data:** Março de 2026  
**Status:** Versão Web em Desenvolvimento  
**Plataforma:** Next.js + React + Google Sheets API

---

## 1. Visão Geral do Projeto

**REFUNC APP** é um sistema de gestão de colaboradores para projetos de implantação/construção que gerencia o ciclo completo de onboarding desde o cadastro inicial até a liberação para operação em campo.

### Objetivo Principal

Centralizar e automatizar o controle de:
- Cadastro e admissão de colaboradores
- Acompanhamento de etapas administrativas (RH, Logística, Segurança)
- Cumprimento de prazos e metas
- Geração de relatórios e dashboards executivos

---

## 2. Arquitetura Técnica

### Stack Tecnológico

| Componente | Tecnologia | Versão |
|---|---|---|
| Frontend | Next.js | 16.1.6 |
| Framework UI | React | 19.2.3 |
| Linguagem | TypeScript | 5 |
| Estilos | Tailwind CSS 4 | 4 |
| Componentes | shadcn/ui + Radix UI | - |
| Gráficos | Recharts + Chart.js | 2.15.4 / 4.5.1 |
| Banco de Dados | Google Sheets API v4 | v4 |
| HTTP Client | Axios | 1.13.6 |
| Validação | Zod | 4.3.6 |

---

## 3. Estrutura de Dados — 58 Campos

### DADOS PESSOAIS (10 campos)
- RE, **NOME (obrigatório)**, **CPF (obrigatório)**, FUNÇÃO, DT_NASC, SEXO, TELEFONE, MUNICÍPIO, UF, ENDEREÇO

### RH E SAÚDE (10 campos)
- STATUS_ADM, DATA_ADMISSÃO, CONTRATO_TIPO, PRÉ_ADMISSÃO, ENVIADO_RH, CLINICA, DATA_EXAME, ASO_STATUS, TREINAMENTO, PONTO_BATIDA

### LOGÍSTICA (11 campos)
- HOTEL, QUARTO, TIPO_APTO, CHECKIN_DATA, TURNO_SEMANA, ROTA_TRANSPORTE, TIPO_TRANSPORTE, COORDENADOR, SUPERVISOR, ENCARREGADO, LOCAL_TRABALHO

### SUPRIMENTOS (7 campos)
- VR_STATUS, UNIFORME_TAM, EPI_STATUS, CRACHÁ, PORTAL, CENTRO_CUSTO, OBS_GERAL

---

## 4. Regras de Negócio e Cálculos

### Métricas Principais

**Cadastrados:** CPF + NOME preenchidos

**Admitidos:** Cadastrado + (DATA_ADMISSÃO preenchida OU STATUS ≠ Pendente)

**Liberados:** Admitido + (PORTAL = Liberado OU ASO = Apto)

**Em Treinamento:** Liberado + TREINAMENTO = Em Andamento

**Portal Liberado:** PORTAL = Liberado

---

### As 10 Etapas do Projeto

| # | Etapa | Descrição |
|---|-------|-----------|
| 1 | Seleção | Triagem e aprovação |
| 2 | Exames | Exames médicos |
| 3 | ASO | Atestado de Saúde |
| 4 | e-Social | Registro eletrônico |
| 5 | Contrato | Formalização |
| 6 | Treinamentos Normativos | Capacitação |
| 7 | Portal | Acesso ao sistema |
| 8 | Liberação de Credencial | Emissão de crachá |
| 9 | EPIs | Entrega de equipamentos |
| 10 | Início de Campo | Autorização |

**Duração Total:** Soma de todas as etapas (configurável)

---

### Progresso Individual

```
Progresso = (Etapa Atual / Total de Etapas) × 100

Exemplo:
- Etapa 1 → 10%
- Etapa 5 → 50%
- Etapa 10 → 100%
```

---

### Curva S (Sigmoide) — Meta Planejada

Representa o acompanhamento ideal usando função logística:

```
Meta(t) = Meta_Total × Sigmoid(t)

Características:
- Dia 0: 0 admissões (início lento)
- Meio: aceleração máxima
- Fim: estabilização (crescimento suave)
```

**Detecção de Atraso:**
```
Realizado < Meta_Sigmoide(hoje) → PROJETO ATRASADO
```

---

## 5. Fluxo de Dados para os Gráficos

### Dashboard Principal (/dashboard)

**Gráfico 1: Curva S de Admissões**
```
Colaboradores → Filtrar DATA_ADMISSÃO 
→ Agrupar por data → Calcular acumulado 
→ Gerar Curva S planejada → Comparar Realizado vs Meta
```

**Gráfico 2-3: Status ASO e Admissional (Pie Chart)**
- Contagem por status com cores diferentes

**Gráfico 4: Distribuição de Funções**
- Agrupar por FUNÇÃO e contar

**Gráfico 5: Progresso por Setor**
- % de preenchimento RH, Logística, Suprimentos

### Dashboards Setoriais

**RH:** Cadastrados, Admitidos, Status ASO, Treinamentos
**Logística:** Hospedados, Distribuição por hotel, Rotas
**Suprimentos:** VR status, EPIs, Uniformes, Crachás

---

## 6. Fluxo de Atualização de Dados

### Importação XLSX
```
Arquivo → Parse → Mapear colunas → Validar CPF 
→ Verificar duplicatas → Google Sheets → Log → Recalcular
```

### Criação/Edição Manual
```
Formulário → Validação Zod → Verificar CPF 
→ API POST/PUT → Log → Cache invalidado → Recarregar
```

### Exportação XLSX
```
Usuário clica → Dados formatados → Planilha → Download
```

---

## 7. Autenticação e Autorização

### Fluxo de Login
```
Login → Credenciais → API POST /auth/login 
→ Validação → Gera JWT → localStorage 
→ Middleware valida → Redireciona
```

---

## 8. Integração com Google Sheets

### Configuração
- Google Cloud Project com Sheets API v4 habilitada
- Service Account criado
- Planilha compartilhada
- Credenciais em .env.local

### Operações
- **Leitura:** GET spreadsheets.values
- **Escrita:** APPEND para novas linhas
- **Atualização:** UPDATE para linhas existentes

### Vantagens
- Custo zero
- Dados continuam no Sheets
- Sem migração

### Limitações
- Latência 200-500ms
- Limite de 10M células

---

## 9. Funcionalidades Implementadas

### Central (CRUD)
- Tabela paginada (20 por página)
- Busca por nome/CPF
- Filtros por status, setor, função
- Formulário com validação
- Importação/Exportação XLSX
- Verificação de duplicatas

### Dashboard
- Cards com métricas
- Curva S vs Realizado
- 5 gráficos principais
- Dashboards setoriais
- Indicadores de atraso

### Admin
- Configuração de datas
- Duração de etapas
- Meta de admissões
- Logs com filtros
- Gerenciamento de usuários

---

## 10. UX e Responsividade

- Layout responsivo
- Sidebar colapsável
- Acessibilidade
- Tema claro/escuro
- Validação em tempo real
- Notificações

---

## 11. Próximas Etapas

**Fase 1:** Testes E2E, validação Google Sheets, performance
**Fase 2:** Bulk actions, agendamento, PDF, email
**Fase 3:** PostgreSQL, Redis, WebSocket, Mobile

---

## 12. Checklist de Aprovação

- [ ] Estrutura de dados correta?
- [ ] Cálculos de progresso e Curva S adequados?
- [ ] Gráficos atendem requisitos?
- [ ] Autenticação segura?
- [ ] Google Sheets viável?
- [ ] UX/UI aceitável?
- [ ] Performance adequada?
- [ ] Documentação clara?

---

**Data:** Março de 2026 | **Versão:** 1.0
