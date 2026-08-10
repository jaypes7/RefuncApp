/**
 * Testes de lib/auth.ts — normalizeCentroCusto, resolveCentroCusto e
 * isCentroCustoAutorizado (isolamento multi-tenant).
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ createServerClient: vi.fn() }));

process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-32-caracteres!";

const { normalizeCentroCusto, resolveCentroCusto, isCentroCustoAutorizado } =
  await import("@/lib/auth");

describe("normalizeCentroCusto", () => {
  it("normaliza array de valores", () => {
    expect(normalizeCentroCusto(["A", " B ", ""])).toEqual(["A", "B"]);
  });

  it("divide string com vírgulas", () => {
    expect(normalizeCentroCusto("A, B,C")).toEqual(["A", "B", "C"]);
  });

  it("trata string única", () => {
    expect(normalizeCentroCusto(" A ")).toEqual(["A"]);
  });

  it("retorna vazio para null/undefined/vazio", () => {
    expect(normalizeCentroCusto(null)).toEqual([]);
    expect(normalizeCentroCusto(undefined)).toEqual([]);
    expect(normalizeCentroCusto("")).toEqual([]);
  });
});

describe("resolveCentroCusto", () => {
  const admin = { re: "1", perfil: "admin" };
  const adminRestrito = { re: "1", perfil: "admin", centro_custo: ["A", "B"] };
  const user = { re: "2", perfil: "user", centro_custo: ["A"] };

  it("admin irrestrito sem param → undefined (todos)", () => {
    expect(resolveCentroCusto(admin)).toBeUndefined();
  });

  it("admin irrestrito com param → usa o param", () => {
    expect(resolveCentroCusto(admin, "X,Y")).toEqual(["X", "Y"]);
  });

  it("admin restrito valida o param dentro dos permitidos", () => {
    expect(resolveCentroCusto(adminRestrito, "B,C")).toEqual(["B"]);
    expect(resolveCentroCusto(adminRestrito, "C")).toEqual(["A", "B"]);
    expect(resolveCentroCusto(adminRestrito)).toEqual(["A", "B"]);
  });

  it("user usa param apenas se autorizado", () => {
    expect(resolveCentroCusto(user, "A")).toEqual(["A"]);
    expect(resolveCentroCusto(user, "B")).toEqual(["A"]);
    expect(resolveCentroCusto(user)).toEqual(["A"]);
  });

  it("user sem centros → undefined", () => {
    expect(resolveCentroCusto({ re: "3", perfil: "user" })).toBeUndefined();
  });
});

describe("isCentroCustoAutorizado", () => {
  const admin = { re: "1", perfil: "admin" };
  const user = { re: "2", perfil: "user", centro_custo: ["A"] };

  it("admin irrestrito acessa qualquer centro", () => {
    expect(isCentroCustoAutorizado(admin, "X")).toBe(true);
    expect(isCentroCustoAutorizado(admin, null)).toBe(true);
  });

  it("user acessa apenas o próprio centro", () => {
    expect(isCentroCustoAutorizado(user, "A")).toBe(true);
    expect(isCentroCustoAutorizado(user, "B")).toBe(false);
  });

  it("registro sem centro_custo é acessível", () => {
    expect(isCentroCustoAutorizado(user, null)).toBe(true);
    expect(isCentroCustoAutorizado(user, undefined)).toBe(true);
  });

  it("admin restrito não acessa centro fora da lista", () => {
    const adminRestrito = { re: "1", perfil: "admin", centro_custo: ["A"] };
    expect(isCentroCustoAutorizado(adminRestrito, "B")).toBe(false);
    expect(isCentroCustoAutorizado(adminRestrito, "A")).toBe(true);
  });
});
