# Análise do PGV — Planejamento e Gestão à Vista

**O que é:** benchmark de UI/UX feito navegando o app `controlcenterpgv.com.br` (obra de demonstração "Gasoduto Demo 50km", v0.1 build dev) em 17/07/2026. Só leitura — nenhum dado foi alterado.

**Para que serve:** catalogar padrões de layout, exibição de dados e funcionalidades do PGV que valem a pena trazer para o RefuncApp, e também os pontos onde o PGV erra e devemos evitar repetir.

---

## 1. Telas percorridas

| Rota | Tela | O que entrega |
|---|---|---|
| `/dashboard` | Painel Geral | Curva geral + blocos de KPI por disciplina |
| `/painel-cronograma` | Planejamento vs realizado | KPIs de prazo, Curva S, atividades críticas |
| `/painel-cronograma/wbs/<id>` | Painel por nó da WBS | Mesma tela, escopada a um ramo da WBS |
| `/consulta-cronograma` | Consulta detalhada | Tabela WBS hierárquica + busca + export CSV |
| `/painel-juntas` | Juntas soldadas | KPIs + distribuição por status |
| `/consulta-juntas` | Consulta de juntas | Tabela de 300 linhas + busca + filtro de status |
| `/painel-valvulas` | Válvulas | **A tela mais rica do app** (detalhada abaixo) |
| `/painel-inspecoes` | Inspeções e END | KPIs + evolução |
| `/painel-rdo` | Diário de Obra | KPIs + evolução de emissão/aprovação |
| `/painel-frentes` | Frentes de trabalho | KPIs + avanço por frente |
| `/painel-mobilizacao` | Mobilização | **A tela mais madura em qualidade de dados** |
| `/painel-clima` | Clima e segurança meteorológica | Condições atuais, 24h, 5 dias |
| `/relatorios` | Central de Relatórios | 4 cards geradores de PDF |
| `/notificacoes` | Notificações | Feed de eventos por tipo |

---

## 2. A arquitetura de navegação: o padrão "Painel → Consulta"

Este é o achado mais importante e o mais fácil de copiar.

O PGV separa **toda** entidade em duas telas com papéis distintos:

- **Painel** — leitura gerencial. KPIs no topo, gráficos abaixo, zero interação de edição. Responde "como estamos?".
- **Consulta detalhada** — a tabela crua, com busca, filtros e export CSV. Responde "quais registros exatamente?".

A ponte entre elas é um botão fixo e sempre no mesmo lugar (abaixo do título): `Abrir consulta detalhada →`. E toda tela de consulta se declara explicitamente: *"Tela somente leitura para consulta completa das juntas da obra ativa."*

**Por que isso importa para nós:** no RefuncApp várias páginas (`banco-talentos`, `colaboradores-restritos`, `frota`) misturam KPI, tabela, filtro e modal de edição na mesma view, o que faz a página carregar pesado e o gestor ter que rolar por cima da operação para achar o número que quer. Separar em painel + consulta resolve os dois problemas de uma vez, e o painel fica cacheável.

**Recomendação:** adotar o par Painel/Consulta em `frota` e `banco-talentos` primeiro, que são os que mais sofrem hoje.

---

## 3. Layout e sistema visual

### 3.1 Estrutura de página (idêntica em todas as telas)

```
[eyebrow: PAINEL DE VÁLVULAS]        ← categoria, caixa alta, pequeno, cor de marca
[H1: Acompanhamento de válvulas]     ← título grande, peso alto
[subtítulo: Visão consolidada e somente leitura das válvulas do projeto ativo.]
[ação primária: Abrir consulta detalhada →]
────────────────────────────────────  ← régua separando cabeçalho do conteúdo
[grid de KPIs]
[gráficos]
[tabelas]
```

Essa consistência é o que faz o app parecer maior e mais acabado do que é. A hierarquia eyebrow → H1 → subtítulo diz **onde você está**, **o que a tela faz** e **qual o escopo dos dados** em três linhas, sem breadcrumb.

**Recomendação:** extrair um `<PageHeader eyebrow title subtitle action />` e usar em todas as páginas do RefuncApp. Hoje cada página nossa monta o cabeçalho do seu jeito.

### 3.2 Cards de KPI

