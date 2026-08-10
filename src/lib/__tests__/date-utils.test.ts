import { describe, expect, it } from "vitest";
import {
  addWorkingDays,
  calculateWorkingDays,
  calculateWorkingDaysDetailed,
  formatDateBR,
  formatDateISO,
  getNationalHolidays,
} from "../date-utils";

describe("getNationalHolidays", () => {
  it("inclui os feriados fixos do ano", () => {
    const feriados = getNationalHolidays(2025);
    expect(feriados).toContain("2025-01-01");
    expect(feriados).toContain("2025-04-21");
    expect(feriados).toContain("2025-05-01");
    expect(feriados).toContain("2025-09-07");
    expect(feriados).toContain("2025-10-12");
    expect(feriados).toContain("2025-11-02");
    expect(feriados).toContain("2025-11-15");
    expect(feriados).toContain("2025-12-25");
  });

  it("calcula os feriados móveis de 2025 (Páscoa 20/04)", () => {
    const feriados = getNationalHolidays(2025);
    expect(feriados).toContain("2025-04-20"); // Páscoa
    expect(feriados).toContain("2025-04-18"); // Sexta-Feira Santa
    expect(feriados).toContain("2025-03-04"); // Carnaval (terça)
    expect(feriados).toContain("2025-06-19"); // Corpus Christi
  });

  it("calcula os feriados móveis de 2024 (Páscoa 31/03)", () => {
    const feriados = getNationalHolidays(2024);
    expect(feriados).toContain("2024-03-31"); // Páscoa
    expect(feriados).toContain("2024-03-29"); // Sexta-Feira Santa
    expect(feriados).toContain("2024-02-13"); // Carnaval
    expect(feriados).toContain("2024-05-30"); // Corpus Christi
  });
});

describe("calculateWorkingDays", () => {
  it("conta 5 dias úteis numa semana sem feriado", () => {
    expect(calculateWorkingDays("2024-01-08", "2024-01-12")).toBe(5);
  });

  it("exclui o feriado de Carnaval automaticamente", () => {
    // Semana de 03/03 a 07/03/2025 — terça 04/03 é Carnaval
    expect(calculateWorkingDays("2025-03-03", "2025-03-07")).toBe(4);
  });

  it("aceita datas invertidas (swap automático)", () => {
    expect(calculateWorkingDays("2024-01-12", "2024-01-08")).toBe(5);
  });

  it("exclui feriados extras informados", () => {
    expect(
      calculateWorkingDays("2024-01-08", "2024-01-12", ["2024-01-10"]),
    ).toBe(4);
  });

  it("um único dia útil conta 1; fim de semana conta 0", () => {
    expect(calculateWorkingDays("2024-01-08", "2024-01-08")).toBe(1); // segunda
    expect(calculateWorkingDays("2024-01-13", "2024-01-14")).toBe(0); // sáb+dom
  });
});

describe("calculateWorkingDaysDetailed", () => {
  it("retorna breakdown de dias corridos, úteis e não úteis", () => {
    // Segunda 08/01 a domingo 14/01/2024
    const r = calculateWorkingDaysDetailed("2024-01-08", "2024-01-14");
    expect(r.calendarDays).toBe(7);
    expect(r.workingDays).toBe(5);
    expect(r.weekendDays).toBe(2);
  });
});

describe("addWorkingDays", () => {
  it("avança N dias úteis pulando fins de semana", () => {
    // Segunda 08/01 + 5 dias úteis (ter..sex + seg) → segunda 15/01
    expect(formatDateISO(addWorkingDays("2024-01-08", 5))).toBe("2024-01-15");
  });

  it("pula feriados nacionais", () => {
    // Segunda 03/03/2025 + 2 dias úteis: terça 04/03 é Carnaval → qui 06/03
    expect(formatDateISO(addWorkingDays("2025-03-03", 2))).toBe("2025-03-06");
  });

  it("lança RangeError para valor negativo", () => {
    expect(() => addWorkingDays("2024-01-08", -1)).toThrow(RangeError);
  });
});

describe("formatDateISO / formatDateBR", () => {
  it("formata com zero à esquerda respeitando fuso local", () => {
    const d = new Date(2024, 0, 5); // 05/01/2024 local
    expect(formatDateISO(d)).toBe("2024-01-05");
    expect(formatDateBR(d)).toBe("05/01/2024");
  });
});
