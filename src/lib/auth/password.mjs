// Hash de senha com scrypt (node:crypto). JS puro para ser usado pelo app e pelos scripts.
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 64 * 1024 * 1024;

const b64 = (buf) => Buffer.from(buf).toString("base64url");

/** @param {string} plain @returns {Promise<string>} scrypt$N$r$p$salt$hash */
export async function hashPassword(plain) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(plain, salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${b64(salt)}$${b64(hash)}`;
}

/** @param {string} plain @param {string} stored @returns {Promise<boolean>} nunca lança */
export async function verifyPassword(plain, stored) {
  try {
    if (typeof plain !== "string" || typeof stored !== "string") return false;
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    const n = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    if (!Number.isInteger(n) || n < 2 || n > 2 ** 17 || (n & (n - 1)) !== 0) return false;
    if (!Number.isInteger(r) || r < 1 || r > 16) return false;
    if (!Number.isInteger(p) || p < 1 || p > 4) return false;
    const salt = Buffer.from(parts[4], "base64url");
    const expected = Buffer.from(parts[5], "base64url");
    if (salt.length < 8 || expected.length < 16 || expected.length > 128) return false;
    const actual = await scryptAsync(plain, salt, expected.length, { N: n, r, p, maxmem: MAXMEM });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Hash válido de uma senha aleatória: usado quando o usuário não existe (tempo parecido). */
export const DUMMY_HASH =
  "scrypt$16384$8$1$uWZBscXVs49FkcaqC1TfEA$dIvx_UErqp5u10NF06MDWqp1V_uyjOW2BbocHJ1zvOTayJYbVXOEj1rPszkUB9V1gzT24teAwec_o7Dkb4OvRg";
