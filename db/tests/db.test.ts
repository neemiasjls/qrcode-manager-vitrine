// Integração com o Postgres local. Cada teste roda numa transação que sempre termina em rollback.
// Uso: npm run db:up; npm run db:migrate; npm run test:db
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { assertLocalDatabase } from "../../scripts/lib/db-guard.mjs";

const url = process.env.DATABASE_URL;
const enabled = Boolean(url);
if (url) assertLocalDatabase(url, "db.test.ts");

const sql = enabled ? postgres(url!, { max: 1, prepare: false, onnotice: () => {} }) : (null as never);

class Rollback extends Error {}

/** Sufixo único para os slugs de teste não colidirem com dados já existentes no banco de dev. */
const uniq = () => randomUUID().slice(0, 6);

type Tx = postgres.TransactionSql;

/** Roda fn numa transação e faz rollback no final (devolve o que fn retornou). */
async function inTx<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  let out!: T;
  try {
    await sql.begin(async (tx) => {
      out = await fn(tx);
      throw new Rollback();
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
  return out;
}

/** Executa fn num savepoint que deve falhar; devolve o erro (e desfaz só o savepoint). */
async function expectFail(tx: Tx, fn: (sp: Tx) => Promise<unknown>) {
  try {
    await tx.savepoint(async (sp) => {
      await fn(sp);
    });
  } catch (e) {
    return e as { code?: string; message: string };
  }
  throw new Error("era esperado falhar");
}

afterAll(async () => {
  if (enabled) await sql.end({ timeout: 5 });
});

describe.skipIf(!enabled)("regras do banco", () => {
  it("create_link: slug aleatório (7 chars) e slug custom", async () => {
    await inTx(async (tx) => {
      const [a] = await tx`select * from public.create_link(null, 'outro', null, null, 'https://www.google.com')`;
      expect(a.slug).toMatch(/^[a-z0-9]{7}$/);
      expect(a.status).toBe("active");
      const custom = `custom-${uniq()}`;
      const [b] = await tx`select * from public.create_link(${custom}::text, 'outro', null, null, null)`;
      expect(b.slug).toBe(custom);
      expect(b.status).toBe("unassigned");
    });
  });

  it("create_link: slug reservado -> slug_reserved", async () => {
    await inTx(async (tx) => {
      const e = await expectFail(tx, (sp) => sp`select * from public.create_link('admin', 'outro', null, null, null)`);
      expect(e.message).toContain("slug_reserved");
    });
  });

  it("create_link: slug duplicado -> 23505", async () => {
    await inTx(async (tx) => {
      const dup = `dup-${uniq()}`;
      await tx`select * from public.create_link(${dup}::text, 'outro', null, null, null)`;
      const e = await expectFail(tx, (sp) => sp`select * from public.create_link(${dup}::text, 'outro', null, null, null)`);
      expect(e.code).toBe("23505");
    });
  });

  it("change_slug sem uso apaga o antigo", async () => {
    await inTx(async (tx) => {
      const antigo = `antigo-${uniq()}`;
      const novoSlug = `novo-${uniq()}`;
      const [l] = await tx`select * from public.create_link(${antigo}::text, 'outro', null, null, 'https://a.com')`;
      await tx`select * from public.change_slug(${l.id}::uuid, ${novoSlug}::text)`;
      const old = await tx`select * from public.resolve_slug(${antigo}::text)`;
      expect(old).toHaveLength(0);
      const novo = await tx`select * from public.resolve_slug(${novoSlug}::text)`;
      expect(novo).toHaveLength(1);
      expect(novo[0].is_alias).toBe(false);
    });
  });

  it("depois de impressa, o slug antigo vira alias e continua resolvendo", async () => {
    await inTx(async (tx) => {
      const antigo = `impresso-${uniq()}`;
      const novoSlug = `impresso-novo-${uniq()}`;
      const [l] = await tx`select * from public.create_link(${antigo}::text, 'outro', null, null, 'https://a.com')`;
      await tx`update public.links set printed_at = now() where id = ${l.id}::uuid`;
      await tx`select * from public.change_slug(${l.id}::uuid, ${novoSlug}::text)`;
      const [old] = await tx`select * from public.resolve_slug(${antigo}::text)`;
      expect(old.is_alias).toBe(true);
      expect(old.destination_url).toBe("https://a.com");
      const [novo] = await tx`select * from public.resolve_slug(${novoSlug}::text)`;
      expect(novo.is_alias).toBe(false);
    });
  });

  it("create_links_batch é idempotente por request_id", async () => {
    await inTx(async (tx) => {
      const req = randomUUID();
      const [a] = await tx`select public.create_links_batch(3::int, 'Lote teste', 'outro', ${req}::uuid) as id`;
      const [b] = await tx`select public.create_links_batch(3::int, 'Lote teste', 'outro', ${req}::uuid) as id`;
      expect(b.id).toBe(a.id);
      const [{ n }] = await tx`select count(*)::int as n from public.links where batch_id = ${a.id}::uuid`;
      expect(n).toBe(3);
      const [{ u }] = await tx`select count(*)::int as u from public.links where batch_id = ${a.id}::uuid and status = 'unassigned'`;
      expect(u).toBe(3);
    });
  });

  it("troca de destino grava destination_history.changed_by (app.user_id)", async () => {
    await inTx(async (tx) => {
      const [u] = await tx`insert into public.users (username, password_hash) values (${"teste-" + uniq()}, 'x') returning id`;
      const [l] = await tx`select * from public.create_link(null, 'outro', null, null, 'https://a.com')`;
      await tx`select set_config('app.user_id', ${u.id}, true)`;
      await tx`update public.links set destination_url = 'https://b.com' where id = ${l.id}::uuid`;
      const [h] = await tx`select old_url, new_url, changed_by from public.destination_history where link_id = ${l.id}::uuid`;
      expect(h.old_url).toBe("https://a.com");
      expect(h.new_url).toBe("https://b.com");
      expect(h.changed_by).toBe(u.id);
    });
  });

  it("scans_by_day devolve 30 linhas e ignora bots; links_overview.scans_30d ignora bots", async () => {
    await inTx(async (tx) => {
      const [l] = await tx`select * from public.create_link(null, 'outro', null, null, 'https://a.com')`;
      await tx`
        insert into public.scans (link_id, slug_used, device, is_bot)
        values (${l.id}::uuid, ${l.slug}, 'mobile', false), (${l.id}::uuid, ${l.slug}, 'mobile', false),
               (${l.id}::uuid, ${l.slug}, 'bot', true)`;
      const days = await tx`select day::text as day, total from public.scans_by_day(${l.id}::uuid, 30)`;
      expect(days).toHaveLength(30);
      expect(days.reduce((s, d) => s + d.total, 0)).toBe(2);
      expect(days[0].day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const [o] = await tx`select scans_total, scans_30d from public.links_overview where id = ${l.id}::uuid`;
      expect(o.scans_30d).toBe(2);
      expect(o.scans_total).toBe(2);
    });
  });
});
