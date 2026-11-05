/** Normaliza o nome de usuário (trim + minúsculas). Mesma regra do CHECK de public.users. */
export function normalizeUsername(u: string): string | null {
  const v = String(u ?? "").trim().toLowerCase();
  return /^[a-z0-9._-]{2,32}$/.test(v) ? v : null;
}
