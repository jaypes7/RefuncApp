function relDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

export const DEMO_OCORRENCIAS = [
  {
    id: "ocr-001", tipo: "Segurança", titulo: "Quase-acidente na área de caldeiraria",
    descricao: "Colaborador escorregou em área molhada. Sem lesões. Área sinalizada e drenada.",
    status: "Aberta", prioridade: "Alta", data: relDate(-5),
    colaborador_re: "RE-0003", colaborador_nome: "JOÃO SANTOS",
    centro_custo: "DEMO-001", registrado_por: "coordenador@demo.com",
  },
  {
    id: "ocr-002", tipo: "RH", titulo: "Atraso recorrente — advertência",
    descricao: "Colaborador com 3 atrasos consecutivos. Advertência emitida conforme CLT.",
    status: "Em Andamento", prioridade: "Média", data: relDate(-12),
    colaborador_re: "RE-0017", colaborador_nome: "LARISSA MENDES",
    centro_custo: "DEMO-001", registrado_por: "rh@demo.com",
  },
  {
    id: "ocr-003", tipo: "Operacional", titulo: "Equipamento danificado",
    descricao: "Multímetro da equipe elétrica danificado. Solicitação de reposição aberta.",
    status: "Aberta", prioridade: "Média", data: relDate(-3),
    colaborador_re: null, colaborador_nome: null,
    centro_custo: "DEMO-001", registrado_por: "coordenador@demo.com",
  },
  {
    id: "ocr-004", tipo: "Segurança", titulo: "EPI fora do prazo de validade",
    descricao: "Lote de cintos de segurança com validade vencida identificado. Substituição autorizada.",
    status: "Resolvida", prioridade: "Alta", data: relDate(-20),
    colaborador_re: null, colaborador_nome: null,
    centro_custo: "DEMO-001", registrado_por: "admin@demo.com",
  },
  {
    id: "ocr-005", tipo: "RH", titulo: "Solicitação de afastamento médico",
    descricao: "Colaborador apresentou atestado de 5 dias. Processo de substituição iniciado.",
    status: "Em Andamento", prioridade: "Baixa", data: relDate(-8),
    colaborador_re: "RE-0041", colaborador_nome: "FÁBIO GUIMARÃES",
    centro_custo: "DEMO-001", registrado_por: "rh@demo.com",
  },
];

export const DEMO_PENDENCIAS = [
  { id: "pen-001", descricao: "ASO pendente para 8 colaboradores da faixa PA-Norte", prazo: relDate(3),  status: "Aberta",   prioridade: "Alta",  responsavel: "rh@demo.com",           centro_custo: "DEMO-001" },
  { id: "pen-002", descricao: "Crachás não emitidos — lote 3 (RE-0041 a RE-0050)",   prazo: relDate(5),  status: "Aberta",   prioridade: "Média", responsavel: "coordenador@demo.com",  centro_custo: "DEMO-001" },
  { id: "pen-003", descricao: "Treinamento NR-35 pendente para turno noturno",        prazo: relDate(2),  status: "Aberta",   prioridade: "Alta",  responsavel: "coordenador@demo.com",  centro_custo: "DEMO-001" },
  { id: "pen-004", descricao: "Atualizar planilha de controle de vagas — Hotel Beta", prazo: relDate(7),  status: "Aberta",   prioridade: "Baixa", responsavel: "admin@demo.com",        centro_custo: "DEMO-001" },
  { id: "pen-005", descricao: "Documentação PJ incompleta — 4 colaboradores",         prazo: relDate(1),  status: "Aberta",   prioridade: "Alta",  responsavel: "rh@demo.com",           centro_custo: "DEMO-001" },
  { id: "pen-006", descricao: "Contato com transportadora para rota Belém–Marituba",  prazo: relDate(4),  status: "Aberta",   prioridade: "Média", responsavel: "coordenador@demo.com",  centro_custo: "DEMO-001" },
  { id: "pen-007", descricao: "Envio de relatório semanal para cliente",              prazo: relDate(0),  status: "Aberta",   prioridade: "Alta",  responsavel: "admin@demo.com",        centro_custo: "DEMO-001" },
];

