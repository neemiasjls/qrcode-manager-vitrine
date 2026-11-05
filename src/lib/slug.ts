// Regras de slug. O SQL (link_slugs CHECK + reserved_slugs()) é a garantia final.

// Precisa ser IDÊNTICA à lista de public.reserved_slugs() no SQL (há teste que compara).
export const RESERVED_SLUGS: readonly string[] = [
  "admin", "api", "app", "auth", "login", "logout", "painel", "dashboard", "r", "s", "qr", "nfc",
  "static", "assets", "_next", "public", "www", "mail", "help", "ajuda", "suporte", "termos",
  "privacidade", "null", "undefined", "test", "teste",
];

export const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

export function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type SlugValidation = { ok: true } | { ok: false; reason: string };

export function validateSlug(slug: string): SlugValidation {
  if (RESERVED_SLUGS.includes(slug)) {
    return { ok: false, reason: "Esse link é reservado e não pode ser usado" };
  }
  if (slug.length < 3) {
    return { ok: false, reason: "O link precisa ter pelo menos 3 caracteres" };
  }
  if (slug.length > 40) {
    return { ok: false, reason: "O link pode ter no máximo 40 caracteres" };
  }
  if (slug.includes("--")) {
    return { ok: false, reason: "O link não pode ter hífens duplos" };
  }
  if (!SLUG_REGEX.test(slug)) {
    return {
      ok: false,
      reason:
        "Use apenas letras minúsculas, números e hífen (sem hífen no início ou no fim)",
    };
  }
  return { ok: true };
}