Anatomia: label em caixa alta pequena + número gigante + unidade pequena ao lado + linha de contexto opcional embaixo.

O que eles fazem bem:
- **Cor semântica, não decorativa** — verde = concluído/bom, laranja = pendente/atenção, azul = em andamento, vermelho = crítico. Números neutros ficam pretos. Isso permite escanear um grid de 12 KPIs e ir direto no laranja.
- **Fundo tonal para os KPIs que exigem ação** — em `/painel-valvulas`, os cards "Liberadas" (verde-água), "Atrasadas" (âmbar) e "Críticas atrasadas" (rosa) têm o card inteiro tingido, não só o número. Os outros ficam brancos. Escala de atenção em duas camadas.
- **Percentual sob o valor absoluto** — `50 / 83%` conta muito mais história do que só `50`.
- **Métrica derivada dentro do card** — o card de avanço traz `SPI 0.79` e o delta `-14.0 PT` como texto pequeno, em vez de gastar um card inteiro.

### 3.3 Linha de contexto sob os KPIs

Um detalhe barato e muito eficaz:

> `Avanço geral: 41% · Vence hoje: 0 · Vence em 7d: 2 · Atualizado em 16/07/2026 às 20:00`

Uma linha de texto discreta juntando o resumo executivo, os alertas de prazo curto e a **recência do dado**. Todo painel do PGV informa quando foi atualizado. Nós não fazemos isso em lugar nenhum e é exatamente a primeira pergunta que um gestor faz ao olhar um número.

### 3.4 Tipografia

O app usa fonte monoespaçada para labels, eixos de gráfico e valores tabulares, e sans para títulos e corpo. A mono nos números garante alinhamento de dígitos entre cards e dá a "cara de painel industrial". Funciona bem com a temática de obra.

---

## 4. Exibição de dados — o que copiar

### 4.1 O Painel de Válvulas (a referência do app)

Estrutura completa, e um modelo do que uma tela de acompanhamento de ciclo de vida deveria ser:

1. **10 KPIs** cobrindo cada etapa do ciclo (Removidas → Em manutenção → Manut. concluída → Retornadas → Reinstaladas → Testadas → Liberadas), cada um com absoluto + %.
2. **Curva acumulada planejado vs realizado**, com **dois seletores**: qual etapa plotar (Remoção / Manutenção concluída / Retorno / Reinstalação / Liberação) e a granularidade (Diário / Semanal / Mensal). Um gráfico, cinco perguntas.
3. **Avanço por etapa** — barras agrupadas de Planejado até hoje / Realizado / Atrasadas. Mostra em qual etapa do funil o atraso está nascendo.
4. **Distribuição por status** — pizza.
5. **Gargalos operacionais** — barras horizontais de "Aguardando X". Traduz status em fila de trabalho.
6. **Top válvulas atrasadas** — tabela com TAG, linha, badge de criticidade, etapa, data planejada, **dias de atraso em vermelho**, responsável, local e ação `Abrir`.

O encadeamento é a lição: **KPI → tendência → onde trava → o que fazer**. A tela termina numa lista de itens acionáveis com dono e link, não num gráfico bonito. Nossos dashboards param no gráfico.

**Recomendação:** replicar essa espinha dorsal na Frota — KPIs de manutenção, curva de disponibilidade, gargalos ("aguardando peça", "aguardando oficina"), e uma tabela "Top veículos parados" com dias parados e responsável.

### 4.2 O bloco "Qualidade dos Dados" (Mobilização)

O `/painel-mobilizacao` tem uma seção dedicada só a **contar o que está faltando ou errado**:

```
Ativos sem integração PB: 10     Possíveis duplicidades (grupos): 1
Ativos sem alojamento: 0         Ausentes na última importação: 4
Ativos sem sexo: 0               Warnings da importação: 1
Ativos sem bota/camisa/calça: 0  Rejeitados na importação: 0
Ativos sem EPI completo: 0       Crachá liberado sem ID Petrobras: 26
Sem ID Petrobras: 33             IDs Petrobras duplicados: 0
```

Com nota de rodapé explicando a regra de contagem: *"Um mesmo colaborador pode aparecer em mais de uma linha. Cada indicador conta registros distintos afetados pelo critério."*

