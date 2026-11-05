import "server-only";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export type TopLink = {
  id: string;
  slug: string;
  label: string | null;
  kind: string;
  client_name: string | null;
  destination_url: string | null;
  scans_30d: number;
};

export async function getDashboard() {
  await requireUser();
  const sql = db();
  const [[counts], top] = await Promise.all([
    sql<{ active: number; unassigned: number; scans_30d: number }[]>`
      select
        (select count(*) from public.links where status = 'active')::int as active,
        (select count(*) from public.links where status = 'unassigned')::int as unassigned,
        (select count(*) from public.scans
          where not is_bot and scanned_at >= now() - interval '30 days')::int as scans_30d`,
    sql<TopLink[]>`
      select id, slug, label, kind, client_name, destination_url, scans_30d
      from public.links_overview
      where scans_30d > 0
      order by scans_30d desc
      limit 10`,
  ]);
  return { ...counts, top };
}
