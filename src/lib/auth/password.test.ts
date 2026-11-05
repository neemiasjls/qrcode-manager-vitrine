import { describe, expect, it } from "vitest";
import { DUMMY_HASH, hashPassword, verifyPassword } from "./password.mjs";

describe("password (scrypt)", () => {
  it("gera hash no formato scrypt$N$r$p$salt$hash", async () => {
    const h = await hashPassword("senha-de-teste");
    expect(h).toMatch(/^scrypt\$16384\$8\$1\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/);
  });

  it("aceita a senha certa e recusa a errada", async () => {
    const h = await hashPassword("senha-certa");
    expect(await verifyPassword("senha-certa", h)).toBe(true);
    expect(await verifyPassword("senha-errada", h)).toBe(false);
  });

  it("dois hashes da mesma senha diferem (salt)", async () => {
    const a = await hashPassword("mesma");
    const b = await hashPassword("mesma");
    expect(a).not.toBe(b);
    expect(await verifyPassword("mesma", a)).toBe(true);
    expect(await verifyPassword("mesma", b)).toBe(true);
  });

  it("hash malformado ou com parâmetros absurdos devolve false sem lançar", async () => {
    const bad = [
      "",
      "lixo",
      "scrypt$1$2",
      "bcrypt$16384$8$1$c2FsdA$aGFzaA",
      "scrypt$16385$8$1$c2FsdHNhbHRzYWx0$aGFzaGhhc2hoYXNoaGFzaGhhc2g", // N não é potência de 2
      "scrypt$1073741824$8$1$c2FsdHNhbHRzYWx0$aGFzaGhhc2hoYXNoaGFzaGhhc2g", // N enorme
      "scrypt$16384$999$1$c2FsdHNhbHRzYWx0$aGFzaGhhc2hoYXNoaGFzaGhhc2g", // r enorme
      "scrypt$16384$8$99$c2FsdHNhbHRzYWx0$aGFzaGhhc2hoYXNoaGFzaGhhc2g", // p enorme
      "scrypt$abc$8$1$c2FsdHNhbHRzYWx0$aGFzaGhhc2hoYXNoaGFzaGhhc2g",
    ];
    for (const b of bad) {
      await expect(verifyPassword("x", b)).resolves.toBe(false);
    }
  });

  it("DUMMY_HASH tem formato válido e não aceita senha comum", async () => {
    expect(DUMMY_HASH).toMatch(/^scrypt\$16384\$8\$1\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/);
    expect(await verifyPassword("123456", DUMMY_HASH)).toBe(false);
  });
});
