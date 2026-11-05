// Runner de migrações: aplica db/migrations/*.sql em ordem, 1 transação por arquivo.
// Uso: node --env-file-if-exists=.env.local scripts/migrate.mjs [--status]
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import postgres from "postgres";
import { describeDatabase } from "./lib/db-guard.mjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não definida (veja .env.example).");
  process.exit(1);
}
const statusOnly = process.argv.includes("--status");
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");

console.log(`banco: ${describeDatabase(url)}`);
const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
let code = 0;
let locked = false;

try {
  // Serializa execuções simultâneas. Exige conexão de sessão (não usar Transaction pooler).
  await sql`select pg_advisory_lock(727274)`;
  locked = true;

  await sql`
    create table if not exists public.schema_migrations (
      version text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )`;
  await sql`alter table public.schema_migrations enable row level security`;

  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  const applied = new Map(
    (await sql`select version, checksum from public.schema_migrations`).map((r) => [r.version, r.checksum]),
  );

  let done = 0;
  let skipped = 0;
  let pending = 0;
  let changed = 0;
  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    const content = (await readFile(path.join(dir, file), "utf8")).replace(/\r\n/g, "\n");
    const checksum = createHash("sha256").update(content).digest("hex");
    const prev = applied.get(version);
    if (prev !== undefined) {
      if (prev !== checksum) {
        changed += 1;
        console.error(`erro: migração ${version} foi alterada depois de aplicada`);
        if (!statusOnly) {
          code = 1;
          break;
        }
      } else {
        skipped += 1;
        if (statusOnly) console.log(`aplicada: ${version}`);
      }
      continue;
    }
    if (statusOnly) {
      pending += 1;
      console.log(`pendente: ${version}`);
      continue;
    }
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`insert into public.schema_migrations (version, checksum) values (${version}, ${checksum})`;
    });
    done += 1;
    console.log(`aplicada: ${version}`);
  }
  if (statusOnly) {
    console.log(`status: ${skipped} aplicada(s), ${pending} pendente(s), ${changed} alterada(s)`);
    if (changed > 0 || pending > 0) code = 1;
  } else if (code === 0) {
    console.log(`ok: ${done} aplicada(s), ${skipped} já estavam aplicadas`);
  }
} catch (e) {
  console.error(`erro: ${e instanceof Error ? e.message : e}`);
  code = 1;
} finally {
  if (locked) await sql`select pg_advisory_unlock(727274)`.catch(() => {});
  await sql.end({ timeout: 5 });
}
process.exit(code);
