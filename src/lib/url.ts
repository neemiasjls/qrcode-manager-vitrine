import { z } from "zod";
import { baseHost } from "@/lib/env";

export type DestinationResult = { ok: true; url: string } | { ok: false; reason: string };

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
const DANGEROUS_SCHEME = /^(javascript|data|vbscript|file|blob|about):/i;

const inputSchema = z
  .string()
  .trim()
  .min(1, "Informe o destino")
  .max(2048, "O destino pode ter no máximo 2048 caracteres");

/**
 * Valida e normaliza a URL de destino.
 * @param blockedHost host (com porta, se houver) que não pode ser destino; padrão: host de NEXT_PUBLIC_BASE_URL.
 */
export function validateDestination(
  input: string,
  blockedHost: string = baseHost(),
): DestinationResult {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message ?? "Destino inválido" };
  }
  let value = parsed.data;

  if (DANGEROUS_SCHEME.test(value)) {
    return { ok: false, reason: "Use apenas endereços http ou https" };
  }
  if (!HAS_SCHEME.test(value)) {
    value = `https://${value}`;
  }

  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return { ok: false, reason: "Endereço inválido" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { ok: false, reason: "Use apenas endereços http ou https" };
  }
  if (!u.hostname.includes(".")) {
    return { ok: false, reason: "Endereço inválido: o domínio precisa ter um ponto" };
  }
  if (blockedHost && (u.host.toLowerCase() === blockedHost.toLowerCase())) {
    return { ok: false, reason: "O destino não pode apontar para o próprio sistema" };
  }
  return { ok: true, url: u.toString() };
}