Isso é ouro para o RefuncApp, que é **movido a importação de planilha**. Nossos imports hoje falham em silêncio ou jogam um toast que some. O PGV transforma inconsistência em métrica visível e permanente.

**Complementos da mesma tela, todos aproveitáveis:**
- **Cabeçalho de proveniência:** `DEMO_Efetivo_Pessoal.xlsx · 16/07/2026, 12:10:13 · por —` seguido de badges `novos 33` `atualizados 0` `ausentes 0` `rejeitados 0` `warnings 1`, com link `Ver detalhes da importação`. O painel diz de onde veio o dado.
- **Banner de duplicidade** no topo: `⚠ Possíveis duplicidades: 1 grupo / 2 registros`.
- **Toggle `Exibir ausentes na última importação (4)`** — deixa o usuário decidir o escopo, com a contagem no próprio label.
- **Sub-KPIs de incerteza:** cada card traz `11 sem informação` embaixo. O card admite o que não sabe em vez de fingir precisão.
- **Distribuição de uniformes/EPI** como barras de proporção inline (`38 ▮▮▯▯▯ 4 · 12%`) — muito mais legível que um gráfico para listas de tamanhos.

**Recomendação (alta prioridade):** portar o padrão inteiro — proveniência + badges + qualidade de dados — para `checklist-mobilizacao` e `banco-talentos`. É o que mais casa com nossa realidade.

### 4.3 Drill-down por WBS

`/painel-cronograma/wbs/<uuid>` reusa **exatamente** o mesmo componente do painel geral, escopado a um nó da WBS, e mostra o caminho: `Código: INSP · Caminho: Gasoduto Demo 50km > Construcao e Montagem > Inspecao e Testes`, com um botão `← Geral` para voltar. Um componente, N níveis de profundidade.

**Recomendação:** aplicar no `cronograma` — hoje nosso Gantt não tem drill-down por nó.

### 4.4 Consulta hierárquica

`/consulta-cronograma` combina: busca por nome/código/ID externo, `Recolher tudo` / `Expandir tudo`, **seletor de nível da WBS** (Nível 1 … máx.), contador `0 de 12 atividades`, card de resumo do nó com mini Curva S embutida, e a tabela expansível. Export CSV sempre presente.

O seletor de nível é a ideia forte: em vez de expandir nó por nó, o usuário escolhe a profundidade que quer ver de uma vez.

### 4.5 Painel de Clima

Bem executado e diretamente reaproveitável:
- KPIs meteorológicos (temperatura, sensação, condição com código, umidade, chuva %/mm/h, vento m/s + direção em graus, rajadas, pressão, visibilidade, cobertura de nuvens).
- Faixa horária de 24h e cards de 5 dias.
- **Fonte e horário sempre visíveis:** `Última atualização: 17/07/2026, 09:29 · Fonte: Tomorrow.io`, com `Atualizar agora` e `Ver histórico`.
- **Honestidade sobre o roadmap:** os cards de raio mostram `—` com a legenda "Detecção real de raios disponível na Fase 2", em vez de esconder o card ou mostrar zero.
- **Disclaimer de responsabilidade** no rodapé: *"Este painel é uma ferramenta de apoio. Decisões de paralisação, evacuação ou retomada devem seguir os procedimentos de SSMA da obra e as fontes oficiais aplicáveis."*

Esses três últimos pontos — fonte do dado, feature ainda não pronta declarada no lugar dela, e limite de responsabilidade — são maturidade de produto que nos falta.

### 4.6 Central de Relatórios

Grid de cards, cada um com ícone, título, descrição de uma frase do que vai sair, e botão `Gerar PDF`. Relatórios disponíveis: Semanal de Progresso, Resumo de QA/QC *(em breve)*, Histórico de Efetivo (HH), Curva S Baseline. O "(em breve)" fica na descrição, com o botão ainda visível.

Nosso `relatorio-executivo` é uma página única. Um hub de relatórios com descrição do conteúdo antes de gerar é melhor UX e mais extensível.

### 4.7 Notificações

Feed com **tipo do evento como eyebrow** (`LIGHTNING`, `RDO CREATED`, `INSPECTION FAILED`, `WELD PENDING`, `PROGRESS ALERT`), timestamp relativo (`16 jul, 11:10`), título, descrição, `Ver detalhes` e ✓ individual para marcar como lido, além de `Marcar tudo como lido`. Badge de contagem na sidebar. Item não lido leva barra azul na borda esquerda.

