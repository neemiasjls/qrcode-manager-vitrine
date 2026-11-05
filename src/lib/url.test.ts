import { describe, expect, it } from "vitest";
import { validateDestination } from "./url";

const BASE = "qr.exemplo.com";

describe("validateDestination", () => {
  it("adiciona https:// quando falta o protocolo", () => {
    const r = validateDestination("www.google.com", BASE);
    expect(r).toEqual({ ok: true, url: "https://www.google.com/" });
  });
  it("aplica trim", () => {
    const r = validateDestination("  https://instagram.com/loja  ", BASE);
    expect(r).toEqual({ ok: true, url: "https://instagram.com/loja" });
  });
  it("aceita http", () => {
    expect(validateDestination("http://exemplo.com", BASE).ok).toBe(true);
  });
  it("rejeita javascript: e data:", () => {
    expect(validateDestination("javascript:alert(1)", BASE).ok).toBe(false);
    expect(validateDestination("data:text/html,<h1>x</h1>", BASE).ok).toBe(false);
  });
  it("rejeita outros protocolos", () => {
    expect(validateDestination("ftp://exemplo.com/a", BASE).ok).toBe(false);
  });
  it("rejeita host sem ponto", () => {
    expect(validateDestination("localhost", BASE).ok).toBe(false);
    expect(validateDestination("https://intranet/x", BASE).ok).toBe(false);
  });
  it("bloqueia o próprio domínio", () => {
    expect(validateDestination("https://qr.exemplo.com/r/abc", BASE).ok).toBe(false);
    expect(validateDestination("QR.exemplo.com", BASE).ok).toBe(false);
  });
  it("aceita outro subdomínio", () => {
    expect(validateDestination("https://www.exemplo.com", BASE).ok).toBe(true);
  });
  it("rejeita vazio e acima de 2048 caracteres", () => {
    expect(validateDestination("   ", BASE).ok).toBe(false);
    expect(validateDestination("https://a.com/" + "x".repeat(2048), BASE).ok).toBe(false);
  });
});
