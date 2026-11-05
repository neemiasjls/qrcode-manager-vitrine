import { describe, expect, it } from "vitest";
import { decide, type ResolvedRow } from "./decide";

const BASE = "qr.exemplo.com";
const row = (over: Partial<NonNullable<ResolvedRow>>): ResolvedRow => ({
  link_id: "1",
  status: "active",
  destination_url: "https://www.google.com/",
  is_alias: false,
  ...over,
});

describe("decide", () => {
  it("linha nula: 404 não encontrado", () => {
    expect(decide(null, BASE)).toEqual({ type: "page", status: 404, page: "not_found" });
  });
  it("active: 302 para o destino", () => {
    expect(decide(row({}), BASE)).toEqual({ type: "redirect", status: 302, url: "https://www.google.com/" });
  });
  it("alias ativo redireciona direto ao destino", () => {
    expect(decide(row({ is_alias: true }), BASE)).toEqual({
      type: "redirect",
      status: 302,
      url: "https://www.google.com/",
    });
  });
  it("unassigned: 200 página de não ativada", () => {
    expect(decide(row({ status: "unassigned", destination_url: null }), BASE)).toEqual({
      type: "page",
      status: 200,
      page: "unassigned",
    });
  });
  it("paused e archived: 200 indisponível", () => {
    for (const status of ["paused", "archived"] as const) {
      expect(decide(row({ status }), BASE)).toEqual({ type: "page", status: 200, page: "unavailable" });
    }
  });
  it("active com destino inválido: 404", () => {
    expect(decide(row({ destination_url: "javascript:alert(1)" }), BASE).type).toBe("page");
    expect(decide(row({ destination_url: null }), BASE)).toMatchObject({ type: "page", status: 404 });
    expect(decide(row({ destination_url: "https://" }), BASE)).toMatchObject({ type: "page", status: 404 });
  });
  it("active apontando para o próprio host: 404 (evita loop)", () => {
    expect(decide(row({ destination_url: "https://qr.exemplo.com/r/abc" }), BASE)).toMatchObject({
      type: "page",
      status: 404,
    });
  });
});