---

## 5. O que o PGV faz de errado (não copiar)

Vale registrar — parte disso já existe no RefuncApp e ficou evidente por contraste.

1. **Números que não batem entre telas.** O Painel Geral diz `VÁLVULAS TOTAL 64`; o Painel de Válvulas diz `TOTAL 60`. Também `ATIVOS 40` no geral vs. o conjunto de KPIs do painel específico. Um gestor que vê isso perde a confiança no app inteiro. **Fonte única de verdade por métrica, sempre.**

2. **Duas paletas de gráfico brigando.** O Painel Geral usa uma paleta contida (azuis/laranja da marca). Válvulas e Mobilização usam as cores default do Recharts — azul berrante, verde neon, vermelho puro, rosa. Parecem dois produtos diferentes. **Definir tokens de cor de série e nunca usar o default da lib.**

3. **Labels de eixo rotacionados e cortados.** Em "Avanço por etapa" (Válvulas) os rótulos saem em diagonal e se sobrepõem; em "Gargalos operacionais" quebram em duas linhas e invadem o gráfico. **Barra horizontal com label legível > barra vertical com texto na diagonal.**

4. **Tabela de 300 linhas sem paginação nem cabeçalho fixo.** `/consulta-juntas` renderiza as 300 juntas de uma vez, e ao rolar o cabeçalho some — você fica olhando colunas sem saber o que são. **Cabeçalho sticky + virtualização ou paginação.**

5. **Estado de carregamento como "vazio".** A consulta do cronograma mostra `Nenhum registro encontrado.` e `0 de 12 atividades` enquanto ainda carrega — ou seja, informa o oposto da verdade por alguns segundos. **Skeleton, nunca empty state, durante o fetch.**

6. **Curva geral que não é curva.** O gráfico principal do dashboard sobrepõe 7 séries e avisa no rodapé: *"A curva consolidada será exibida após a definição dos pesos das disciplinas."* Ou seja, o elemento mais proeminente do app não está entregando o que promete. **Se a métrica principal depende de configuração, peça a configuração ali, não mostre um gráfico quebrado.**

7. **Sidebar colapsada sem tooltip.** Vira uma coluna de ícones sem rótulo nem tooltip no hover — indecifrável. E o cabeçalho "PGV — Planejamento e Gestão à Vista" na sidebar expandida tem contraste baixíssimo sobre o azul, praticamente ilegível.

8. **Gráfico com um único ponto.** "Evolução das inspeções e END" plota uma barra em `2026-07`. Uma barra não é uma evolução. **Abaixo de N pontos, mostrar o número, não um gráfico de tendência.**

---

## 6. Plano de adoção sugerido

Ordenado por (impacto ÷ esforço):

### Rodada 1 — barato e visível
1. **`<PageHeader>` padronizado** (eyebrow / H1 / subtítulo / ação primária + régua) em todas as páginas.
2. **Linha "Atualizado em ..."** em todo painel e tabela. Nenhum número sem data.
3. **Cor semântica nos KPIs** — fixar o significado (verde OK, laranja pendente, azul em andamento, vermelho crítico) e aplicar em `dashboard`, `frota`, `central`.
4. **Absoluto + % em todo KPI de contagem.**
5. **Cabeçalho sticky** nas tabelas longas (o erro nº 4 do PGV também é nosso).

### Rodada 2 — estrutural
6. **Separar Painel / Consulta** em `frota` e `banco-talentos`; ação primária `Abrir consulta detalhada →` sempre no mesmo lugar.
7. **Bloco "Qualidade dos Dados"** em `checklist-mobilizacao` e `banco-talentos`.
8. **Cabeçalho de proveniência de importação** (arquivo · data · autor + badges novos/atualizados/rejeitados/warnings + link para detalhes) em todo fluxo que consome planilha — hoje `ImportModal`, `BancoTalentosImportModal`, `ColaboradoresRestritosImportModal`, `sheet-upload`.
9. **Tokens de cor de série** para os gráficos; auditar `relatorio-curva-chart` e `frota` e eliminar cores default.

