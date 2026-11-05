// Atenção: NEXT_PUBLIC_* precisa ser acessada de forma literal para ser embutida no bundle do cliente.

export function publicBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return raw.trim().replace(/\/+$/, "");
}

/** true quando a URL base é provisória (não-https ou localhost/127.0.0.1/.local). */
export function isProvisionalBaseUrl(base: string = publicBaseUrl()): boolean {
  try {
    const u = new URL(base);
    if (u.protocol !== "https:") return true;
    const h = u.hostname.toLowerCase();
    return h === "localhost" || h === "127.0.0.1" || h.endsWith(".local");
  } catch {
    return true;
  }
}

export function baseHost(): string {
  try {
    return new URL(publicBaseUrl()).host.toLowerCase();
  } catch {
    return "";
  }
}
