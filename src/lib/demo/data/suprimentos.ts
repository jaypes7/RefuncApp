function relDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

export const DEMO_REQUISICOES = [
  {
    id: "req-0001", titulo: "EPIs — Lote Inicial Turma 1", coordenador: "Carlos Mendes",
    data_abertura: relDate(-60), status: "concluida", centro_custo: "DEMO-001",
    created_at: relDate(-60), updated_at: relDate(-30),
    itens: [
      { id: "item-001", nome_item: "Capacete de Segurança ABA TOTAL", categoria: "EPI", unidade: "un", quantidade: 90, criticidade: "alta", tipo: "item" },
      { id: "item-002", nome_item: "Bota de Segurança Couro CA-39674", categoria: "EPI", unidade: "par", quantidade: 90, criticidade: "alta", tipo: "item" },
      { id: "item-003", nome_item: "Luva de Vaqueta", categoria: "EPI", unidade: "par", quantidade: 180, criticidade: "media", tipo: "item" },
      { id: "item-004", nome_item: "Óculos de Proteção Incolor", categoria: "EPI", unidade: "un", quantidade: 90, criticidade: "media", tipo: "item" },
    ],
  },
  {
    id: "req-0002", titulo: "Uniformes — 1ª Remessa", coordenador: "Ana Lima",
    data_abertura: relDate(-50), status: "concluida", centro_custo: "DEMO-001",
    created_at: relDate(-50), updated_at: relDate(-20),
    itens: [
      { id: "item-005", nome_item: "Camisa Polo Manga Longa (P)", categoria: "Uniforme", unidade: "un", quantidade: 30, criticidade: "media", tipo: "item" },
      { id: "item-006", nome_item: "Camisa Polo Manga Longa (M)", categoria: "Uniforme", unidade: "un", quantidade: 40, criticidade: "media", tipo: "item" },
      { id: "item-007", nome_item: "Camisa Polo Manga Longa (G)", categoria: "Uniforme", unidade: "un", quantidade: 20, criticidade: "media", tipo: "item" },
      { id: "item-008", nome_item: "Calça de Brim (42)", categoria: "Uniforme", unidade: "un", quantidade: 45, criticidade: "media", tipo: "item" },
      { id: "item-009", nome_item: "Calça de Brim (44)", categoria: "Uniforme", unidade: "un", quantidade: 45, criticidade: "media", tipo: "item" },
    ],
  },
  {
    id: "req-0003", titulo: "Ferramentas — Equipe Caldeiraria", coordenador: "Carlos Mendes",
    data_abertura: relDate(-40), status: "concluida", centro_custo: "DEMO-001",
    created_at: relDate(-40), updated_at: relDate(-15),
    itens: [
      { id: "item-010", nome_item: "Esmerilhadeira Angular 7\"", categoria: "Ferramenta", unidade: "un", quantidade: 8, criticidade: "alta", tipo: "item" },
      { id: "item-011", nome_item: "Serra Circular 7.1/4\"", categoria: "Ferramenta", unidade: "un", quantidade: 4, criticidade: "alta", tipo: "item" },
      { id: "item-012", nome_item: "Chave Inglesa 12\"", categoria: "Ferramenta", unidade: "un", quantidade: 20, criticidade: "media", tipo: "item" },
      { id: "item-013", nome_item: "Conjunto de Chaves Allen", categoria: "Ferramenta", unidade: "jg", quantidade: 10, criticidade: "baixa", tipo: "item" },
    ],
  },
  {
    id: "req-0004", titulo: "EPIs — Lote Complementar", coordenador: "Ana Lima",
    data_abertura: relDate(-35), status: "em_andamento", centro_custo: "DEMO-001",
    created_at: relDate(-35), updated_at: relDate(-10),
    itens: [
      { id: "item-014", nome_item: "Protetor Auricular Plug CA-7592", categoria: "EPI", unidade: "cx", quantidade: 50, criticidade: "media", tipo: "item" },
      { id: "item-015", nome_item: "Cinto de Segurança Tipo Paraquedista", categoria: "EPI", unidade: "un", quantidade: 25, criticidade: "alta", tipo: "item" },
      { id: "item-016", nome_item: "Máscara Descartável PFF2 (cx 50un)", categoria: "EPI", unidade: "cx", quantidade: 20, criticidade: "alta", tipo: "item" },
    ],
  },
  {
    id: "req-0005", titulo: "Materiais de Escritório e TI", coordenador: "Ana Lima",
    data_abertura: relDate(-28), status: "concluida", centro_custo: "DEMO-001",
    created_at: relDate(-28), updated_at: relDate(-12),
    itens: [
      { id: "item-017", nome_item: "Papel A4 75g (resma 500fls)", categoria: "Escritório", unidade: "resma", quantidade: 60, criticidade: "baixa", tipo: "item" },
      { id: "item-018", nome_item: "Notebook i5 8GB 256SSD", categoria: "TI", unidade: "un", quantidade: 3, criticidade: "media", tipo: "item" },
      { id: "item-019", nome_item: "Roteador Wi-Fi Dual Band", categoria: "TI", unidade: "un", quantidade: 2, criticidade: "media", tipo: "item" },
    ],
  },
  {
    id: "req-0006", titulo: "Serviço de Transporte — Rota Diária", coordenador: "Carlos Mendes",
    data_abertura: relDate(-20), status: "em_andamento", centro_custo: "DEMO-001",
    created_at: relDate(-20), updated_at: relDate(-5),
    itens: [
      { id: "item-020", nome_item: "Van 15 lugares (diária)", categoria: "Serviço", unidade: "diária", quantidade: 60, criticidade: "alta", tipo: "servico" },
      { id: "item-021", nome_item: "Ônibus 46 lugares (diária)", categoria: "Serviço", unidade: "diária", quantidade: 30, criticidade: "alta", tipo: "servico" },
    ],
  },
  {
    id: "req-0007", titulo: "Uniformes — 2ª Remessa", coordenador: "Ana Lima",
    data_abertura: relDate(-18), status: "aberta", centro_custo: "DEMO-001",
    created_at: relDate(-18), updated_at: relDate(-18),
    itens: [
      { id: "item-022", nome_item: "Camisa Polo (GG)", categoria: "Uniforme", unidade: "un", quantidade: 15, criticidade: "baixa", tipo: "item" },
      { id: "item-023", nome_item: "Colete Refletivo Laranja", categoria: "Uniforme", unidade: "un", quantidade: 80, criticidade: "media", tipo: "item" },
    ],
  },
  {
    id: "req-0008", titulo: "Equipamentos de Medição", coordenador: "Carlos Mendes",
    data_abertura: relDate(-15), status: "aberta", centro_custo: "DEMO-001",
    created_at: relDate(-15), updated_at: relDate(-15),
    itens: [
      { id: "item-024", nome_item: "Multímetro Digital Fluke 87-V", categoria: "Ferramenta", unidade: "un", quantidade: 6, criticidade: "alta", tipo: "item" },
      { id: "item-025", nome_item: "Alicate Amperímetro Digital", categoria: "Ferramenta", unidade: "un", quantidade: 4, criticidade: "alta", tipo: "item" },
      { id: "item-026", nome_item: "Detector de Tensão", categoria: "Ferramenta", unidade: "un", quantidade: 8, criticidade: "media", tipo: "item" },
    ],
  },
  {
    id: "req-0009", titulo: "Materiais de Higiene e Limpeza", coordenador: "Ana Lima",
    data_abertura: relDate(-10), status: "rascunho", centro_custo: "DEMO-001",
    created_at: relDate(-10), updated_at: relDate(-10),
    itens: [
      { id: "item-027", nome_item: "Álcool em Gel 70% 5L", categoria: "Higiene", unidade: "un", quantidade: 30, criticidade: "media", tipo: "item" },
      { id: "item-028", nome_item: "Sabonete Líquido 5L", categoria: "Higiene", unidade: "un", quantidade: 20, criticidade: "baixa", tipo: "item" },
      { id: "item-029", nome_item: "Papel Higiênico (fardo 64un)", categoria: "Higiene", unidade: "fardo", quantidade: 10, criticidade: "baixa", tipo: "item" },
    ],
  },
  {
    id: "req-0010", titulo: "Suprimentos Médicos — Enfermaria", coordenador: "Carlos Mendes",
    data_abertura: relDate(-8), status: "aberta", centro_custo: "DEMO-001",
    created_at: relDate(-8), updated_at: relDate(-8),
    itens: [
      { id: "item-030", nome_item: "Kit de Primeiros Socorros", categoria: "Médico", unidade: "un", quantidade: 5, criticidade: "alta", tipo: "item" },
      { id: "item-031", nome_item: "Desfibrilador DEA (locação mensal)", categoria: "Médico", unidade: "mês", quantidade: 3, criticidade: "alta", tipo: "servico" },
    ],
  },
];

