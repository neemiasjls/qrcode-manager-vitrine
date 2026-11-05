// Recria o schema public (APAGA tudo). Só roda contra banco local.
import postgres from "postgres";
import { assertLocalDatabase } from "./lib/db-guard.mjs";

try {
  assertLocalDatabase(process.env.DATABASE_URL, "db-reset.mjs");
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
try {
  await sql.unsafe("drop schema if exists public cascade; create schema public;");
  console.log("schema public recriado");
} finally {
  await sql.end({ timeout: 5 });
}
