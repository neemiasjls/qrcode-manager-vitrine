import "server-only";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import type { Client } from "@/lib/db/types";

export async function listClients(term: string): Promise<Client[]> {
  await requireUser();
  const sql = db();
  const p = `%${term}%`;
  return sql<Client[]>`
    select * from public.clients
    ${term ? sql`where name ilike ${p}` : sql``}
    order by name limit 200`;
}

export async function listClientOptions(): Promise<{ id: string; name: string }[]> {
  await requireUser();
  return db()<{ id: string; name: string }[]>`select id, name from public.clients order by name limit 500`;
}

export type ClientLink = {
  id: string;
  slug: string;
  label: string | null;
  kind: string;
  status: "unassigned" | "active" | "paused" | "archived";
  destination_url: string | null;
  scans_30d: number;
};

export async function getClient(id: string): Promise<{ client: Client; links: ClientLink[] } | null> {
  await requireUser();
  const sql = db();
  const [client] = await sql<Client[]>`select * from public.clients where id = ${id}::uuid`;
  if (!client) return null;
  const links = await sql<ClientLink[]>`
    select id, slug, label, kind, status, destination_url, scans_30d
    from public.links_overview where client_id = ${id}::uuid order by created_at desc`;
  return { client, links };
}

type ClientInput = { name: string; phone: string | null; email: string | null; notes: string | null };

export async function insertClient(v: ClientInput): Promise<string> {
  await requireUser();
  const [row] = await db()<{ id: string }[]>`
    insert into public.clients (name, phone, email, notes)
    values (${v.name}, ${v.phone}, ${v.email}, ${v.notes}) returning id`;
  return row.id;
}

export async function updateClient(id: string, v: ClientInput): Promise<void> {
  await requireUser();
  await db()`
    update public.clients set name = ${v.name}, phone = ${v.phone}, email = ${v.email}, notes = ${v.notes}
    where id = ${id}::uuid`;
}

export async function countClientLinks(id: string): Promise<number> {
  await requireUser();
  const [row] = await db()<{ n: number }[]>`
    select count(*)::int as n from public.links where client_id = ${id}::uuid`;
  return row.n;
}

/** Pode lançar erro 23503 (FK) se o cliente tiver plaquinhas. */
export async function deleteClient(id: string): Promise<void> {
  await requireUser();
  await db()`delete from public.clients where id = ${id}::uuid`;
}
