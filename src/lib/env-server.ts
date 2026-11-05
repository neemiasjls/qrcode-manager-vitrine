// Variáveis SÓ de servidor. Nunca importar em client component.
export function databaseUrl(): string {
  const v = process.env.DATABASE_URL?.trim();
  if (!v) throw new Error("DATABASE_URL não definida");
  return v;
}

export function sessionSecret(): Uint8Array {
  const v = process.env.SESSION_SECRET ?? "";
  if (v.length < 32) throw new Error("SESSION_SECRET ausente ou curta (mínimo 32 caracteres)");
  return new TextEncoder().encode(v);
}