export const DEMO_ORDENS_COMPRA = [
  { id: "oc-001", requisicao_id: "req-0001", numero_oc: "OC-2026-001", fornecedor: "Distribuidora EPI Alpha Ltda.",    valor: 47800,  valor_previsto: 50000, previsao_entrega: relDate(-30), entregue: true  },
  { id: "oc-002", requisicao_id: "req-0001", numero_oc: "OC-2026-002", fornecedor: "EPI Total Indústria S.A.",          valor: 71200,  valor_previsto: 75000, previsao_entrega: relDate(-25), entregue: true  },
  { id: "oc-003", requisicao_id: "req-0002", numero_oc: "OC-2026-003", fornecedor: "Uniformes Beta Confecções",         valor: 34500,  valor_previsto: 38000, previsao_entrega: relDate(-20), entregue: true  },
  { id: "oc-004", requisicao_id: "req-0003", numero_oc: "OC-2026-004", fornecedor: "Ferramentas Gama Distribuidora",    valor: 28400,  valor_previsto: 30000, previsao_entrega: relDate(-15), entregue: true  },
  { id: "oc-005", requisicao_id: "req-0004", numero_oc: "OC-2026-005", fornecedor: "Segurança Total Equipamentos",      valor: 18700,  valor_previsto: 20000, previsao_entrega: relDate(5),   entregue: false },
  { id: "oc-006", requisicao_id: "req-0005", numero_oc: "OC-2026-006", fornecedor: "Papelaria Delta Comércio",          valor: 9850,   valor_previsto: 10500, previsao_entrega: relDate(-18), entregue: true  },
  { id: "oc-007", requisicao_id: "req-0006", numero_oc: "OC-2026-007", fornecedor: "Transportes Épsilon Logística",     valor: 54000,  valor_previsto: 54000, previsao_entrega: relDate(30),  entregue: false },
  { id: "oc-008", requisicao_id: "req-0007", numero_oc: "OC-2026-008", fornecedor: "Uniformes Beta Confecções",         valor: 12300,  valor_previsto: 14000, previsao_entrega: relDate(8),   entregue: false },
  { id: "oc-009", requisicao_id: "req-0008", numero_oc: "OC-2026-009", fornecedor: "Instrumentos Zeta Metrologia",      valor: 31500,  valor_previsto: 33000, previsao_entrega: relDate(12),  entregue: false },
  { id: "oc-010", requisicao_id: "req-0001", numero_oc: "OC-2026-010", fornecedor: "Calçados Eta Segurança",             valor: 22000,  valor_previsto: 22000, previsao_entrega: relDate(-28), entregue: true  },
  { id: "oc-011", requisicao_id: "req-0003", numero_oc: "OC-2026-011", fornecedor: "Reta Ferragens Industrial",          valor: 15600,  valor_previsto: 16000, previsao_entrega: relDate(-10), entregue: true  },
  { id: "oc-012", requisicao_id: "req-0010", numero_oc: "OC-2026-012", fornecedor: "Teta Saúde Ocupacional",             valor: 8400,   valor_previsto: 9000,  previsao_entrega: relDate(3),   entregue: false },
];

export const DEMO_CATEGORIAS = [
  "EPI", "Uniforme", "Ferramenta", "Escritório", "Serviço",
  "Material de Construção", "Equipamento", "TI", "Higiene", "Médico",
];
