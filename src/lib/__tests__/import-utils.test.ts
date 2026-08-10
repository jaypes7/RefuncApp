import { describe, expect, it } from "vitest";
import {
  buildHeaderMap,
  mapStrictEnums,
  normalizeTurno,
  rowToColaborador,
  rowToColaboradorRestrito,
  sanitizeCPF,
  sanitizeDate,
  sanitizeText,
} from "../import-utils";

describe("sanitizeCPF", () => {
  it("remove máscara e não-dígitos", () => {
    expect(sanitizeCPF("123.456.789-01")).toBe("12345678901");
  });

  it("preenche zeros à esquerda até 11 dígitos (Excel corta o 0 inicial)", () => {
    expect(sanitizeCPF(1234567890)).toBe("01234567890");
  });

  it("vazio/inválido retorna string vazia", () => {
    expect(sanitizeCPF("")).toBe("");
    expect(sanitizeCPF(null)).toBe("");
    expect(sanitizeCPF("abc")).toBe("");
  });
});

describe("sanitizeDate", () => {
  it("converte serial do Excel para ISO", () => {
    // 45000 dias após 1900 → 15/03/2023
    expect(sanitizeDate(45000)).toBe("2023-03-15");
  });

  it("converte serial antigo (data de nascimento) para ISO", () => {
    // 20000 → 03/10/1954
    expect(sanitizeDate(20000)).toBe("1954-10-03");
  });

  it("converte DD/MM/YYYY para ISO", () => {
    expect(sanitizeDate("31/12/2024")).toBe("2024-12-31");
    expect(sanitizeDate("5/1/2024")).toBe("2024-01-05");
    expect(sanitizeDate("05-01-2024")).toBe("2024-01-05");
  });

  it("mantém ISO como está", () => {
    expect(sanitizeDate("2024-12-31")).toBe("2024-12-31");
  });

  it("valores vazios ou irreconhecíveis retornam null", () => {
    expect(sanitizeDate(null)).toBeNull();
    expect(sanitizeDate("")).toBeNull();
    expect(sanitizeDate("não informado")).toBeNull();
  });
});

describe("sanitizeText", () => {
  it("trim e opção de maiúsculas", () => {
    expect(sanitizeText("  fulano ")).toBe("fulano");
    expect(sanitizeText("fulano", { upper: true })).toBe("FULANO");
    expect(sanitizeText("")).toBeNull();
    expect(sanitizeText(null)).toBeNull();
  });
});

describe("normalizeTurno", () => {
  it("vazio ou N/A explícito retorna N/A", () => {
    expect(normalizeTurno("")).toBe("N/A");
    expect(normalizeTurno(null)).toBe("N/A");
    expect(normalizeTurno("N/A")).toBe("N/A");
    expect(normalizeTurno("na")).toBe("N/A");
  });

  it("detecta o dígito do turno em qualquer formato", () => {
    expect(normalizeTurno("3º TURNO - NOITE")).toBe("3º TURNO");
    expect(normalizeTurno("TURNO 2")).toBe("2º TURNO");
    expect(normalizeTurno("1")).toBe("1º TURNO");
  });

  it("prioriza 3 > 2 > 1 quando há múltiplos dígitos", () => {
    expect(normalizeTurno("TURNO 1 E 3")).toBe("3º TURNO");
  });

  it("valor sem dígito reconhecível retorna null", () => {
    expect(normalizeTurno("TURNO DIURNO")).toBeNull();
  });
});

describe("mapStrictEnums", () => {
  it("aplica defaults para valores vazios", () => {
    expect(mapStrictEnums("status_adm", null)).toBe("Pendente");
    expect(mapStrictEnums("contrato_tipo", null)).toBe("CLT");
    expect(mapStrictEnums("pessoa", null)).toBe("Física");
    expect(mapStrictEnums("colab_pend", null)).toBe("Não");
    expect(mapStrictEnums("qualquer_outro", null)).toBeNull();
  });

  it("normaliza status administrativo", () => {
    expect(mapStrictEnums("status_adm", "ATIVO")).toBe("Ativo");
    expect(mapStrictEnums("status_adm", "colaborador demitido")).toBe("Desligado");
    expect(mapStrictEnums("status_adm", "DESISTIU")).toBe("Desistente");
    expect(mapStrictEnums("status_adm", "restrição do cliente")).toBe("Restrição Cliente");
    expect(mapStrictEnums("status_adm", "aguardando")).toBe("Pendente");
  });

  it("normaliza ASO e crachá", () => {
    expect(mapStrictEnums("aso_status", "APTO")).toBe("Apto");
    expect(mapStrictEnums("aso_status", "INAPTO")).toBe("Inapto");
    expect(mapStrictEnums("cracha", "emitido")).toBe("Emitido");
  });

  it("preserva códigos MOB dinâmicos", () => {
    expect(mapStrictEnums("mob", "MOB 02.2")).toBe("MOB 02.2");
    expect(mapStrictEnums("mob", "SIM")).toBe("Sim");
  });

  it("schemaId desconhecido passa o valor adiante", () => {
    expect(mapStrictEnums("municipio", "São Paulo")).toBe("São Paulo");
  });
});

