// Dados de exemplo e usuários de TESTE (admin / operador). SOMENTE banco local.
// Senha: variável SEED_PASSWORD; sem ela, gera uma aleatória e mostra no terminal.
// Uso: node --env-file=.env.local scripts/seed-users.mjs
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import postgres from "postgres";
import { assertLocalDatabase } from "./lib/db-guard.mjs";
import { hashPassword } from "../src/lib/auth/password.mjs";

try {
  assertLocalDatabase(process.env.DATABASE_URL, "seed-users.mjs");
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

const seedPassword = process.env.SEED_PASSWORD?.trim() || randomBytes(12).toString("base64url");
if (!process.env.SEED_PASSWORD?.trim()) {
  console.log(`SEED_PASSWORD não definida; senha gerada para os usuários de teste: ${seedPassword}`);
}
const users = [
  { username: "admin", password: seedPassword },
  { username: "operador", password: seedPassword },
];
const seedFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "seed.sql");
const seedSql = (await readFile(seedFile, "utf8")).replace(/\r\n/g, "\n");
const hashes = await Promise.all(users.map((u) => hashPassword(u.password)));

const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
try {
  await sql.begin(async (tx) => {
    const [{ n }] = await tx`select count(*)::int as n from public.clients`;
    if (n === 0) {
      await tx.unsafe(seedSql);
      console.log("dados de exemplo criados (clientes)");
    } else {
      console.log(`dados de exemplo ignorados (${n} cliente(s) já existem)`);
    }
    for (const [i, { username }] of users.entries()) {
      const [row] = await tx`
        insert into public.users (username, password_hash) values (${username}, ${hashes[i]})
        on conflict (username) do update
          set password_hash = excluded.password_hash,
              is_active = true,
              session_version = public.users.session_version + 1
        returning (xmax = 0) as created`;
      console.log(`${row.created ? "criado" : "atualizado"}: ${username}`);
    }
  });
  console.log("ok");
} finally {
  await sql.end({ timeout: 5 });
}
