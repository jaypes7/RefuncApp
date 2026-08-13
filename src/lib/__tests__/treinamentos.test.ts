import { describe, expect, it } from "vitest";

import {
  contarStatusTreinamentos,
  derivarStatusTreinamento,
  indexarResumos,
  type ResumoTreinamentos,
} from "../treinamentos";

function resumo(parcial: Partial<ResumoTreinamentos>): ResumoTreinamentos {
  return {
    colaborador_id: "c1",
    total: 0,
    ok: 0,
    aVencer: 0,
    vencido: 0,
    pendente: 0,
    ...parcial,
  };
}

describe("derivarStatusTreinamento", () => {
  it("trata ausência de resumo como 'sem cadastro', não como pendência", () => {
    expect(derivarStatusTreinamento(undefined)).toBe("semCadastro");
    expect(derivarStatusTreinamento(resumo({ total: 0 }))).toBe("semCadastro");
  });

  it("um curso vencido contamina o colaborador inteiro", () => {
    expect(derivarStatusTreinamento(resumo({ total: 5, ok: 4, vencido: 1 }))).toBe("vencido");
    // vencido tem prioridade sobre 'a vencer'
    expect(
      derivarStatusTreinamento(resumo({ total: 3, ok: 1, aVencer: 1, vencido: 1 })),
    ).toBe("vencido");
  });

  it("sinaliza 'a vencer' quando não há vencidos", () => {
    expect(derivarStatusTreinamento(resumo({ total: 4, ok: 3, aVencer: 1 }))).toBe("aVencer");
  });

  it("só é concluído quando todos os aplicáveis estão OK", () => {
    expect(derivarStatusTreinamento(resumo({ total: 3, ok: 3 }))).toBe("concluido");
    expect(derivarStatusTreinamento(resumo({ total: 3, ok: 2, pendente: 1 }))).toBe("pendente");
  });
});

describe("contarStatusTreinamentos", () => {
  it("agrega os colaboradores por status derivado", () => {
    const resumos = indexarResumos([
      resumo({ colaborador_id: "a", total: 2, ok: 2 }),
      resumo({ colaborador_id: "b", total: 2, ok: 1, vencido: 1 }),
      resumo({ colaborador_id: "c", total: 2, ok: 1, pendente: 1 }),
    ]);

    const contagem = contarStatusTreinamentos(
      [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, {}],
      resumos,
    );

    expect(contagem).toEqual({
      concluido: 1,
      aVencer: 0,
      vencido: 1,
      pendente: 1,
      // "d" não tem resumo e o último não tem id
      semCadastro: 2,
    });
  });
});
