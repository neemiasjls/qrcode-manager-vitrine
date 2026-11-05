import { describe, expect, it } from "vitest";
import { normalizeUsername } from "./username";

describe("normalizeUsername", () => {
  it("normaliza maiúsculas e espaços", () => {
    expect(normalizeUsername("  Admin ")).toBe("admin");
    expect(normalizeUsername("OPERADOR")).toBe("operador");
  });

  it("aceita ponto, hífen e underscore", () => {
    expect(normalizeUsername("joao.silva_2-x")).toBe("joao.silva_2-x");
  });

  it("recusa vazio e 1 caractere", () => {
    expect(normalizeUsername("")).toBeNull();
    expect(normalizeUsername("   ")).toBeNull();
    expect(normalizeUsername("a")).toBeNull();
  });

  it("recusa 33 caracteres (32 é o máximo)", () => {
    expect(normalizeUsername("a".repeat(32))).toBe("a".repeat(32));
    expect(normalizeUsername("a".repeat(33))).toBeNull();
  });

  it("recusa caracteres inválidos", () => {
    expect(normalizeUsername("jo ao")).toBeNull();
    expect(normalizeUsername("joão")).toBeNull();
    expect(normalizeUsername("a@b.com")).toBeNull();
    expect(normalizeUsername("x';--")).toBeNull();
  });
});
