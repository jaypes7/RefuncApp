function relDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

// CPFs com prefixo 999 — inválidos na Receita Federal
const CPF_BASE = Array.from({ length: 80 }, (_, i) =>
  `999.${String(i + 1).padStart(3, "0")}.${String((i * 7 + 11) % 999).padStart(3, "0")}-${String((i * 3 + 17) % 99).padStart(2, "0")}`,
);

const NOMES = [
  "Carlos Eduardo Silva",    "Ana Paula Oliveira",      "João Marcos Santos",      "Maria Clara Souza",
  "Pedro Henrique Lima",     "Fernanda Costa Melo",     "Lucas Gabriel Pereira",   "Juliana Alves Rocha",
  "Rafael Augusto Gomes",    "Patrícia Souza Rocha",    "Bruno Henrique Martins",  "Camila Ferreira Dias",
  "Diego Carvalho Neto",     "Aline Ribeiro Pinto",     "Thiago Araújo Fonseca",   "Larissa Mendes Costa",
  "Gabriel Barros Lima",     "Priscila Dias Cavalcante","Mateus Nunes Rodrigues",  "Vanessa Campos Freitas",
  "Ricardo Freitas Moura",   "Amanda Teixeira Leal",    "Felipe Moreira Azevedo",  "Daniela Ramos Borges",
  "Gustavo Lopes Cunha",     "Renata Cardoso Vieira",   "Henrique Correia Filho",  "Tatiane Melo Prado",
  "Eduardo Pinto Nascimento","Mônica Cruz Barbosa",     "Alexandre Barbosa Junior","Simone Azevedo Lopes",
  "Leonardo Nascimento Cruz","Cláudia Cavalcante Mota", "André Andrade Macedo",    "Isabela Sousa Castro",
  "Marcos Vieira Nogueira",  "Letícia Pires Monteiro",  "Wellington Borges Santos","Cristiane Menezes Sá",
  "Fábio Guimarães Medeiros","Rosana Castro Ribeiro",   "Leandro Machado Duarte",  "Eliane Moraes Tavares",
  "Roberto Luz Albuquerque", "Adriana Batista Cardoso", "Samuel Brito Fernandes",  "Natália Cunha Leite",
  "Vitor Fonseca Damasceno", "Rejane Monteiro Bastos",  "Caio Queiroz Sampaio",    "Solange Lacerda Braga",
  "Rodrigo Novaes Ferreira", "Beatriz Vaz Andrade",     "Alexsandro Prado Corrêa", "Vera Domingues Lima",
  "Sérgio Tavares Ramos",    "Glória Sampaio Costa",    "Antônio Vasquez Pereira", "Helena Rezende Matos",
  "Clenilton Oliveira Brum", "Rosimar Freitas Paes",    "Edson Cavalcante Torres",  "Maria Nascimento Gaia",
  "Marcelo Andrade Neves",   "Sandra Correia Lins",     "Paulo Magalhães Viana",    "Tereza Carvalho Belo",
  "Welington Cunha Teixeira","Luciana Passos Gouveia",  "Rinaldo Matos Bispo",      "Conceição Deus Farias",
  "Jadson Ferreira Luz",     "Andreza Vieira Melo",     "Celso Monteiro Nunes",     "Graça Pinheiro Rocha",
  "Maurício Coelho Barros",  "Danielle Assis Freire",   "Ozielton Braga Saraiva",   "Elza Bonfim Galdino",
];

const FUNCOES = [
  "CALDEIREIRO I",             "ELETRICISTA I",             "MECÂNICO DE MANUTENÇÃO",
  "SOLDADOR I",                "ENCARREGADO CALDEIRARIA",   "ENCARREGADO ELETRICA",
  "ASSISTENTE ADMINISTRATIVO I","AUXILIAR ALMOXARIFADO",   "COORDENADOR TÉCNICO",
  "TÉCNICO DE SEGURANÇA DO TRABALHO","MOTORISTA",           "AJUDANTE GERAL",
  "ENCARREGADO MECANICA",      "INSTRUMENTISTA I",          "ALMOXARIFE I",
];

// Distribuição realista: 50% Ativo, 25% Pendente, 15% Em Andamento, 10% Desligado
const STATUS_DIST = [
  "Ativo","Ativo","Ativo","Ativo","Ativo",
  "Pendente","Pendente","Pendente",
  "Em Andamento","Em Andamento",
  "Desligado",
];

