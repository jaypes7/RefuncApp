function relDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

// CPFs fictícios com prefixo 999 — inválidos na Receita Federal
const CPF_BASE = [
  "999.001.111-00", "999.002.222-00", "999.003.333-00", "999.004.444-00",
  "999.005.555-00", "999.006.666-00", "999.007.777-00", "999.008.888-00",
  "999.009.999-00", "999.010.010-00", "999.011.011-00", "999.012.012-00",
  "999.013.013-00", "999.014.014-00", "999.015.015-00", "999.016.016-00",
  "999.017.017-00", "999.018.018-00", "999.019.019-00", "999.020.020-00",
  "999.021.021-00", "999.022.022-00", "999.023.023-00", "999.024.024-00",
  "999.025.025-00", "999.026.026-00", "999.027.027-00", "999.028.028-00",
  "999.029.029-00", "999.030.030-00", "999.031.031-00", "999.032.032-00",
  "999.033.033-00", "999.034.034-00", "999.035.035-00", "999.036.036-00",
  "999.037.037-00", "999.038.038-00", "999.039.039-00", "999.040.040-00",
  "999.041.041-00", "999.042.042-00", "999.043.043-00", "999.044.044-00",
  "999.045.045-00", "999.046.046-00", "999.047.047-00", "999.048.048-00",
  "999.049.049-00", "999.050.050-00", "999.051.051-00", "999.052.052-00",
  "999.053.053-00", "999.054.054-00", "999.055.055-00", "999.056.056-00",
  "999.057.057-00", "999.058.058-00", "999.059.059-00", "999.060.060-00",
];

const NOMES = [
  "Carlos Silva", "Ana Oliveira", "João Santos", "Maria Souza", "Pedro Lima",
  "Fernanda Costa", "Lucas Pereira", "Juliana Alves", "Rafael Gomes", "Patrícia Rocha",
  "Bruno Martins", "Camila Ferreira", "Diego Carvalho", "Aline Ribeiro", "Thiago Araújo",
  "Larissa Mendes", "Gabriel Barros", "Priscila Dias", "Mateus Nunes", "Vanessa Campos",
  "Ricardo Freitas", "Amanda Teixeira", "Felipe Moreira", "Daniela Ramos", "Gustavo Lopes",
  "Renata Cardoso", "Henrique Correia", "Tatiane Melo", "Eduardo Pinto", "Mônica Cruz",
  "Alexandre Barbosa", "Simone Azevedo", "Leonardo Nascimento", "Cláudia Cavalcante", "André Andrade",
  "Isabela Sousa", "Marcos Vieira", "Letícia Pires", "Wellington Borges", "Cristiane Menezes",
  "Fábio Guimarães", "Rosana Castro", "Leandro Machado", "Eliane Moraes", "Roberto Luz",
  "Adriana Batista", "Samuel Brito", "Natália Cunha", "Vitor Fonseca", "Rejane Monteiro",
  "Caio Queiroz", "Solange Lacerda", "Rodrigo Novaes", "Beatriz Vaz", "Alexsandro Prado",
  "Vera Domingues", "Sérgio Tavares", "Glória Sampaio", "Antônio Vasquez", "Helena Rezende",
];

const FUNCOES = [
  "CALDEIREIRO I", "ELETRICISTA I", "MECÂNICO DE MANUTENÇÃO", "SOLDADOR I",
  "ENCARREGADO CALDEIRARIA", "ENCARREGADO ELETRICA", "ASSISTENTE ADMINISTRATIVO I",
  "AUXILIAR ALMOXARIFADO", "COORDENADOR TÉCNICO", "TÉCNICO DE SEGURANÇA DO TRABALHO",
  "MOTORISTA", "AJUDANTE GERAL", "ENCARREGADO MECANICA", "INSTRUMENTISTA I",
  "ALMOXARIFE I",
];

const STATUS_LIST = [
  "Ativo", "Ativo", "Ativo", "Ativo",          // 40% ativos
  "Pendente", "Pendente", "Pendente",            // 30% pendentes
  "Em Andamento", "Em Andamento",               // 20% em andamento
  "Desligado",                                  // 10% desligados
];

