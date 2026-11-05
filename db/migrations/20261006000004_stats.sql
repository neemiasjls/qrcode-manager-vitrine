-- Estatísticas (bots sempre excluídos)

create view public.links_overview
with (security_invoker = true) as
select
  l.*,
  c.name as client_name,
  coalesce(s.scans_total, 0)::int as scans_total,
  coalesce(s.scans_7d, 0)::int as scans_7d,
  coalesce(s.scans_30d, 0)::int as scans_30d
from public.links l
left join public.clients c on c.id = l.client_id
left join lateral (
  select
    count(*) as scans_total,
    count(*) filter (where sc.scanned_at >= now() - interval '7 days') as scans_7d,
    count(*) filter (where sc.scanned_at >= now() - interval '30 days') as scans_30d
  from public.scans sc
  where sc.link_id = l.id and not sc.is_bot
) s on true;

create function public.scans_by_day(p_link_id uuid, p_days int default 30)
returns table (day date, total int)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_start date := (now() at time zone 'America/Sao_Paulo')::date - (greatest(p_days, 1) - 1);
begin
  return query
    select g.d::date as day, coalesce(x.cnt, 0)::int as total
    from generate_series(v_start::timestamp, v_today::timestamp, interval '1 day') as g(d)
    left join (
      select (s.scanned_at at time zone 'America/Sao_Paulo')::date as d, count(*) as cnt
      from public.scans s
      where s.link_id = p_link_id
        and not s.is_bot
        and s.scanned_at >= (v_start::timestamp at time zone 'America/Sao_Paulo')
      group by 1
    ) x on x.d = g.d::date
    order by 1;
end;
$$;

revoke execute on function public.scans_by_day(uuid, int) from public;

select public.revoke_api_roles();
