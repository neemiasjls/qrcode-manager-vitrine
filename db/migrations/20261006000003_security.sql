-- Segurança. O app conecta como dono das tabelas (não é afetado por RLS sem FORCE).
-- RLS habilitado SEM políticas = nega tudo para qualquer outra role. Em Postgres puro não há
-- outras roles; no Supabase isso fecha a Data API (PostgREST) para anon/authenticated.

alter table public.clients enable row level security;
alter table public.batches enable row level security;
alter table public.links enable row level security;
alter table public.link_slugs enable row level security;
alter table public.destination_history enable row level security;
alter table public.scans enable row level security;

-- Revoga privilégios das roles de API do Supabase, se existirem. Idempotente; reutilizada nas
-- migrações seguintes que criarem objetos.
create function public.revoke_api_roles()
returns void
language plpgsql
set search_path = ''
as $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on all tables in schema public from %I', r);
      execute format('revoke all on all sequences in schema public from %I', r);
      execute format('revoke all on all functions in schema public from %I', r);
      execute format('alter default privileges in schema public revoke all on tables from %I', r);
      execute format('alter default privileges in schema public revoke all on sequences from %I', r);
      execute format('alter default privileges in schema public revoke all on functions from %I', r);
    end if;
  end loop;
end;
$$;
revoke execute on function public.revoke_api_roles() from public;

select public.revoke_api_roles();
