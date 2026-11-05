// Dados do redirect PÚBLICO (/r/[slug]). Sem requireUser de propósito: a rota é pública.
import "server-only";
import { db } from "@/lib/db";
import type { ResolvedRow } from "@/lib/redirect/decide";

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

/** Resolve o slug (principal ou alias). Lança em erro/timeout (a rota responde 503). */
export async function resolveSlug(slug: string): Promise<ResolvedRow> {
  const rows = await withTimeout(
    db()<NonNullable<ResolvedRow>[]>`
      select link_id, status, destination_url, is_alias from public.resolve_slug(${slug}::text)`,
    2000,
  );
  return rows[0] ?? null;
}

export async function recordScan(s: {
  linkId: string;
  slug: string;
  userAgent: string | null;
  device: string;
  country: string | null;
  isBot: boolean;
}): Promise<void> {
  await db()`
    insert into public.scans (link_id, slug_used, user_agent, device, country, is_bot)
    values (${s.linkId}::uuid, ${s.slug}, ${s.userAgent}, ${s.device}, ${s.country}, ${s.isBot})`;
}