### Rodada 3 — funcionalidades novas
10. **Seção "Gargalos operacionais"** na Frota (filas de "aguardando X") e tabela "Top itens atrasados" com dias de atraso, responsável e link.
11. **Seletor de granularidade (Diário/Semanal/Mensal) + seletor de etapa** nas curvas — um gráfico servindo várias perguntas.
12. **Drill-down por nó** no `cronograma`, reusando o mesmo componente de painel com o caminho no cabeçalho.
13. **Hub de Relatórios** substituindo a página única de `relatorio-executivo`, com card + descrição + Gerar PDF por relatório.
14. **Feed de notificações** com tipo de evento, badge de contagem na sidebar e marcar como lido.

---

## 7. Resumo em uma frase

Do PGV vale copiar **a disciplina de estrutura** (mesmo cabeçalho, mesma anatomia de KPI, mesma separação painel/consulta em toda tela), **a honestidade sobre o dado** (proveniência, recência, fonte, o que está faltando, o que ainda não existe) e **a cadeia KPI → tendência → gargalo → item acionável com dono**. Vale evitar **a inconsistência de números entre telas** e **os gráficos entregues no default da biblioteca**.

---

## 8. Atualização do gráfico — Curva S estilo PGV

**O que é:** referência coletada em 17/07/2026 do gráfico principal do PGV, no `/painel-cronograma` → card "Curva S — Planejado vs Realizado". Objetivo: adotar o **estilo** desse gráfico no `dashboard/page.tsx` do RefuncApp, mantendo os dados e a paleta Manserv (o PGV usa laranja-500/azul-500 do Tailwind; não vale copiar as cores em cima da marca).

### 8.1 Anatomia do gráfico no PGV

Inspecionado direto no DOM/SVG do Recharts renderizado em produção:

| Elemento | Valor / regra |
|---|---|
| Tipo | `AreaChart` (Recharts), duas séries |
| Curva | `type="monotone"`, `strokeWidth={2}`, **ambas sólidas** (sem dasharray no planejado) |
| Área | `linearGradient` vertical: cor@`stop-opacity=0.35` no topo → mesma cor@`0` no rodapé. Cada série pinta com sua própria cor. |
| Cor "Planejado" | `#f97316` (Tailwind orange-500) |
| Cor "Realizado" | `#3b82f6` (Tailwind blue-500) |
| Grid | horizontal only (`vertical={false}`), `stroke="var(--color-border)"`, **`stroke-dasharray="2 4"`** (mais fino que o `"3 3"` default) |
| Ticks | fonte mono (JetBrains Mono / IBM Plex Mono), 11px, `fill="var(--color-muted-foreground)"`, `tickLine={false}`, `axisLine={false}` |
| Eixo X | rótulos sem rotação (`S01`…`S22` cabem no eixo — quando não couberem, virar barra horizontal, ver §5.3) |
| Eixo Y | 5 ticks fixos: `0%, 25%, 50%, 75%, 100%` |
| Ponto ativo | dot pequeno preenchido na cor da série, **sem borda branca** — mais discreto que o default |
| Cursor | linha vertical cinza, aparece no hover |
| Tooltip | fundo branco, borda cinza clara, sombra sutil; primeira linha é o label do X ("Semana S10") em preto; abaixo, uma linha por série com **nome e valor coloridos na cor da série** |
| Legenda | dots pequenos coloridos + label caixa alta (`PLANEJADO`, `REALIZADO`), embaixo do gráfico |
| Card externo | `panel min-w-0 p-4` — bg branco, borda 1px cinza, radius 4px, padding 16px, sombra dupla (inner light + outer sutil). No RefuncApp usamos `glass-card`, que já tem esse mesmo papel |

### 8.2 O que estamos usando hoje no `dashboard/page.tsx` (`src/app/dashboard/page.tsx:1297–1411`)

O gráfico "Evolução do Projeto" já é um `AreaChart` do Recharts com a mesma espinha (planejado + realizado, gradient, tooltip customizado). O que difere do PGV:

