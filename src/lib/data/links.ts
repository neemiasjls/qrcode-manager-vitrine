import "server-only";
import { requireUser } from "@/lib/auth/dal";
import { db, withUser } from "@/lib/db";
import type { DestinationHistory, Link, LinkOverview, ScanDay } from "@/lib/db/types";

export const PAGE_SIZE = 50;

export async function listLinks(p: {
  term: string;
  status: string;
  kind: string;
  page: number;
}): Promise<{ rows: LinkOverview[]; total: number }> {
  await requireUser();
  const sql = db();
  const like = `%${p.term}%`;
  const off = (p.page - 1) * PAGE_SIZE;
  const rows = await sql<(LinkOverview & { total_count: number })[]>`
    select *, count(*) over()::int as total_count
    from public.links_overview
    where true
      ${p.term ? sql`and (slug ilike ${like} or label ilike ${like} or client_name ilike ${like})` : sql``}
      ${p.status ? sql`and status = ${p.status}::public.link_status` : sql``}
      ${p.kind ? sql`and kind = ${p.kind}` : sql``}
    order by created_at desc
    limit ${PAGE_SIZE} offset ${off}`;
  return { rows, total: rows[0]?.total_count ?? 0 };
}

export type LinkDetail = {
  link: LinkOverview;
  clients: { id: string; name: string }[];
  aliases: { slug: string; created_at: string }[];
  history: Pick<DestinationHistory, "id" | "old_url" | "new_url" | "changed_at">[];
  days: ScanDay[];
  mobile: number;
  desktop: number;
};

export async function getLinkDetail(id: string): Promise<LinkDetail | null> {
  await requireUser();
  const sql = db();
  const [link] = await sql<LinkOverview[]>`select * from public.links_overview where id = ${id}::uuid`;
  if (!link) return null;
  const [clients, aliases, history, days, [dev]] = await Promise.all([
    sql<{ id: string; name: string }[]>`select id, name from public.clients order by name limit 500`,
    sql<{ slug: string; created_at: string }[]>`
      select slug, created_at from public.link_slugs
      where link_id = ${id}::uuid and not is_primary order by created_at desc`,
    sql<LinkDetail["history"]>`
      select id, old_url, new_url, changed_at from public.destination_history
      where link_id = ${id}::uuid order by changed_at desc limit 20`,
    sql<ScanDay[]>`select day::text as day, total from public.scans_by_day(${id}::uuid, 30)`,
    sql<{ mobile: number; desktop: number }[]>`
      select
        count(*) filter (where device = 'mobile')::int as mobile,
        count(*) filter (where device = 'desktop')::int as desktop
      from public.scans where link_id = ${id}::uuid and not is_bot`,
  ]);
  return { link, clients, aliases, history, days, mobile: dev.mobile, desktop: dev.desktop };
}

export async function createLink(v: {
  slug: string | null;
  kind: string;
  label: string | null;
  clientId: string | null;
  destination: string | null;
}): Promise<Link> {
  await requireUser();
  const [row] = await db()<Link[]>`
    select * from public.create_link(
      ${v.slug}::text, ${v.kind}::text, ${v.label}::text, ${v.clientId}::uuid, ${v.destination}::text)`;
  return row;
}

export async function updateLink(v: {
  id: string;
  destination: string | null;
  status: string;
  kind: string;
  label: string | null;
  clientId: string | null;
}): Promise<void> {
  const user = await requireUser();
  await withUser(user.id, async (tx) => {
    await tx`
      update public.links set
        destination_url = ${v.destination}::text,
        status = ${v.status}::public.link_status,
        kind = ${v.kind}::text,
        label = ${v.label}::text,
        client_id = ${v.clientId}::uuid
      where id = ${v.id}::uuid`;
  });
}

export async function changeSlug(id: string, slug: string): Promise<Link> {
  await requireUser();
  const [row] = await db()<Link[]>`select * from public.change_slug(${id}::uuid, ${slug}::text)`;
  return row;
}

export async function markPrintedOne(id: string): Promise<number> {
  await requireUser();
  const r = await db()`
    update public.links set printed_at = now() where id = ${id}::uuid and printed_at is null returning id`;
  return r.length;
}

export async function markPrintedMany(ids: string[]): Promise<number> {
  await requireUser();
  const r = await db()`
    update public.links set printed_at = now()
    where id = any(${ids}::uuid[]) and printed_at is null returning id`;
  return r.length;
}

export async function isSlugTaken(slug: string): Promise<boolean> {
  await requireUser();
  const [row] = await db()<{ taken: boolean }[]>`
    select exists(select 1 from public.link_slugs where slug = ${slug}::text) as taken`;
  return row.taken;
}

export type AssignCandidate = {
  id: string;
  slug: string;
  status: Link["status"];
  kind: string;
  label: string | null;
  client_name: string | null;
};

export async function findBySlugForAssign(slug: string): Promise<AssignCandidate | null> {
  await requireUser();
  const [row] = await db()<AssignCandidate[]>`
    select lo.id, lo.slug, lo.status, lo.kind, lo.label, lo.client_name
    from public.link_slugs ls
    join public.links_overview lo on lo.id = ls.link_id
    where ls.slug = ${slug}::text`;
  return row ?? null;
}

export class BusinessError extends Error {}

/** Vincula numa transação (atômico contra dois admins vinculando a mesma plaquinha). */
export async function assignLink(v: {
  id: string;
  clientId: string | null;
  newClientName: string | null;
  destination: string;
  kind: string;
  label: string | null;
}): Promise<void> {
  const user = await requireUser();
  await withUser(user.id, async (tx) => {
    const [cur] = await tx<{ status: string }[]>`
      select status from public.links where id = ${v.id}::uuid for update`;
    if (!cur) throw new BusinessError("Plaquinha não encontrada");
    if (cur.status !== "unassigned") throw new BusinessError("Esta plaquinha já está vinculada");
    let clientId = v.clientId;
    if (!clientId && v.newClientName) {
      const [c] = await tx<{ id: string }[]>`
        insert into public.clients (name) values (${v.newClientName}) returning id`;
      clientId = c.id;
    }
    await tx`
      update public.links set
        client_id = ${clientId}::uuid,
        destination_url = ${v.destination}::text,
        status = 'active',
        kind = ${v.kind}::text,
        label = ${v.label}::text
      where id = ${v.id}::uuid`;
  });
}
