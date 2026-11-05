import "server-only";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import type { Batch, LinkStatus } from "@/lib/db/types";

export async function listBatches(): Promise<(Batch & { linked: number })[]> {
  await requireUser();
  return db()<(Batch & { linked: number })[]>`
    select b.*,
      (select count(*)::int from public.links l where l.batch_id = b.id and l.status <> 'unassigned') as linked
    from public.batches b
    order by b.created_at desc
    limit 50`;
}

export type BatchLink = {
  id: string;
  slug: string;
  status: LinkStatus;
  client_name: string | null;
  destination_url: string | null;
};

export async function getBatch(id: string): Promise<{ batch: Batch; links: BatchLink[] } | null> {
  await requireUser();
  const sql = db();
  const [batch] = await sql<Batch[]>`select * from public.batches where id = ${id}::uuid`;
  if (!batch) return null;
  const links = await sql<BatchLink[]>`
    select id, slug, status, client_name, destination_url
    from public.links_overview where batch_id = ${id}::uuid
    order by created_at asc limit 500`;
  return { batch, links };
}

export async function createBatch(v: { quantity: number; name: string; kind: string; requestId: string }) {
  await requireUser();
  const [row] = await db()<{ id: string }[]>`
    select public.create_links_batch(${v.quantity}::int, ${v.name}::text, ${v.kind}::text, ${v.requestId}::uuid) as id`;
  return row.id;
}
