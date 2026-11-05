import "server-only";
import postgres from "postgres";
import { databaseUrl } from "@/lib/env-server";

// Datas como string ISO (o código e os client components esperam string).
const types = {
  isoTimestamp: {
    to: 1184,
    from: [1114, 1184],
    serialize: (x: unknown) => (x instanceof Date ? x.toISOString() : x),
    parse: (x: string) => new Date(x).toISOString(),
  },
  rawDate: { to: 1082, from: [1082], serialize: (x: unknown) => x, parse: (x: string) => x },
};

function create() {
  return postgres(databaseUrl(), {
    max: 5,
    prepare: false, // compatível com pooler em modo transação / Hyperdrive
    connect_timeout: 5,
    idle_timeout: 20,
    types,
    onnotice: () => {},
  });
}

type Sql = ReturnType<typeof create>;
const g = globalThis as unknown as { __qmSql?: Sql };

/** Conexão (lazy). Em dev reaproveita entre recargas do HMR.
 *  FUTURO (Cloudflare Workers): criar por requisição a partir do Hyperdrive; não usar global. */
export function db(): Sql {
  if (!g.__qmSql) g.__qmSql = create();
  return g.__qmSql;
}

/** Transação com app.user_id definido (usado pelo gatilho de histórico de destino). */
export async function withUser<T>(userId: string, fn: (tx: postgres.TransactionSql) => Promise<T>) {
  return db().begin(async (tx) => {
    await tx`select set_config('app.user_id', ${userId}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

export function isPgError(e: unknown): e is { code: string; message: string } {
  return typeof e === "object" && e !== null && "code" in e && typeof (e as { code: unknown }).code === "string";
}
