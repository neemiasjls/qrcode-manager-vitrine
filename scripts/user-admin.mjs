// Administra usuários do painel em QUALQUER banco (inclusive produção), sem senha fixa.
// Uso:
//   $env:NEW_PASSWORD = Read-Host           # (opcional; senão pergunta no terminal)
//   node --env-file-if-exists=.env.local scripts/user-admin.mjs set-password <usuario>
//   node --env-file-if-exists=.env.local scripts/user-admin.mjs deactivate <usuario>
//   node --env-file-if-exists=.env.local scripts/user-admin.mjs logout-all <usuario>
import readline from "node:readline/promises";
import postgres from "postgres";
import { describeDatabase } from "./lib/db-guard.mjs";
import { hashPassword } from "../src/lib/auth/password.mjs";

const LOCAL = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const [cmd, rawUser] = process.argv.slice(2);
const username = String(rawUser ?? "").trim().toLowerCase();

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (!["set-password", "deactivate", "logout-all"].includes(cmd ?? "") || !/^[a-z0-9._-]{2,32}$/.test(username)) {
  fail("Uso: user-admin.mjs <set-password|deactivate|logout-all> <usuario>");
}
const url = process.env.DATABASE_URL;
if (!url) fail("DATABASE_URL não definida");

const host = new URL(url).hostname;
console.log(`banco: ${describeDatabase(url)}`);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
try {
  if (!LOCAL.has(host.toLowerCase())) {
    const typed = (await rl.question(`Banco NÃO local. Digite o host (${host}) para confirmar: `)).trim();
    if (typed !== host) fail("Host não confere. Cancelado.");
  }

  let hash = null;
  if (cmd === "set-password") {
    let pwd = process.env.NEW_PASSWORD;
    if (!pwd) pwd = await rl.question("Nova senha (mín. 12 caracteres; ficará visível): ");
    if (!pwd || pwd.length < 12) fail("A senha precisa ter pelo menos 12 caracteres.");
    if (pwd.length > 200) fail("Senha longa demais (máx. 200).");
    hash = await hashPassword(pwd);
  }

  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  try {
    if (cmd === "set-password") {
      const [row] = await sql`
        insert into public.users (username, password_hash) values (${username}, ${hash})
        on conflict (username) do update
          set password_hash = excluded.password_hash,
              is_active = true,
              session_version = public.users.session_version + 1
        returning (xmax = 0) as created`;
      console.log(`${row.created ? "criado" : "senha atualizada"}: ${username}`);
    } else if (cmd === "deactivate") {
      const r = await sql`
        update public.users set is_active = false, session_version = session_version + 1
        where username = ${username} returning id`;
      console.log(r.length ? `desativado: ${username}` : `usuário não encontrado: ${username}`);
    } else {
      const r = await sql`
        update public.users set session_version = session_version + 1
        where username = ${username} returning id`;
      console.log(r.length ? `sessões encerradas: ${username}` : `usuário não encontrado: ${username}`);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
} finally {
  rl.close();
}
