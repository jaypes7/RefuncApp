/**
 * Testes de lib/password.ts — geração de senha temporária e comparação dummy.
 */

import { describe, it, expect } from "vitest";
import { generateTemporaryPassword, dummyCompare } from "@/lib/password";

describe("generateTemporaryPassword", () => {
  it("gera senha com o tamanho padrão (10) e apenas caracteres não ambíguos", () => {
    const senha = generateTemporaryPassword();
    expect(senha).toHaveLength(10);
    expect(senha).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789]+$/);
  });

  it("respeita tamanho customizado", () => {
    expect(generateTemporaryPassword(16)).toHaveLength(16);
  });

  it("gera senhas diferentes a cada chamada", () => {
    const senhas = new Set(Array.from({ length: 20 }, () => generateTemporaryPassword()));
    expect(senhas.size).toBe(20);
  });
});

describe("dummyCompare", () => {
  it("executa sem lançar e não valida nenhuma senha", async () => {
    await expect(dummyCompare("qualquer-coisa")).resolves.toBeUndefined();
  });
});
