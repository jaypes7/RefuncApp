function relDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

export const DEMO_REQUISICOES = [
  {
    id: "req-0001", titulo: "EPIs - Lote Inicial", coordenador: "Carlos Mendes",
    data_abertura: relDate(-45), status: "concluida", centro_custo: "DEMO-001",
    itens: [
      { id: "item-001", nome_item: "Capacete de Segurança", categoria: "EPI", unidade: "un", quantidade: 180, criticidade: "alta", tipo: "item" },
      { id: "item-002", nome_item: "Bota de Segurança", categoria: "EPI", unidade: "par", quantidade: 180, criticidade: "alta", tipo: "item" },
      { id: "item-003", nome_item: "Luva de Vaqueta", categoria: "EPI", unidade: "par", quantidade: 360, criticidade: "media", tipo: "item" },
    ],
  },
  {
    id: "req-0002", titulo: "Uniformes - 1ª Remessa", coordenador: "Ana Lima",
    data_abertura: relDate(-38), status: "em_andamento", centro_custo: "DEMO-001",
    itens: [
      { id: "item-004", nome_item: "Camisa Polo (P)", categoria: "Uniforme", unidade: "un", quantidade: 60, criticidade: "media", tipo: "item" },
      { id: "item-005", nome_item: "Camisa Polo (M)", categoria: "Uniforme", unidade: "un", quantidade: 80, criticidade: "media", tipo: "item" },
      { id: "item-006", nome_item: "Camisa Polo (G)", categoria: "Uniforme", unidade: "un", quantidade: 40, criticidade: "media", tipo: "item" },
    ],
  },
  {
    id: "req-0003", titulo: "Ferramentas de Manutenção", coordenador: "Carlos Mendes",
    data_abertura: relDate(-30), status: "aberta", centro_custo: "DEMO-001",
    itens: [
      { id: "item-007", nome_item: "Chave Inglesa 12\"", categoria: "Ferramenta", unidade: "un", quantidade: 20, criticidade: "media", tipo: "item" },
      { id: "item-008", nome_item: "Multímetro Digital", categoria: "Ferramenta", unidade: "un", quantidade: 10, criticidade: "alta", tipo: "item" },
    ],
  },
  {
    id: "req-0004", titulo: "Materiais de Escritório", coordenador: "Ana Lima",
    data_abertura: relDate(-22), status: "aberta", centro_custo: "DEMO-001",
    itens: [
      { id: "item-009", nome_item: "Papel A4 (Resma)", categoria: "Escritório", unidade: "resma", quantidade: 50, criticidade: "baixa", tipo: "item" },
      { id: "item-010", nome_item: "Caneta Esferográfica", categoria: "Escritório", unidade: "cx", quantidade: 10, criticidade: "baixa", tipo: "item" },
    ],
  },
  {
    id: "req-0005", titulo: "Serviço de Transporte Extra", coordenador: "Carlos Mendes",
    data_abertura: relDate(-15), status: "em_andamento", centro_custo: "DEMO-001",
    itens: [
      { id: "item-011", nome_item: "Van de Transporte (diária)", categoria: "Serviço", unidade: "diária", quantidade: 30, criticidade: "alta", tipo: "servico" },
    ],
  },
];

export const DEMO_ORDENS_COMPRA = [
  { id: "oc-001", requisicao_id: "req-0001", numero_oc: "OC-2026-001", fornecedor: "Distribuidora Alpha Ltda.",  valor: 48500, valor_previsto: 50000, previsao_entrega: relDate(-20), entregue: true  },
  { id: "oc-002", requisicao_id: "req-0001", numero_oc: "OC-2026-002", fornecedor: "EPI Total Indústria",        valor: 72000, valor_previsto: 75000, previsao_entrega: relDate(-15), entregue: true  },
  { id: "oc-003", requisicao_id: "req-0002", numero_oc: "OC-2026-003", fornecedor: "Uniformes Beta Confecções",  valor: 35800, valor_previsto: 38000, previsao_entrega: relDate(5),   entregue: false },
  { id: "oc-004", requisicao_id: "req-0003", numero_oc: "OC-2026-004", fornecedor: "Ferramentas Gama",           valor: 12400, valor_previsto: 13000, previsao_entrega: relDate(-8),  entregue: true  },
  { id: "oc-005", requisicao_id: "req-0004", numero_oc: "OC-2026-005", fornecedor: "Papelaria Delta",            valor: 1850,  valor_previsto: 2000,  previsao_entrega: relDate(-30), entregue: true  },
  { id: "oc-006", requisicao_id: "req-0005", numero_oc: "OC-2026-006", fornecedor: "Transportes Épsilon",        valor: 18000, valor_previsto: 18000, previsao_entrega: relDate(10),  entregue: false },
];

export const DEMO_CATEGORIAS = ["EPI", "Uniforme", "Ferramenta", "Escritório", "Serviço", "Material de Construção", "Equipamento"];
