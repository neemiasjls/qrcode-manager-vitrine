-- Schema principal do QR Code Manager

-- pgcrypto no schema "extensions" (padrão do Supabase; em Postgres puro é criado aqui).
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.link_status as enum ('unassigned','active','paused','archived');

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  phone text, email text, notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'outro',
  quantity int not null check (quantity between 1 and 500),
  request_id uuid not null unique,          -- idempotência (clique duplo)
  created_at timestamptz not null default now()
);

create table public.links (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,                -- slug PRINCIPAL (espelho de link_slugs.is_primary)
  client_id uuid references public.clients(id) on delete restrict,
  batch_id uuid references public.batches(id) on delete restrict,
  destination_url text check (destination_url is null or destination_url ~* '^https?://'),
  status public.link_status not null default 'unassigned',
  kind text not null default 'outro'
    check (kind in ('google_review','instagram','whatsapp','cardapio','site','outro')),
  label text,
  printed_at timestamptz,                   -- trava o slug (ver regras de slug)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint active_needs_destination check (status <> 'active' or destination_url is not null)
);
create index on public.links (status);
create index on public.links (client_id);
create index on public.links (batch_id);

-- Namespace GLOBAL de slugs: principal + aliases. Nada é apagado depois de impresso.
create table public.link_slugs (
  slug text primary key
    check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$' and slug !~ '--'),
  link_id uuid not null references public.links(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index link_slugs_one_primary on public.link_slugs (link_id) where is_primary;

create table public.destination_history (
  id bigint generated always as identity primary key,
  link_id uuid not null references public.links(id),
  old_url text, new_url text,
  changed_by uuid,                          -- users.id de quem alterou (app.user_id da transação)
  changed_at timestamptz not null default now()
);
create index on public.destination_history (link_id, changed_at desc);

create table public.scans (
  id bigint generated always as identity primary key,
  link_id uuid not null references public.links(id),
  slug_used text not null,
  scanned_at timestamptz not null default now(),
  user_agent text,                          -- truncado em 300 chars no app
  device text check (device in ('mobile','desktop','bot','unknown')),
  country text,                             -- header cf-ipcountry (null em dev)
  is_bot boolean not null default false
);
create index on public.scans (link_id, scanned_at desc);
-- NÃO armazenar IP (LGPD).

-- Gatilhos ---------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create trigger links_set_updated_at
  before update on public.links
  for each row execute function public.set_updated_at();

create function public.log_destination_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.destination_url is distinct from new.destination_url then
    insert into public.destination_history (link_id, old_url, new_url, changed_by)
    values (new.id, old.destination_url, new.destination_url,
            nullif(current_setting('app.user_id', true), '')::uuid);
  end if;
  return new;
end;
$$;

create trigger links_log_destination_change
  after update of destination_url on public.links
  for each row execute function public.log_destination_change();

revoke execute on function public.set_updated_at() from public;
revoke execute on function public.log_destination_change() from public;
