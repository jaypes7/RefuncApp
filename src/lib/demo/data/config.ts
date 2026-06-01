// Datas relativas ao mês atual para o projeto sempre parecer "em andamento"
function relDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

export const DEMO_CONFIG = {
  id: 1,
  centro_custo: "DEMO-001",
  nome_cliente: "Petroquímica Horizonte S.A.",
  gerente_operacoes: "Carlos Eduardo Mendes",
  gerente_contrato: "Ana Paula Lima",
  data_inicio_projeto: relDate(-120),
  data_fim_projeto: relDate(120),
  dias_totais_projeto: 240,
  colaboradores_previstos: 180,
  meta_admissoes: 150,
  orcado_suprimentos: 850000,
  feriados_projeto: [] as string[],
  dias_trabalhados: [1, 2, 3, 4, 5],
  created_at: "2026-01-15T00:00:00Z",
  updated_at: new Date().toISOString(),
};

// Grupos de fases do projeto — alimentam as abas de Curva S no dashboard
export const DEMO_GRUPOS_ETAPAS = [
  { id: 1, nome: "Pré-mobilização", ordem: 1 },
  { id: 2, nome: "Habilitação",     ordem: 2 },
  { id: 3, nome: "Mobilização",     ordem: 3 },
  { id: 4, nome: "Operação",        ordem: 4 },
];

export const DEMO_ETAPAS = [
  // Fase 1: Pré-mobilização (concluída)
  {
    id: 1, nome: "Pré-Admissão", ordem: 1, duracao_dias: 30,
    percentual_fisico: 100, concluida: true,
    grupo_id: 1, centro_custo: "DEMO-001",
    data_inicio: relDate(-120), data_fim: relDate(-91),
  },
  {
    id: 2, nome: "Exames Médicos", ordem: 2, duracao_dias: 30,
    percentual_fisico: 100, concluida: true,
    grupo_id: 1, centro_custo: "DEMO-001",
    data_inicio: relDate(-90), data_fim: relDate(-61),
  },
  // Fase 2: Habilitação (concluída)
  {
    id: 3, nome: "Treinamentos", ordem: 3, duracao_dias: 30,
    percentual_fisico: 100, concluida: true,
    grupo_id: 2, centro_custo: "DEMO-001",
    data_inicio: relDate(-60), data_fim: relDate(-31),
  },
  {
    id: 4, nome: "Documentação", ordem: 4, duracao_dias: 15,
    percentual_fisico: 95, concluida: false,
    grupo_id: 2, centro_custo: "DEMO-001",
    data_inicio: relDate(-30), data_fim: relDate(-16),
  },
  // Fase 3: Mobilização (em andamento)
  {
    id: 5, nome: "Logística", ordem: 5, duracao_dias: 25,
    percentual_fisico: 60, concluida: false,
    grupo_id: 3, centro_custo: "DEMO-001",
    data_inicio: relDate(-15), data_fim: relDate(9),
  },
  {
    id: 6, nome: "Mobilização", ordem: 6, duracao_dias: 50,
    percentual_fisico: 0, concluida: false,
    grupo_id: 3, centro_custo: "DEMO-001",
    data_inicio: relDate(10), data_fim: relDate(59),
  },
  // Fase 4: Operação (futura)
  {
    id: 7, nome: "Operação Plena", ordem: 7, duracao_dias: 40,
    percentual_fisico: 0, concluida: false,
    grupo_id: 4, centro_custo: "DEMO-001",
    data_inicio: relDate(60), data_fim: relDate(99),
  },
  {
    id: 8, nome: "Encerramento", ordem: 8, duracao_dias: 20,
    percentual_fisico: 0, concluida: false,
    grupo_id: 4, centro_custo: "DEMO-001",
    data_inicio: relDate(100), data_fim: relDate(119),
  },
];

export const DEMO_CLINICAS = [
  { id: 1, nome: "Clínica Saúde Total", cidade: "São Paulo", uf: "SP", centro_custo: "DEMO-001" },
  { id: 2, nome: "Centro Médico Ocupacional", cidade: "Belém", uf: "PA", centro_custo: "DEMO-001" },
  { id: 3, nome: "Clínica Bem Estar", cidade: "Salvador", uf: "BA", centro_custo: "DEMO-001" },
];

export const DEMO_HOTEIS = [
  { id: 1, nome: "Hotel Alpha Executivo", cidade: "Belém", vagas_total: 80, vagas_ocupadas: 67, centro_custo: "DEMO-001" },
  { id: 2, nome: "Hotel Beta Confort", cidade: "Ananindeua", vagas_total: 60, vagas_ocupadas: 38, centro_custo: "DEMO-001" },
  { id: 3, nome: "Pousada Gama", cidade: "Marituba", vagas_total: 40, vagas_ocupadas: 15, centro_custo: "DEMO-001" },
];

export const DEMO_CENTROS_CUSTO = ["DEMO-001"];