describe("buildHeaderMap", () => {
  it("faz match exato ignorando acentos e caixa", () => {
    const map = buildHeaderMap(["cpf", "Nome Completo", "FUNÇÃO CLT"]);
    expect(map.get("cpf")).toBe("cpf");
    expect(map.get("Nome Completo")).toBe("nome");
    expect(map.get("FUNÇÃO CLT")).toBe("funcao");
  });

  it("match exato vence substring (TURNO não perde para HORAS TURNO)", () => {
    const map = buildHeaderMap(["TURNO", "HORAS TURNO"]);
    expect(map.get("TURNO")).toBe("turno_semana");
  });

  it("aliases curtos exigem match exato (AREA não vira RE)", () => {
    const map = buildHeaderMap(["AREA"]);
    expect(map.get("AREA")).toBe("setor_trabalho");
  });

  it("header de custo nunca mapeia para hotel", () => {
    const map = buildHeaderMap(["HOTEL CUSTO"]);
    expect(map.get("HOTEL CUSTO")).toBeUndefined();
  });

  it("headers desconhecidos ficam sem mapeamento", () => {
    const map = buildHeaderMap(["COLUNA INVENTADA XYZ"]);
    expect(map.has("COLUNA INVENTADA XYZ")).toBe(false);
  });
});

describe("rowToColaborador", () => {
  it("converte linha bruta em registro da API com sanitização", () => {
    const headers = ["NOME", "CPF", "DATA ADMISSÃO", "IDADE", "STATUS", "CENTRO DE CUSTO"];
    const map = buildHeaderMap(headers);
    const row = {
      NOME: "  fulano de tal ",
      CPF: "123.456.789-01",
      "DATA ADMISSÃO": "15/01/2025",
      IDADE: "35",
      STATUS: "ATIVO",
      "CENTRO DE CUSTO": "09.06.0001.171",
    };
    const r = rowToColaborador(row, map);
    expect(r.NOME).toBe("FULANO DE TAL");
    expect(r.CPF).toBe("12345678901");
    expect(r.DATA_ADMISSAO).toBe("2025-01-15");
    expect(r.IDADE).toBe(35);
    expect(r.STATUS).toBe("Ativo");
    expect(r.CENTRO_CUSTO).toBe("09.06.0001.171");
  });

  it("idade fora da faixa 16–99 é descartada", () => {
    const map = buildHeaderMap(["IDADE"]);
    expect(rowToColaborador({ IDADE: 150 }, map).IDADE).toBeUndefined();
    expect(rowToColaborador({ IDADE: 10 }, map).IDADE).toBeUndefined();
  });

  it("CPF inválido não entra no resultado", () => {
    const map = buildHeaderMap(["CPF"]);
    expect(rowToColaborador({ CPF: "sem cpf" }, map).CPF).toBeUndefined();
  });
});

describe("rowToColaboradorRestrito", () => {
  it("extrai apenas os campos do domínio restrito", () => {
    const headers = ["NOME", "CPF", "TIPODEMISSAO", "MOTIVODEMISSAO"];
    const map = buildHeaderMap(headers);
    const r = rowToColaboradorRestrito(
      {
        NOME: "Beltrano",
        CPF: "987.654.321-00",
        TIPODEMISSAO: "Justa causa",
        MOTIVODEMISSAO: "Abandono",
      },
      map,
    );
    expect(r).toEqual({
      NOME: "Beltrano",
      CPF: "98765432100",
      tipo_demissao: "Justa causa",
      motivo_demissao: "Abandono",
    });
  });
});
