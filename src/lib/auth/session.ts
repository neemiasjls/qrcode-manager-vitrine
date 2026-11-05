// Sessão = JWT HS256 em cookie. Sem "server-only": o proxy também usa (só verifica a assinatura).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "qm_session";
export const SESSION_TTL_SECONDS = 7 * 24 * 3600;

const ISSUER = "qrcode-manager";
const AUDIENCE = "painel";

export type SessionPayload = { sub: string; username: string; ver: number };

export async function signSession(
  p: SessionPayload,
  secret: Uint8Array,
  ttl: number = SESSION_TTL_SECONDS,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ username: p.username, ver: p.ver })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(p.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + ttl)
    .sign(secret);
}

export async function verifySession(token: string, secret: Uint8Array): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    const { sub, username, ver } = payload;
    if (typeof sub !== "string" || !sub) return null;
    if (typeof username !== "string" || !username) return null;
    if (typeof ver !== "number" || !Number.isInteger(ver)) return null;
    return { sub, username, ver };
  } catch {
    return null;
  }
}
