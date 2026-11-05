import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { signSession, verifySession } from "./session";

const secret = new TextEncoder().encode("a".repeat(48));
const otherSecret = new TextEncoder().encode("b".repeat(48));
const payload = { sub: "11111111-1111-4111-8111-111111111111", username: "admin", ver: 3 };

describe("sessão (JWT HS256)", () => {
  it("assina e verifica", async () => {
    const t = await signSession(payload, secret);
    expect(await verifySession(t, secret)).toEqual(payload);
  });

  it("token adulterado -> null", async () => {
    const t = await signSession(payload, secret);
    const [h, p, s] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ ...payload, sub: "x", iss: "qrcode-manager", aud: "painel" })).toString("base64url");
    expect(await verifySession(`${h}.${forged}.${s}`, secret)).toBeNull();
    expect(await verifySession(`${h}.${p}.${s.slice(0, -2)}xx`, secret)).toBeNull();
    expect(await verifySession("nao-e-jwt", secret)).toBeNull();
  });

  it("segredo diferente -> null", async () => {
    const t = await signSession(payload, secret);
    expect(await verifySession(t, otherSecret)).toBeNull();
  });

  it("expirado -> null", async () => {
    const t = await signSession(payload, secret, -10);
    expect(await verifySession(t, secret)).toBeNull();
  });

  it("alg none e payload sem ver -> null", async () => {
    const none = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from(
      JSON.stringify({ ...payload, iss: "qrcode-manager", aud: "painel" }),
    ).toString("base64url")}.`;
    expect(await verifySession(none, secret)).toBeNull();

    const noVer = await new SignJWT({ username: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(payload.sub)
      .setIssuer("qrcode-manager")
      .setAudience("painel")
      .setExpirationTime("1h")
      .sign(secret);
    expect(await verifySession(noVer, secret)).toBeNull();
  });

  it("issuer/audience errados -> null", async () => {
    const t = await new SignJWT({ username: "admin", ver: 1 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(payload.sub)
      .setIssuer("outro")
      .setAudience("painel")
      .setExpirationTime("1h")
      .sign(secret);
    expect(await verifySession(t, secret)).toBeNull();
  });
});
