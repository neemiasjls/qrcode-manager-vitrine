// Impede que scripts destrutivos (reset, seed de teste) rodem contra um banco que não seja local.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function describeDatabase(url) {
  const u = new URL(url);
  return `${u.hostname}:${u.port || "5432"}${u.pathname}`;
}

/** @param {string | undefined} url  @param {string} [script] */
export function assertLocalDatabase(url, script = process.argv[1] ? process.argv[1].split(/[\/]/).pop() : "script") {
  if (!url) throw new Error("DATABASE_URL não definida");
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error("DATABASE_URL inválida");
  }
  if (process.env.NODE_ENV === "production" || !LOCAL_HOSTS.has(host.toLowerCase())) {
    throw new Error(`Recusado: ${script} só roda contra banco local (host atual: ${host})`);
  }
}