- Planejado vem **cinza tracejado** (`MANSERV_CHART.gray`, `strokeDasharray="6 3"`) → visualmente some, parece "apagado"; o PGV usa cor cheia sólida
- Realizado vem **vermelho danger** (`#DA291B`) → semanticamente errado: "realizado" não é um estado de erro. É a **linha de dado**, deve ser cor forte mas neutra
- `strokeWidth` desigual (2 vs. 3) e `activeDot` do realizado com **borda branca de 2px** → chama muita atenção; PGV usa dot fino e discreto
- Grid `strokeDasharray="3 3"` → mais denso que o `"2 4"` do PGV
- Ticks usam `CHART_AXIS_TICK` com IBM Plex **Sans** — não mono. Perde o alinhamento tabular
- Tooltip mostra "Planejado: X%" e "Realizado: Y%" em preto, **sem cor na série** → o usuário tem que achar qual é qual olhando o gradient no gráfico
- ReferenceDot do ponto selecionado usa `#DA291B` com borda branca — mesmo problema visual do activeDot

### 8.3 Adaptação — o que copiar e o que **não** copiar do PGV

**Copiar (estilo):**
- Curva `monotone`, ambas séries com stroke sólido `width=2`
- `linearGradient` por série com sua própria cor, `stop-opacity` 0.35 → 0
- Grid `strokeDasharray="2 4"`, cor do border token
- Ticks em fonte **mono** (via `font-mono` do Tailwind ou `var(--font-mono)`), 11px, cor muted
- Tooltip com nome+valor coloridos por série, label do X em preto no topo, borda cinza
- Legenda com dot pequeno colorido + label caixa alta
- `activeDot` pequeno (r=4), preenchido na cor da série, **sem borda branca**

**Não copiar (paleta):**
- `#f97316`/`#3b82f6` do Tailwind → substituir por `MANSERV_CHART.primary` (`#ff460a`, laranja da marca) para **planejado** e `MANSERV_CHART.navy` (`#19365b`, azul-marinho da marca) para **realizado**. A escolha vem do §5.2: "definir tokens de cor de série e nunca usar o default da lib" — e a lib do PGV usa Tailwind, para nós é Manserv
- A troca "planejado = cor de marca / realizado = cor de contraste" é intencional: o planejado é a **referência estável**; o realizado é o dado que anda. No PGV a referência é laranja e o dado é azul; aqui invertemos porque laranja é a nossa cor primária e ancora o gráfico à identidade

### 8.4 Onde tocar

| Arquivo | O que muda |
|---|---|
| `src/lib/chart-colors.ts` | Ajustar `CHART_SERIES.planejado` para `MANSERV_CHART.primary` e `CHART_SERIES.realizado` para `MANSERV_CHART.navy`. Adicionar `CHART_GRID_DASH = "2 4"` para reuso |
| `src/app/dashboard/page.tsx:1302–1411` | Trocar os `stopColor` dos dois gradients pelas novas cores; remover `strokeDasharray="6 3"` do planejado; padronizar `strokeWidth={2}` nos dois; alinhar `activeDot` (raio 4, sem borda); trocar `ReferenceDot` para cor do realizado (`navy`); trocar `stroke` do grid para `"2 4"`; refazer o tooltip customizado com valores coloridos por série; trocar `CHART_AXIS_TICK` por `CHART_AXIS_TICK_THEMED` com `font-family: var(--font-mono)` |
| `src/components/relatorio-curva-chart.tsx` | Já foi migrado para `CHART_SERIES`/`CHART_THEME` na rodada anterior. A mudança de cor em `chart-colors.ts` propaga automaticamente. Verificar visualmente |

### 8.5 O que **remover** ao aplicar

- No `dashboard/page.tsx`, o bloco de indicadores diários (`indicadorCurvaS.diario`) que hoje está no header do card usa `#337246` (verde success) para "realizado ≥ planejado" e `#DA291B` (vermelho danger) para "realizado < planejado". **Manter** — não é do gráfico, é a leitura textual. Mas quando refizer as cores da curva, revisar se o vermelho/verde continua coerente. Se ficar barulhento com o laranja/navy, degradar para `text-emerald-700`/`text-rose-700` (mesma leitura, menos saturação)
- O legado `activeDot={{ r: 7, fill: "#DA291B", stroke: "#fff", strokeWidth: 2 }}` sai inteiro
- O `strokeDasharray="6 3"` do planejado sai inteiro
- Todas as constantes de cor **hardcoded no JSX** (`#DA291B`, `#e2e2e2`, `#fff`) saem — puxa tudo dos tokens (`CHART_SERIES.*`, `CHART_THEME.*`)

