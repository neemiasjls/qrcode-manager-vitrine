import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { RESERVED_SLUGS, normalizeSlug, validateSlug } from "./slug";

describe("normalizeSlug", () => {
  it("remove acentos e pontuação", () => {
    expect(normalizeSlug("Pizzaria do Zé!")).toBe("pizzaria-do-ze");
  });
  it("remove emoji", () => {
    expect(normalizeSlug("Café 🍕 Bom")).toBe("cafe-bom");
  });
  it("converte espaços e _ em hífen, colapsa e apara", () => {
    expect(normalizeSlug("  --a__b   c--  ")).toBe("a-b-c");
  });
  it("minúsculas", () => {
    expect(normalizeSlug("LOJA")).toBe("loja");
  });
});

describe("validateSlug", () => {
  it("aceita tamanhos 3 e 40", () => {
    expect(validateSlug("abc").ok).toBe(true);
    expect(validateSlug("a".repeat(40)).ok).toBe(true);
  });
  it("rejeita tamanhos 2 e 41", () => {
    expect(validateSlug("ab").ok).toBe(false);
    expect(validateSlug("a".repeat(41)).ok).toBe(false);
  });
  it("rejeita hífen no início, no fim e duplo", () => {
    expect(validateSlug("-abc").ok).toBe(false);
    expect(validateSlug("abc-").ok).toBe(false);
    expect(validateSlug("a--bc").ok).toBe(false);
  });
  it("rejeita maiúsculas, acento e emoji", () => {
    expect(validateSlug("Abc").ok).toBe(false);
    expect(validateSlug("café").ok).toBe(false);
    expect(validateSlug("ab🍕c").ok).toBe(false);
  });
  it("rejeita palavras reservadas", () => {
    for (const r of RESERVED_SLUGS) {
      const res = validateSlug(r);
      expect(res.ok).toBe(false);
    }
    const res = validateSlug("admin");
    expect(res.ok === false && res.reason).toMatch(/reservado/);
  });
  it("aceita slug normal com hífen", () => {
    expect(validateSlug("pizzaria-do-ze").ok).toBe(true);
  });
});

describe("RESERVED_SLUGS", () => {
  it("é idêntica à lista de reserved_slugs() no SQL", () => {
    const sql = readFileSync(
      path.resolve(__dirname, "../../db/migrations/20261006000002_functions.sql"),
      "utf8",
    );
    const fn = sql.match(/create function public\.reserved_slugs\(\)[\s\S]*?array\[([\s\S]*?)\]/);
    expect(fn).not.toBeNull();
    const sqlList = [...fn![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect([...RESERVED_SLUGS].sort()).toEqual([...sqlList].sort());
  });
});
