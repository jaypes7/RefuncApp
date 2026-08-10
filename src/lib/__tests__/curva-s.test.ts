import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calcularMetricas,
  calcularProgressoReal,
  gerarDadosGraficoCurvaS,
  sigmoid,
  verificarAtraso,
  verificarAtrasoFisico,
} from "../curva-s";

describe("sigmoid", () => {
  it("é normalizada: σ(0)=0, σ(1)=1, σ(0.5)=0.5", () => {
    expect(sigmoid(0)).toBeCloseTo(0, 6);
    expect(sigmoid(1)).toBeCloseTo(1, 6);
    expect(sigmoid(0.5)).toBeCloseTo(0.5, 6);
  });

  it("é monotônica crescente e limitada a [0,1] fora do domínio", () => {
    let anterior = -1;
    for (let t = 0; t <= 1.0001; t += 0.1) {
      const v = sigmoid(t);
      expect(v).toBeGreaterThanOrEqual(anterior);
      anterior = v;
    }
    expect(sigmoid(-5)).toBeCloseTo(0, 6);
    expect(sigmoid(5)).toBeCloseTo(1, 6);
  });
});

describe("gerarDadosGraficoCurvaS", () => {
  it("retorna vazio quando faltam parâmetros", () => {
    expect(gerarDadosGraficoCurvaS("", "2025-06-30", 100)).toEqual({
      labels: [],
      planejado: [],
      realizado: [],
    });
    expect(gerarDadosGraficoCurvaS("2025-01-01", null, 100).labels).toEqual([]);
    expect(gerarDadosGraficoCurvaS("2025-01-01", "2025-06-30", 0).labels).toEqual([]);
    // fim antes do início
    expect(gerarDadosGraficoCurvaS("2025-06-30", "2025-01-01", 100).labels).toEqual([]);
  });

  it("planejado começa em 0 e termina na meta; arrays alinhados", () => {
    const meta = 200;
    const r = gerarDadosGraficoCurvaS("2025-01-01", "2025-06-30", meta);
    expect(r.labels.length).toBeGreaterThan(0);
    expect(r.planejado.length).toBe(r.labels.length);
    expect(r.realizado!.length).toBe(r.labels.length);
    expect(r.planejado[0]).toBeCloseTo(0, 1);
    expect(r.planejado[r.planejado.length - 1]).toBeCloseTo(meta, 1);
  });

  it("realizado acumula pelo último valor com data <= ponto", () => {
    const r = gerarDadosGraficoCurvaS("2025-01-01", "2025-03-01", 100, [
      { data: "2025-01-10", acumulado: 10 },
      { data: "2025-02-01", acumulado: 45 },
    ]);
    // Primeiro ponto (01/01) não tem admissão ainda
    expect(r.realizado![0]).toBe(0);
    // Último ponto (01/03) reflete o acumulado final
    expect(r.realizado![r.realizado!.length - 1]).toBe(45);
    // Nunca decresce
    for (let i = 1; i < r.realizado!.length; i++) {
      expect(r.realizado![i]).toBeGreaterThanOrEqual(r.realizado![i - 1]);
    }
  });
});

describe("verificarAtraso", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sem parâmetros válidos não acusa atraso", () => {
    expect(verificarAtraso("", null, 0, 0)).toEqual({
      atrasado: false,
      diasAtraso: 0,
      percentualAtraso: 0,
    });
  });

  it("no meio do projeto com 0 admitidos acusa atraso", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 16)); // 16/06/2025, meio do projeto
    const r = verificarAtraso("2025-01-01", "2025-12-31", 100, 0);
    expect(r.atrasado).toBe(true);
    expect(r.diasAtraso).toBeGreaterThan(0);
    expect(r.percentualAtraso).toBeGreaterThan(0);
  });

  it("no meio do projeto com admitidos acima da meta sigmoide não acusa atraso", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 16));
    const r = verificarAtraso("2025-01-01", "2025-12-31", 100, 100);
    expect(r.atrasado).toBe(false);
    expect(r.diasAtraso).toBe(0);
  });

  it("antes do início do projeto não acusa atraso", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 10));
    const r = verificarAtraso("2025-01-01", "2025-12-31", 100, 0);
    expect(r.atrasado).toBe(false);
  });
});

describe("verificarAtrasoFisico", () => {
  it("sem progresso real não há atraso computável", () => {
    expect(verificarAtrasoFisico(50, 0)).toEqual({ atrasado: false, percentualAtraso: 0 });
  });

  it("realizado abaixo do planejado acusa atraso com o delta", () => {
    expect(verificarAtrasoFisico(50, 30)).toEqual({ atrasado: true, percentualAtraso: 20 });
  });

  it("realizado acima do planejado não acusa atraso", () => {
    expect(verificarAtrasoFisico(30, 50)).toEqual({ atrasado: false, percentualAtraso: 0 });
  });

  it("diferença dentro da tolerância (0.5) não acusa atraso", () => {
    expect(verificarAtrasoFisico(30.4, 30)).toEqual({ atrasado: false, percentualAtraso: 0.4 });
  });
});

describe("calcularMetricas", () => {
  it("retorna zeros para lista vazia", () => {
    const m = calcularMetricas([]);
    expect(m.totalCadastrados).toBe(0);
    expect(m.percentualASO).toBe(0);
  });

  it("conta cadastrados, admitidos, liberados e percentuais", () => {
    const m = calcularMetricas([
      // cadastrado + admitido (data) + liberado (ASO Apto) + portal
      { CPF: "1", NOME: "A", DATA_ADMISSAO: "2025-01-01", ASO: "Apto", PORTAL: "Liberado" },
      // cadastrado + admitido (status) + liberado (MOB)
      { CPF: "2", NOME: "B", STATUS: "Ativo", MOB: "MOB 01" },
      // cadastrado, pendente
      { CPF: "3", NOME: "C", STATUS: "Pendente" },
      // sem CPF → não conta como cadastrado
      { NOME: "D", STATUS: "Ativo" },
    ]);
    expect(m.totalCadastrados).toBe(3);
    expect(m.totalAdmitidos).toBe(2);
    expect(m.totalLiberados).toBe(2);
    expect(m.percentualASO).toBeCloseTo(33.33, 1);
    expect(m.percentualPortal).toBeCloseTo(33.33, 1);
    expect(m.percentualMOB).toBeCloseTo(33.33, 1);
  });
});

describe("calcularProgressoReal", () => {
  it("lista vazia retorna 0", () => {
    expect(calcularProgressoReal([])).toBe(0);
  });

  it("colaborador só cadastrado vale etapa 1 de 8 (12.5%)", () => {
    expect(calcularProgressoReal([{ STATUS: "Pendente" }])).toBe(12.5);
  });

  it("colaborador com treinamento concluído vale 100%", () => {
    expect(
      calcularProgressoReal([
        {
          STATUS: "Ativo",
          PRE_ADMISSAO: "Sim",
          MOB: "MOB 01",
          PORTAL: "Liberado",
          ASO: "Apto",
          TREINAMENTO: "Concluído",
        },
      ]),
    ).toBe(100);
  });

  it("média entre colaboradores em etapas diferentes", () => {
    const r = calcularProgressoReal([
      { STATUS: "Pendente" }, // 12.5
      { STATUS: "Ativo", PRE_ADMISSAO: "Sim", MOB: "X", PORTAL: "Liberado", ASO: "Apto", TREINAMENTO: "Concluído" }, // 100
    ]);
    expect(r).toBeCloseTo(56.25, 2);
  });
});