const UFS = ["PA", "PA", "PA", "SP", "BA", "RJ", "MG", "CE", "MA", "AM"];
const MUNICIPIOS = {
  PA: ["Belém", "Ananindeua", "Marituba", "Castanhal", "Marabá"],
  SP: ["São Paulo", "Campinas", "Santos", "Guarulhos", "Osasco"],
  BA: ["Salvador", "Feira de Santana", "Vitória da Conquista", "Ilhéus"],
  RJ: ["Rio de Janeiro", "Niterói", "Duque de Caxias", "Nova Iguaçu"],
  MG: ["Belo Horizonte", "Uberlândia", "Contagem", "Montes Claros"],
  CE: ["Fortaleza", "Caucaia", "Juazeiro do Norte", "Maracanaú"],
  MA: ["São Luís", "Imperatriz", "Caxias"],
  AM: ["Manaus", "Parintins", "Itacoatiara"],
};

const ASO_STATUS = ["Apto", "Apto", "Apto", "Pendente", "Inapto"];
const HOTEIS = ["Hotel Alpha Executivo", "Hotel Beta Confort", "Pousada Gama", null];
const CLINICAS = ["Clínica Saúde Total", "Centro Médico Ocupacional", "Clínica Bem Estar"];
const SEXOS = ["M", "M", "M", "F", "F"];

function pick<T>(arr: T[], idx: number): T {
  return arr[idx % arr.length];
}

export interface DemoColaborador {
  id: string;
  re: string;
  nome: string;
  cpf: string;
  funcao: string;
  status: string;
  uf: string;
  municipio: string;
  sexo: string;
  idade: number;
  dt_nasc: string;
  telefone: string;
  aso_status: string;
  clinica: string;
  data_exame: string | null;
  hotel: string | null;
  data_admissao: string | null;
  status_adm: string;
  contrato_tipo: string;
  portal: string;
  cracha: string;
  treinamento: string;
  centro_custo: string;
  created_at: string;
}

export const DEMO_COLABORADORES: DemoColaborador[] = NOMES.map((nome, i) => {
  const uf = pick(UFS, i + 7) as keyof typeof MUNICIPIOS;
  const municipioList = MUNICIPIOS[uf] ?? ["Belém"];
  const idade = 22 + (i % 33);
  const anoNasc = new Date().getFullYear() - idade;
  const ativo = pick(STATUS_LIST, i) === "Ativo";

  return {
    id: `collab-${String(i + 1).padStart(4, "0")}`,
    re: `RE-${String(i + 1).padStart(4, "0")}`,
    nome: nome.toUpperCase(),
    cpf: CPF_BASE[i],
    funcao: pick(FUNCOES, i + 3),
    status: pick(STATUS_LIST, i),
    uf,
    municipio: pick(municipioList, i),
    sexo: pick(SEXOS, i),
    idade,
    dt_nasc: `${anoNasc}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
    telefone: `(${60 + (i % 30)}) 9${String(i * 1234 + 10000).slice(0, 4)}-${String(i * 5678 + 1000).slice(0, 4)}`,
    aso_status: pick(ASO_STATUS, i),
    clinica: pick(CLINICAS, i),
    data_exame: ativo ? relDate(-(i % 45)) : null,
    hotel: i < 50 ? pick(HOTEIS, i) : null,
    data_admissao: ativo ? relDate(-(i % 60) - 5) : null,
    status_adm: ativo ? "Admitido" : "Pendente",
    contrato_tipo: i % 4 === 0 ? "PJ" : "CLT",
    portal: pick(["Liberado", "Pendente", "Bloqueado"], i),
    cracha: pick(["Emitido", "Pendente"], i),
    treinamento: pick(["Concluído", "Em Andamento", "Pendente"], i),
    centro_custo: "DEMO-001",
    created_at: relDate(-(i % 90) - 10),
  };
});

export function listColaboradores(filtros?: {
  status?: string;
  centro_custo?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): DemoColaborador[] {
  let result = [...DEMO_COLABORADORES];

  if (filtros?.status) {
    result = result.filter((c) =>
      c.status.toLowerCase() === filtros.status!.toLowerCase(),
    );
  }
  if (filtros?.search) {
    const q = filtros.search.toLowerCase();
    result = result.filter(
      (c) => c.nome.toLowerCase().includes(q) || c.cpf.includes(q) || c.re.toLowerCase().includes(q),
    );
  }

  const offset = filtros?.offset ?? 0;
  const limit = filtros?.limit ?? result.length;
  return result.slice(offset, offset + limit);
}

export function getColaborador(id: string): DemoColaborador | undefined {
  return DEMO_COLABORADORES.find((c) => c.id === id || c.re === id || c.cpf === id);
}