// Portal: labels que o dashboard de segurança espera
const PORTAL_DIST = ["Aprovado","Aprovado","Aprovado","Pendente","Pendente","Aprovado - DEMITIDO"];

// RPV: labels que o dashboard de segurança espera
const RPV_DIST = ["OK","OK","OK","OK","Pendente","Pendente","N/A"];

const ASO_DIST  = ["Apto","Apto","Apto","Apto","Pendente","Inapto"];
const TREIN_DIST = ["Concluído","Concluído","Concluído","Em Andamento","Em Andamento","Pendente"];

const UFS = ["PA","PA","PA","PA","SP","BA","RJ","MG","CE","MA","AM","TO"];
const MUNICIPIOS: Record<string,string[]> = {
  PA: ["Belém","Ananindeua","Marituba","Castanhal","Marabá","Santarém"],
  SP: ["São Paulo","Campinas","Santos","Guarulhos","Osasco"],
  BA: ["Salvador","Feira de Santana","Vitória da Conquista","Ilhéus"],
  RJ: ["Rio de Janeiro","Niterói","Duque de Caxias","Nova Iguaçu"],
  MG: ["Belo Horizonte","Uberlândia","Contagem","Montes Claros"],
  CE: ["Fortaleza","Caucaia","Juazeiro do Norte","Maracanaú"],
  MA: ["São Luís","Imperatriz","Caxias"],
  AM: ["Manaus","Parintins","Itacoatiara"],
  TO: ["Palmas","Araguaína","Gurupi"],
};
const SEXOS = ["M","M","M","F","F"];
const HOTEIS = ["Hotel Alpha Executivo","Hotel Beta Confort","Pousada Gama",null];
const CLINICAS = ["Clínica Saúde Total","Centro Médico Ocupacional","Clínica Bem Estar"];

function pick<T>(arr: T[], idx: number): T { return arr[idx % arr.length]; }

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
  rpv: string;
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
  const status = pick(STATUS_DIST, i);
  const ativo  = status === "Ativo";

  return {
    id:           `collab-${String(i + 1).padStart(4, "0")}`,
    re:           `RE-${String(i + 1).padStart(4, "0")}`,
    nome:         nome.toUpperCase(),
    cpf:          CPF_BASE[i],
    funcao:       pick(FUNCOES, i + 3),
    status,
    uf,
    municipio:    pick(municipioList, i),
    sexo:         pick(SEXOS, i),
    idade,
    dt_nasc:      `${anoNasc}-${String((i % 12) + 1).padStart(2,"0")}-${String((i % 28) + 1).padStart(2,"0")}`,
    telefone:     `(${60 + (i % 30)}) 9${String(i * 1234 + 10000).slice(0,4)}-${String(i * 5678 + 1000).slice(0,4)}`,
    aso_status:   pick(ASO_DIST, i),
    clinica:      pick(CLINICAS, i),
    data_exame:   ativo ? relDate(-(i % 45)) : null,
    hotel:        i < 65 ? pick(HOTEIS, i) : null,
    data_admissao: ativo ? relDate(-(i % 80) - 5) : null,
    status_adm:   ativo ? "Admitido" : "Pendente",
    contrato_tipo: i % 5 === 0 ? "PJ" : "CLT",
    portal:       pick(PORTAL_DIST, i),
    rpv:          pick(RPV_DIST, i),
    cracha:       pick(["Emitido","Emitido","Pendente"], i),
    treinamento:  pick(TREIN_DIST, i),
    centro_custo: "DEMO-001",
    created_at:   relDate(-(i % 90) - 10),
  };
});

export function listColaboradores(filtros?: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): DemoColaborador[] {
  let result = [...DEMO_COLABORADORES];
  if (filtros?.status) result = result.filter((c) => c.status.toLowerCase() === filtros.status!.toLowerCase());
  if (filtros?.search) {
    const q = filtros.search.toLowerCase();
    result = result.filter((c) => c.nome.toLowerCase().includes(q) || c.cpf.includes(q) || c.re.toLowerCase().includes(q));
  }
  const offset = filtros?.offset ?? 0;
  const limit  = filtros?.limit  ?? result.length;
  return result.slice(offset, offset + limit);
}

export function getColaborador(id: string): DemoColaborador | undefined {
  return DEMO_COLABORADORES.find((c) => c.id === id || c.re === id || c.cpf === id);
}
