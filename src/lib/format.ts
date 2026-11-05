export function hostOf(url: string | null | undefined): string {
  if (!url) return "—";
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(
    new Date(iso),
  );
}

/** Extrai o slug de um link completo (.../r/slug) ou de um slug solto. */
export function extractSlug(input: string): string {
  let v = input.trim();
  const idx = v.toLowerCase().indexOf("/r/");
  if (idx >= 0) v = v.slice(idx + 3);
  v = v.split(/[?#]/)[0].replace(/\/+$/, "");
  try {
    v = decodeURIComponent(v);
  } catch {
    /* mantém */
  }
  return v.trim().toLowerCase();
}

/** Remove curingas do ILIKE (% e _) e caracteres problemáticos. */
export function sanitizeSearch(q: string): string {
  return q.replace(/[%_,()"\*]/g, " ").replace(/\s+/g, " ").trim();
}

export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}