export const DEMO_CHECKLIST = {
  id: "chk-001",
  titulo: "Checklist de Mobilização — Turma 3",
  centro_custo: "DEMO-001",
  etapas: [
    { id: "e1", nome: "Documentação Recebida",    concluido: true,  responsavel: "rh@demo.com",          data_conclusao: relDate(-15) },
    { id: "e2", nome: "ASO Realizado",            concluido: true,  responsavel: "rh@demo.com",          data_conclusao: relDate(-10) },
    { id: "e3", nome: "Treinamento NR-10",        concluido: true,  responsavel: "coordenador@demo.com", data_conclusao: relDate(-8)  },
    { id: "e4", nome: "Treinamento NR-35",        concluido: false, responsavel: "coordenador@demo.com", data_conclusao: null         },
    { id: "e5", nome: "Crachá Emitido",           concluido: true,  responsavel: "admin@demo.com",       data_conclusao: relDate(-5)  },
    { id: "e6", nome: "Portal Liberado",          concluido: false, responsavel: "admin@demo.com",       data_conclusao: null         },
    { id: "e7", nome: "Hotel Confirmado",         concluido: true,  responsavel: "coordenador@demo.com", data_conclusao: relDate(-3)  },
    { id: "e8", nome: "Transporte Agendado",      concluido: false, responsavel: "coordenador@demo.com", data_conclusao: null         },
    { id: "e9", nome: "Kit EPI Entregue",         concluido: true,  responsavel: "coordenador@demo.com", data_conclusao: relDate(-2)  },
    { id: "e10", nome: "Uniforme Entregue",       concluido: false, responsavel: "coordenador@demo.com", data_conclusao: null         },
  ],
};

export const DEMO_TREINAMENTOS = [
  { id: "trn-001", nome: "NR-10 — Segurança em Instalações Elétricas",   carga_horaria: 40, validade_meses: 24, obrigatorio: true  },
  { id: "trn-002", nome: "NR-35 — Trabalho em Altura",                   carga_horaria: 8,  validade_meses: 12, obrigatorio: true  },
  { id: "trn-003", nome: "NR-12 — Segurança em Máquinas e Equipamentos", carga_horaria: 16, validade_meses: 24, obrigatorio: false },
  { id: "trn-004", nome: "NR-20 — Líquidos Combustíveis e Inflamáveis",  carga_horaria: 8,  validade_meses: 12, obrigatorio: true  },
  { id: "trn-005", nome: "Integração de Segurança",                       carga_horaria: 4,  validade_meses: 12, obrigatorio: true  },
  { id: "trn-006", nome: "Primeiros Socorros Básicos",                    carga_horaria: 8,  validade_meses: 24, obrigatorio: false },
  { id: "trn-007", nome: "Uso Correto de EPIs",                           carga_horaria: 4,  validade_meses: 12, obrigatorio: true  },
  { id: "trn-008", nome: "Operação de Empilhadeira",                       carga_horaria: 20, validade_meses: 36, obrigatorio: false },
];

export const DEMO_BANCO_TALENTOS = [
  { id: "bt-001", nome: "MARCELO ANDRADE",    cpf: "999.101.001-00", funcao: "SOLDADOR I",           uf: "PA", disponivel: true,  data_cadastro: relDate(-60) },
  { id: "bt-002", nome: "SANDRA CORREIA",     cpf: "999.102.002-00", funcao: "AUXILIAR ALMOXARIFADO", uf: "MA", disponivel: true,  data_cadastro: relDate(-45) },
  { id: "bt-003", nome: "PAULO MAGALHÃES",    cpf: "999.103.003-00", funcao: "ELETRICISTA I",         uf: "PA", disponivel: false, data_cadastro: relDate(-30) },
  { id: "bt-004", nome: "TEREZA CARVALHO",    cpf: "999.104.004-00", funcao: "AJUDANTE GERAL",        uf: "TO", disponivel: true,  data_cadastro: relDate(-20) },
  { id: "bt-005", nome: "CLENILTON OLIVEIRA", cpf: "999.105.005-00", funcao: "MECÂNICO DE MANUTENÇÃO", uf: "PA", disponivel: true,  data_cadastro: relDate(-15) },
  { id: "bt-006", nome: "ROSIMAR FREITAS",    cpf: "999.106.006-00", funcao: "CALDEIREIRO I",         uf: "AM", disponivel: true,  data_cadastro: relDate(-10) },
  { id: "bt-007", nome: "EDSON CAVALCANTE",   cpf: "999.107.007-00", funcao: "ALMOXARIFE I",          uf: "CE", disponivel: false, data_cadastro: relDate(-5)  },
  { id: "bt-008", nome: "MARIA NASCIMENTO",   cpf: "999.108.008-00", funcao: "ASSISTENTE ADMINISTRATIVO I", uf: "PA", disponivel: true, data_cadastro: relDate(-3) },
];
